import { debug } from "debug";
import { Contract, JsonRpcProvider } from "ethers";
import { assert } from "./assert";
import { fetchMultisigsFromGitbook } from "./multisigs";

const log = debug("send:ethers");

// contract address
const contractAddress = "0x3f14920c99BEB920Afa163031c4e47a3e03B3e4A";
export const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL!;
export const BASE_RPC_URL = process.env.BASE_RPC_URL!;
const mainnetProvider = new JsonRpcProvider(MAINNET_RPC_URL);
const baseProvider = new JsonRpcProvider(BASE_RPC_URL);
const mainnetChainId = (await mainnetProvider.getNetwork()).chainId;
const baseChainId = (await baseProvider.getNetwork()).chainId;
log("Mainnet chain ID:", mainnetChainId);
assert(mainnetChainId === 1n, "Mainnet chain ID is not 1n");
log("Base chain ID:", baseChainId);
assert(baseChainId === 8453n, "Base chain ID is not 8453n");

const abi = [
	"function balanceOf(address addr) view returns (uint)",
	"function totalSupply() view returns (uint)",
];
export const mainnetSendContract = new Contract(
	contractAddress,
	abi,
	mainnetProvider,
);
export const baseSendContract = new Contract(
	contractAddress,
	abi,
	baseProvider,
);
