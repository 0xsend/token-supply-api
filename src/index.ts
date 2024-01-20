import express from "express";
import {
  mainnetSendContract,
  baseSendContract,
  multisigAddresses,
  MAINNET_RPC_URL,
  BASE_RPC_URL,
} from "./ethers";
import { assert } from "./assert";
import { debug } from "debug";

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
let totalSupply = await lookupTotalSupply();
log("Total supply:", totalSupply);
assert(totalSupply > 0n, "Total supply not found");
assert(totalSupply === 100000000000n, "Total supply is not 100 billion");

let circulatingSupply = 0n;

async function lookupCirculatingSupply() {
  let lockedSupply = 0n;
  for (let i = 0; i < multisigAddresses.length; i++) {
    const { address, heading, name } = multisigAddresses[i];
    log(`Checking balance of multisig ${name} (${heading})...`, address);
    await mainnetSendContract.balanceOf(address).then((balance: any) => {
      log(`Multisig ${name} on mainnet balance:`, balance);
      lockedSupply += balance;
    });
    await baseSendContract.balanceOf(address).then((balance: any) => {
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
  console.log("Total supply:", totalSupply);
  console.log("Circulating supply:", circulatingSupply);
  console.log(
    "% of supply circulating:",
    (circulatingSupply * 100n) / totalSupply + "%"
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
const port = 8080;

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

app.listen(port, "::", () => {
  const mainnetRpcHost = new URL(MAINNET_RPC_URL).hostname;
  const baseRpcHost = new URL(BASE_RPC_URL).hostname;
  console.log(
    `Connected to mainnet:${mainnetRpcHost} and base:${baseRpcHost}. Listening on port ${port}...`
  );
  printSummary();
});
