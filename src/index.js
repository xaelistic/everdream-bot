import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} from 'discord.js';
import { setupServer } from './lib/serverSetup.js';
import { getProfile, getLeaderboard, awardPoints, POINTS } from './lib/gamification.js';
import { createListing, buyListing, cancelListing, confirmTrade, getActiveListings, getUserListings } from './lib/trading.js';
import { rateContent, getContentRating } from './lib/rating.js';
import { registerRemix, getProvenance } from './lib/provenance.js';
import { isValidAddress, getNFTBalance } from './web3/index.js';
import db from './db/database.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

// ── Config ──────────────────────────────────────────────────────────
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  channels: {
    welcome: process.env.WELCOME_CHANNEL_ID,
    rules: process.env.RULES_CHANNEL_ID,
    general: process.env.GENERAL_CHANNEL_ID,
    dreamJournal: process.env.DREAM_JOURNAL_CHANNEL_ID,
    announcements: process.env.ANNOUNCEMENTS_CHANNEL_ID,
    botLog: process.env.BOT_LOG_CHANNEL_ID,
    trading: process.env.TRADING_CHANNEL_ID,
    leaderboard: process.env.LEADERBOARD_CHANNEL_ID,
  },
  roles: {
    member: process.env.MEMBER_ROLE_ID,
    unverified: process.env.UNVERIFIED_ROLE_ID,
    creator: process.env.CREATOR_ROLE_ID,
    collector: process.env.COLLECTOR_ROLE_ID,
  },
  verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT_SECONDS || '0', 10),
  nftContract: process.env.NFT_CONTRACT_ADDRESS,
};

// Store setup results
let setupData = { roleMap: {}, channelMap: {} };

// ── Utility: log to bot-log channel ─────────────────────────────────
async function log(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  try {
    const channel = await client.channels.fetch(config.channels.botLog);
    if (channel) {
      const colors = { info: 0x6d8b74, warn: 0xf59e0b, error: 0xef4444, success: 0x22c55e };
      const embed = new EmbedBuilder()
        .setColor(colors[type] || colors.info)
        .setDescription(message)
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    }
  } catch { /* channel not configured */ }
}

// ── Bot ready ───────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`Everdream Bot v2 online as ${client.user.tag}`);
  log(`Bot started — ${client.user.tag} is online`, 'success');
  client.user.setActivity('dreams unfold...', { type: 3 });
});

// ── Slash + prefix command handler ──────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleCommand(interaction.commandName, interaction);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  await handleCommand(command, message, args);
});

