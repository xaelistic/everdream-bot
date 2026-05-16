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
     - Kick Members (optional)
     - Ban Members (optional)
     - Moderate Members (timeout)
   - Use the OAuth2 URL generator to invite the bot to your server

2. **Enable Developer Mode in Discord**
   - User Settings → Advanced → Developer Mode ON
   - This lets you right-click to copy channel/role/user IDs

3. **Get IDs**
   - Server ID: Right-click server icon → Copy ID
   - Channel IDs: Right-click each channel → Copy ID
   - Role IDs: Server Settings → Roles → right-click role → Copy ID

---

## Option A: Deploy YAGPDB Fork (Full-featured)

### Requirements
- Docker and Docker Compose installed
- A server (VPS, Raspberry Pi, or cloud)

### Steps

1. **Clone the fork**
   ```bash
   git clone https://github.com/xaelistic/yagpdb.git
   cd yagpdb
   ```

2. **Configure environment**
   ```bash
   cp yagpdb_docker/app.env.example yagpdb_docker/app.env
   cp yagpdb_docker/db.env.example yagpdb_docker/db.env
   ```

3. **Edit `yagpdb_docker/app.env`** with your Discord credentials

4. **Edit `yagpdb_docker/db.env`** with a strong password

5. **Build and run**
   ```bash
   docker compose -f yagpdb_docker/docker-compose.yml up -d --build
   ```

6. **Initialize the database**
   ```bash
   docker compose -f yagpdb_docker/docker-compose.yml exec db psql -U yagpdb -c "CREATE DATABASE yagpdb;"
   ```

7. **Access the web panel**
   - Open `http://your-server-ip:80`
   - Log in with your Discord account
   - Configure auto-mod, reaction roles, custom commands, etc.

### Free Hosting Options
- **Railway** (railway.app) — Free tier with PostgreSQL
- **Render** (render.com) — Free tier available
- **Oracle Cloud** — Always-free VPS
- **Hetzner** — Cheap VPS (~€3/mo)

---

## Option B: Deploy Everdream Node.js Bot (Lightweight)

### Requirements
- Node.js 20+
- A server or free hosting

### Steps

1. **Clone the bot**
   ```bash
   git clone https://github.com/xaelistic/everdream-bot.git
   cd everdream-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord credentials and channel/role IDs
   ```

4. **Run**
   ```bash
   npm start
   ```

### Free Hosting (Node.js)
- **Railway** — Connect GitHub repo, auto-deploys
- **Render** — Free web service
- **Fly.io** — Free tier
- **Replit** — Free with always-on hack

---

## Recommended: Use Both

- **YAGPDB** handles: auto-mod, logging, custom commands, reaction roles, feeds
- **Everdream Bot** handles: welcome DMs, verification flow, onboarding questions

They can run simultaneously on the same server without conflicts.

---

## Post-Setup Checklist

- [ ] Bot is online and shows "Watching dreams unfold..."
- [ ] Welcome DM sends when new users join
- [ ] Verification button works
- [ ] Member role is assigned on verify
- [ ] Unverified role is removed on verify
- [ ] Reaction roles work in #roles channel
- [ ] Message delete/edit logs appear in #bot-log
- [ ] Auto-mod is configured in YAGPDB web panel
- [ ] Custom commands are set up (!dream, !profile, etc.)
