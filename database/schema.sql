-- ============================================================
-- Campus Marketplace – FINAL CORRECTED SCHEMA
-- PostgreSQL / Supabase Compatible
-- Sprint 1 + Sprint 2 Ready
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');

CREATE TYPE verified_status AS ENUM
('unverified', 'verified', 'suspended');

CREATE TYPE condition_type AS ENUM
('new', 'like_new', 'good', 'fair', 'poor');

CREATE TYPE listing_type AS ENUM
('sale', 'trade', 'either');

CREATE TYPE listing_status AS ENUM
('active', 'sold', 'traded', 'removed');

CREATE TYPE transaction_type AS ENUM
('purchase', 'trade');

CREATE TYPE transaction_status AS ENUM
('pending', 'accepted', 'completed', 'cancelled');

CREATE TYPE payment_method AS ENUM
('online', 'cash', 'partial');

CREATE TYPE payment_status AS ENUM
('pending', 'completed', 'failed', 'refunded');

CREATE TYPE trade_offer_status AS ENUM
('pending', 'accepted', 'rejected', 'countered');

-- ============================================================
-- TABLES – CORE
-- ============================================================

CREATE TABLE categories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100)
        NOT NULL
        UNIQUE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()

);

-- ============================================================

CREATE TABLE users (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255)
        NOT NULL,

    email VARCHAR(255)
        NOT NULL
        UNIQUE,

    role user_role
        NOT NULL DEFAULT 'student',

    verified_status verified_status
        NOT NULL DEFAULT 'unverified',

    verified_at TIMESTAMPTZ NULL,

    provider_id VARCHAR(255)
        UNIQUE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()

);

-- ============================================================

CREATE TABLE listings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    category_id UUID NOT NULL,

    title VARCHAR(255)
        NOT NULL,

    description TEXT
        NOT NULL,

    condition condition_type
        NOT NULL,

    price NUMERIC(10,2)
        CHECK (price IS NULL OR price >= 0),

    listing_type listing_type
        NOT NULL,

    status listing_status
        NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (category_id)
        REFERENCES categories(id)

);

-- ============================================================

CREATE TABLE listing_images (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    listing_id UUID NOT NULL,

    image_url VARCHAR(500)
        NOT NULL,

    display_order INT
        NOT NULL DEFAULT 0,

    uploaded_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    FOREIGN KEY (listing_id)
        REFERENCES listings(id)
        ON DELETE CASCADE,

    UNIQUE (listing_id, display_order),

    UNIQUE (listing_id, image_url)

);

-- Cover image constraint

CREATE UNIQUE INDEX unique_cover_image
ON listing_images(listing_id)
WHERE display_order = 0;

-- ============================================================

CREATE TABLE transactions (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    listing_id UUID NOT NULL,

    buyer_id UUID NOT NULL,

    seller_id UUID NOT NULL,

    type transaction_type
        NOT NULL,

    status transaction_status
        NOT NULL DEFAULT 'pending',

    offer_amount NUMERIC(10,2)
        CHECK (offer_amount >= 0),

    offer_status trade_offer_status
        DEFAULT 'pending',

    trade_item_description TEXT,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW(),

    accepted_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    FOREIGN KEY (listing_id)
        REFERENCES listings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (buyer_id)
        REFERENCES users(id),

    FOREIGN KEY (seller_id)
        REFERENCES users(id),

    CHECK (buyer_id <> seller_id)

);

-- ============================================================

CREATE TABLE conversations (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    listing_id UUID NOT NULL,

    buyer_id UUID NOT NULL,

    seller_id UUID NOT NULL,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW(),

    FOREIGN KEY (listing_id)
        REFERENCES listings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (seller_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE (listing_id, buyer_id, seller_id),

    CHECK (buyer_id <> seller_id)

);

-- ============================================================

CREATE TABLE messages (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL,

    sender_id UUID NOT NULL,

    body TEXT
        NOT NULL
        CHECK (length(body) > 0),

    is_read BOOLEAN
        DEFAULT FALSE,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE

);

-- ============================================================

CREATE TABLE payments (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    transaction_id UUID NOT NULL,

    payer_id UUID NOT NULL,

    amount NUMERIC(10,2)
        NOT NULL
        CHECK (amount > 0),

    method payment_method
        NOT NULL,

    status payment_status
        DEFAULT 'pending',

    shortfall_amount NUMERIC(10,2)
        CHECK (shortfall_amount >= 0),

    reference VARCHAR(255),

    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW(),

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE,

    FOREIGN KEY (payer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CHECK (
        method != 'partial'
        OR shortfall_amount IS NOT NULL
    )

);

-- ============================================================

CREATE TABLE saved_cards (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    gateway_token TEXT NOT NULL,

    last4 VARCHAR(4) NOT NULL,

    card_brand VARCHAR(20) NOT NULL,

    expiry_month SMALLINT,

    expiry_year SMALLINT,

    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

);

-- ============================================================

CREATE TABLE ratings (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    transaction_id UUID
        NOT NULL UNIQUE,

    reviewer_id UUID
        NOT NULL,

    reviewee_id UUID
        NOT NULL,

    score SMALLINT
        CHECK (score BETWEEN 1 AND 5),

    comment TEXT,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE,

    FOREIGN KEY (reviewer_id)
        REFERENCES users(id),

    FOREIGN KEY (reviewee_id)
        REFERENCES users(id),

    CHECK (reviewer_id <> reviewee_id)

);

-- ============================================================

CREATE TABLE trade_offers (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    listing_id UUID NOT NULL,

    offered_item_id UUID NOT NULL,

    buyer_id UUID NOT NULL,

    seller_id UUID NOT NULL,

    status trade_offer_status
        DEFAULT 'pending',

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    FOREIGN KEY (listing_id)
        REFERENCES listings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (offered_item_id)
        REFERENCES listings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (buyer_id)
        REFERENCES users(id),

    FOREIGN KEY (seller_id)
        REFERENCES users(id),

    CHECK (buyer_id <> seller_id),

    CHECK (listing_id <> offered_item_id)

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_listings_user
ON listings(user_id);

CREATE INDEX idx_listings_category
ON listings(category_id);

CREATE INDEX idx_listings_status
ON listings(status);

CREATE INDEX idx_listings_price
ON listings(price);

CREATE INDEX idx_listing_title_search
ON listings
USING gin (title gin_trgm_ops);

CREATE INDEX idx_messages_conversation
ON messages(conversation_id);

CREATE INDEX idx_messages_unread
ON messages(conversation_id, is_read);

CREATE INDEX idx_conversations_buyer
ON conversations(buyer_id);

CREATE INDEX idx_conversations_seller
ON conversations(seller_id);

CREATE INDEX idx_payments_transaction
ON payments(transaction_id);

CREATE INDEX idx_trade_offers_listing
ON trade_offers(listing_id);

CREATE INDEX idx_ratings_reviewee
ON ratings(reviewee_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_listings_updated
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transactions_updated
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_conversations_updated
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();