// ── Command Router ──────────────────────────────────────────────────
async function handleCommand(command, ctx, args = []) {
  const reply = (content, ephemeral = false) => {
    if (ctx.reply) return ctx.reply({ content, ephemeral });
  };
  const replyEmbed = (embed, ephemeral = false) => {
    if (ctx.reply) return ctx.reply({ embeds: [embed], ephemeral });
    if (ctx.channel) return ctx.channel.send({ embeds: [embed] });
  };
  const defer = async () => {
    if (ctx.deferReply) await ctx.deferReply({ ephemeral: true });
  };
  const user = ctx.user || ctx.author;
  const guild = ctx.guild;

  try {
    switch (command) {
      // ── Server Setup ──────────────────────────────────────────
      case 'setup-server':
      case 'setup': {
        if (!ctx.member?.permissions?.has('Administrator')) {
          return reply('You need Administrator permission to run this command.', true);
        }
        await defer();
        log(`${user.tag} initiated server setup`);
        const { results, roleMap, channelMap } = await setupServer(guild, log);
        setupData = { roleMap, channelMap };

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('🌙 Everdream Server Setup Complete')
          .setDescription(
            `**Roles created:** ${results.roles.length}\n` +
            `**Categories created:** ${results.categories.length}\n` +
            `**Channels created:** ${results.channels.length}\n` +
            (results.errors.length > 0 ? `\n**Errors:**\n${results.errors.map(e => `• ${e}`).join('\n')}` : '')
          );
        await ctx.editReply?.({ embeds: [embed] }) || replyEmbed(embed);
        break;
      }

      // ── Wallet Linking ────────────────────────────────────────
      case 'link': {
        const wallet = args[0];
        if (!wallet) return reply('Usage: `!link <ethereum_address>`', true);
        if (!isValidAddress(wallet)) return reply('Invalid Ethereum address.', true);

        // Store wallet link
        db.prepare('INSERT OR REPLACE INTO wallets (discord_id, eth_address) VALUES (?, ?)')
          .run(user.id, wallet.toLowerCase());

        // Check NFT balance for role assignment
        if (config.nftContract && config.nftContract !== '0x') {
          const balance = await getNFTBalance(wallet, config.nftContract);
          if (balance > 0) {
            const member = await guild.members.fetch(user.id);
            if (config.roles.collector) await member.roles.add(config.roles.collector).catch(() => {});
            if (config.roles.member) await member.roles.add(config.roles.member).catch(() => {});
            awardPoints(user.id, user.username, 'VERIFY', 'Wallet linked with NFTs');

            const embed = new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle('✅ Wallet Linked')
              .setDescription(
                `Wallet \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\` linked!\n` +
                `**NFTs found:** ${balance}\n` +
                `You've been given the **Collector** and **Member** roles.`
              );
            return replyEmbed(embed);
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('✅ Wallet Linked')
          .setDescription(`Wallet \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\` linked to your account.`);
        replyEmbed(embed);
        break;
      }

      // ── Upload Content ─────────────────────────────────────────
      case 'upload': {
        const [contentId, title, ...descParts] = args;
        if (!contentId || !title) return reply('Usage: `!upload <content_id> <title> [description]`', true);

        const existing = db.prepare('SELECT * FROM content WHERE content_id = ?').get(contentId);
        if (existing) return reply('Content ID already exists.', true);

        db.prepare('INSERT INTO content (content_id, creator_discord_id, title, description) VALUES (?, ?, ?, ?)')
          .run(contentId, user.id, title, descParts.join(' ') || null);

        awardPoints(user.id, user.username, 'UPLOAD', `Uploaded ${contentId}`);
        db.prepare('UPDATE users SET uploads = uploads + 1 WHERE discord_id = ?').run(user.id);

        // Auto-assign Creator role
        const member = await guild.members.fetch(user.id);
        if (config.roles.creator) await member.roles.add(config.roles.creator).catch(() => {});

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('🎨 Content Uploaded')
          .setDescription(`**${title}** (\`${contentId}\`) has been registered.\nYou earned ${POINTS.UPLOAD} points!`);
        replyEmbed(embed);
        break;
      }

      // ── Rate Content ──────────────────────────────────────────
      case 'rate': {
        const [contentId, scoreStr] = args;
        const score = parseInt(scoreStr, 10);
        if (!contentId || isNaN(score)) return reply('Usage: `!rate <content_id> <1-5>`', true);

        const result = rateContent(contentId, user.id, score);
        if (result.error) return reply(result.error, true);

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle('⭐ Rating Submitted')
          .setDescription(
            `You rated \`${contentId}\` **${score}/5**\n` +
            `New average: **${result.newAverage}/5** (${result.totalRatings} ratings)\n` +
            `You earned ${POINTS.RATING_GIVEN} points!`
          );
        replyEmbed(embed);
        break;
      }

      // ── List for Sale ──────────────────────────────────────────
      case 'list': {
        const [contentId, priceStr] = args;
        const price = parseFloat(priceStr);
        if (!contentId || isNaN(price)) return reply('Usage: `!list <content_id> <price_in_eth>`', true);

        const result = createListing(contentId, user.id, price);
        if (result.error) return reply(result.error, true);

        const embed = new EmbedBuilder()
          .setColor(0x06b6d4)
          .setTitle('📋 Listing Created')
          .setDescription(
            `**Listing #${result.listing.id}**\n` +
            `Content: \`${contentId}\`\n` +
            `Price: **${price} ETH**\n\n` +
            `Buyers can use \`!buy ${result.listing.id}\` to purchase.`
          );
        replyEmbed(embed);
        break;
      }

      // ── Buy ────────────────────────────────────────────────────
      case 'buy': {
        const [listingIdStr] = args;
        const listingId = parseInt(listingIdStr, 10);
        if (isNaN(listingId)) return reply('Usage: `!buy <listing_id>`', true);

        const result = buyListing(listingId, user.id);
        if (result.error) return reply(result.error, true);

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('💰 Purchase Initiated')
          .setDescription(
            `**Listing #${listingId}**\n` +
            `Price: **${result.listing.price_eth} ETH**\n\n` +
            `⚠️ This bot tracks listings but does NOT handle on-chain transactions.\n` +
            `Complete the trade on the Everdream platform, then the seller confirms with \`!confirm ${listing_id} <tx_hash>\`.`
          );
        replyEmbed(embed);
        break;
      }

      // ── Confirm Trade ──────────────────────────────────────────
      case 'confirm': {
        const [listingIdStr, txHash] = args;
        const listingId = parseInt(listingIdStr, 10);
        if (isNaN(listingId) || !txHash) return reply('Usage: `!confirm <listing_id> <tx_hash>`', true);

        // Only seller can confirm
        const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
        if (!listing) return reply('Listing not found.', true);
        if (listing.seller_discord_id !== user.id) return reply('Only the seller can confirm a trade.', true);

        const result = confirmTrade(listingId, txHash);
        if (result.error) return reply(result.error, true);

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ Trade Confirmed')
          .setDescription(
            `**Listing #${listingId}** marked as sold.\n` +
            `TX: \`${txHash.slice(0, 10)}...${txHash.slice(-8)}\`\n` +
            `Both parties earned ${POINTS.TRADE_COMPLETED} points!`
          );
        replyEmbed(embed);
        break;
      }

      // ── Cancel Listing ─────────────────────────────────────────
      case 'cancel': {
        const [listingIdStr] = args;
        const listingId = parseInt(listingIdStr, 10);
        if (isNaN(listingId)) return reply('Usage: `!cancel <listing_id>`', true);

        const result = cancelListing(listingId, user.id);
        if (result.error) return reply(result.error, true);

        const embed = new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle('❌ Listing Cancelled')
          .setDescription(`Listing #${listingId} has been cancelled.`);
        replyEmbed(embed);
        break;
      }

      // ── Listings ───────────────────────────────────────────────
      case 'listings': {
        const listings = getActiveListings(10);
        if (listings.length === 0) return reply('No active listings right now.', true);

        const embed = new EmbedBuilder()
          .setColor(0x06b6d4)
          .setTitle('📋 Active Listings')
          .setDescription(
            listings.map(l =>
              `**#${l.id}** — ${l.title || l.content_id} — **${l.price_eth} ETH** — by <@${l.seller_discord_id}>`
            ).join('\n')
          );
        replyEmbed(embed);
        break;
      }

      // ── Remix ──────────────────────────────────────────────────
      case 'remix': {
        const [derivativeId, originalId] = args;
        if (!derivativeId || !originalId) return reply('Usage: `!remix <new_content_id> <original_content_id>`', true);

        const result = registerRemix(derivativeId, originalId, user.id);
        if (result.error) return reply(result.error, true);

        awardPoints(user.id, user.username, 'REMIX_CREATED', `Remixed ${originalId}`);

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('🎨 Remix Registered')
          .setDescription(
            `**${derivativeId}** is a remix of **${originalId}**\n` +
            `Original creator: <@${result.originalCreator}>\n` +
            `You earned ${POINTS.REMIX_CREATED} points!`
          );
        replyEmbed(embed);
        break;
      }

      // ── Provenance ─────────────────────────────────────────────
      case 'provenance': {
        const [contentId] = args;
        if (!contentId) return reply('Usage: `!provenance <content_id>`', true);

        const chain = getProvenance(contentId);
        if (chain.length === 0) return reply('Content not found.', true);

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('🔗 Provenance Chain')
          .setDescription(
            chain.map((c, i) =>
              `${i === '0' ? '🌱' : '↳'} **${c.title || c.contentId}** by <@${c.creator}> ${c.isOriginal ? '(Original)' : ''}`
            ).join('\n')
          );
        replyEmbed(embed);
        break;
      }

      // ── Profile ────────────────────────────────────────────────
      case 'profile': {
        const profile = getProfile(user.id, user.username);
        const embed = new EmbedBuilder()
          .setColor(0x6d8b74)
          .setTitle(`🌙 ${user.username}'s Dream Profile`)
          .setDescription(
            `**Level ${profile.level}** — ${profile.title}\n` +
            `**Points:** ${profile.points}${profile.nextLevel ? ` (next level: ${profile.nextLevel})` : ' (MAX)'}\n\n` +
            `📤 Uploads: ${profile.uploads}\n` +
            `⭐ Ratings received: ${profile.ratings_received}\n` +
            `💰 Trades: ${profile.trades_completed}\n` +
            `🎨 Remixes: ${profile.remixes}`
          )
          .setThumbnail(user.displayAvatarURL());
        replyEmbed(embed);
        break;
      }

      // ── Leaderboard ────────────────────────────────────────────
      case 'leaderboard': {
        const lb = getLeaderboard(10);
        if (lb.length === 0) return reply('No users on the leaderboard yet.', true);

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle('🏆 Everdream Leaderboard')
          .setDescription(
            lb.map((u, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
              return `${medal} <@${u.discord_id}> — **${u.points} pts** (${u.uploads} uploads, ${u.trades_completed} trades)`;
            }).join('\n')
          );
        replyEmbed(embed);
        break;
      }

      // ── Verify ─────────────────────────────────────────────────
      case 'verify': {
        const member = await guild.members.fetch(user.id);
        if (config.roles.member) await member.roles.add(config.roles.member).catch(() => {});
        if (config.roles.unverified) await member.roles.remove(config.roles.unverified).catch(() => {});
        awardPoints(user.id, user.username, 'VERIFY', 'Manual verify');

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ Verified!')
          .setDescription(`Welcome to Everdream, ${user}! You now have access to all member channels.`);
        replyEmbed(embed);
        break;
      }

      // ── Help ───────────────────────────────────────────────────
      case 'help': {
        const embed = new EmbedBuilder()
          .setColor(0x6d8b74)
          .setTitle('🌙 Everdream Bot Commands')
          .setDescription(
            '**Server Setup:**\n' +
            '`!setup-server` — Create entire server structure (Admin only)\n\n' +
            '**Wallet & Identity:**\n' +
            '`!link <address>` — Link Ethereum wallet\n' +
            '`!verify` — Verify and get Member role\n\n' +
            '**Content:**\n' +
            '`!upload <id> <title> [desc]` — Register content\n' +
            '`!rate <content_id> <1-5>` — Rate content\n' +
            '`!remix <new_id> <original_id>` — Register a remix\n' +
            '`!provenance <content_id>` — View provenance chain\n\n' +
            '**Trading:**\n' +
            '`!list <content_id> <price_eth>` — List for sale\n' +
            '`!buy <listing_id>` — Buy a listing\n' +
            '`!confirm <listing_id> <tx_hash>` — Confirm trade (seller)\n' +
            '`!cancel <listing_id>` — Cancel your listing\n' +
            '`!listings` — View active listings\n\n' +
            '**Community:**\n' +
            '`!profile` — View your profile\n' +
            '`!leaderboard` — Top members\n' +
            '`!help` — This message'
          );
        replyEmbed(embed, true);
        break;
      }

      default:
        // Unknown command — ignore silently
        break;
    }
  } catch (err) {
    console.error(`Command error (${command}):`, err);
    log(`Command error (${command}): ${err.message}`, 'error');
    reply('An error occurred. Check bot logs.', true);
  }
}

// ── Reaction Roles ──────────────────────────────────────────────────
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  try {
    const msg = reaction.partial ? await reaction.message.fetch() : reaction.message;
    // Check if this is the roles message (by channel + bot message)
    if (reaction.message.author?.id !== client.user.id) return;
    if (!reaction.message.embeds[0]?.title?.includes('Choose Your Roles')) return;

    const roleNames = ['Dream Journaler', 'Announcements', 'Artist', 'Gamer', 'Bookworm', 'Mindfulness', 'Sleep Science', 'Premium'];
    const emojis = ['🌙', '📢', '🎨', '🎮', '📚', '🧘', '🔬', '💎'];
    const idx = emojis.indexOf(reaction.emoji.name);
    if (idx === -1) return;

    const guild = msg.guild;
    const role = guild.roles.cache.find(r => r.name === roleNames[idx]);
    if (!role) return;

    const member = await guild.members.fetch(user.id);
    await member.roles.add(role);
  } catch (err) {
    console.error('Reaction role add error:', err.message);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  try {
    const msg = reaction.partial ? await reaction.message.fetch() : reaction.message;
    if (reaction.message.author?.id !== client.user.id) return;
    if (!reaction.message.embeds[0]?.title?.includes('Choose Your Roles')) return;

    const roleNames = ['Dream Journaler', 'Announcements', 'Artist', 'Gamer', 'Bookworm', 'Mindfulness', 'Sleep Science', 'Premium'];
    const emojis = ['🌙', '📢', '🎨', '🎮', '📚', '🧘', '🔬', '💎'];
    const idx = emojis.indexOf(reaction.emoji.name);
    if (idx === -1) return;

    const guild = msg.guild;
    const role = guild.roles.cache.find(r => r.name === roleNames[idx]);
    if (!role) return;

    const member = await guild.members.fetch(user.id);
    await member.roles.remove(role);
  } catch (err) {
    console.error('Reaction role remove error:', err.message);
  }
});

// ── New member onboarding ──────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== config.guildId) return;
  log(`${member.user.tag} joined the server`, 'info');

  if (config.roles.unverified) {
    try { await member.roles.add(config.roles.unverified); } catch {}
  }

  // Welcome DM
  try {
    const embed = new EmbedBuilder()
      .setColor(0x6d8b74)
      .setTitle('Welcome to Everdream 🌙')
      .setDescription(
        `Hey ${member.user.username}!\n\n` +
        `Welcome to the Everdream community.\n\n` +
        `**To get started:**\n` +
        `1. Read the rules channel\n` +
        `2. Use \`!verify\` to get the Member role\n` +
        `3. Link your wallet with \`!link <address>\`\n` +
        `4. Pick roles in the roles channel\n\n` +
        `Sweet dreams! 💤`
      );
    await member.send({ embeds: [embed] });
  } catch {}
});

// ── Error handling ──────────────────────────────────────────────────
client.on('error', (err) => log(`Client error: ${err.message}`, 'error'));
process.on('unhandledRejection', (err) => log(`Unhandled: ${err.message}`, 'error'));

// ── Start ───────────────────────────────────────────────────────────
client.login(config.token);
