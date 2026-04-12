CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================
-- Campus Marketplace – Sprint 1 SQL Schema
-- Tables: USERS, CATEGORIES, LISTINGS, LISTING_IMAGES, TRANSACTIONS
-- Database: PostgreSQL
-- ============================================================

/*Backend must call fromusers table*/
-- ------------------------------------------------------------
-- ENUMS
-- Define all custom types 
-- ------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');

CREATE TYPE verified_status AS ENUM ('unverified', 'verified', 'suspended');

CREATE TYPE condition_type AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

CREATE TYPE listing_type AS ENUM ('sale', 'trade', 'either');

CREATE TYPE listing_status AS ENUM ('active', 'sold', 'traded', 'removed');

CREATE TYPE transaction_type AS ENUM ('purchase', 'trade');

CREATE TYPE transaction_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled');


-- ------------------------------------------------------------
-- 1. CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE categories (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100)        NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 2. USERS
-- Created before LISTINGS and TRANSACTIONS (both reference it)
-- ------------------------------------------------------------
CREATE TABLE users (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255)        NOT NULL,
    email               VARCHAR(255)        NOT NULL UNIQUE,
    role                user_role           NOT NULL DEFAULT 'student',
    verified_status     verified_status     NOT NULL DEFAULT 'unverified',
    verified_at         TIMESTAMPTZ         NULL,       -- set when verified_status becomes 'verified'
    provider_id         VARCHAR(255)        NULL UNIQUE, -- ID from 3rd party identity provider 
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);



-- ------------------------------------------------------------
-- 3. LISTINGS
-- Depends on: users (seller), categories
-- ------------------------------------------------------------
CREATE TABLE listings (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                NOT NULL,   -- FK to users (seller)
    category_id     UUID                NOT NULL,   -- FK to categories
    title           VARCHAR(255)        NOT NULL,
    description     TEXT                NOT NULL,
    condition       condition_type      NOT NULL,
    price           NUMERIC(10, 2)      NULL        -- NULL allowed for trade-only listings
                        CHECK (price IS NULL OR price >= 0),
    listing_type    listing_type        NOT NULL,
    status          listing_status      NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_listings_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE, /* if you delete  a row in users, all data related to user are deleted as well*/

    CONSTRAINT fk_listings_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT
);
/*ON DELETE RESTRICT
Meaning: If you try to delete a user who still has any listings,
 the database refuses the delete operation and throws an error.*/


-- ------------------------------------------------------------
-- 4. LISTING_IMAGES
-- Depends on: listings
-- At least 1 image required per listing 
-- display_order = 0 means cover/primary image
-- ------------------------------------------------------------
CREATE TABLE listing_images (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID                NOT NULL,   -- FK to listings
    image_url       VARCHAR(500)        NOT NULL,   -- Azure Blob Storage URL
    display_order   INT                 NOT NULL DEFAULT 0,
    uploaded_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_listing_images_listing
        FOREIGN KEY (listing_id) REFERENCES listings(id)
        ON DELETE CASCADE   -- delete images when listing is deleted
);
ALTER TABLE listing_images
ADD CONSTRAINT unique_image_order
UNIQUE(listing_id, display_order);

-- ------------------------------------------------------------
-- 5. TRANSACTIONS
-- Depends on: listings, users (buyer + seller)
-- Included here as it connects directly to Sprint 1 entities
-- Fully activated in Sprint 2
-- ------------------------------------------------------------
CREATE TABLE transactions (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID                NOT NULL,   -- FK to listings
    buyer_id        UUID                NOT NULL,   -- FK to users
    seller_id       UUID                NOT NULL,   -- FK to users (copied from listing)
    type            transaction_type    NOT NULL,
    status          transaction_status  NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_transactions_listing
        FOREIGN KEY (listing_id) REFERENCES listings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_transactions_buyer
        FOREIGN KEY (buyer_id) REFERENCES users(id),

    CONSTRAINT fk_transactions_seller
        FOREIGN KEY (seller_id) REFERENCES users(id),

    CHECK (buyer_id <> seller_id)  
);

CREATE INDEX idx_listings_user
ON listings(user_id);
/* everytime a student logs in ,the app will search users by email to find
student account.Happens evry login*/
CREATE INDEX idx_users_email
ON users(email);
/*Browsing and filtering.
 Every time a student clicks Electronics or Textbooks, your
  app runs a query filtering by category_id.
  */
CREATE INDEX idx_listings_category
ON listings(category_id);
/*E.gWhen a student sets a max price of R500, your app queries WHERE price <= 500. 
Without this index it scans every listing. Making itslow
 With it, it goes straight to the relevant price range. */
CREATE INDEX idx_listings_price
ON listings(price);
CREATE INDEX idx_listings_status
ON listings(status);
CREATE INDEX idx_transactions_user
ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_listing_images_listing ON listing_images(listing_id);

-- ============================================================
-- TRIGGERS
-- Auto-update updated_at on row changes
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
