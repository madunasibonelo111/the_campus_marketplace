-- ============================================================
-- Campus Marketplace – Complete Queries (Sprint 1 + Sprint 2)
-- Database: PostgreSQL / Supabase
-- Usage: Reference for backend API developers
-- $1, $2, ... = parameters passed in from the backend
-- NOTE: In Supabase SQL Editor, replace $1 with actual values
--       e.g. WHERE provider_id = $1 becomes WHERE provider_id = 'abc123'
-- ============================================================

-- ============================================================
-- USER QUERIES
-- ============================================================

-- Q1: Get user by provider_id (OAuth)
-- Used: on every login to find the user in our DB
SELECT * FROM users WHERE provider_id = $1;

-- Q2: Insert new user on first login
INSERT INTO users (name, email, role, provider_id, verified_status, verified_at)
VALUES ($1, $2, 'student', $3, 'verified', NOW())
RETURNING *;

-- Q3: Get user by ID
SELECT id, name, email, role, verified_status, verified_at, created_at
FROM users WHERE id = $1;

-- Q4: Get user by email
SELECT * FROM users WHERE email = $1;

-- Q5: Update user verified status (admin)
UPDATE users
SET verified_status = 'verified', verified_at = NOW()
WHERE id = $1
RETURNING *;

-- Q6: Suspend a user (admin)
UPDATE users
SET verified_status = 'suspended'
WHERE id = $1
RETURNING *;

-- Q7: Update user profile (name, email)
UPDATE users
SET name = $1, email = $2
WHERE id = $3
RETURNING *;

-- ============================================================
-- CATEGORY QUERIES
-- ============================================================

-- Q8: Get all categories
SELECT * FROM categories ORDER BY name ASC;

-- Q9: Get category by ID
SELECT * FROM categories WHERE id = $1;

-- Q10: Create a new category (admin)
INSERT INTO categories (name) VALUES ($1) RETURNING *;

-- ============================================================
-- LISTING QUERIES (browse, filter, CRUD)
-- ============================================================

-- Q11: Get all active listings (browse page) with cover image
SELECT DISTINCT ON (l.id)
    l.id, l.title, l.description, l.condition, l.price,
    l.listing_type, l.status, l.created_at,
    c.name AS category, u.name AS seller_name,
    li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id AND li.display_order = 0
WHERE l.status = 'active'
ORDER BY l.id, l.created_at DESC LIMIT $1 OFFSET $2;;

-- Q12: Filter listings by category name
SELECT l.id, l.title, l.condition, l.price, l.listing_type,
       c.name AS category, u.name AS seller_name, li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id AND li.display_order = 0
WHERE l.status = 'active' AND c.name = $1
ORDER BY l.created_at DESC;

-- Q13: Filter listings by price range
SELECT l.id, l.title, l.condition, l.price, l.listing_type,
       c.name AS category, u.name AS seller_name, li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id AND li.display_order = 0
WHERE l.status = 'active' AND l.price BETWEEN $1 AND $2
ORDER BY l.price ASC;

-- Q14: Filter by category AND price range combined
SELECT l.id, l.title, l.condition, l.price, l.listing_type,
       c.name AS category, u.name AS seller_name, li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id AND li.display_order = 0
WHERE l.status = 'active' AND c.name = $1 AND l.price BETWEEN $2 AND $3
ORDER BY l.price ASC;

-- Q15: Search listings by keyword (title)
SELECT l.id, l.title, l.condition, l.price, l.listing_type,
       c.name AS category, u.name AS seller_name, li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id AND li.display_order = 0
WHERE l.status = 'active' AND l.title ILIKE '%' || $1 || '%'
ORDER BY l.created_at DESC;



-- Q16: Get single listing with ALL images
SELECT l.id, l.title, l.description, l.condition, l.price, l.listing_type,
       l.status, l.created_at, l.updated_at,
       c.name AS category, u.id AS seller_id, u.name AS seller_name,
       COALESCE(json_agg(json_build_object('url', li.image_url, 'order', li.display_order)
                         ORDER BY li.display_order), '[]') AS images
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id
WHERE l.id = $1
GROUP BY l.id, c.name, u.id, u.name;

-- Q17: Get all listings by a specific seller
SELECT l.id, l.title, l.condition, l.price, l.listing_type, l.status, l.created_at,
       c.name AS category, li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
LEFT JOIN listing_images li ON li.listing_id = l.id AND li.display_order = 0
WHERE l.user_id = $1
ORDER BY l.created_at DESC;

