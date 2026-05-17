# Everdream Bot — Deploy Guide

## Prerequisites

1. **Discord Bot Application**
   - Go to https://discord.com/developers/applications
   - Create a new application → "Everdream Bot"
   - Go to "Bot" section → Create a bot
   - Copy the **Bot Token**
   - Go to "OAuth2" → Copy **Client ID** and **Client Secret**
   - Under "Bot Permissions", enable:
     - Manage Roles
     - Manage Channels
     - Send Messages
     - Read Messages/View Channels
     - Embed Links
     - Add Reactions
     - Kick Members
     - Ban Members
     - Moderate Members (timeout)
   - **Privileged Gateway Intents** (Bot section):
     - ✅ SERVER MEMBERS INTENT
     - ✅ MESSAGE CONTENT INTENT
     - ✅ PRESENCE INTENT
   - Use the OAuth2 URL generator to invite the bot to your server

2. **Enable Developer Mode in Discord**
   - User Settings → Advanced → Developer Mode ON
   - This lets you right-click to copy channel/role/user IDs

---

## Option A: Local / WSL Development

```bash
cd ~/Documents/GitHub/EDI/everdream-bot
cp .env.example .env
# Edit .env with your Discord credentials
npm install
npm run dev    # auto-reloads on file changes
```

---

## Option B: Docker (for Coolify / self-hosted)

### Dockerfile

Create a `Dockerfile` at the project root:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p /app/data
VOLUME /app/data
CMD ["node", "src/index.js"]
```

### docker-compose.yml (for Coolify)

Create `docker-compose.yml` at the project root:

```yaml
services:
  everdream-bot:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - CLIENT_ID=${CLIENT_ID}
      - GUILD_ID=${GUILD_ID}
      - WELCOME_CHANNEL_ID=${WELCOME_CHANNEL_ID}
      - RULES_CHANNEL_ID=${RULES_CHANNEL_ID}
      - GENERAL_CHANNEL_ID=${GENERAL_CHANNEL_ID}
      - DREAM_JOURNAL_CHANNEL_ID=${DREAM_JOURNAL_CHANNEL_ID}
      - ANNOUNCEMENTS_CHANNEL_ID=${ANNOUNCEMENTS_CHANNEL_ID}
      - BOT_LOG_CHANNEL_ID=${BOT_LOG_CHANNEL_ID}
      - TRADING_CHANNEL_ID=${TRADING_CHANNEL_ID}
      - LEADERBOARD_CHANNEL_ID=${LEADERBOARD_CHANNEL_ID}
      - INTRODUCTIONS_CHANNEL_ID=${INTRODUCTIONS_CHANNEL_ID}
      - MEMBER_ROLE_ID=${MEMBER_ROLE_ID}
      - UNVERIFIED_ROLE_ID=${UNVERIFIED_ROLE_ID}
      - MUTED_ROLE_ID=${MUTED_ROLE_ID}
      - CREATOR_ROLE_ID=${CREATOR_ROLE_ID}
      - COLLECTOR_ROLE_ID=${COLLECTOR_ROLE_ID}
      - MODERATOR_ROLE_ID=${MODERATOR_ROLE_ID}
      - ADMIN_ROLE_ID=${ADMIN_ROLE_ID}
      - ETH_RPC_URL=${ETH_RPC_URL}
      - NFT_CONTRACT_ADDRESS=${NFT_CONTRACT_ADDRESS}
      - CHAIN_ID=${CHAIN_ID}
      - VERIFICATION_TIMEOUT_SECONDS=${VERIFICATION_TIMEOUT_SECONDS:-0}
      - DB_PATH=/app/data/everdream.db
    volumes:
      - everdream-data:/app/data

volumes:
  everdream-data:
```

### Coolify Deployment

1. In Coolify, create a new service from your GitHub repo
2. Set the build type to "Docker Compose"
3. Add ALL environment variables from above in Coolify's UI
   - **Do NOT use `env_file:`** — Coolify doesn't support it
   - **Do NOT put secrets in the compose file** — use Coolify's UI
4. Deploy

### Important Coolify Notes

- **No `env_file:`** — Coolify doesn't support it. All env vars must be inlined or set in the UI.
- **No `networks:` blocks** — Coolify manages its own networks.
- **No subdirectory Dockerfiles** — Keep Dockerfile at repo root with `context: .`.
- **No secrets in compose** — GitHub Push Protection will block commits with tokens. Add secrets in Coolify's UI instead.
- **No `networks:` in compose** — omit entirely.

---

## Option C: Deploy YAGPDB Fork (Full-featured alternative)

If you want auto-mod, custom commands, feeds, and a web panel alongside the Everdream bot:

```bash
git clone https://github.com/xaelistic/yagpdb.git
cd yagpdb
cp yagpdb_docker/app.env.example yagpdb_docker/app.env
cp yagpdb_docker/db.env.example yagpdb_docker/db.env
# Edit env files with credentials
docker compose -f yagpdb_docker/docker-compose.yml up -d --build
```

Access web panel at `http://your-server:80`

---

## Post-Setup Checklist

- [ ] Bot is online and shows "dreams unfold..."
- [ ] Welcome DM sends when new users join (with verify button)
- [ ] Verify button works → assigns Member role, removes Unverified
- [ ] Onboarding modal appears after verify
- [ ] Reaction roles work in #roles channel
- [ ] `!dream` command logs to #dream-journal
- [ ] Message delete/edit logs appear in #bot-log
- [ ] Join/leave logs appear in #bot-log
- [ ] Moderation commands work (!warn, !mute, !kick, !ban, !clear)
- [ ] Token gate commands work (!gate-add, !gate-remove, !check-gates)
- [ ] Trading commands work (!list, !buy, !confirm, !cancel)
- [ ] Gamification points award correctly
