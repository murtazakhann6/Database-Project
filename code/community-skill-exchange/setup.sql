-- Run your Sample_database.sql first, then run this file for seeds

USE community_skill_exchange;

-- Seed service categories
INSERT IGNORE INTO service_category (category_name, description) VALUES
('Home Repair', 'Plumbing, electrical, carpentry, painting and general repairs'),
('Tutoring', 'Academic tutoring for all subjects and levels'),
('Cleaning', 'Home, office and commercial cleaning services'),
('IT Support', 'Computer repair, networking, software troubleshooting'),
('Photography', 'Wedding, event, portrait and commercial photography'),
('Transport & Delivery', 'Goods delivery, moving help, driving services'),
('Beauty & Grooming', 'Haircuts, makeup, salon services at home'),
('Gardening', 'Lawn care, landscaping, plant maintenance'),
('Cooking & Catering', 'Home cooking, event catering, baking'),
('Fitness & Training', 'Personal training, yoga, sports coaching');

-- Create a demo admin user (password: admin123)
INSERT IGNORE INTO users (full_name, email, password_hash, user_type, status)
VALUES ('Admin User', 'admin@cse.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHy', 'both', 'active');

INSERT IGNORE INTO admin (user_id)
SELECT user_id FROM users WHERE email = 'admin@cse.com';

INSERT IGNORE INTO provider_profile (user_id, business_name, occupation, verification_status)
SELECT user_id, 'CSE Admin', 'Platform Administrator', 'verified'
FROM users WHERE email = 'admin@cse.com';

INSERT IGNORE INTO customer_profile (user_id, address)
SELECT user_id, 'Peshawar, KPK'
FROM users WHERE email = 'admin@cse.com';

-- Demo provider (password: test1234)
INSERT IGNORE INTO users (full_name, email, password_hash, phone, user_type, status)
VALUES ('Sara Ahmed', 'sara@provider.com', '$2a$10$8K1p/a0dclxGCGnMFEb0EeJaFh4mS2B5jWXQCGf0jXjEWUF9vlkBi', '0300-1234567', 'provider', 'active');

INSERT IGNORE INTO provider_profile (user_id, business_name, occupation, bio, location, experience_years, verification_status)
SELECT user_id, 'Sara Tutoring', 'Math & Science Tutor',
  'Experienced tutor with 5 years of teaching Math and Science to students from Grade 6 to 12.',
  'Hayatabad, Peshawar', 5, 'verified'
FROM users WHERE email = 'sara@provider.com';

-- Demo customer (password: test1234)
INSERT IGNORE INTO users (full_name, email, password_hash, phone, user_type, status)
VALUES ('Ali Hassan', 'ali@customer.com', '$2a$10$8K1p/a0dclxGCGnMFEb0EeJaFh4mS2B5jWXQCGf0jXjEWUF9vlkBi', '0311-9876543', 'customer', 'active');

INSERT IGNORE INTO customer_profile (user_id, address)
SELECT user_id, 'University Town, Peshawar'
FROM users WHERE email = 'ali@customer.com';

-- Demo service
INSERT IGNORE INTO service (provider_id, category_id, title, description, min_estimated_price, max_estimated_price, price_unit, booking_type, is_active)
SELECT pp.provider_id, sc.category_id,
  'Home Math & Science Tutoring',
  'I offer personalized home tutoring for Matric and Intermediate students. Covering Mathematics, Physics, and Chemistry with past paper practice.',
  500, 1000, 'hour', 'recurring', TRUE
FROM provider_profile pp
JOIN users u ON u.user_id = pp.user_id
JOIN service_category sc ON sc.category_name = 'Tutoring'
WHERE u.email = 'sara@provider.com'
LIMIT 1;

-- Availability for demo service
INSERT IGNORE INTO availability (service_id, day_of_week, start_time, end_time)
SELECT s.service_id, 'Mon', '16:00:00', '20:00:00'
FROM service s JOIN provider_profile pp ON pp.provider_id = s.provider_id
JOIN users u ON u.user_id = pp.user_id WHERE u.email = 'sara@provider.com' LIMIT 1;

INSERT IGNORE INTO availability (service_id, day_of_week, start_time, end_time)
SELECT s.service_id, 'Wed', '16:00:00', '20:00:00'
FROM service s JOIN provider_profile pp ON pp.provider_id = s.provider_id
JOIN users u ON u.user_id = pp.user_id WHERE u.email = 'sara@provider.com' LIMIT 1;

INSERT IGNORE INTO availability (service_id, day_of_week, start_time, end_time)
SELECT s.service_id, 'Sat', '10:00:00', '15:00:00'
FROM service s JOIN provider_profile pp ON pp.provider_id = s.provider_id
JOIN users u ON u.user_id = pp.user_id WHERE u.email = 'sara@provider.com' LIMIT 1;