-- Q18: Create a new listing
INSERT INTO listings (user_id, category_id, title, description, condition, price, listing_type)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- Q19: Update an existing listing (owner only)
UPDATE listings
SET title = $1, description = $2, condition = $3, price = $4,
    listing_type = $5, category_id = $6, updated_at = NOW()
WHERE id = $7 AND user_id = $8
RETURNING *;

-- Q20: Soft-delete listing (owner only)
UPDATE listings SET status = 'removed', updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- Q21: Mark listing as sold (after completed transaction)
UPDATE listings SET status = 'sold', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- ============================================================
-- LISTING IMAGE QUERIES
-- ============================================================

-- Q22: Add image to a listing
INSERT INTO listing_images (listing_id, image_url, display_order)
VALUES ($1, $2, $3)
RETURNING *;

-- Q23: Get all images for a listing
SELECT id, image_url, display_order, uploaded_at
FROM listing_images
WHERE listing_id = $1
ORDER BY display_order ASC;

-- Q24: Delete a specific image (owner safety check via listing_id)
DELETE FROM listing_images
WHERE id = $1 AND listing_id = $2
RETURNING *;

-- Q25: Reorder images – update display_order
UPDATE listing_images
SET display_order = $1
WHERE id = $2 AND listing_id = $3
RETURNING *;

-- ============================================================
-- TRANSACTION QUERIES (purchase & trade)
-- ============================================================

-- Q26: Create a new transaction (for purchase or trade)
INSERT INTO transactions (listing_id, buyer_id, seller_id, type, offer_amount, trade_item_description)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- Q27: Get transaction by ID with full details
SELECT t.*, l.title AS listing_title, l.price AS listing_price,
       buyer.name AS buyer_name, seller.name AS seller_name
FROM transactions t
JOIN listings l ON l.id = t.listing_id
JOIN users buyer ON buyer.id = t.buyer_id
JOIN users seller ON seller.id = t.seller_id
WHERE t.id = $1;

-- Q28: Get all transactions for a user (as buyer or seller)
SELECT t.*, l.title AS listing_title, buyer.name AS buyer_name, seller.name AS seller_name
FROM transactions t
JOIN listings l ON l.id = t.listing_id
JOIN users buyer ON buyer.id = t.buyer_id
JOIN users seller ON seller.id = t.seller_id
WHERE t.buyer_id = $1 OR t.seller_id = $1
ORDER BY t.created_at DESC;

-- Q29: Update transaction status (e.g., accept, complete, cancel)
UPDATE transactions
SET status = $1, updated_at = NOW(),
    accepted_at = CASE WHEN $1 = 'accepted' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
    completed_at = CASE WHEN $1 = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
WHERE id = $2
RETURNING *;

-- Q30: Update transaction with offer status (for counter-offers)
UPDATE transactions
SET offer_status = $1, offer_amount = $2, updated_at = NOW()
WHERE id = $3
RETURNING *;

-- ============================================================
-- TRADE OFFER QUERIES (dedicated trade negotiation)
-- ============================================================

-- Q31: Create a new trade offer
INSERT INTO trade_offers (listing_id, offered_item_id, buyer_id, seller_id, status)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING *;

-- Q32: Get trade offer by ID
SELECT toff.*,
       wanted.title AS wanted_item_title, offered.title AS offered_item_title,
       buyer.name AS buyer_name, seller.name AS seller_name
FROM trade_offers toff
JOIN listings wanted ON wanted.id = toff.listing_id
JOIN listings offered ON offered.id = toff.offered_item_id
JOIN users buyer ON buyer.id = toff.buyer_id
JOIN users seller ON seller.id = toff.seller_id
WHERE toff.id = $1;

-- Q33: Get all pending trade offers for a seller (incoming)
SELECT toff.*, wanted.title AS wanted_item_title, offered.title AS offered_item_title,
       buyer.name AS buyer_name
FROM trade_offers toff
JOIN listings wanted ON wanted.id = toff.listing_id
JOIN listings offered ON offered.id = toff.offered_item_id
JOIN users buyer ON buyer.id = toff.buyer_id
WHERE toff.seller_id = $1 AND toff.status = 'pending'
ORDER BY toff.created_at DESC;

-- Q34: Get all trade offers sent by a buyer (outgoing)
SELECT toff.*, wanted.title AS wanted_item_title, offered.title AS offered_item_title,
       seller.name AS seller_name
