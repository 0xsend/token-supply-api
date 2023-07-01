import { Contract, JsonRpcProvider } from "ethers";
import express from "express";

// contract address
const contractAddress = "0x3f14920c99BEB920Afa163031c4e47a3e03B3e4A";

// multisig addresses
const multisigAddresses = [
  // Multisig Signer Payouts:
  "0x4bB2f4c771ccB60723a78a974a2537AD339071c7",

  // Core Team:
  "0xE52D0967A2eE242098d11c209f53C8158E329eCC",

  // Holder Distributions:
  "0x6204Bc0662ccd8a9A762d59fe7906733f251E3b7",

  // Dex n Cex Listings:
  "0xF530e6E60e7a65Ea717f843a8b2e6fcdC727aC9E",

  // Treasury:
  "0x5355c409fa3D0901292231Ddb953C949C2211D96",

  // Community Contributor Incentives:
  "0x4F30818f5c1a20803AB2075B813DBDE810e51b98",
];

const RPC_URL = process.env.RPC_URL!;
const provider = new JsonRpcProvider(RPC_URL);

const abi = [
  "function balanceOf(address addr) view returns (uint)",
  "function totalSupply() view returns (uint)",
];
let sendContract = new Contract(contractAddress, abi, provider);

// 100 billion total supply
let totalSupply = await sendContract.totalSupply();

let circulatingSupply = 0n;

// lookup multisig balances for circulating supply
const lookupCirculatingSupply = async () => {
  let lockedSupply = 0n;
  for (let i = 0; i < multisigAddresses.length; i++) {
    await sendContract.balanceOf(multisigAddresses[i]).then((balance: any) => {
      lockedSupply += balance;
    });
  }
  return totalSupply - lockedSupply;
};

circulatingSupply = await lookupCirculatingSupply();

// 5 minute refresh interval in production, 10 second refresh interval in development
const refreshInterval =
  process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 10000;
setInterval(async () => {
  circulatingSupply = await lookupCirculatingSupply();
}, refreshInterval);

const app = express();
const port = 8080;

app.get("/", (req, res) => {
  // redirect to naked domain
  res.redirect(301, "https://www.send.it/");
});

app.get("/total", (req, res) => {
  res.send(totalSupply.toString());
});

app.get("/circulating", (req, res) => {
  res.send(circulatingSupply.toString());
});

app.listen(port, () => {
  const rpcHost = new URL(RPC_URL).hostname;
  console.log(`Connected to ${rpcHost}. Listening on port ${port}...`);
});
