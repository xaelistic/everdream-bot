// Dream Journal Gamification — streaks, prompts, mood tracking, weekly summaries
import db from '../db/database.js';
import { awardPoints, POINTS } from './gamification.js';

// ── Dream Entry Tracking ─────────────────────────────────────────────

export function recordDreamEntry(discordId, username, dreamContent, mood = null, tags = []) {
  const today = new Date().toISOString().split('T')[0];

  // Check if user already logged a dream today
  const existing = db.prepare(
    'SELECT * FROM dream_entries WHERE discord_id = ? AND date(entry_date) = date(?)'
  ).get(discordId, today);

  if (existing) {
    // Update existing entry (allow multiple dreams per day, append)
    db.prepare('UPDATE dream_entries SET content = content || ? WHERE id = ?')
      .run('\n---\n' + dreamContent, existing.id);
    return { success: true, message: 'Dream appended to today\'s entry.', entryId: existing.id };
  }

  // Insert new dream entry
  db.prepare(
    'INSERT INTO dream_entries (discord_id, username, content, mood, tags, entry_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(discordId, username, dreamContent, mood, JSON.stringify(tags), today);

  const entry = db.prepare('SELECT * FROM dream_entries WHERE discord_id = ? ORDER BY id DESC LIMIT 1').get(discordId);

  // Calculate streak
  const streak = calculateStreak(discordId);

  // Award points
  const result = awardPoints(discordId, username, 'DREAM_LOGGED', `Dream entry #${entry.id}`);

  // Update user stats
  db.prepare('UPDATE users SET dream_count = COALESCE(dream_count, 0) + 1 WHERE discord_id = ?').run(discordId);

  return {
    success: true,
    entryId: entry.id,
    streak,
    pointsEarned: result?.earned || 0,
    totalPoints: result?.newPoints || 0,
    leveledUp: result?.leveledUp || false,
    level: result?.level || 1,
    title: result?.title || 'Dream Initiate',
  };
}

// ── Streak Calculation ────────────────────────────────────────────────

export function calculateStreak(discordId) {
  const entries = db.prepare(
    'SELECT DISTINCT date(entry_date) as date FROM dream_entries WHERE discord_id = ? ORDER BY entry_date DESC'
  ).all(discordId);

  if (entries.length === 0) return { current: 0, longest: 0, total: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if most recent entry is today or yesterday
  const mostRecent = new Date(entries[0].date);
  mostRecent.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24));

  if (daysDiff > 1) return { current: 0, longest: entries.length, total: entries.length };

  // Calculate current streak
  currentStreak = 1;
  for (let i = 1; i < entries.length; i++) {
    const prev = new Date(entries[i - 1].date);
    const curr = new Date(entries[i].date);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  tempStreak = 1;
  longestStreak = 1;
  for (let i = 1; i < entries.length; i++) {
    const prev = new Date(entries[i - 1].date);
    const curr = new Date(entries[i].date);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { current: currentStreak, longest: longestStreak, total: entries.length };
}

// ── Daily Dream Prompts ───────────────────────────────────────────────

const DREAM_PROMPTS = [
  { prompt: "What was the most vivid color in your dream last night?", category: "recall" },
  { prompt: "Did you meet anyone unusual in your dreams? Describe them.", category: "characters" },
  { prompt: "Were you flying, falling, or floating? How did it feel?", category: "sensation" },
  { prompt: "What emotion dominated your dream? Fear, joy, confusion?", category: "emotion" },
  { prompt: "Was there a door or portal in your dream? Where did it lead?", category: "symbolism" },
  { prompt: "Describe the setting of your most recent dream in 3 words.", category: "recall" },
  { prompt: "Did you have a lucid moment? What did you do with it?", category: "lucid" },
  { prompt: "What sound do you remember from your dream?", category: "sensation" },
  { prompt: "If your dream had a title, what would it be?", category: "creative" },
  { prompt: "Were you yourself in the dream, or someone else?", category: "identity" },
  { prompt: "What was the weather like in your dream?", category: "setting" },
  { prompt: "Did any animals appear? What were they doing?", category: "symbols" },
  { prompt: "What was the strangest thing that happened?", category: "recall" },
  { prompt: "Were you trying to accomplish something in the dream?", category: "narrative" },
  { prompt: "How did you feel when you woke up? Rested, confused, sad?", category: "emotion" },
  { prompt: "Was there a recurring element from previous dreams?", category: "patterns" },
  { prompt: "Describe a dream where you had a superpower. What was it?", category: "creative" },
  { prompt: "What would you ask a dream character if you could?", category: "lucid" },
  { prompt: "Did you dream in color or black and white?", category: "recall" },
  { prompt: "What food, if any, appeared in your dream?", category: "symbols" },
  { prompt: "Were you indoors or outdoors? Describe the space.", category: "setting" },
  { prompt: "Did time feel normal in your dream, or was it distorted?", category: "perception" },
  { prompt: "What object from your waking life appeared in your dream?", category: "symbols" },
  { prompt: "Were you alone or with others? Who?", category: "characters" },
  { prompt: "What was the last thing that happened before you woke?", category: "narrative" },
  { prompt: "If you could re-enter one dream, which would it be?", category: "reflection" },
  { prompt: "Did you notice anything odd that you ignored in the dream?", category: "lucid" },
  { prompt: "What music or sounds accompanied your dream?", category: "sensation" },
  { prompt: "Was there a vehicle in your dream? Where were you going?", category: "narrative" },
  { prompt: "Describe your dream as if it were a movie review.", category: "creative" },
];

export function getDailyPrompt() {
  // Use day of year as seed so everyone gets the same prompt each day
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = dayOfYear % DREAM_PROMPTS.length;
  return DREAM_PROMPTS[index];
}

export function getRandomPrompt() {
  const index = Math.floor(Math.random() * DREAM_PROMPTS.length);
  return DREAM_PROMPTS[index];
}

// ── Dream Mood Tracking ───────────────────────────────────────────────

export function getMoodStats(discordId, days = 30) {
  const entries = db.prepare(
    `SELECT mood, COUNT(*) as count FROM dream_entries 
     WHERE discord_id = ? AND mood IS NOT NULL 
     AND date(entry_date) >= date('now', ?) 
     GROUP BY mood ORDER BY count DESC`
  ).all(discordId, `-${days} days`);

  return entries;
}

// ── Weekly Dream Summary ──────────────────────────────────────────────

export function getWeeklySummary(discordId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const entries = db.prepare(
    `SELECT * FROM dream_entries 
     WHERE discord_id = ? AND date(entry_date) >= date(?) 
     ORDER BY entry_date DESC`
  ).all(discordId, weekAgo.toISOString().split('T')[0]);

  if (entries.length === 0) return null;

  const moods = entries.filter(e => e.mood).map(e => e.mood);
  const moodCounts = {};
  moods.forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  const streak = calculateStreak(discordId);

  return {
    totalDreams: entries.length,
    daysActive: new Set(entries.map(e => e.entry_date)).size,
    topMood: topMood ? topMood[0] : 'unknown',
    streak,
    entries: entries.slice(0, 5), // Last 5 entries
  };
}

// ── Dream Search ──────────────────────────────────────────────────────

export function searchDreams(discordId, query) {
  return db.prepare(
    `SELECT * FROM dream_entries 
     WHERE discord_id = ? AND (content LIKE ? OR tags LIKE ? OR mood LIKE ?)
     ORDER BY entry_date DESC LIMIT 20`
  ).all(discordId, `%${query}%`, `%${query}%`, `%${query}%`);
}

// ── Dream Stats ───────────────────────────────────────────────────────

export function getDreamStats(discordId) {
  const total = db.prepare('SELECT COUNT(*) as count FROM dream_entries WHERE discord_id = ?').get(discordId);
  const thisMonth = db.prepare(
    `SELECT COUNT(*) as count FROM dream_entries 
     WHERE discord_id = ? AND date(entry_date) >= date('now', 'start of month')`
  ).get(discordId);
  const streak = calculateStreak(discordId);
  const uniqueMoods = db.prepare(
    'SELECT DISTINCT mood FROM dream_entries WHERE discord_id = ? AND mood IS NOT NULL'
  ).all(discordId);

  return {
    totalDreams: total?.count || 0,
    thisMonth: thisMonth?.count || 0,
    streak,
    moodsTracked: uniqueMoods.map(m => m.mood),
  };
}