FROM trade_offers toff
JOIN listings wanted ON wanted.id = toff.listing_id
JOIN listings offered ON offered.id = toff.offered_item_id
JOIN users seller ON seller.id = toff.seller_id
WHERE toff.buyer_id = $1
ORDER BY toff.created_at DESC;

-- Q35: Accept a trade offer (seller)
UPDATE trade_offers
SET status = 'accepted'
WHERE id = $1 AND seller_id = $2 AND status = 'pending'
RETURNING *;

-- Q36: Reject a trade offer (seller)
UPDATE trade_offers
SET status = 'rejected'
WHERE id = $1 AND seller_id = $2 AND status = 'pending'
RETURNING *;

-- Q37: Counter a trade offer (create a new offer from seller to buyer)
-- The seller becomes buyer of the new offer, offering a different item.
INSERT INTO trade_offers (listing_id, offered_item_id, buyer_id, seller_id, status)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING *;

-- Q38: Get all trade offers related to a specific listing
SELECT toff.*, buyer.name AS buyer_name, offered.title AS offered_item_title
FROM trade_offers toff
JOIN users buyer ON buyer.id = toff.buyer_id
JOIN listings offered ON offered.id = toff.offered_item_id
WHERE toff.listing_id = $1
ORDER BY toff.created_at DESC;

-- ============================================================
-- CONVERSATION & MESSAGE QUERIES (Sprint 2)
-- ============================================================

-- Q39: Get or create a conversation between buyer and seller for a listing
-- First try to find existing
SELECT * FROM conversations
WHERE listing_id = $1 AND buyer_id = $2 AND seller_id = $3
LIMIT 1;
-- If not found, insert:
INSERT INTO conversations (listing_id, buyer_id, seller_id)
VALUES ($1, $2, $3)
ON CONFLICT (listing_id, buyer_id, seller_id) DO NOTHING
RETURNING *;

-- Q40: Send a message
INSERT INTO messages (conversation_id, sender_id, body)
VALUES ($1, $2, $3)
RETURNING *;

-- Q41: Get all messages for a conversation (ordered oldest to newest)
SELECT m.*, u.name AS sender_name
FROM messages m
JOIN users u ON u.id = m.sender_id
WHERE m.conversation_id = $1
ORDER BY m.created_at ASC;

-- Q42: Mark messages as read (for a specific user in a conversation)
UPDATE messages
SET is_read = TRUE
WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE;

-- Q43: Get all conversations for a user (as buyer or seller)
SELECT c.*,
       l.title AS listing_title,
       buyer.name AS buyer_name, seller.name AS seller_name,
       (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = FALSE AND sender_id != $1) AS unread_count
FROM conversations c
JOIN listings l ON l.id = c.listing_id
JOIN users buyer ON buyer.id = c.buyer_id
JOIN users seller ON seller.id = c.seller_id
WHERE c.buyer_id = $1 OR c.seller_id = $1
ORDER BY c.updated_at DESC;

-- Q44: Get unread message count for a user across all conversations
SELECT COUNT(*) AS unread_total
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE (c.buyer_id = $1 OR c.seller_id = $1)
  AND m.sender_id != $1
  AND m.is_read = FALSE;

-- ============================================================
-- PAYMENT QUERIES (Sprint 2)
-- ============================================================

-- Q45: Create a payment record
INSERT INTO payments (transaction_id, payer_id, amount, method, shortfall_amount, reference)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- Q46: Update payment status
UPDATE payments
SET status = $1, paid_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE paid_at END,
    updated_at = NOW()
WHERE id = $2
RETURNING *;

-- Q47: Get payments for a transaction
SELECT * FROM payments
WHERE transaction_id = $1
ORDER BY created_at ASC;

-- Q48: Get all payments made by a user (payer)
SELECT p.*, t.listing_id, l.title AS listing_title
FROM payments p
JOIN transactions t ON t.id = p.transaction_id
JOIN listings l ON l.id = t.listing_id
WHERE p.payer_id = $1
ORDER BY p.created_at DESC;

-- Q49: Get outstanding balance for a partial payment transaction
SELECT t.id, t.listing_id, l.price,
       COALESCE(SUM(p.amount), 0) AS paid_total,
       l.price - COALESCE(SUM(p.amount), 0) AS remaining_balance
