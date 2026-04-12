-- ============================================================
-- SEED DATA – Sprint 1 Demo 
-- ============================================================

INSERT INTO categories (name) VALUES
    ('Textbooks'),
    ('Electronics'),
    ('Furniture'),
    ('Clothing'),
    ('Sports & Outdoors'),
    ('Stationery'),
    ('Other');

INSERT INTO users (name, email, role) VALUES
    ('Alice Student', 'alice@campus.edu', 'student'),
    ('Bob Student', 'bob@campus.edu', 'student'),
    ('Carol Staff', 'carol@campus.edu', 'staff'),
    ('Dave Admin', 'admin@campus.edu', 'admin');

-- Insert listings
INSERT INTO listings (user_id, category_id, title, description, condition, price, listing_type) VALUES
(
    (SELECT id FROM users WHERE email='alice@campus.edu'),
    (SELECT id FROM categories WHERE name='Textbooks'),
    'Calculus Textbook',
    'Good condition, lightly used',
    'good',
    350,
    'sale'
),
(
    (SELECT id FROM users WHERE email='alice@campus.edu'),
    (SELECT id FROM categories WHERE name='Electronics'),
    'Laptop',
    'Used gaming laptop, great condition',
    'good',
    4500,
    'sale'
);

-- Insert listing images (two for Calculus, one for Laptop)
INSERT INTO listing_images (listing_id, image_url) VALUES
    ((SELECT id FROM listings WHERE title='Calculus Textbook'), 'https://example.com/calculus_front.jpg',0),
    ((SELECT id FROM listings WHERE title='Calculus Textbook'), 'https://example.com/calculus_back.jpg',1),
    ((SELECT id FROM listings WHERE title='Laptop'), 'https://example.com/laptop.jpg',0);

-- Insert a transaction for Calculus Textbook
INSERT INTO transactions (listing_id, buyer_id, seller_id, type, status) VALUES (
    (SELECT id FROM listings WHERE title='Calculus Textbook'),
    (SELECT id FROM users WHERE email='bob@campus.edu'),
    (SELECT id FROM users WHERE email='alice@campus.edu'),
    'purchase',
    'pending'
);