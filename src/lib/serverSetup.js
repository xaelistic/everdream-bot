// Server Setup — creates the entire Everdream server structure
// Categories, channels, roles, and permissions
import {
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
  EmbedBuilder,
} from 'discord.js';

// ── Role Definitions ────────────────────────────────────────────────
const ROLES = [
  { name: 'Owner', color: '#dc2626', hoist: true, permissions: [PermissionFlagsBits.Administrator] },
  { name: 'Admin', color: '#f97316', hoist: true, permissions: [
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ViewAuditLog,
  ]},
  { name: 'Moderator', color: '#eab308', hoist: true, permissions: [
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ModerateMembers,
  ]},
  { name: 'Helper', color: '#22c55e', hoist: false, permissions: [
    PermissionFlagsBits.ManageMessages,
  ]},
  { name: 'Creator', color: '#8b5cf6', hoist: false, permissions: [] },
  { name: 'Collector', color: '#06b6d4', hoist: false, permissions: [] },
  { name: 'Member', color: '#3b82f6', hoist: false, permissions: [] },
  { name: 'Unverified', color: '#6b7280', hoist: false, permissions: [] },
  { name: 'Muted', color: '#374151', hoist: false, permissions: [] },
];

// Self-assignable roles (created but not in hierarchy)
const SELF_ASSIGNABLE_ROLES = [
  { name: 'Dream Journaler', emoji: '🌙', color: '#6366f1', description: 'Dream journal reminders' },
  { name: 'Announcements', emoji: '📢', color: '#f59e0b', description: 'Server announcements' },
  { name: 'Artist', emoji: '🎨', color: '#ec4899', description: 'Creative content' },
  { name: 'Gamer', emoji: '🎮', color: '#10b981', description: 'Gaming nights' },
  { name: 'Bookworm', emoji: '📚', color: '#8b5cf6', description: 'Book/sleep stories' },
  { name: 'Mindfulness', emoji: '🧘', color: '#14b8a6', description: 'Meditation & wellness' },
  { name: 'Sleep Science', emoji: '🔬', color: '#6366f1', description: 'Research & science' },
  { name: 'Premium', emoji: '💎', color: '#f59e0b', description: 'Premium tier' },
];

// ── Channel Structure ───────────────────────────────────────────────
// Each category has: name, channels[]
// Each channel has: name, topic, type, nsfw
const CATEGORIES = [
  {
    name: '📋 INFORMATION',
    channels: [
      { name: 'welcome', topic: 'Welcome to Everdream! Read the rules to get started.', slowmode: 0 },
      { name: 'rules', topic: 'Server rules — read before verifying.', slowmode: 0 },
      { name: 'announcements', topic: 'Official Everdream updates and news.', slowmode: 0 },
      { name: 'roles', topic: 'React to get self-assignable roles.', slowmode: 0 },
    ],
  },
  {
    name: '💬 COMMUNITY',
    channels: [
      { name: 'general', topic: 'Main chat — be cool.', slowmode: 0 },
      { name: 'introductions', topic: 'Tell us about yourself!', slowmode: 0 },
      { name: 'off-topic', topic: 'Anything goes (within reason).', slowmode: 0 },
      { name: 'media', topic: 'Share images, art, memes.', slowmode: 0 },
    ],
  },
  {
    name: '🌙 DREAM JOURNAL',
    channels: [
      { name: 'dream-journal', topic: 'Share your dreams with the community.', slowmode: 30 },
      { name: 'lucid-talk', topic: 'Discuss lucid dreaming techniques.', slowmode: 0 },
      { name: 'dream-interpret', topic: 'Ask for dream interpretations.', slowmode: 0 },
      { name: 'sleep-talk', topic: 'Sleep quality, routines, tips.', slowmode: 0 },
    ],
  },
  {
    name: '🎨 CREATIVE',
    channels: [
      { name: 'dream-art', topic: 'Art inspired by dreams.', slowmode: 0 },
      { name: 'dream-music', topic: 'Music for sleep and dreaming.', slowmode: 0 },
      { name: 'writing', topic: 'Dream-inspired writing and poetry.', slowmode: 0 },
    ],
  },
  {
    name: '💰 MARKETPLACE',
    channels: [
      { name: 'trading', topic: 'List and trade NFTs. Use !list, !buy, !cancel.', slowmode: 10 },
      { name: 'showcase', topic: 'Show off your collection.', slowmode: 30 },
      { name: 'leaderboard', topic: 'Top creators, collectors, and traders.', slowmode: 0 },
    ],
  },
  {
    name: '🔒 MEMBERS ONLY',
    memberOnly: true,
    channels: [
      { name: 'member-chat', topic: 'Casual member-only chat.', slowmode: 0 },
      { name: 'events', topic: 'Community events and watch parties.', slowmode: 0 },
      { name: 'feedback', topic: 'Suggestions for the server.', slowmode: 0 },
    ],
  },
  {
    name: '🤖 BOT',
    channels: [
      { name: 'bot-commands', topic: 'Use bot commands here.', slowmode: 5 },
      { name: 'bot-log', topic: 'Bot action logs (admin only).', slowmode: 0 },
    ],
  },
  {
    name: '🔧 ADMIN',
    adminOnly: true,
    channels: [
      { name: 'admin-chat', topic: 'Staff discussion.', slowmode: 0 },
      { name: 'mod-log', topic: 'Moderation action log.', slowmode: 0 },
      { name: 'server-config', topic: 'Configuration notes.', slowmode: 0 },
    ],
  },
];

