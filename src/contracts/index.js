// Contract interaction — mint XAELs and TAOs on Base chain
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { XAELS_ABI, TAOS_ABI } from "./abis.js";

// Contract addresses (set after deployment)
const XAELS_ADDRESS = process.env.XAELS_CONTRACT_ADDRESS || "";
const TAOS_ADDRESS = process.env.TAOS_CONTRACT_ADDRESS || "";

// Bot wallet (must have minter role on both contracts)
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || "";

let publicClient = null;
let walletClient = null;
let botAccount = null;

function getPublicClient() {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
    });
  }
  return publicClient;
}

function getWalletClient() {
  if (!walletClient) {
    if (!BOT_PRIVATE_KEY) throw new Error("BOT_PRIVATE_KEY not set");
    botAccount = privateKeyToAccount(BOT_PRIVATE_KEY.startsWith("0x") ? BOT_PRIVATE_KEY : `0x${BOT_PRIVATE_KEY}`);
    walletClient = createWalletClient({
      account: botAccount,
      chain: base,
      transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
    });
  }
  return walletClient;
}

function getBotAccount() {
  if (!botAccount) getWalletClient();
  return botAccount;
}

// ── XAELs ─────────────────────────────────────────────────────────

export async function mintXAEL(recipient, metadataURI, category, emotion, allowRemix = true, royaltyBps = 500) {
  if (!XAELS_ADDRESS) throw new Error("XAELS_CONTRACT_ADDRESS not set");
  const wallet = getWalletClient();
  const account = getBotAccount();

  const hash = await wallet.writeContract({
    address: XAELS_ADDRESS,
    abi: XAELS_ABI,
    functionName: "mint",
    args: [recipient, metadataURI, category, emotion, allowRemix, royaltyBps],
    account,
  });

  // Wait for receipt to get token ID
  const client = getPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash });

  // Parse token ID from event logs
  const logs = receipt.logs;
  let tokenId = null;
  for (const log of logs) {
    try {
      const decoded = await client.readContract({
        address: XAELS_ADDRESS,
        abi: XAELS_ABI,
        functionName: "ownerOf",
        args: [BigInt(log.topics[1] || 0)],
      });
      if (decoded) {
        tokenId = BigInt(log.topics[1]).toString();
        break;
      }
    } catch {}
  }

  return { hash, tokenId };
}

export async function mintXAELRemix(recipient, metadataURI, parentIds, category, emotion, allowRemix = true, royaltyBps = 250) {
  if (!XAELS_ADDRESS) throw new Error("XAELS_CONTRACT_ADDRESS not set");
  const wallet = getWalletClient();
  const account = getBotAccount();

  const hash = await wallet.writeContract({
    address: XAELS_ADDRESS,
    abi: XAELS_ABI,
    functionName: "mintRemix",
    args: [recipient, metadataURI, parentIds.map(BigInt), category, emotion, allowRemix, royaltyBps],
    account,
  });

  return { hash };
}

export async function getXAELBalance(address) {
  if (!XAELS_ADDRESS) return 0;
  const client = getPublicClient();
  const balance = await client.readContract({
    address: XAELS_ADDRESS,
    abi: XAELS_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  return Number(balance);
}

export async function getXAELsOfOwner(address) {
  if (!XAELS_ADDRESS) return [];
  const client = getPublicClient();
  const tokenIds = await client.readContract({
    address: XAELS_ADDRESS,
    abi: XAELS_ABI,
    functionName: "tokensOfOwner",
    args: [address],
  });
  return tokenIds.map((id) => id.toString());
}

export async function getXAELTokenURI(tokenId) {
  if (!XAELS_ADDRESS) return null;
  const client = getPublicClient();
  return await client.readContract({
    address: XAELS_ADDRESS,
    abi: XAELS_ABI,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });
}

export async function getTotalXAELSupply() {
  if (!XAELS_ADDRESS) return 0;
  const client = getPublicClient();
  const supply = await client.readContract({
    address: XAELS_ADDRESS,
    abi: XAELS_ABI,
    functionName: "totalSupply",
    args: [],
  });
  return Number(supply);
}

// ── TAOs ──────────────────────────────────────────────────────────

export async function mintTAO(recipient, amount, reason = "Engagement reward") {
  if (!TAOS_ADDRESS) throw new Error("TAOS_CONTRACT_ADDRESS not set");
  const wallet = getWalletClient();
  const account = getBotAccount();

  const hash = await wallet.writeContract({
    address: TAOS_ADDRESS,
    abi: TAOS_ABI,
    functionName: "mint",
    args: [recipient, parseEther(String(amount)), reason],
    account,
  });

  return { hash };
}

export async function mintTAOForAction(recipient, action) {
  if (!TAOS_ADDRESS) throw new Error("TAOS_CONTRACT_ADDRESS not set");
  const wallet = getWalletClient();
  const account = getBotAccount();

  const hash = await wallet.writeContract({
    address: TAOS_ADDRESS,
    abi: TAOS_ABI,
    functionName: "mintForAction",
    args: [recipient, action],
    account,
  });

  return { hash };
}

export async function getTAOBalance(address) {
  if (!TAOS_ADDRESS) return "0";
  const client = getPublicClient();
  const balance = await client.readContract({
    address: TAOS_ADDRESS,
    abi: TAOS_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  return formatEther(balance);
}

export async function getTAORemainingDaily(address) {
  if (!TAOS_ADDRESS) return "0";
  const client = getPublicClient();
  const remaining = await client.readContract({
    address: TAOS_ADDRESS,
    abi: TAOS_ABI,
    functionName: "getRemainingDaily",
    args: [address],
  });
  return formatEther(remaining);
}

export async function getTotalTAOSupply() {
  if (!TAOS_ADDRESS) return "0";
  const client = getPublicClient();
  const supply = await client.readContract({
    address: TAOS_ADDRESS,
    abi: TAOS_ABI,
    functionName: "totalSupply",
    args: [],
  });
  return formatEther(supply);
}

// ── Bot wallet info ───────────────────────────────────────────────

export function getBotAddress() {
  const account = getBotAccount();
  return account?.address || null;
}

export async function getBotBalance() {
  const client = getPublicClient();
  const account = getBotAccount();
  if (!account) return "0";
  const balance = await client.getBalance({ address: account.address });
  return formatEther(balance);
}
