import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';

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
  },
  roles: {
    member: process.env.MEMBER_ROLE_ID,
    unverified: process.env.UNVERIFIED_ROLE_ID,
  },
  verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT_SECONDS || '600', 10),
};

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

// ── Onboarding: Send welcome DM to new members ─────────────────────
async function sendWelcomeDM(member) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x6d8b74)
      .setTitle('Welcome to Everdream')
      .setDescription(
        `Hey ${member.user.username}! 🌙\n\n` +
        `Welcome to the Everdream community — a place for dreamers, sleep explorers, and the lucid-curious.\n\n` +
        `**To get started:**\n` +
        `1. Read the <#${config.channels.rules}> channel\n` +
        `2. Click the ✅ below to verify you've read them\n` +
        `3. Introduce yourself in <#${config.channels.general}>\n\n` +
        `Once verified, you'll unlock the full server including the dream journal, events, and more.`
      )
      .setFooter({ text: 'Everdream · Dreams · Sleep · Calm reflection' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_${member.id}`)
        .setLabel('I agree to the rules')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
    );

    await member.send({ embeds: [embed], components: [row] });
    log(`Sent welcome DM to ${member.user.tag}`, 'info');
  } catch (err) {
    log(`Failed to send welcome DM to ${member.user.tag}: ${err.message}`, 'warn');
  }
}

// ── Verification handler ────────────────────────────────────────────
async function verifyMember(member, source = 'dm') {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const fullMember = await guild.members.fetch(member.id);

    // Add member role
    if (config.roles.member) {
      await fullMember.roles.add(config.roles.member);
    }
    // Remove unverified role
    if (config.roles.unverified) {
      await fullMember.roles.remove(config.roles.unverified).catch(() => {});
    }

    // Send confirmation
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('Welcome to Everdream! 🌙')
      .setDescription(
        `You're in, ${member.user}! ✨\n\n` +
        `Here's what you can do next:\n` +
        `• Share your dreams in <#${config.channels.dreamJournal}>\n` +
        `• Chat with the community in <#${config.channels.general}>\n` +
        `• Check <#${config.channels.announcements}> for updates\n\n` +
        `Sweet dreams await. 💤`
      )
      .setTimestamp();

    try {
      await member.send({ embeds: [embed] });
    } catch {
      // If DM fails, try to post in welcome channel
      const welcomeChannel = await client.channels.fetch(config.channels.welcome);
      if (welcomeChannel) {
        await welcomeChannel.send({ content: `${member.user}`, embeds: [embed] });
      }
    }

    log(`${member.user.tag} verified via ${source}`, 'success');
  } catch (err) {
    log(`Verification failed for ${member.user.tag}: ${err.message}`, 'error');
  }
}

// ── Event: Bot ready ────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`Everdream Bot online as ${client.user.tag}`);
  log(`Bot started — ${client.user.tag} is online`, 'success');

  // Set bot status
  client.user.setActivity('dreams unfold...', { type: 3 }); // Watching
});

// ── Event: New member joins ─────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== config.guildId) return;

  log(`${member.user.tag} joined the server`, 'info');

  // Assign unverified role
  if (config.roles.unverified) {
    try {
      await member.roles.add(config.roles.unverified);
    } catch (err) {
      log(`Could not assign unverified role to ${member.user.tag}: ${err.message}`, 'warn');
    }
  }

  // Send welcome DM
  await sendWelcomeDM(member);

  // Post in welcome channel
  const welcomeChannel = await client.channels.fetch(config.channels.welcome);
  if (welcomeChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x6d8b74)
      .setTitle('New Dreamer')
      .setDescription(`Welcome to Everdream, ${member.user}! 🌙`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    await welcomeChannel.send({ embeds: [embed] });
  }

  // Optional: kick after timeout if not verified
  if (config.verificationTimeout > 0) {
    setTimeout(async () => {
      try {
        const guild = await client.guilds.fetch(config.guildId);
        const fullMember = await guild.members.fetch(member.id);
        if (config.roles.unverified && fullMember.roles.cache.has(config.roles.unverified)) {
          await member.kick('Failed to verify within time limit');
          log(`${member.user.tag} kicked for not verifying in time`, 'warn');
        }
      } catch { /* member already left or role removed */ }
    }, config.verificationTimeout * 1000);
  }
});

// ── Event: Button interactions (verification) ───────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Verification button
  if (interaction.customId.startsWith('verify_')) {
    const userId = interaction.customId.replace('verify_', '');
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: 'This verification button is not for you.',
        ephemeral: true,
      });
    }
    await interaction.reply({
      content: '✅ You have been verified! Welcome to Everdream.',
      ephemeral: true,
    });
    await verifyMember(interaction.user, 'dm');
  }
});

// ── Event: Member leaves ────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
  if (member.guild.id !== config.guildId) return;
  log(`${member.user.tag} left the server`, 'info');
});

// ── Error handling ──────────────────────────────────────────────────
client.on('error', (err) => {
  log(`Client error: ${err.message}`, 'error');
});

process.on('unhandledRejection', (err) => {
  log(`Unhandled rejection: ${err.message}`, 'error');
});

// ── Start ───────────────────────────────────────────────────────────
client.login(config.token);
