// Trading system — listings, purchases, escrow tracking
import db from '../db/database.js';
import { awardPoints } from './gamification.js';

// Create a listing
export function createListing(contentId, sellerDiscordId, priceEth) {
  // Check if content exists and seller is creator
  const content = db.prepare('SELECT * FROM content WHERE content_id = ?').get(contentId);
  if (!content) return { error: 'Content not found. Use !upload first.' };
  if (content.creator_discord_id !== sellerDiscordId) return { error: 'You are not the creator of this content.' };

  // Check for existing active listing
  const existing = db.prepare('SELECT * FROM listings WHERE content_id = ? AND status = "active"').get(contentId);
  if (existing) return { error: 'This content is already listed. Use !cancel first.' };

  db.prepare('INSERT INTO listings (content_id, seller_discord_id, price_eth) VALUES (?, ?, ?)')
    .run(contentId, sellerDiscordId, priceEth);

  const listing = db.prepare('SELECT * FROM listings WHERE content_id = ? AND seller_discord_id = ? ORDER BY id DESC LIMIT 1').get(contentId, sellerDiscordId);
  return { success: true, listing };
}

// Buy a listing
export function buyListing(listingId, buyerDiscordId) {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
  if (!listing) return { error: 'Listing not found.' };
  if (listing.status !== 'active') return { error: `Listing is ${listing.status}.` };
  if (listing.seller_discord_id === buyerDiscordId) return { error: 'You cannot buy your own listing.' };

  // Update listing
  db.prepare('UPDATE listings SET status = "escrow", buyer_discord_id = ?, updated_at = datetime("now") WHERE id = ?')
    .run(buyerDiscordId, listingId);

  return {
    success: true,
    listing: { ...listing, status: 'escrow', buyer_discord_id: buyerDiscordId },
    message: `Purchase initiated. Price: ${listing.price_eth} ETH. Awaiting on-chain confirmation.`,
  };
}

// Confirm trade (called when on-chain tx is confirmed)
export function confirmTrade(listingId, txHash) {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
  if (!listing || listing.status !== 'escrow') return { error: 'Invalid listing or not in escrow.' };

  // Mark as sold
  db.prepare('UPDATE listings SET status = "sold", tx_hash = ?, updated_at = datetime("now") WHERE id = ?')
    .run(txHash, listingId);

  // Record trade history
  db.prepare('INSERT INTO trades (content_id, from_discord_id, to_discord_id, price_eth, tx_hash) VALUES (?, ?, ?, ?, ?)')
    .run(listing.content_id, listing.seller_discord_id, listing.buyer_discord_id, listing.price_eth, txHash);

  // Award points
  awardPoints(listing.seller_discord_id, null, 'TRADE_COMPLETED', `Sold ${listing.content_id}`);
  awardPoints(listing.buyer_discord_id, null, 'TRADE_COMPLETED', `Bought ${listing.content_id}`);

  return { success: true, listing: { ...listing, status: 'sold', tx_hash: txHash } };
}

// Cancel a listing
export function cancelListing(listingId, userId) {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
  if (!listing) return { error: 'Listing not found.' };
  if (listing.seller_discord_id !== userId) return { error: 'You are not the seller.' };
  if (listing.status !== 'active') return { error: `Cannot cancel a ${listing.status} listing.` };

  db.prepare('UPDATE listings SET status = "cancelled", updated_at = datetime("now") WHERE id = ?').run(listingId);
  return { success: true };
}

// Get active listings
export function getActiveListings(limit = 20) {
  return db.prepare(`
    SELECT l.*, c.title, c.image_url, c.creator_discord_id
    FROM listings l
    LEFT JOIN content c ON l.content_id = c.content_id
    WHERE l.status = 'active'
    ORDER BY l.created_at DESC
    LIMIT ?
  `).all(limit);
}

// Get user's listings
export function getUserListings(discordId) {
  return db.prepare(`
    SELECT l.*, c.title, c.image_url
    FROM listings l
    LEFT JOIN content c ON l.content_id = c.content_id
    WHERE l.seller_discord_id = ?
    ORDER BY l.created_at DESC
  `).all(discordId);
}

// Get trade history for content
export function getTradeHistory(contentId) {
  return db.prepare(`
    SELECT * FROM trades WHERE content_id = ? ORDER BY traded_at DESC
  `).all(contentId);
}
