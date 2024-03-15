import { debug } from "debug";
import express from "express";
import { assert } from "./assert";
import {
  BASE_RPC_URL,
  MAINNET_RPC_URL,
  baseSendContract,
  mainnetSendContract,
} from "./ethers";
import { fetchMultisigsFromGitbook } from "./multisigs";

const log = debug("send:server");

async function lookupTotalSupply() {
  const mainnnetTotalSupply = await mainnetSendContract.totalSupply();

  // Mainnet is the source of truth for total supply. Base is a l2 and uses bridged tokens for total supply.
  // const baseTotalSupply = await baseSendContract.totalSupply();
  // log("Mainnet total supply:", mainnnetTotalSupply);
  // log("Base total supply:", baseTotalSupply);

  return mainnnetTotalSupply;
}

// 100 billion total supply
const totalSupply = await lookupTotalSupply();
log("Total supply:", totalSupply);
assert(totalSupply > 0n, "Total supply not found");
assert(totalSupply === 100000000000n, "Total supply is not 100 billion");

// let multisigAddresses = await fetchMultisigsFromGitbook();
const multisigAddresses = [
  ["Team", "0xB6073D163cFBdE99D573891B094721eA6e319b57"],
  ["Treasury", "0x05CEa6C36f3a44944A4F4bA39B1820677AcB97EE"],
  ["Rewards", "0xD3DCFf1823714a4399AD2927A3800686D4CEB53A"],
  ["Revenues", "0x71fa02bb11e4b119bEDbeeD2f119F62048245301"],
  ["Contributors", "0xA9127eE59d9D8eBCfeF58B22Bd6CeaaBEb584A3C"],
  ["Distributions", "0x077c4E5983e5c495599C1Eb5c1511A52C538eB50"],
  ["Multisig Signers", "0xa8b5861Eb8764b509f5D9eF0E71833ab5c9D547D"],
  ["Exchange Listings", "0x9B0F6329f7A0e5091A9EEC1102Eaf97B53E67447"],
] as const;
let circulatingSupply = 0n;

async function lookupCirculatingSupply() {
  // multisigAddresses = await fetchMultisigsFromGitbook();
  let lockedSupply = 0n;
  for (let i = 0; i < multisigAddresses.length; i++) {
    // const { address, heading, name } = multisigAddresses[i];
    const [name, address] = multisigAddresses[i];
    log(`Checking balance of multisig ${name}...`, address);
    await mainnetSendContract.balanceOf(address).then((balance: bigint) => {
      log(`Multisig ${name} on mainnet balance:`, balance);
      lockedSupply += balance;
    });
    await baseSendContract.balanceOf(address).then((balance: bigint) => {
      log(`Multisig ${name} on base balance:`, balance);
      lockedSupply += balance;
    });
  }
  return totalSupply - lockedSupply;
}

circulatingSupply = await lookupCirculatingSupply();
log("Circulating supply:", circulatingSupply);
assert(circulatingSupply > 0n, "Circulating supply not found");

function printSummary() {
  console.log(
    "Multisig addresses:",
    multisigAddresses.map(([, m]) => m)
  );
  console.log("Total supply:", totalSupply);
  console.log("Circulating supply:", circulatingSupply);
  console.log(
    "% of supply circulating:",
    `${(circulatingSupply * 100n) / totalSupply}%`
  );
}

// 5 minute refresh interval in production, 10 second refresh interval in development
const refreshInterval =
  process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 10000;
setInterval(async () => {
  await lookupTotalSupply();
  log("Refreshing supply...");
  circulatingSupply = await lookupCirculatingSupply();
  printSummary();
}, refreshInterval);

const app = express();
const port = process.env.PORT || 8080;

// set CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  // redirect to naked domain
  res.redirect(301, "https://www.send.it/");
});

app.get("/amounts.json", (req, res) => {
  res.send({
    total: Number(totalSupply),
    circulating: Number(circulatingSupply),
  });
});

app.get("/total", (req, res) => {
  res.send(totalSupply.toString());
});

app.get("/circulating", (req, res) => {
  res.send(circulatingSupply.toString());
});

app.get("/multisigs", (req, res) => {
  res.send(multisigAddresses);
});

app.listen(Number(port), "::", () => {
  const mainnetRpcHost = new URL(MAINNET_RPC_URL).hostname;
  const baseRpcHost = new URL(BASE_RPC_URL).hostname;
  console.log(
    `Connected to mainnet:${mainnetRpcHost} and base:${baseRpcHost}. Listening on port ${port}...`
  );
  printSummary();
});
