// Message Logger — tracks edits, deletes, and moderation actions

import { EmbedBuilder } from 'discord.js';

export function getMessageLogChannelId(config) {
  return config.channels.botLog;
}

// Log a message deletion
export async function logMessageDelete(message, client, config) {
  if (message.author?.bot) return;
  if (!message.guild || message.guild.id !== config.guildId) return;

  try {
    const channel = await client.channels.fetch(config.channels.botLog);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🗑️ Message Deleted')
      .setDescription(
        `**Author:** ${message.author?.tag || 'Unknown'} (${message.author?.id})\n` +
        `**Channel:** <#${message.channel.id}>\n` +
        `**Content:**\n${message.content?.slice(0, 1024) || '*[No text content]*'}`
      )
      .setTimestamp();

    if (message.attachments.size > 0) {
      embed.addFields({ name: 'Attachments', value: `${message.attachments.size} file(s)` });
    }

    await channel.send({ embeds: [embed] });
  } catch { /* ignore */ }
}

// Log a message edit
export async function logMessageEdit(oldMessage, newMessage, client, config) {
  if (oldMessage.author?.bot) return;
  if (!oldMessage.guild || oldMessage.guild.id !== config.guildId) return;
  if (oldMessage.content === newMessage.content) return;

  try {
    const channel = await client.channels.fetch(config.channels.botLog);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('✏️ Message Edited')
      .setDescription(
        `**Author:** ${newMessage.author?.tag || 'Unknown'} (${newMessage.author?.id})\n` +
        `**Channel:** <#${newMessage.channel.id}>\n` +
        `**Before:**\n${oldMessage.content?.slice(0, 512) || '*[No content]*'}\n\n` +
        `**After:**\n${newMessage.content?.slice(0, 512) || '*[No content]*'}`
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch { /* ignore */ }
}

// Log a moderation action
export async function logModAction(action, moderator, target, reason, client, config) {
  try {
    const channel = await client.channels.fetch(config.channels.botLog);
    if (!channel) return;

    const colors = {
      ban: 0xdc2626,
      kick: 0xf59e0b,
      mute: 0x6366f1,
      warn: 0xfbbf24,
      timeout: 0x8b5cf6,
    };

    const icons = {
      ban: '🔨',
      kick: '👢',
      mute: '🔇',
      warn: '⚠️',
      timeout: '⏱️',
    };

    const embed = new EmbedBuilder()
      .setColor(colors[action] || 0x6b7280)
      .setTitle(`${icons[action] || '🛡️'} ${action.charAt(0).toUpperCase() + action.slice(1)}`)
      .setDescription(
        `**Moderator:** ${moderator.tag} (${moderator.id})\n` +
        `**Target:** ${target.tag} (${target.id})\n` +
        `**Reason:** ${reason || 'No reason provided'}`
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch { /* ignore */ }
}
