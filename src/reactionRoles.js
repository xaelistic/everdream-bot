// Reaction Roles Manager
// Users react to a message to get/remove roles

import { EmbedBuilder } from 'discord.js';

// Define your reaction role groups here
// messageId → array of { emoji, roleId, description }
export const REACTION_ROLE_GROUPS = {
  // Example: 'MESSAGE_ID_HERE': [
  //   { emoji: '🌙', roleId: 'ROLE_ID', description: 'Dream Journal notifications' },
  //   { emoji: '📢', roleId: 'ROLE_ID', description: 'Announcements' },
  //   { emoji: '🎨', roleId: 'ROLE_ID', description: 'Art & Visuals' },
  //   { emoji: '🎮', roleId: 'ROLE_ID', description: 'Gaming nights' },
  // ],
};

// Build the reaction role embed
export function buildReactionRoleEmbed(groups) {
  const embed = new EmbedBuilder()
    .setColor(0x6d8b74)
    .setTitle('Choose Your Roles')
    .setDescription('React to get roles. Remove your reaction to remove the role.\n\n');

  let desc = '';
  for (const group of groups) {
    desc += `${group.emoji} — ${group.description}\n`;
  }
  embed.setDescription(embed.data.description + desc);
  return embed;
}

// Handle reaction add
export async function handleReactionAdd(reaction, user, client) {
  if (user.bot) return;
  const messageId = reaction.message.id;
  const groups = REACTION_ROLE_GROUPS[messageId];
  if (!groups) return;

  const match = groups.find((g) => g.emoji === reaction.emoji.name);
  if (!match) return;

  try {
    const guild = await client.guilds.fetch(reaction.message.guildId);
    const member = await guild.members.fetch(user.id);
    await member.roles.add(match.roleId);
  } catch (err) {
    console.error(`Failed to add role to ${user.tag}:`, err.message);
  }
}

// Handle reaction remove
export async function handleReactionRemove(reaction, user, client) {
  if (user.bot) return;
  const messageId = reaction.message.id;
  const groups = REACTION_ROLE_GROUPS[messageId];
  if (!groups) return;

  const match = groups.find((g) => g.emoji === reaction.emoji.name);
  if (!match) return;

  try {
    const guild = await client.guilds.fetch(reaction.message.guildId);
    const member = await guild.members.fetch(user.id);
    await member.roles.remove(match.roleId);
  } catch (err) {
    console.error(`Failed to remove role from ${user.tag}:`, err.message);
  }
}
