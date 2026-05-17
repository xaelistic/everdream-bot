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
  PermissionFlagsBits,
} from 'discord.js';
import { setupServer } from './lib/serverSetup.js';
import { getProfile, getLeaderboard, awardPoints, POINTS } from './lib/gamification.js';
import { createListing, buyListing, cancelListing, confirmTrade, getActiveListings, getUserListings } from './lib/trading.js';
import { rateContent, getContentRating } from './lib/rating.js';
import { registerRemix, getProvenance } from './lib/provenance.js';
import { isValidAddress, getNFTBalance } from './web3/index.js';
import { recordDreamEntry, calculateStreak, getDailyPrompt, getRandomPrompt, getMoodStats, getWeeklySummary, searchDreams, getDreamStats } from './lib/dreamJournal.js';
import db from './db/database.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
    Partials.DMChannel,
  ],
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
    introductions: process.env.INTRODUCTIONS_CHANNEL_ID,
  },
  roles: {
    member: process.env.MEMBER_ROLE_ID,
    unverified: process.env.UNVERIFIED_ROLE_ID,
    creator: process.env.CREATOR_ROLE_ID,
    collector: process.env.COLLECTOR_ROLE_ID,
    muted: process.env.MUTED_ROLE_ID,
    moderator: process.env.MODERATOR_ROLE_ID,
    admin: process.env.ADMIN_ROLE_ID,
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

// ── Helper: check if user has mod+ permissions ──────────────────────
function isMod(member) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.KickMembers) ||
         member.permissions.has(PermissionFlagsBits.BanMembers) ||
         member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
         member.permissions.has(PermissionFlagsBits.Administrator);
}

function isAdmin(member) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

// ── Bot ready ───────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`Everdream Bot v2 online as ${client.user.tag}`);
  log(`Bot started — ${client.user.tag} is online`, 'success');
  client.user.setActivity('dreams unfold...', { type: 3 });
});

// ── Slash + prefix command handler ──────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    await handleModal(interaction);
    return;
  }
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction.commandName, interaction);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  await handleCommand(command, message, args);
});

// ── Button Handler ──────────────────────────────────────────────────
async function handleButton(interaction) {
  const { customId } = interaction;

  // Verification button
  if (customId === 'verify_button') {
    const member = interaction.member;
    try {
      if (config.roles.member) await member.roles.add(config.roles.member).catch(() => {});
      if (config.roles.unverified) await member.roles.remove(config.roles.unverified).catch(() => {});
      awardPoints(member.id, member.user.username, 'VERIFY', 'Verified via button');

      // Show onboarding modal
      const modal = new ModalBuilder()
        .setCustomId('onboarding_modal')
        .setTitle('Welcome to Everdream 🌙');

      const howFound = new TextInputBuilder()
        .setCustomId('how_found')
        .setLabel('How did you find Everdream?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Friend / Social media / App store / Search / Other')
        .setRequired(true);

      const interests = new TextInputBuilder()
        .setCustomId('interests')
        .setLabel('What brings you here?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Dream journaling / Sleep improvement / Lucid dreaming / Creative inspiration / Community')
        .setRequired(true);

      const journalStatus = new TextInputBuilder()
        .setCustomId('journal_status')
        .setLabel('Do you keep a dream journal?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Yes regularly / Sometimes / Not yet / What is that?')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(howFound),
        new ActionRowBuilder().addComponents(interests),
        new ActionRowBuilder().addComponents(journalStatus),
      );

      await interaction.showModal(modal);
    } catch (err) {
      console.error('Verify button error:', err);
      await interaction.reply({ content: 'Something went wrong. Try `!verify` instead.', ephemeral: true }).catch(() => {});
    }
    return;
  }
}