// ── Setup Function ──────────────────────────────────────────────────
export async function setupServer(guild, log) {
  const results = { roles: [], categories: [], channels: [], errors: [] };

  // 1. Create roles
  log('Creating roles...');
  const roleMap = {};
  for (const roleDef of ROLES) {
    try {
      const role = await guild.roles.create({
        name: roleDef.name,
        color: roleDef.color,
        hoist: roleDef.hoist,
        permissions: roleDef.permissions,
        reason: 'Everdream server setup',
      });
      roleMap[roleDef.name] = role.id;
      results.roles.push(role.name);
    } catch (err) {
      results.errors.push(`Role ${roleDef.name}: ${err.message}`);
    }
  }

  // Create self-assignable roles
  for (const roleDef of SELF_ASSIGNABLE_ROLES) {
    try {
      const role = await guild.roles.create({
        name: roleDef.name,
        color: roleDef.color,
        hoist: false,
        mentionable: true,
        reason: 'Everdream self-assignable role',
      });
      roleMap[roleDef.name] = role.id;
      results.roles.push(role.name);
    } catch (err) {
      results.errors.push(`Self-role ${roleDef.name}: ${err.message}`);
    }
  }

  // 2. Create categories and channels
  log('Creating categories and channels...');
  const channelMap = {};
  const everyoneRole = guild.roles.everyone;

  for (const catDef of CATEGORIES) {
    try {
      // Build overwrites for the category
      const overwrites = [
        {
          id: everyoneRole.id,
          type: OverwriteType.Role,
          deny: catDef.adminOnly
            ? [PermissionFlagsBits.ViewChannel]
            : catDef.memberOnly
              ? [PermissionFlagsBits.ViewChannel]
              : [],
        },
      ];

      if (catDef.memberOnly) {
        // Member role can see
        if (roleMap['Member']) {
          overwrites.push({
            id: roleMap['Member'],
            type: OverwriteType.Role,
            allow: [PermissionFlagsBits.ViewChannel],
          });
        }
        // Staff can always see
        for (const staffRole of ['Admin', 'Moderator', 'Owner']) {
          if (roleMap[staffRole]) {
            overwrites.push({
              id: roleMap[staffRole],
              type: OverwriteType.Role,
              allow: [PermissionFlagsBits.ViewChannel],
            });
          }
        }
      }

      if (catDef.adminOnly) {
        // Only staff can see admin channels
        for (const staffRole of ['Admin', 'Moderator', 'Owner']) {
          if (roleMap[staffRole]) {
            overwrites.push({
              id: roleMap[staffRole],
              type: OverwriteType.Role,
              allow: [PermissionFlagsBits.ViewChannel],
            });
          }
        }
      }

      // Bot-log channel: only bot + staff can send
      if (catDef.name === '🤖 BOT') {
        // Will handle per-channel below
      }

      const category = await guild.channels.create({
        name: catDef.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
        reason: 'Everdream server setup',
      });
      results.categories.push(catDef.name);

      // Create channels in this category
      for (const chanDef of catDef.channels) {
        try {
          const chanOverwrites = [...overwrites];

          // Special: bot-log is read-only for non-staff
          if (chanDef.name === 'bot-log') {
            // Deny send messages for @everyone
            chanOverwrites.push({
              id: everyoneRole.id,
              type: OverwriteType.Role,
              deny: [PermissionFlagsBits.SendMessages],
            });
          }

          // Special: announcements read-only for non-staff
          if (chanDef.name === 'announcements') {
            chanOverwrites.push({
              id: everyoneRole.id,
              type: OverwriteType.Role,
              deny: [PermissionFlagsBits.SendMessages],
            });
            for (const staffRole of ['Admin', 'Moderator', 'Owner']) {
              if (roleMap[staffRole]) {
                chanOverwrites.push({
                  id: roleMap[staffRole],
                  type: OverwriteType.Role,
                  allow: [PermissionFlagsBits.SendMessages],
                });
              }
            }
          }

          // Special: rules read-only
          if (chanDef.name === 'rules') {
            chanOverwrites.push({
              id: everyoneRole.id,
              type: OverwriteType.Role,
              deny: [PermissionFlagsBits.SendMessages],
            });
          }

          // Special: leaderboard read-only
          if (chanDef.name === 'leaderboard') {
            chanOverwrites.push({
              id: everyoneRole.id,
              type: OverwriteType.Role,
              deny: [PermissionFlagsBits.SendMessages],
            });
          }

          // Special: Muted role can't send messages
          if (roleMap['Muted']) {
            chanOverwrites.push({
              id: roleMap['Muted'],
              type: OverwriteType.Role,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
            });
          }

          const channel = await guild.channels.create({
            name: chanDef.name,
            type: ChannelType.GuildText,
            topic: chanDef.topic,
            parent: category.id,
            permissionOverwrites: chanOverwrites,
            rateLimitPerUser: chanDef.slowmode || 0,
            reason: 'Everdream server setup',
          });

          channelMap[chanDef.name] = channel.id;
          results.channels.push(`#${chanDef.name}`);
        } catch (err) {
          results.errors.push(`Channel #${chanDef.name}: ${err.message}`);
        }
      }
    } catch (err) {
      results.errors.push(`Category ${catDef.name}: ${err.message}`);
    }
  }

  // 3. Set up role hierarchy (position roles)
  log('Setting role hierarchy...');
  const roleOrder = ['Owner', 'Admin', 'Moderator', 'Helper', 'Creator', 'Collector', 'Member', 'Unverified', 'Muted'];
  let position = roleOrder.length;
  for (const roleName of roleOrder) {
    if (roleMap[roleName]) {
      try {
        const role = await guild.roles.fetch(roleMap[roleName]);
        await role.setPosition(position);
        position--;
      } catch (err) {
        results.errors.push(`Position ${roleName}: ${err.message}`);
      }
    }
  }

  // 4. Post rules in #rules
  if (channelMap['rules']) {
    try {
      const rulesChannel = await guild.channels.fetch(channelMap['rules']);
      const rulesEmbed = new EmbedBuilder()
        .setColor(0x6d8b74)
        .setTitle('🌙 Everdream Server Rules')
        .setDescription(
          '**1. Be Respectful** — Treat everyone with kindness. We\'re all here to explore dreams together.\n\n' +
          '**2. No Spam or Unsolicited Promos** — Don\'t flood channels or DM members with promotions. Ask a mod first.\n\n' +
          '**3. Keep it Safe** — No NSFW content in general channels. Mark sensitive content appropriately.\n\n' +
          '**4. Zero Tolerance for Hate** — No harassment, hate speech, discrimination, or bullying of any kind.\n\n' +
          '**5. Use the Right Channels** — Check channel descriptions before posting.\n\n' +
          '**6. Follow Discord ToS** — https://discord.com/terms\n\n' +
          '**7. Dream Freely** — This is a space for open-minded exploration.\n\n' +
          '**Violations may result in warnings, mutes, kicks, or bans at moderator discretion.**\n\n' +
          'By verifying, you agree to these rules. Welcome to Everdream! 🌙'
        );
      await rulesChannel.send({ embeds: [rulesEmbed] });
    } catch (err) {
      results.errors.push(`Post rules: ${err.message}`);
    }
  }

  // 5. Post reaction roles in #roles
  if (channelMap['roles']) {
    try {
      const rolesChannel = await guild.channels.fetch(channelMap['roles']);
      let desc = 'React to get roles. Remove your reaction to remove the role.\n\n';
      const reactions = [];
      for (const r of SELF_ASSIGNABLE_ROLES) {
        desc += `${r.emoji} — **${r.name}** — ${r.description}\n`;
        reactions.push(r.emoji);
      }
      const rolesEmbed = new EmbedBuilder()
        .setColor(0x6d8b74)
        .setTitle('🎭 Choose Your Roles')
        .setDescription(desc);
      const msg = await rolesChannel.send({ embeds: [rolesEmbed] });
      for (const emoji of reactions) {
        await msg.react(emoji).catch(() => {});
      }
    } catch (err) {
      results.errors.push(`Reaction roles: ${err.message}`);
    }
  }

  // 6. Post welcome in #welcome
  if (channelMap['welcome']) {
    try {
      const welcomeChannel = await guild.channels.fetch(channelMap['welcome']);
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x6d8b74)
        .setTitle('🌙 Welcome to Everdream')
        .setDescription(
          'A community for dreamers, sleep explorers, and the lucid-curious.\n\n' +
          '**To get started:**\n' +
          '1. Read <#' + channelMap['rules'] + '>\n' +
          '2. Use `!verify` or click ✅ in the rules channel\n' +
          '3. Pick your roles in <#' + channelMap['roles'] + '>\n' +
          '4. Introduce yourself in <#' + channelMap['introductions'] + '>\n\n' +
          '**Web3 Features:**\n' +
          '• `!link <wallet>` — Link your Ethereum wallet\n' +
          '• `!list <content_id> <price>` — List an NFT for sale\n' +
          '• `!buy <listing_id>` — Buy a listed NFT\n' +
          '• `!rate <content_id> <1-5>` — Rate content\n' +
          '• `!leaderboard` — View top members\n\n' +
          'Sweet dreams await. 💤'
        );
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (err) {
      results.errors.push(`Welcome message: ${err.message}`);
    }
  }

  return { results, roleMap, channelMap };
}

export { ROLES, SELF_ASSIGNABLE_ROLES, CATEGORIES };
