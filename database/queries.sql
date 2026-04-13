-- ============================================================
-- Campus Marketplace – Sprint 1 Queries
-- Database: PostgreSQL / Supabase
-- Usage: Reference for backend API developers
-- $1, $2 etc. = parameters passed in from the backend
-- NOTE: In Supabase SQL Editor, replace $1 with actual values
-- e.g. WHERE provider_id = $1 becomes WHERE provider_id = 'abc123'
-- ============================================================


-- ============================================================
-- USER QUERIES
-- ============================================================

-- Q1: Get user by provider_id
-- Used: on every login to find the user in our DB
-- Called by: auth middleware
-- TEST: SELECT * FROM users WHERE provider_id = 'your-provider-id';
SELECT * 
FROM users 
WHERE provider_id = $1;


-- Q2: Insert new user on first login
-- Used: when a student logs in for the first time
-- Called by: auth callback after identity provider confirms
INSERT INTO users (name, email, role, provider_id, verified_status, verified_at)
VALUES ($1, $2, 'student', $3, 'verified', NOW())
RETURNING *;


-- Q3: Get user by ID
SELECT 
    id,
    name,
    email,
    role,
    verified_status,
    verified_at,
    created_at
FROM users 
WHERE id = $1;


-- Q4: Get user by email
-- Used: to check if a user already exists before inserting
SELECT * 
FROM users 
WHERE email = $1;


-- Q5: Update user verified status
-- Used: when admin verifies a student (Sprint 4)
UPDATE users
SET 
    verified_status = 'verified',
    verified_at     = NOW()
WHERE id = $1
RETURNING *;


-- ============================================================
-- CATEGORY QUERIES
-- ============================================================

-- Q6: Get all categories
-- TEST: Run this directly, no parameters needed
SELECT * 
FROM categories 
ORDER BY name ASC;


-- Q7: Get category by ID
SELECT * 
FROM categories 
WHERE id = $1;


-- ============================================================
-- LISTING QUERIES
-- ============================================================

-- Q8: Get all active listings (browse page)
-- TEST: Run this directly, no parameters needed
SELECT DISTINCT ON (l.id)
    l.id,
    l.title,
    l.description,
    l.condition,
    l.price,
    l.listing_type,
    l.status,
    l.created_at,
    c.name       AS category,
    u.name       AS seller_name,
    li.image_url AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id
LEFT JOIN listing_images li 
    ON li.listing_id = l.id
    AND li.display_order = 0
WHERE l.status = 'active'
ORDER BY l.id, l.created_at DESC;

-- Q9: Filter listings by category
-- TEST: replace $1 with 'Textbooks'
SELECT 
    l.id,
    l.title,
    l.condition,
    l.price,
    l.listing_type,
    c.name           AS category,
    u.name           AS seller_name,
    li.image_url     AS cover_image
FROM listings l
JOIN categories c        ON c.id  = l.category_id
JOIN users u             ON u.id  = l.user_id
LEFT JOIN listing_images li 
    ON  li.listing_id    = l.id 
    AND li.display_order = 0
WHERE l.status = 'active'
AND   c.name   = $1
ORDER BY l.created_at DESC;


-- Q10: Filter listings by price range
-- $1 = min price, $2 = max price
-- TEST: replace $1 with 100 and $2 with 500
SELECT 
    l.id,
    l.title,
    l.condition,
    l.price,
    l.listing_type,
    c.name           AS category,
    u.name           AS seller_name,
    li.image_url     AS cover_image
FROM listings l
JOIN categories c        ON c.id  = l.category_id
JOIN users u             ON u.id  = l.user_id
LEFT JOIN listing_images li 
    ON  li.listing_id    = l.id 
    AND li.display_order = 0
WHERE l.status = 'active'
AND   l.price  BETWEEN $1 AND $2
ORDER BY l.price ASC;


-- Q11: Filter by category AND price range combined
-- $1 = category name, $2 = min price, $3 = max price
-- TEST: replace $1 with 'Electronics', $2 with 100, $3 with 5000
SELECT 
    l.id,
    l.title,
    l.condition,
    l.price,
    l.listing_type,
    c.name           AS category,
    u.name           AS seller_name,
    li.image_url     AS cover_image
FROM listings l
JOIN categories c        ON c.id  = l.category_id
JOIN users u             ON u.id  = l.user_id
LEFT JOIN listing_images li 
    ON  li.listing_id    = l.id 
    AND li.display_order = 0
WHERE l.status = 'active'
AND   c.name   = $1
AND   l.price  BETWEEN $2 AND $3
ORDER BY l.price ASC;


-- Q12: Search listings by keyword
-- $1 = search keyword
-- TEST: replace '%' || $1 || '%' with '%calculus%'
SELECT 
    l.id,
    l.title,
    l.condition,
    l.price,
    l.listing_type,
    c.name           AS category,
    u.id             AS seller_id, 
    u.name           AS seller_name,
    li.image_url     AS cover_image