// ── Modal Handler ───────────────────────────────────────────────────
async function handleModal(interaction) {
  const { customId } = interaction;

  if (customId === 'onboarding_modal') {
    const howFound = interaction.fields.getTextInputValue('how_found');
    const interests = interaction.fields.getTextInputValue('interests');
    const journalStatus = interaction.fields.getTextInputValue('journal_status');

    // Log onboarding responses
    const summary = `**New member onboarding:** <@${interaction.user.id}>\n` +
      `**How found:** ${howFound}\n` +
      `**Interests:** ${interests}\n` +
      `**Journal:** ${journalStatus}`;
    log(summary, 'info');

    // Award intro points
    awardPoints(interaction.user.id, interaction.user.username, 'VERIFY', 'Completed onboarding');

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('✅ Welcome to Everdream!')
      .setDescription(
        `You're all set, ${interaction.user}!\n\n` +
        `**Next steps:**\n` +
        `• Pick roles in <#${config.channels.roles || 'roles'}>\n` +
        `• Introduce yourself in <#${config.channels.introductions || 'introductions'}>\n` +
        `• Share your first dream in <#${config.channels.dreamJournal || 'dream-journal'}>\n\n` +
        `Sweet dreams! 🌙`
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
}

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
  const member = ctx.member;

  try {
    switch (command) {
      // ── Server Setup ──────────────────────────────────────────
      case 'setup-server':
      case 'setup': {
        if (!isAdmin(member)) {
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

        db.prepare('INSERT OR REPLACE INTO wallets (discord_id, eth_address) VALUES (?, ?)')
          .run(user.id, wallet.toLowerCase());

        if (config.nftContract && config.nftContract !== '0x') {
          const balance = await getNFTBalance(wallet, config.nftContract);
          if (balance > 0) {
            const targetMember = await guild.members.fetch(user.id);
            if (config.roles.collector) await targetMember.roles.add(config.roles.collector).catch(() => {});
            if (config.roles.member) await targetMember.roles.add(config.roles.member).catch(() => {});
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

        const targetMember = await guild.members.fetch(user.id);
        if (config.roles.creator) await targetMember.roles.add(config.roles.creator).catch(() => {});

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
            `Complete the trade on the Everdream platform, then the seller confirms with \`!confirm ${listingId} <tx_hash>\`.`
          );
        replyEmbed(embed);
        break;
      }

      // ── Confirm Trade ──────────────────────────────────────────
      case 'confirm': {
        const [listingIdStr, txHash] = args;
        const listingId = parseInt(listingIdStr, 10);
        if (isNaN(listingId) || !txHash) return reply('Usage: `!confirm <listing_id> <tx_hash>`', true);

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
              `${i === 0 ? '🌱' : '↳'} **${c.title || c.contentId}** by <@${c.creator}> ${c.isOriginal ? '(Original)' : ''}`
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
        const targetMember = await guild.members.fetch(user.id);
        if (config.roles.member) await targetMember.roles.add(config.roles.member).catch(() => {});
        if (config.roles.unverified) await targetMember.roles.remove(config.roles.unverified).catch(() => {});
        awardPoints(user.id, user.username, 'VERIFY', 'Manual verify');

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ Verified!')
          .setDescription(`Welcome to Everdream, ${user}! You now have access to all member channels.`);
        replyEmbed(embed);
        break;
      }

      // ── Dream Journal ──────────────────────────────────────────
      case 'dream': {
        const dreamText = args.join(' ');
        if (!dreamText) return reply('Usage: `!dream <your dream text>` — Log a dream to the journal.', true);

        // Check if member role
        const dreamMember = await guild.members.fetch(user.id);
        if (config.roles.member && !dreamMember.roles.cache.has(config.roles.member)) {
          return reply('You need to verify first! Use `!verify` to get the Member role.', true);
        }

        // Record the dream entry
        const result = recordDreamEntry(user.id, user.username, dreamText);

        // Log to dream-journal channel
        const journalChannel = config.channels.dreamJournal
          ? await guild.channels.fetch(config.channels.dreamJournal).catch(() => null)
          : null;

        const dreamEmbed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle('🌙 Dream Entry')
          .setDescription(dreamText.slice(0, 4096))
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setTimestamp();

        if (journalChannel) {
          await journalChannel.send({ embeds: [dreamEmbed] });
        }

        const confirmEmbed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle('🌙 Dream Logged')
          .setDescription(
            `Your dream has been recorded!\n\n` +
            `**Streak:** ${result.streak.current} day${result.streak.current !== 1 ? 's' : ''} 🔥\n` +
            `**Points:** +${result.pointsEarned} (${result.totalPoints} total)\n` +
            (result.leveledUp ? `\n🎉 **Level Up!** You're now **Level ${result.level} — ${result.title}**!` : '')
          );
        replyEmbed(confirmEmbed, true);
        break;
      }

      // ── Dream Streak ─────────────────────────────────────────────
      case 'streak': {
        const streak = calculateStreak(user.id);
        const stats = getDreamStats(user.id);

        const embed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle('🔥 Dream Streak')
          .setDescription(
            `**Current Streak:** ${streak.current} day${streak.current !== 1 ? 's' : ''}\n` +
            `**Longest Streak:** ${streak.longest} day${streak.longest !== 1 ? 's' : ''}\n` +
            `**Total Dreams:** ${stats.totalDreams}\n` +
            `**This Month:** ${stats.thisMonth}\n` +
            (stats.moodsTracked.length > 0 ? `**Moods Tracked:** ${stats.moodsTracked.join(', ')}` : '')
          );
        replyEmbed(embed);
        break;
      }

      // ── Dream Prompt ─────────────────────────────────────────────
      case 'prompt': {
        const prompt = args[0] === 'random' ? getRandomPrompt() : getDailyPrompt();
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('💭 Dream Prompt')
          .setDescription(`*${prompt.prompt}*`)
          .setFooter({ text: `Category: ${prompt.category} | Use !prompt random for a random prompt` });
        replyEmbed(embed, true);
        break;
      }

      // ── Dream Search ─────────────────────────────────────────────
      case 'search-dreams': {
        const query = args.join(' ');
        if (!query) return reply('Usage: `!search-dreams <keyword>` — Search your dream journal.', true);

        const results = searchDreams(user.id, query);
        if (results.length === 0) return reply('No dreams found matching that query.', true);

        const embed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(`🔍 Dream Search: "${query}"`)
          .setDescription(
            results.slice(0, 5).map(e =>
              `**${e.entry_date}:** ${e.content.slice(0, 100)}${e.content.length > 100 ? '...' : ''}`
            ).join('\n\n')
          )
          .setFooter({ text: `${results.length} result${results.length !== 1 ? 's' : ''} found` });
        replyEmbed(embed, true);
        break;
      }

      // ── Dream Stats ──────────────────────────────────────────────
      case 'dream-stats': {
        const stats = getDreamStats(user.id);
        const streak = stats.streak;

        const embed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle('📊 Your Dream Stats')
          .setDescription(
            `**Total Dreams:** ${stats.totalDreams}\n` +
            `**This Month:** ${stats.thisMonth}\n` +
            `**Current Streak:** ${streak.current} day${streak.current !== 1 ? 's' : ''}\n` +
            `**Longest Streak:** ${streak.longest} day${streak.longest !== 1 ? 's' : ''}\n` +
            (stats.moodsTracked.length > 0 ? `**Moods:** ${stats.moodsTracked.join(', ')}\n` : '') +
            `\nKeep dreaming! 🌙`
          );
        replyEmbed(embed, true);
        break;
      }

      // ── Dream Mood ───────────────────────────────────────────────
      case 'mood': {
        const mood = args.join(' ');
        if (!mood) {
          const moodStats = getMoodStats(user.id);
          if (moodStats.length === 0) return reply('No mood data yet. Use `!mood <mood>` to tag your dreams.', true);

          const embed = new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle('🎭 Your Dream Moods (Last 30 Days)')
            .setDescription(
              moodStats.map(m => `**${m.mood}:** ${m.count} dream${m.count !== 1 ? 's' : ''}`).join('\n')
            );
          return replyEmbed(embed, true);
        }

        // Tag the most recent dream with a mood
        const latestDream = db.prepare(
          'SELECT * FROM dream_entries WHERE discord_id = ? ORDER BY id DESC LIMIT 1'
        ).get(user.id);

        if (!latestDream) return reply('No dreams logged yet. Use `!dream <text>` first.', true);

        db.prepare('UPDATE dream_entries SET mood = ? WHERE id = ?').run(mood, latestDream.id);
        return reply(`Mood "${mood}" tagged on your latest dream entry.`, true);
      }

      // ── Weekly Summary ───────────────────────────────────────────
      case 'weekly': {
        const summary = getWeeklySummary(user.id);
        if (!summary) return reply('No dreams logged this week. Start dreaming! 🌙', true);

        const embed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle('📅 Weekly Dream Summary')
          .setDescription(
            `**Dreams This Week:** ${summary.totalDreams}\n` +
            `**Active Days:** ${summary.daysActive}/7\n` +
            `**Top Mood:** ${summary.topMood}\n` +
            `**Current Streak:** ${summary.streak.current} day${summary.streak.current !== 1 ? 's' : ''}\n\n` +
            summary.entries.slice(0, 3).map(e =>
              `• **${e.entry_date}:** ${e.content.slice(0, 80)}${e.content.length > 80 ? '...' : ''}`
            ).join('\n')
          );
        replyEmbed(embed, true);
        break;
      }

      // ── Moderation: Kick ───────────────────────────────────────
      case 'kick': {
        if (!isMod(member)) return reply('You need Moderator permissions.', true);
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!targetId) return reply('Usage: `!kick @user [reason]`', true);

        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return reply('User not found.', true);
        if (!target.kickable) return reply('I cannot kick this user (role hierarchy).', true);

        await target.kick(`${user.tag}: ${reason}`);
        logModAction('kick', user, target.user, reason, client, config);
        log(`${user.tag} kicked ${target.user.tag}: ${reason}`, 'warn');

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle('👢 User Kicked')
          .setDescription(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`);
        replyEmbed(embed);
        break;
      }

      // ── Moderation: Ban ────────────────────────────────────────
      case 'ban': {
        if (!isMod(member)) return reply('You need Moderator permissions.', true);
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!targetId) return reply('Usage: `!ban @user [reason]`', true);

        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return reply('User not found.', true);
        if (!target.bannable) return reply('I cannot ban this user (role hierarchy).', true);

        await target.ban({ deleteMessageDays: 1, reason: `${user.tag}: ${reason}` });
        logModAction('ban', user, target.user, reason, client, config);
        log(`${user.tag} banned ${target.user.tag}: ${reason}`, 'warn');

        const embed = new EmbedBuilder()
          .setColor(0xdc2626)
          .setTitle('🔨 User Banned')
          .setDescription(`**${target.user.tag}** has been banned.\n**Reason:** ${reason}`);
        replyEmbed(embed);
        break;
      }

      // ── Moderation: Mute ───────────────────────────────────────
      case 'mute': {
        if (!isMod(member)) return reply('You need Moderator permissions.', true);
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        const durationStr = args[1] || '600';
        const reason = args.slice(2).join(' ') || 'No reason provided';
        if (!targetId) return reply('Usage: `!mute @user [seconds] [reason]`', true);

        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return reply('User not found.', true);

        // Try timeout first (Discord native)
        const durationSec = parseInt(durationStr, 10);
        if (!isNaN(durationSec) && durationSec > 0 && durationSec <= 2419200) {
          await target.timeout(durationSec * 1000, `${user.tag}: ${reason}`);
        } else if (config.roles.muted) {
          // Fallback: assign muted role
          await target.roles.add(config.roles.muted);
        }

        logModAction('mute', user, target.user, reason, client, config);
        log(`${user.tag} muted ${target.user.tag} for ${durationStr}s: ${reason}`, 'warn');

        const embed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle('🔇 User Muted')
          .setDescription(`**${target.user.tag}** has been muted.\n**Duration:** ${durationStr}s\n**Reason:** ${reason}`);
        replyEmbed(embed);
        break;
      }

      // ── Moderation: Warn ───────────────────────────────────────
      case 'warn': {
        if (!isMod(member)) return reply('You need Moderator permissions.', true);
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!targetId) return reply('Usage: `!warn @user [reason]`', true);

        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return reply('User not found.', true);

        logModAction('warn', user, target.user, reason, client, config);
        log(`${user.tag} warned ${target.user.tag}: ${reason}`, 'warn');

        // DM the warned user
        try {
          const warnDm = new EmbedBuilder()
            .setColor(0xfbbf24)
            .setTitle('⚠️ Warning — Everdream')
            .setDescription(`You have been warned by **${user.tag}**.\n**Reason:** ${reason}`);
          await target.send({ embeds: [warnDm] });
        } catch {}

        const embed = new EmbedBuilder()
          .setColor(0xfbbf24)
          .setTitle('⚠️ User Warned')
          .setDescription(`**${target.user.tag}** has been warned.\n**Reason:** ${reason}`);
        replyEmbed(embed);
        break;
      }

      // ── Moderation: Clear/Purge ────────────────────────────────
      case 'clear':
      case 'purge': {
        if (!isMod(member)) return reply('You need Moderator permissions.', true);
        const amount = parseInt(args[0], 10) || 10;
        if (amount < 1 || amount > 100) return reply('Amount must be between 1 and 100.', true);

        const channel = ctx.channel;
        const messages = await channel.messages.fetch({ limit: amount });
        await channel.bulkDelete(messages, true);

        log(`${user.tag} cleared ${messages.size} messages in #${channel.name}`, 'info');

        const embed = new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle('🗑️ Messages Cleared')
          .setDescription(`Deleted **${messages.size}** messages in <#${channel.id}>.`);
        // Send confirmation then delete it after 5s
        const confirmMsg = await channel.send({ embeds: [embed] });
        setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
        break;
      }

      // ── Token Gate Management ──────────────────────────────────
      case 'gate-add': {
        if (!isAdmin(member)) return reply('You need Administrator permission.', true);
        const [roleId, contractAddr, chainIdStr, minBalStr, ...descParts] = args;
        if (!roleId || !contractAddr) return reply('Usage: `!gate-add <role_id> <contract_address> [chain_id] [min_balance] [description]`', true);

        const chainId = parseInt(chainIdStr || '1', 10);
        const minBalance = parseInt(minBalStr || '1', 10);
        const desc = descParts.join(' ') || 'Token-gated role';

        db.prepare('INSERT OR REPLACE INTO token_gates (role_id, contract_address, chain_id, min_balance, description) VALUES (?, ?, ?, ?, ?)')
          .run(roleId.replace(/[<@&>]/g, ''), contractAddr, chainId, minBalance, desc);

        log(`${user.tag} added token gate: role ${roleId} <- ${contractAddr} (chain ${chainId}, min ${minBalance})`, 'info');

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('🔐 Token Gate Added')
          .setDescription(`Role <@&${roleId.replace(/[<@&>]/g, '')}> requires **${minBalance}** NFT(s) from \`${contractAddr.slice(0, 10)}...\`\nChain: ${chainId}`);
        replyEmbed(embed);
        break;
      }

      case 'gate-remove': {
        if (!isAdmin(member)) return reply('You need Administrator permission.', true);
        const [roleId] = args;
        if (!roleId) return reply('Usage: `!gate-remove <role_id>`', true);

        const result = db.prepare('DELETE FROM token_gates WHERE role_id = ?').run(roleId.replace(/[<@&>]/g, ''));
        if (result.changes === 0) return reply('No token gate found for that role.', true);

        log(`${user.tag} removed token gate for role ${roleId}`, 'info');

        const embed = new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle('🔓 Token Gate Removed')
          .setDescription(`Token gate for <@&${roleId.replace(/[<@&>]/g, '')}> has been removed.`);
        replyEmbed(embed);
        break;
      }

      case 'check-gates': {
        const gates = db.prepare('SELECT * FROM token_gates').all();
        if (gates.length === 0) return reply('No token gates configured.', true);

        const embed = new EmbedBuilder()
          .setColor(0x06b6d4)
          .setTitle('🔐 Active Token Gates')
          .setDescription(
            gates.map(g =>
              `• <@&${g.role_id}> — requires **${g.min_balance}** NFT(s) from \`${g.contract_address.slice(0, 8)}...\` (chain ${g.chain_id})`
            ).join('\n')
          );
        replyEmbed(embed);
        break;
      }

      // ── NFT Minting ─────────────────────────────────────────────
      case 'mint-xael': {
        // Check if user has linked a wallet
        const wallet = db.prepare('SELECT * FROM wallets WHERE discord_id = ?').get(user.id);
        if (!wallet) return reply('You need to link a wallet first! Use `!link <ethereum_address>`', true);

        const [contentId, title, ...descParts] = args;
        if (!contentId || !title) {
          return reply('Usage: `!mint-xael <content_id> <title> [description]`\n\nThis mints your dream as an XAEL NFT on Base chain. You need a linked wallet and the bot must be configured with a contract address.', true);
        }

        // Check if content already minted
        const existingMinted = db.prepare('SELECT * FROM minted_xaels WHERE content_id = ?').get(contentId);
        if (existingMinted) return reply('This content ID has already been minted as an XAEL.', true);

        // Check contracts are configured
        if (!process.env.XAELS_CONTRACT_ADDRESS) {
          return reply('XAELs contract not yet deployed. Coming soon!', true);
        }

        await defer();

        try {
          // Upload metadata to IPFS
          const { uploadMetadataToIPFS } = await import('./ipfs/index.js');
          const pinataJWT = process.env.PINATA_JWT;
          if (!pinataJWT) throw new Error('PINATA_JWT not configured');

          const metadataResult = await uploadMetadataToIPFS({
            name: title,
            description: descParts.join(' ') || `Dream: ${title}`,
            category: 'dream',
            emotion: 'neutral',
            themes: [contentId],
            externalUrl: `https://everdream.app/dream/${contentId}`,
          }, pinataJWT);

          // Mint on-chain
          const { mintXAEL } = await import('./contracts/index.js');
          const result = await mintXAEL(
            wallet.eth_address,
            metadataResult.metadataURI,
            'dream',
            'neutral',
            true,
            500 // 5% royalty
          );

          // Record in DB
          db.prepare('INSERT INTO minted_xaels (content_id, token_id, tx_hash, minter_discord_id, metadata_uri) VALUES (?, ?, ?, ?, ?)')
            .run(contentId, result.tokenId, result.hash, user.id, metadataResult.metadataURI);

          // Award TAOs for minting
          if (process.env.TAOS_CONTRACT_ADDRESS) {
            try {
              const { mintTAOForAction } = await import('./contracts/index.js');
              await mintTAOForAction(wallet.eth_address, 'UPLOAD');
            } catch (taoErr) {
              console.log('TAO mint failed (non-critical):', taoErr.message);
            }
          }

          const embed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle('🌙 XAEL Minted!')
            .setDescription(
              `**${title}** has been minted as an XAEL NFT!\n\n` +
              `**Token ID:** ${result.tokenId}\n` +
              `**TX:** \`${result.hash.slice(0, 10)}...${result.hash.slice(-8)}\`\n` +
              `**Metadata:** ${metadataResult.metadataURI}\n\n` +
              `View on Basescan: https://basescan.org/tx/${result.hash}`
            );
          await ctx.editReply?.({ embeds: [embed] }) || replyEmbed(embed);
          log(`${user.tag} minted XAEL #${result.tokenId} (${contentId}): ${result.hash}`, 'success');
        } catch (mintErr) {
          console.error('Mint error:', mintErr);
          log(`Mint error for ${user.tag}: ${mintErr.message}`, 'error');
          await ctx.editReply?.({ content: `Mint failed: ${mintErr.message}` }) || reply(`Mint failed: ${mintErr.message}`, true);
        }
        break;
      }

      case 'my-nfts': {
        const wallet = db.prepare('SELECT * FROM wallets WHERE discord_id = ?').get(user.id);
        if (!wallet) return reply('You need to link a wallet first! Use `!link <ethereum_address>`', true);

        // Get on-chain balance if contract is configured
        let onChainCount = 0;
        let onChainTokens = [];
        if (process.env.XAELS_CONTRACT_ADDRESS) {
          try {
            const { getXAELBalance, getXAELsOfOwner } = await import('./contracts/index.js');
            onChainCount = await getXAELBalance(wallet.eth_address);
            onChainTokens = await getXAELsOfOwner(wallet.eth_address);
          } catch {}
        }

        // Get locally minted
        const minted = db.prepare('SELECT * FROM minted_xaels WHERE minter_discord_id = ? ORDER BY created_at DESC LIMIT 10').all(user.id);

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('🌙 Your XAELs')
          .setDescription(
            `**Wallet:** \`${wallet.eth_address.slice(0, 6)}...${wallet.eth_address.slice(-4)}\`\n` +
            `**On-chain balance:** ${onChainCount} XAELs\n\n` +
            (minted.length > 0
              ? minted.map(m => `**#${m.token_id}** — \`${m.content_id}\` — ${m.metadata_uri}`).join('\n')
              : 'No XAELs minted yet. Use `!mint-xael <id> <title>` to mint your first!')
          );
        replyEmbed(embed);
        break;
      }

      case 'my-taos': {
        const wallet = db.prepare('SELECT * FROM wallets WHERE discord_id = ?').get(user.id);
        if (!wallet) return reply('You need to link a wallet first! Use `!link <ethereum_address>`', true);

        let balance = "0";
        let remaining = "0";
        if (process.env.TAOS_CONTRACT_ADDRESS) {
          try {
            const { getTAOBalance, getTAORemainingDaily } = await import('./contracts/index.js');
            balance = await getTAOBalance(wallet.eth_address);
            remaining = await getTAORemainingDaily(wallet.eth_address);
          } catch {}
        }

        // Get local points too
        const profile = getProfile(user.id, user.username);

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle('💰 Your TAOs')
          .setDescription(
            `**Wallet:** \`${wallet.eth_address.slice(0, 6)}...${wallet.eth_address.slice(-4)}\`\n` +
            `**On-chain TAOs:** ${balance}\n` +
            `**Daily mint remaining:** ${remaining}\n` +
            `**Local points:** ${profile.points} (Level ${profile.level} — ${profile.title})`
          );
        replyEmbed(embed);
        break;
      }

      case 'nft-stats': {
        let totalXAELs = 0;
        let totalTAOs = "0";
        if (process.env.XAELS_CONTRACT_ADDRESS) {
          try {
            const { getTotalXAELSupply } = await import('./contracts/index.js');
            totalXAELs = await getTotalXAELSupply();
          } catch {}
        }
        if (process.env.TAOS_CONTRACT_ADDRESS) {
          try {
            const { getTotalTAOSupply } = await import('./contracts/index.js');
            totalTAOs = await getTotalTAOSupply();
          } catch {}
        }
        const totalMinted = db.prepare('SELECT COUNT(*) as c FROM minted_xaels').get().c;

        const embed = new EmbedBuilder()
          .setColor(0x6d8b74)
          .setTitle('📊 Everdream NFT Stats')
          .setDescription(
            `**Total XAELs minted:** ${totalXAELs}\n` +
            `**Total TAOs supply:** ${totalTAOs}\n` +
            `**Bot-minted XAELs:** ${totalMinted}\n` +
            `**XAELs contract:** ${process.env.XAELS_CONTRACT_ADDRESS ? `\`${process.env.XAELS_CONTRACT_ADDRESS.slice(0, 10)}...\`` : 'Not deployed'}\n` +
            `**TAOs contract:** ${process.env.TAOS_CONTRACT_ADDRESS ? `\`${process.env.TAOS_CONTRACT_ADDRESS.slice(0, 10)}...\`` : 'Not deployed'}`
          );
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
            '**Dream Journal:**\n' +
            '`!dream <text>` — Log a dream entry\n' +
            '`!streak` — View your dream logging streak\n' +
            '`!prompt` — Get today\'s dream prompt\n' +
            '`!prompt random` — Get a random dream prompt\n' +
            '`!mood` — View your mood stats\n' +
            '`!mood <mood>` — Tag your latest dream with a mood\n' +
            '`!search-dreams <keyword>` — Search your dream journal\n' +
            '`!dream-stats` — View your dream statistics\n' +
            '`!weekly` — Weekly dream summary\n\n' +
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
            '**Token Gates (Admin):**\n' +
            '`!gate-add <role_id> <contract> [chain] [min] [desc]`\n' +
            '`!gate-remove <role_id>`\n' +
            '`!check-gates`\n\n' +
            '**NFTs & Tokens:**\n' +
            '`!mint-xael <id> <title> [desc]` — Mint a dream as XAEL NFT\n' +
            '`!my-nfts` — View your XAEL NFTs\n' +
            '`!my-taos` — View your TAO balance\n' +
            '`!nft-stats` — Global NFT stats\n\n' +
            '**Moderation:**\n' +
            '`!warn @user [reason]` — Warn a user\n' +
            '`!mute @user [seconds] [reason]` — Mute/timeout\n' +
            '`!kick @user [reason]` — Kick a user\n' +
            '`!ban @user [reason]` — Ban a user\n' +
            '`!clear [amount]` — Delete messages (1-100)\n\n' +
            '**Community:**\n' +
            '`!profile` — View your profile\n' +
            '`!leaderboard` — Top members\n' +
            '`!help` — This message'
          );
        replyEmbed(embed, true);
        break;
      }

      default:
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

// ── Message Logging: Delete ─────────────────────────────────────────
client.on('messageDelete', async (message) => {
  if (!message.guild || message.guild.id !== config.guildId) return;
  await logMessageDelete(message, client, config);
});

// ── Message Logging: Edit ───────────────────────────────────────────
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.guild.id !== config.guildId) return;
  await logMessageEdit(oldMessage, newMessage, client, config);
});

// ── Member Leave Logging ────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
  if (member.guild.id !== config.guildId) return;
  log(`${member.user.tag} (${member.id}) left the server`, 'info');
});

// ── New member onboarding ──────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== config.guildId) return;
  log(`${member.user.tag} joined the server`, 'info');

  if (config.roles.unverified) {
    try { await member.roles.add(config.roles.unverified); } catch {}
  }

  // Welcome DM with verify button
  try {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
    );

    const embed = new EmbedBuilder()
      .setColor(0x6d8b74)
      .setTitle('Welcome to Everdream 🌙')
      .setDescription(
        `Hey ${member.user.username}!\n\n` +
        `Welcome to the Everdream community — a place for dreamers, sleep explorers, and the lucid-curious.\n\n` +
        `**Click the button below to verify and get started!**\n\n` +
        `You'll be asked a few quick questions to help us personalize your experience.`
      );
    await member.send({ embeds: [embed], components: [row] });
  } catch {
    // Can't DM user — they'll need to use !verify in-server
  }
});

// ── Error handling ──────────────────────────────────────────────────
client.on('error', (err) => log(`Client error: ${err.message}`, 'error'));
process.on('unhandledRejection', (err) => log(`Unhandled: ${err.message}`, 'error'));

// ── Start ───────────────────────────────────────────────────────────
client.login(config.token);
