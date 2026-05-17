// XAELs contract ABI (minimal — only functions the bot needs)
export const XAELS_ABI = [
  // Write
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" },
      { name: "category", type: "string" },
      { name: "emotion", type: "string" },
      { name: "allowRemix", type: "bool" },
      { name: "royaltyBps", type: "uint96" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mintRemix",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" },
      { name: "parentIds", type: "uint256[]" },
      { name: "category", type: "string" },
      { name: "emotion", type: "string" },
      { name: "allowRemix", type: "bool" },
      { name: "royaltyBps", type: "uint96" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "setMinter",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "minter", type: "address" },
      { name: "authorized", type: "bool" },
    ],
    outputs: [],
  },
  // Read
  {
    name: "getDream",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "parents", type: "uint256[]" },
          { name: "mintedAt", type: "uint256" },
          { name: "category", type: "string" },
          { name: "emotion", type: "string" },
          { name: "allowRemix", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokensOfOwner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "minters",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "DreamMinted",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "uri", type: "string" },
      { name: "parents", type: "uint256[]" },
    ],
  },
];

// TAOs contract ABI (minimal)
export const TAOS_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "mintForAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "action", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "setMinter",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "minter", type: "address" },
      { name: "authorized", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getRemainingDaily",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "dailyMintLimit",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
];
