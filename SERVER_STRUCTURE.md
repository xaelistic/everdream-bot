# Everdream Discord Server Structure

## Server Settings

- **Server Name:** Everdream
- **Verification Level:** Low (must have verified email)
- **Default Notifications:** Only @mentions
- **Explicit Media Content Filter:** Scan media from all members

---

## Channel Layout

### 📋 INFORMATION (read-only for members)
```
#welcome          — Welcome message + bot introductions
#rules            — Server rules (react to verify)
#announcements    — Official Everdream updates
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
#dream-journal    — Share your dreams
#lucid-talk       — Lucid dreaming discussion
#dream-interpret  — Ask for dream interpretations
#sleep-talk       — Sleep quality, routines, tips
```

### 🎨 CREATIVE
```
#dream-art       — Art inspired by dreams
#dream-music      — Music for sleep/dreaming
#writing          — Dream-inspired writing
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
#bot-log          — Bot action logs (admin only)
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
🔵 Member         — Verified members (access to main channels)
⚪ Unverified     — New members (limited access until verified)
⚫ Muted          — Cannot send messages
```

### Self-Assignable Roles (via reaction roles)
```
🌙 Dream Journaler    — Get pinged for dream journal reminders
📢 Announcements      — Get pinged for server announcements
🎨 Artist             — Access to creative channels
🎮 Gamer              — Gaming night notifications
📚 Bookworm           — Book/sleep story discussions
🧘 Mindfulness        — Meditation & wellness content
🔬 Sleep Science      — Research & science discussions
💎 Premium            — Premium tier (if applicable)
```

---

## Onboarding Flow

### Step 1: User joins → gets `Unverified` role
- Can only see: #welcome, #rules, #bot-commands
- Receives a DM from the bot with rules summary + verify button

### Step 2: User reads #rules
- Rules include:
  1. Be respectful and kind
  2. No spam or self-promotion without permission
  3. Keep content SFW (or mark NSFW appropriately)
  4. No harassment, hate speech, or discrimination
  5. Use the correct channels
  6. Follow Discord ToS
  7. Have fun and share your dreams!

### Step 3: User clicks ✅ verify button (in DM or in #rules)
- Gets `Member` role
- Loses `Unverified` role
- Gets access to all member channels
- Receives welcome message with next steps

### Step 4: User picks roles in #roles
- Reacts to get notification roles
- Can be done anytime

---

## Bot Commands (prefix: `!`)

| Command | Description | Access |
|---------|-------------|--------|
| `!verify` | Manually verify a user | Mod+ |
| `!kick @user [reason]` | Kick a user | Mod+ |
| `!ban @user [reason]` | Ban a user | Mod+ |
| `!mute @user [duration]` | Mute a user | Mod+ |
| `!warn @user [reason]` | Warn a user | Mod+ |
| `!clear [amount]` | Clear messages | Mod+ |
| `!dream [text]` | Log a dream entry | Member+ |
| `!profile` | View your dream profile | Member+ |
| `!help` | Show help | Everyone |

---

## Verification Questions (Premium Touch)

When a user clicks verify, the bot can ask optional questions via DM:

1. **"How did you find Everdream?"**
   - Friend invite
   - Social media
   - App store
   - Search
   - Other: ___

2. **"What brings you here?"** (multi-select reactions)
   - 🌙 Dream journaling
   - 🧘 Sleep improvement
   - 🔮 Lucid dreaming
   - 🎨 Creative inspiration
   - 👥 Community

3. **"Do you keep a dream journal?"**
   - ✅ Yes, regularly
   - 🔄 Sometimes
   - ❌ Not yet, but want to
   - 🤔 What's a dream journal?

These answers are logged (not stored long-term) to help understand the community.

---

## Server Rules (for #rules channel)

```
🌙 **Everdream Server Rules**

1. **Be Respectful** — Treat everyone with kindness. We're all here to explore dreams together.

2. **No Spam or Unsolicited Promos** — Don't flood channels or DM members with promotions. Ask a mod first.

3. **Keep it Safe** — No NSFW content in general channels. Mark sensitive content appropriately.

4. **Zero Tolerance for Hate** — No harassment, hate speech, discrimination, or bullying of any kind.

5. **Use the Right Channels** — Check channel descriptions before posting. Dreams go in #dream-journal, art in #dream-art, etc.

6. **Follow Discord ToS** — https://discord.com/terms

7. **Dream Freely** — This is a space for open-minded exploration. Share, question, and wonder together.

**Violations may result in warnings, mutes, kicks, or bans at moderator discretion.**

By verifying, you agree to these rules. Welcome to Everdream! 🌙
```
