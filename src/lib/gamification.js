// Gamification engine — points, levels, leaderboard
import db from '../db/database.js';

// Point values for actions
const POINTS = {
  UPLOAD: 10,
  RATING_GIVEN: 2,
  RATING_RECEIVED: 5,
  TRADE_COMPLETED: 20,
  REMIX_CREATED: 15,
  REMIX_RECEIVED: 10,
  VERIFY: 5,
  INTRODUCTION: 3,
  DAILY_LOGIN: 1,
};

// Level thresholds
function getLevel(points) {
  if (points >= 10000) return { level: 10, title: 'Dream Legend', next: null };
  if (points >= 5000) return { level: 9, title: 'Lucid Master', next: 10000 };
  if (points >= 2500) return { level: 8, title: 'Dream Weaver', next: 5000 };
  if (points >= 1000) return { level: 7, title: 'Sleep Sage', next: 2500 };
  if (points >= 500) return { level: 6, title: 'Dream Artist', next: 1000 };
  if (points >= 250) return { level: 5, title: 'Dream Collector', next: 500 };
  if (points >= 100) return { level: 4, title: 'Dream Explorer', next: 250 };
  if (points >= 50) return { level: 3, title: 'Dreamer', next: 100 };
  if (points >= 20) return { level: 2, title: 'Dream Novice', next: 50 };
  return { level: 1, title: 'Dream Initiate', next: 20 };
}

// Get or create user
function getOrCreateUser(discordId, username) {
  let user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  if (!user) {
    db.prepare('INSERT INTO users (discord_id, username) VALUES (?, ?)').run(discordId, username);
    user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  }
  return user;
}

// Award points
export function awardPoints(discordId, username, action, details = null) {
  const points = POINTS[action] || 0;
  if (points === 0) return null;

  const user = getOrCreateUser(discordId, username);
  db.prepare('UPDATE users SET points = points + ? WHERE discord_id = ?').run(points, discordId);
  db.prepare('INSERT INTO action_log (discord_id, action, points, details) VALUES (?, ?, ?, ?)')
    .run(discordId, action, points, details);

  const updated = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  const levelInfo = getLevel(updated.points);

  return {
    previousPoints: user.points,
    newPoints: updated.points,
    earned: points,
    level: levelInfo.level,
    title: levelInfo.title,
    nextLevel: levelInfo.next,
    leveledUp: levelInfo.level > getLevel(user.points).level,
  };
}

// Get user profile
export function getProfile(discordId, username) {
  const user = getOrCreateUser(discordId, username);
  const levelInfo = getLevel(user.points);
  return { ...user, ...levelInfo };
}

// Get leaderboard
export function getLeaderboard(limit = 10) {
  return db.prepare(
    'SELECT discord_id, username, points, uploads, ratings_received, trades_completed, remixes FROM users ORDER BY points DESC LIMIT ?'
  ).all(limit);
}

// Increment counters
export function incrementCounter(discordId, field) {
  const validFields = ['uploads', 'ratings_given', 'ratings_received', 'trades_completed', 'remixes'];
  if (!validFields.includes(field)) return;
  db.prepare(`UPDATE users SET ${field} = ${field} + 1 WHERE discord_id = ?`).run(discordId);
}

export { POINTS, getLevel };
