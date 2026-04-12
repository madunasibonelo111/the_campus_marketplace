
-- ============================================================
-- USEFUL DEBUG QUERIES
--  Werun  these in Supabase SQL Editor to check ourdata data
-- ============================================================

-- Check all users
SELECT id, name, email, role, verified_status FROM users;

-- Check all listings with category and seller
SELECT l.title, c.name AS category, u.name AS seller, l.status
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN users u ON u.id = l.user_id;

-- Check all images linked to listings
SELECT l.title, li.image_url, li.display_order
FROM listing_images li
JOIN listings l ON l.id = li.listing_id
ORDER BY l.title, li.display_order;

-- Check all transactions
SELECT 
    l.title, 
    buyer.name  AS buyer, 
    seller.name AS seller, 
    t.type, 
    t.status
FROM transactions t
JOIN listings l          ON l.id      = t.listing_id
JOIN users buyer         ON buyer.id  = t.buyer_id
JOIN users seller        ON seller.id = t.seller_id;
