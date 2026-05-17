# Everdream Discord Server Structure

## Server Settings

- **Server Name:** Everdream
- **Verification Level:** Low (must have verified email)
- **Default Notifications:** Only @mentions
- **Explicit Media Content Filter:** Scan media from all members

---

## Channel Layout

### 📋 INFORMATION
```
#welcome          — Welcome message + verify button
#rules            — Server rules (read-only)
#announcements    — Official Everdream updates (read-only)
#roles            — Self-assignable reaction roles
```

### 💬 COMMUNITY
```
#general          — Main chat
#introductions    — New member intros
#off-topic        — Anything goes
#media            — Share images, art, memes
```

### 🌙 DREAM JOURNAL
```
#dream-journal    — Share your dreams (use !dream)
#lucid-talk       — Lucid dreaming discussion
#dream-interpret  — Ask for dream interpretations
#sleep-talk       — Sleep quality, routines, tips
```

### 🎨 CREATIVE
```
#dream-art        — Art inspired by dreams
#dream-music      — Music for sleep/dreaming
#writing          — Dream-inspired writing
```

### 💰 MARKETPLACE
```
#trading          — List and trade NFTs (!list, !buy, !cancel)
#showcase         — Show off your collection
#leaderboard      — Top creators, collectors, traders (read-only)
```

### 🔒 MEMBERS ONLY (requires Member role)
```
#member-chat      — Casual member-only chat
#events           — Community events, watch parties
#feedback         — Suggestions for the server
```

### 🤖 BOT
```
#bot-commands     — Bot command usage
#bot-log          — Bot action logs (admin only, read-only)
```

### 🔧 ADMIN (admin only)
```
#admin-chat       — Staff discussion
#mod-log          — Moderation action log
#server-config    — Configuration notes
```

---

## Role Hierarchy

```
🔴 Owner          — Full admin
🟠 Admin          — Manage server, roles, channels
🟡 Moderator      — Kick, ban, mute, manage messages
🟢 Helper         — Answer questions, guide new members
🟣 Creator        — Content creators (auto-assigned)
🔵 Collector      — NFT holders (auto-assigned via token-gate)
🔵 Member         — Verified members (access to main channels)
⚪ Unverified     — New members (limited access until verified)
⚫ Muted          — Cannot send messages
```

### Self-Assignable Roles (via reaction roles in #roles)
```
🌙 Dream Journaler    — Dream journal reminders
📢 Announcements      — Server announcements
🎨 Artist             — Creative content
🎮 Gamer              — Gaming night notifications
📚 Bookworm           — Book/sleep story discussions
🧘 Mindfulness        — Meditation & wellness
🔬 Sleep Science      — Research & science discussions
💎 Premium            — Premium tier
```

---

## Onboarding Flow

### Step 1: User joins → gets `Unverified` role
- Can only see: #welcome, #rules
- Receives a DM from the bot with a **Verify button**

### Step 2: User clicks ✅ Verify button (in DM)
- Gets `Member` role
- Loses `Unverified` role
- Gets access to all member channels
- An **onboarding modal** pops up asking:
  1. "How did you find Everdream?" (text input)
  2. "What brings you here?" (paragraph input)
  3. "Do you keep a dream journal?" (text input)
- Responses are logged to #bot-log

### Step 3: User picks roles in #roles
- Reacts to get notification/interest roles
- Can be done anytime

### Alternative: `!verify` command
- Users who can't receive DMs can type `!verify` in #bot-commands
- Same effect but without the onboarding questions

---

## Bot Commands

### Everyone
| Command | Description |
|---------|-------------|
| `!verify` | Verify and get Member role |
| `!help` | Show all commands |
| `!profile` | View your dream profile |
| `!leaderboard` | View top members |
| `!dream <text>` | Log a dream entry (Member+) |

### Wallet & Web3
| Command | Description |
|---------|-------------|
| `!link <address>` | Link Ethereum wallet |
| `!upload <id> <title> [desc]` | Register content |
| `!rate <content_id> <1-5>` | Rate content |
| `!list <content_id> <price_eth>` | List for sale |
| `!buy <listing_id>` | Buy a listing |
| `!confirm <listing_id> <tx_hash>` | Confirm trade (seller) |
| `!cancel <listing_id>` | Cancel your listing |
| `!listings` | View active listings |
| `!remix <new_id> <original_id>` | Register a remix |
| `!provenance <content_id>` | View provenance chain |

### Moderation (Mod+)
| Command | Description |
|---------|-------------|
| `!warn @user [reason]` | Warn a user (DMs them) |
| `!mute @user [seconds] [reason]` | Mute/timeout a user |
| `!kick @user [reason]` | Kick a user |
| `!ban @user [reason]` | Ban a user |
| `!clear [amount]` | Delete messages (1-100) |

### Admin Only
| Command | Description |
|---------|-------------|
| `!setup-server` | Create entire server structure |
| `!gate-add <role_id> <contract> [chain] [min] [desc]` | Add token gate |
| `!gate-remove <role_id>` | Remove token gate |
| `!check-gates` | List active token gates |

---

## Gamification

Points are awarded for:
- 📤 Upload content: **10 pts**
- ⭐ Give rating: **2 pts**
- ⭐ Receive rating: **5 pts**
- 💰 Complete trade: **20 pts**
- 🎨 Create remix: **15 pts**
- 🎨 Receive remix: **10 pts**
- ✅ Verify: **5 pts**
- 📝 Introduction/dream: **3 pts**

Levels: 1(0) → 2(20) → 3(50) → 4(100) → 5(250) → 6(500) → 7(1000) → 8(2500) → 9(5000) → 10(10000)

Titles: Dream Initiate → Dream Novice → Dreamer → Dream Explorer → Dream Collector → Dream Artist → Sleep Sage → Dream Weaver → Lucid Master → Dream Legend

---

## Server Rules (for #rules channel)

```
🌙 **Everdream Server Rules**

1. **Be Respectful** — Treat everyone with kindness. We're all here to explore dreams together.

2. **No Spam or Unsolicited Promos** — Don't flood channels or DM members with promotions. Ask a mod first.

3. **Keep it Safe** — No NSFW content in general channels. Mark sensitive content appropriately.

4. **Zero Tolerance for Hate** — No harassment, hate speech, discrimination, or bullying of any kind.

5. **Use the Right Channels** — Check channel descriptions before posting.

6. **Follow Discord ToS** — https://discord.com/terms

7. **Dream Freely** — This is a space for open-minded exploration.

**Violations may result in warnings, mutes, kicks, or bans at moderator discretion.**

By verifying, you agree to these rules. Welcome to Everdream! 🌙
```
