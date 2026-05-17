// Remix provenance tracking
import db from '../db/database.js';
import { awardPoints, incrementCounter } from './gamification.js';

// Register a remix
export function registerRemix(derivativeContentId, originalContentId, remixerDiscordId) {
  const original = db.prepare('SELECT * FROM content WHERE content_id = ?').get(originalContentId);
  if (!original) return { error: 'Original content not found.' };

  if (original.creator_discord_id === remixerDiscordId) {
    return { error: 'You cannot remix your own content (that\'s just an original!).' };
  }

  // Check for circular remixes
  const isCircular = db.prepare(
    'SELECT * FROM remixes WHERE derivative_content_id = ? AND original_content_id = ?'
  ).get(originalContentId, derivativeContentId);
  if (isCircular) return { error: 'Circular remix detected.' };

  db.prepare('INSERT INTO remixes (derivative_content_id, original_content_id, remixer_discord_id) VALUES (?, ?, ?)')
    .run(derivativeContentId, originalContentId, remixerDiscordId);

  // Award points
  awardPoints(remixerDiscordId, null, 'REMIX_CREATED', `Remixed ${originalContentId}`);
  awardPoints(original.creator_discord_id, null, 'REMIX_RECEIVED', `Content ${originalContentId} remixed`);
  incrementCounter(remixerDiscordId, 'remixes');

  return {
    success: true,
    derivative: derivativeContentId,
    original: originalContentId,
    originalCreator: original.creator_discord_id,
  };
}

// Get provenance chain for a piece of content
export function getProvenance(contentId) {
  const chain = [];
  let currentId = contentId;
  const visited = new Set();

  // Walk backwards to find the root
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const content = db.prepare('SELECT * FROM content WHERE content_id = ?').get(currentId);
    if (!content) break;

    const remix = db.prepare('SELECT * FROM remixes WHERE derivative_content_id = ?').get(currentId);
    chain.push({
      contentId: currentId,
      title: content.title,
      creator: content.creator_discord_id,
      createdAt: content.created_at,
      isOriginal: !remix,
    });

    currentId = remix ? remix.original_content_id : null;
  }

  return chain;
}

// Get all derivatives of a piece of content
export function getDerivatives(contentId) {
  return db.prepare(`
    SELECT r.derivative_content_id, r.created_at, c.title, c.creator_discord_id
    FROM remixes r
    LEFT JOIN content c ON r.derivative_content_id = c.content_id
    WHERE r.original_content_id = ?
    ORDER BY r.created_at DESC
  `).all(contentId);
}