FROM transactions t
JOIN listings l ON l.id = t.listing_id
LEFT JOIN payments p ON p.transaction_id = t.id AND p.status = 'completed'
WHERE t.id = $1
GROUP BY t.id, l.price;

-- ============================================================
-- SAVED CARDS QUERIES (Sprint 2)
-- ============================================================

-- Q50: Save a card for a user
INSERT INTO saved_cards (user_id, gateway_token, last4, card_brand, expiry_month, expiry_year, is_default)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- Q51: Get all saved cards for a user
SELECT * FROM saved_cards
WHERE user_id = $1
ORDER BY is_default DESC, created_at DESC;

-- Q52: Delete a saved card
DELETE FROM saved_cards
WHERE id = $1 AND user_id = $2
RETURNING *;

-- Q53: Set a card as default (clear others first)
UPDATE saved_cards SET is_default = FALSE WHERE user_id = $1;
UPDATE saved_cards SET is_default = TRUE WHERE id = $2 AND user_id = $1
RETURNING *;

-- ============================================================
-- RATING & REVIEW QUERIES (Sprint 2)
-- ============================================================

-- Q54: Create a rating for a completed transaction
INSERT INTO ratings (transaction_id, reviewer_id, reviewee_id, score, comment)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- Q55: Get average rating for a user (reviewee)
SELECT reviewee_id,
       AVG(score)::NUMERIC(3,2) AS average_rating,
       COUNT(*) AS total_reviews
FROM ratings
WHERE reviewee_id = $1
GROUP BY reviewee_id;

-- Q56: Get all reviews for a user (with reviewer names)
SELECT r.score, r.comment, r.created_at,
       reviewer.name AS reviewer_name
FROM ratings r
JOIN users reviewer ON reviewer.id = r.reviewer_id
WHERE r.reviewee_id = $1
ORDER BY r.created_at DESC;

-- Q57: Check if a user has already rated a transaction (to prevent double rating)
SELECT EXISTS (
    SELECT 1 FROM ratings WHERE transaction_id = $1 AND reviewer_id = $2
) AS already_rated;

-- ============================================================
-- ANALYTICS & AGGREGATION QUERIES (Sprint 3/4)
-- ============================================================

-- Q58: Get total listings, active listings, sold/traded per user (seller stats)
SELECT u.id, u.name,
       COUNT(l.id) AS total_listings,
       COUNT(CASE WHEN l.status = 'active' THEN 1 END) AS active_listings,
       COUNT(CASE WHEN l.status IN ('sold', 'traded') THEN 1 END) AS sold_or_traded
FROM users u
LEFT JOIN listings l ON l.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total_listings DESC;

-- Q59: Top 5 categories by number of active listings
SELECT c.name, COUNT(l.id) AS listing_count
FROM categories c
JOIN listings l ON l.category_id = c.id
WHERE l.status = 'active'
GROUP BY c.id, c.name
ORDER BY listing_count DESC
LIMIT 5;

-- Q60: Revenue / sales volume (sum of listing prices for completed purchases)
SELECT SUM(l.price) AS total_revenue
FROM transactions t
JOIN listings l ON l.id = t.listing_id
WHERE t.type = 'purchase' AND t.status = 'completed';

-- Q61: Monthly listing creation trend
SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS new_listings
FROM listings
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Q62: User reputation summary (average rating + number of reviews)
SELECT u.id, u.name,
       COALESCE(AVG(r.score), 0) AS avg_rating,
       COUNT(r.id) AS total_received_ratings
FROM users u
LEFT JOIN ratings r ON r.reviewee_id = u.id
GROUP BY u.id, u.name;

-- Q63: Average time to complete a transaction (from creation to completed_at)
SELECT AVG(completed_at - created_at) AS avg_completion_time
FROM transactions
WHERE status = 'completed' AND completed_at IS NOT NULL;

-- Q64: Most active buyers (by number of transactions as buyer)
SELECT u.id, u.name, COUNT(t.id) AS purchases_made
FROM users u
JOIN transactions t ON t.buyer_id = u.id
GROUP BY u.id, u.name
ORDER BY purchases_made DESC
LIMIT 10;

-- Q65: Listings that have received trade offers but are still active
SELECT DISTINCT l.id, l.title, COUNT(toff.id) AS trade_offers_received
FROM listings l
JOIN trade_offers toff ON toff.listing_id = l.id
WHERE l.status = 'active'
GROUP BY l.id, l.title
ORDER BY trade_offers_received DESC;