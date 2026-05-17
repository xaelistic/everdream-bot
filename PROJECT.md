# Everdream Bot v2.0 — Web3 Community Discord Bot

## Architecture

```
everdream-bot/
├── src/
│   ├── index.js              # Main bot — command handlers, events, onboarding
│   ├── db/
│   │   └── database.js       # SQLite schema + migrations
│   ├── lib/
│   │   ├── serverSetup.js    # Full server creation (categories, channels, roles, permissions)
│   │   ├── gamification.js   # Points, levels, leaderboard
│   │   ├── trading.js        # Listings, buy/sell, escrow tracking
│   │   ├── rating.js         # Content rating system
│   │   ├── provenance.js     # Remix chain tracking
│   │   ├── reactionRoles.js  # Reaction role handling (legacy)
│   │   └── logger.js         # Message edit/delete/mod logging (legacy)
│   ├── web3/
│   │   └── index.js          # NFT ownership checks, wallet validation (viem)
│   ├── logger.js             # Bot log channel utility
│   └── reactionRoles.js      # Reaction role config
├── .env.example              # Environment variable template
├── package.json              # Dependencies: discord.js, better-sqlite3, viem, dotenv
└── SERVER_STRUCTURE.md       # Full server layout spec
```

## Database Schema (SQLite)

### Tables

**wallets** — Linked Ethereum addresses
- `discord_id`, `eth_address`, `linked_at`, `nonce`

**users** — Profiles + gamification
- `discord_id`, `username`, `points`, `uploads`, `ratings_given`, `ratings_received`, `trades_completed`, `remixes`

**content** — Registered creative works
- `content_id`, `creator_discord_id`, `title`, `description`, `image_url`, `metadata_json`, `average_rating`, `rating_count`

**ratings** — Content ratings
- `content_id`, `rater_discord_id`, `score` (1-5), unique constraint on (content_id, rater)

**remixes** — Provenance chain
- `derivative_content_id`, `original_content_id`, `remixer_discord_id`

**listings** — Active marketplace listings
- `content_id`, `seller_discord_id`, `price_eth`, `status` (active/sold/cancelled/escrow), `buyer_discord_id`, `tx_hash`

**trades** — Completed trade history
- `content_id`, `from_discord_id`, `to_discord_id`, `price_eth`, `tx_hash`

**token_gates** — NFT-gated role config
- `role_id`, `contract_address`, `chain_id`, `min_balance`, `description`

**action_log** — Gamification audit trail
- `discord_id`, `action`, `points`, `details`

## Gamification System

### Point Values
| Action | Points |
|---|---|
| UPLOAD | 10 |
| RATING_GIVEN | 2 |
| RATING_RECEIVED | 5 |
| TRADE_COMPLETED | 20 |
| REMIX_CREATED | 15 |
| REMIX_RECEIVED | 10 |
| VERIFY | 5 |
| INTRODUCTION | 3 |
| DAILY_LOGIN | 1 |

### Level Thresholds
| Level | Title | Points Required |
|---|---|---|
| 1 | Dream Initiate | 0 |
| 2 | Dream Novice | 20 |
| 3 | Dreamer | 50 |
| 4 | Dream Explorer | 100 |
| 5 | Dream Collector | 250 |
| 6 | Dream Artist | 500 |
| 7 | Sleep Sage | 1,000 |
| 8 | Dream Weaver | 2,500 |
| 9 | Lucid Master | 5,000 |
| 10 | Dream Legend | 10,000 |

## Server Structure (created by !setup-server)

### Categories & Channels

**📋 INFORMATION** (read-only for members)
- `#welcome` — Welcome message + bot introductions
- `#rules` — Server rules
- `#announcements` — Official updates
- `#roles` — Self-assignable reaction roles

**💬 COMMUNITY**
- `#general` — Main chat
- `#introductions` — New member intros
- `#off-topic` — Anything goes
- `#media` — Share images, art, memes

**🌙 DREAM JOURNAL**
- `#dream-journal` — Share dreams (30s slowmode)
- `#lucid-talk` — Lucid dreaming discussion
- `#dream-interpret` — Dream interpretations
- `#sleep-talk` — Sleep quality, routines

**🎨 CREATIVE**
- `#dream-art` — Dream-inspired art
- `#dream-music` — Sleep/dream music
- `#writing` — Dream-inspired writing

**💰 MARKETPLACE**
- `#trading` — NFT trading (10s slowmode)
- `#showcase` — Show off collection (30s slowmode)
- `#leaderboard` — Top members (read-only)

**🔒 MEMBERS ONLY** (requires Member role)
- `#member-chat` — Casual member chat
- `#events` — Community events
- `#feedback` — Suggestions

**🤖 BOT**
- `#bot-commands` — Bot command usage (5s slowmode)
- `#bot-log` — Bot action logs (admin only)

**🔧 ADMIN** (admin only)
- `#admin-chat` — Staff discussion
- `#mod-log` — Moderation log
- `#server-config` — Config notes