FROM listings l
JOIN categories c        ON c.id  = l.category_id
JOIN users u             ON u.id  = l.user_id
LEFT JOIN listing_images li 
    ON  li.listing_id    = l.id 
    AND li.display_order = 0
WHERE l.status = 'active'
AND   l.title  ILIKE '%' || $1 || '%'
ORDER BY l.created_at DESC;


-- Q13: Get single listing with ALL images
-- TEST: replace $1 with a real listing id from your listings table
SELECT 
    l.id,
    l.title,
    l.description,
    l.condition,
    l.price,
    l.listing_type,
    l.status,
    l.created_at,
    l.updated_at,
    c.name           AS category,
    u.id             AS seller_id,
    u.name           AS seller_name,
    COALESCE(
    json_agg(
        json_build_object(
            'url', li.image_url,
            'order', li.display_order
        )
        ORDER BY li.display_order
    ),
    '[]'
) AS images
FROM listings l
JOIN categories c        ON c.id = l.category_id
JOIN users u             ON u.id = l.user_id
LEFT JOIN listing_images li ON li.listing_id = l.id
WHERE l.id = $1
GROUP BY l.id, c.name, u.id, u.name;


-- Q14: Get all listings by a specific seller
-- TEST: replace $1 with a real user id from your users table
SELECT 
    l.id,
    l.title,
    l.condition,
    l.price,
    l.listing_type,
    l.status,
    l.created_at,
    c.name           AS category,
    li.image_url     AS cover_image
FROM listings l
JOIN categories c        ON c.id  = l.category_id
LEFT JOIN listing_images li 
    ON  li.listing_id    = l.id 
    AND li.display_order = 0
WHERE l.user_id = $1
ORDER BY l.created_at DESC;


-- Q15: Create a new listing
-- $1=user_id, $2=category_id, $3=title, $4=description
-- $5=condition, $6=price, $7=listing_type
-- Q15: cleaner version
INSERT INTO listings (user_id, category_id, title, description, condition, price, listing_type)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;


-- Q16: Update an existing listing
-- $1=title, $2=description, $3=condition, $4=price
-- $5=listing_type, $6=category_id, $7=listing id, $8=user_id
UPDATE listings
SET 
    title        = $1,
    description  = $2,
    condition    = $3,
    price        = $4,
    listing_type = $5,
    category_id  = $6,
    updated_at   = NOW()
WHERE id      = $7
AND   user_id = $8
RETURNING *;

UPDATE listings
SET 
    status = 'sold',
    updated_at = NOW()
WHERE id = $1;
-- Q17: Remove a listing (soft delete)
-- $1 = listing id, $2 = user_id (must be the owner)
UPDATE listings
SET status = 'removed'
WHERE id      = $1
AND   user_id = $2
RETURNING *;


-- ============================================================
-- LISTING IMAGE QUERIES
-- ============================================================

-- Q18: Add image to a listing
-- $1=listing_id, $2=image_url, $3=display_order
INSERT INTO listing_images (listing_id, image_url, display_order)
VALUES ($1, $2, $3)
RETURNING *;


-- Q19: Get all images for a listing
-- TEST: replace $1 with a real listing id
SELECT 
    id,
    image_url,
    display_order,
    uploaded_at
FROM listing_images
WHERE listing_id = $1
ORDER BY display_order ASC;


-- Q20: Delete a specific image
-- $1 = image id, $2 = listing_id (safety check)
DELETE FROM listing_images
WHERE id         = $1
AND   listing_id = $2
RETURNING *;


-- ============================================================
-- TRANSACTION QUERIES
-- ============================================================

-- Q21: Create a new transaction
-- $1=listing_id, $2=buyer_id, $3=seller_id, $4=type
INSERT INTO transactions (listing_id, buyer_id, seller_id, type)
VALUES ($1, $2, $3, $4)
RETURNING *;


-- Q22: Get transaction by ID
-- TEST: replace $1 with a real transaction id
SELECT 
    t.*,
    l.title          AS listing_title,
    l.price          AS listing_price,
    buyer.name       AS buyer_name,
    seller.name      AS seller_name
FROM transactions t
JOIN listings l          ON l.id      = t.listing_id
JOIN users buyer         ON buyer.id  = t.buyer_id
JOIN users seller        ON seller.id = t.seller_id
WHERE t.id = $1;


-- Q23: Get all transactions for a user (as buyer or seller)
-- TEST: replace $1 with a real user id
SELECT 
    t.*,
    l.title          AS listing_title,
    buyer.name       AS buyer_name,
    seller.name      AS seller_name
FROM transactions t
JOIN listings l          ON l.id      = t.listing_id
JOIN users buyer         ON buyer.id  = t.buyer_id
JOIN users seller        ON seller.id = t.seller_id
WHERE t.buyer_id  = $1
OR    t.seller_id = $1
ORDER BY t.created_at DESC;
