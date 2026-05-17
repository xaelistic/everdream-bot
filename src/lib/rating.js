// Content rating system
import db from '../db/database.js';
import { awardPoints, incrementCounter } from './gamification.js';

// Rate a piece of content
export function rateContent(contentId, raterDiscordId, score) {
  if (score < 1 || score > 5) return { error: 'Rating must be between 1 and 5.' };

  const content = db.prepare('SELECT * FROM content WHERE content_id = ?').get(contentId);
  if (!content) return { error: 'Content not found.' };
  if (content.creator_discord_id === raterDiscordId) return { error: 'You cannot rate your own content.' };

  // Check if already rated
  const existing = db.prepare('SELECT * FROM ratings WHERE content_id = ? AND rater_discord_id = ?').get(contentId, raterDiscordId);
  if (existing) {
    // Update existing rating
    db.prepare('UPDATE ratings SET score = ?, created_at = datetime("now") WHERE content_id = ? AND rater_discord_id = ?')
      .run(score, contentId, raterDiscordId);
  } else {
    db.prepare('INSERT INTO ratings (content_id, rater_discord_id, score) VALUES (?, ?, ?)')
      .run(contentId, raterDiscordId, score);
    incrementCounter(raterDiscordId, 'ratings_given');
    incrementCounter(content.creator_discord_id, 'ratings_received');
  }

  // Recalculate average
  const stats = db.prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE content_id = ?').get(contentId);
  db.prepare('UPDATE content SET average_rating = ?, rating_count = ? WHERE content_id = ?')
    .run(Math.round(stats.avg * 10) / 10, stats.count, contentId);

  // Award points
  const raterResult = awardPoints(raterDiscordId, null, 'RATING_GIVEN', `Rated ${contentId}`);
  const creatorResult = awardPoints(content.creator_discord_id, null, 'RATING_RECEIVED', `Received rating on ${contentId}`);

  return {
    success: true,
    contentId,
    newAverage: Math.round(stats.avg * 10) / 10,
    totalRatings: stats.count,
    yourRating: score,
  };
}

// Get content rating info
export function getContentRating(contentId) {
  const content = db.prepare('SELECT content_id, title, average_rating, rating_count FROM content WHERE content_id = ?').get(contentId);
  if (!content) return null;
  return content;
}