### Role Hierarchy
| Role | Color | Permissions |
|---|---|---|
| 🔴 Owner | #dc2626 | Administrator |
| 🟠 Admin | #f97316 | Manage channels, roles, messages, kick/ban |
| 🟡 Moderator | #eab308 | Manage messages, kick, timeout |
| 🟢 Helper | #22c55e | Manage messages |
| 🟣 Creator | #8b5cf6 | Content creator badge |
| 🔵 Collector | #06b6d4 | NFT holder badge |
| 🔵 Member | #3b82f6 | Verified members |
| ⚪ Unverified | #6b7280 | New members (limited access) |
| ⚫ Muted | #374151 | Cannot send messages |

### Self-Assignable Roles (via reaction roles)
| Emoji | Role | Description |
|---|---|---|
| 🌙 | Dream Journaler | Journal reminders |
| 📢 | Announcements | Server announcements |
| 🎨 | Artist | Creative content |
| 🎮 | Gamer | Gaming nights |
| 📚 | Bookworm | Book/sleep stories |
| 🧘 | Mindfulness | Meditation & wellness |
| 🔬 | Sleep Science | Research & science |
| 💎 | Premium | Premium tier |

## Commands

### Server Setup
| Command | Access | Description |
|---|---|---|
| `!setup-server` | Admin | Creates entire server structure |

### Wallet & Identity
| Command | Access | Description |
|---|---|---|
| `!link <eth_address>` | Everyone | Link Ethereum wallet, auto-check NFTs |
| `!verify` | Everyone | Get Member role |

### Content
| Command | Access | Description |
|---|---|---|
| `!upload <id> <title> [desc]` | Everyone | Register content, earn points |
| `!rate <content_id> <1-5>` | Everyone | Rate content |
| `!remix <new_id> <original_id>` | Everyone | Register a remix |
| `!provenance <content_id>` | Everyone | View provenance chain |

### Trading
| Command | Access | Description |
|---|---|---|
| `!list <content_id> <price_eth>` | Creator | List NFT for sale |
| `!buy <listing_id>` | Everyone | Buy a listing |
| `!confirm <listing_id> <tx_hash>` | Seller | Confirm on-chain trade |
| `!cancel <listing_id>` | Seller | Cancel listing |
| `!listings` | Everyone | View active listings |

### Community
| Command | Access | Description |
|---|---|---|
| `!profile` | Everyone | View your profile |
| `!leaderboard` | Everyone | Top 10 members |
| `!help` | Everyone | Command reference |

## Environment Variables

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id

# Channel IDs (populated by !setup-server)
WELCOME_CHANNEL_ID=
RULES_CHANNEL_ID=
GENERAL_CHANNEL_ID=
DREAM_JOURNAL_CHANNEL_ID=
ANNOUNCEMENTS_CHANNEL_ID=
BOT_LOG_CHANNEL_ID=
TRADING_CHANNEL_ID=
LEADERBOARD_CHANNEL_ID=

# Role IDs (populated by !setup-server)
MEMBER_ROLE_ID=
UNVERIFIED_ROLE_ID=
OWNER_ROLE_ID=
ADMIN_ROLE_ID=
MODERATOR_ROLE_ID=
CREATOR_ROLE_ID=
COLLECTOR_ROLE_ID=

# Web3
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NFT_CONTRACT_ADDRESS=0x
CHAIN_ID=1

# Onboarding
VERIFICATION_TIMEOUT_SECONDS=0
```

## Web3 Integration

### NFT Ownership Checks (viem)
- `getNFTBalance(address, contract)` — Returns NFT count for address
- `getOwnedTokenIds(address, contract)` — Returns array of token IDs
- `ownsToken(address, contract, tokenId)` — Checks specific token ownership
- `isValidAddress(address)` — Validates Ethereum address format

### Token Gating Flow
1. User runs `!link <address>`
2. Bot validates address format
3. Bot checks NFT balance via RPC
4. If balance > 0: assigns Collector + Member roles
5. Wallet linked in database for future checks

### Trading Flow
1. Creator: `!list <content_id> <price_eth>` — Creates listing
2. Buyer: `!buy <listing_id>` — Initiates purchase (status: escrow)
3. Seller: `!confirm <listing_id> <tx_hash>` — Confirms on-chain tx
4. Both parties earn TRADE_COMPLETED points
5. Trade recorded in history table

### Remix Provenance
1. User: `!remix <new_content_id> <original_content_id>`
2. Bot validates original exists, not circular
3. Records link in remixes table
4. Both remixer and original creator earn points
5. `!provenance <id>` walks the chain back to root

## Deployment

```bash
git clone https://github.com/xaelistic/everdream-bot.git
cd everdream-bot
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

Then in Discord:
```
!setup-server
```

## Dependencies
- `discord.js` ^14.16.0 — Discord API
- `better-sqlite3` ^11.0.0 — Database
- `viem` ^2.21.0 — Ethereum RPC / NFT checks
- `dotenv` ^16.4.0 — Environment config

## Repo
github.com/xaelistic/everdream-bot
