// Web3 utilities — NFT ownership checks, wallet verification
import { createPublicClient, http, formatEther, isAddress } from 'viem';
import { mainnet, polygon, base } from 'viem/chains';

const CHAIN_MAP = {
  1: mainnet,
  137: polygon,
  8453: base,
};

// Minimal ERC-721 ABI for balanceOf and ownerOf
const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

let client = null;

export function getWeb3Client() {
  if (!client) {
    const rpcUrl = process.env.ETH_RPC_URL;
    const chainId = parseInt(process.env.CHAIN_ID || '1', 10);
    const chain = CHAIN_MAP[chainId] || mainnet;
    client = createPublicClient({ chain, transport: http(rpcUrl) });
  }
  return client;
}

// Validate Ethereum address
export function isValidAddress(address) {
  return isAddress(address);
}

// Check if address holds any NFTs from a contract
export async function getNFTBalance(address, contractAddress) {
  try {
    const c = getWeb3Client();
    const balance = await c.readContract({
      address: contractAddress,
      abi: ERC721_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    return Number(balance);
  } catch (err) {
    console.error(`NFT balance check failed: ${err.message}`);
    return 0;
  }
}

// Get all token IDs owned by an address
export async function getOwnedTokenIds(address, contractAddress) {
  try {
    const c = getWeb3Client();
    const balance = await getNFTBalance(address, contractAddress);
    const tokenIds = [];
    for (let i = 0; i < Math.min(balance, 100); i++) {
      const tokenId = await c.readContract({
        address: contractAddress,
        abi: ERC721_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [address, BigInt(i)],
      });
      tokenIds.push(tokenId.toString());
    }
    return tokenIds;
  } catch (err) {
    console.error(`Token ID fetch failed: ${err.message}`);
    return [];
  }
}

// Check if address owns a specific token
export async function ownsToken(address, contractAddress, tokenId) {
  try {
    const c = getWeb3Client();
    const owner = await c.readContract({
      address: contractAddress,
      abi: ERC721_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    });
    return owner.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// Format ETH value
export function formatEth(wei) {
  return formatEther(BigInt(wei));
}

export { ERC721_ABI };
