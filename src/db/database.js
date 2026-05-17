// Database setup — SQLite with better-sqlite3
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DB_PATH || './data/everdream.db';

// Ensure data directory exists
const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  db.exec(`
    -- Linked wallets (SIWE)
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL UNIQUE,
      eth_address TEXT NOT NULL UNIQUE,
      linked_at TEXT DEFAULT (datetime('now')),
      nonce TEXT
    );

    -- User profiles + gamification
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL UNIQUE,
      username TEXT,
      points INTEGER DEFAULT 0,
      uploads INTEGER DEFAULT 0,
      ratings_given INTEGER DEFAULT 0,
      ratings_received INTEGER DEFAULT 0,
      trades_completed INTEGER DEFAULT 0,
      remixes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Content items (uploaded to platform, referenced in Discord)
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id TEXT NOT NULL UNIQUE,
      creator_discord_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      image_url TEXT,
      metadata_json TEXT,
      average_rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_discord_id) REFERENCES users(discord_id)
    );

    -- Ratings
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id TEXT NOT NULL,
      rater_discord_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(content_id, rater_discord_id),
      FOREIGN KEY (content_id) REFERENCES content(content_id)
    );

    -- Remix provenance chain
    CREATE TABLE IF NOT EXISTS remixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      derivative_content_id TEXT NOT NULL,
      original_content_id TEXT NOT NULL,
      remixer_discord_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (derivative_content_id) REFERENCES content(content_id),
      FOREIGN KEY (original_content_id) REFERENCES content(content_id)
    );

    -- Trading listings
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id TEXT NOT NULL,
      seller_discord_id TEXT NOT NULL,
      price_eth REAL NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'sold', 'cancelled', 'escrow')),
      buyer_discord_id TEXT,
      tx_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (content_id) REFERENCES content(content_id)
    );

    -- Trade history / provenance
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id TEXT NOT NULL,
      from_discord_id TEXT NOT NULL,
      to_discord_id TEXT NOT NULL,
      price_eth REAL,
      tx_hash TEXT,
      traded_at TEXT DEFAULT (datetime('now'))
    );

    -- Token-gated role assignments
    CREATE TABLE IF NOT EXISTS token_gates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id TEXT NOT NULL,
      contract_address TEXT NOT NULL,
      chain_id INTEGER DEFAULT 1,
      min_balance INTEGER DEFAULT 1,
      description TEXT,
      UNIQUE(role_id, contract_address)
    );

    -- Gamification action log
    CREATE TABLE IF NOT EXISTS action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      action TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_ratings_content ON ratings(content_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_rater ON ratings(rater_discord_id);
    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
    CREATE INDEX IF NOT EXISTS idx_content_creator ON content(creator_discord_id);
    CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
    CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(eth_address);
  `);
}

// Run migrations on import
migrate();

export default db;
