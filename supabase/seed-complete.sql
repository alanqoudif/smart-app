-- ============================================================================
-- COMPREHENSIVE SEED DATA FOR SMART RESTAURANT MANAGEMENT SYSTEM
-- ============================================================================
-- This seed file creates a complete demo environment with:
-- - 2 demo restaurants
-- - Staff accounts for each role
-- - Customers with varied purchase history
-- - Complete menu with categories
-- - Sample orders in different states
-- - Restaurant settings
-- ============================================================================

-- Note: This uses bcrypt for password hashing. In production, hash passwords in application code.
-- For demo purposes, we'll use plain text indicators (replace with actual hashes in production)
-- Demo password for all accounts: "demo1234"
-- Demo passcode for all staff: "1234"

-- ============================================================================
-- 1. SEED RESTAURANTS
-- ============================================================================

insert into public.restaurants (
  id, code, name, owner_name, owner_email, owner_password_hash,
  experience_type, specialties, onboarding_complete, is_active,
  timezone, currency, phone, city, country
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'DEMO-REST-001',
    'مطعم البيك الذهبي',
    'أحمد السعيد',
    'ahmed@goldenbik.com',
    '$2a$10$Dummy.Hash.For.Demo.Password.123456789abcdef', -- demo1234
    'restaurant',
    ARRAY['برجر', 'دجاج', 'مشويات'],
    true,
    true,
    'Asia/Riyadh',
    'SAR',
    '+966501234567',
    'الرياض',
    'SA'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'DEMO-CAFE-001',
    'مقهى الأصالة',
    'فاطمة العلي',
    'fatima@authenticity-cafe.com',
    '$2a$10$Dummy.Hash.For.Demo.Password.123456789abcdef', -- demo1234
    'cafe',
    ARRAY['قهوة', 'معجنات', 'حلويات'],
    true,
    true,
    'Asia/Riyadh',
    'SAR',
    '+966507654321',
    'جدة',
    'SA'
  )
on conflict (code) do nothing;

-- ============================================================================
-- 2. SEED RESTAURANT ONBOARDING
-- ============================================================================

insert into public.restaurant_onboarding (
  restaurant_id, concept_vision, service_modes, cuisine_focus,
  guest_notes, price_position
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'تقديم وجبات سريعة بجودة عالية وأسعار مناسبة للعائلات',
    ARRAY['dine-in', 'pickup', 'delivery'],
    ARRAY['أمريكي', 'عربي', 'مشويات'],
    'نركز على السرعة والجودة مع خدمة عملاء ممتازة',
    'standard'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'مقهى عصري يقدم أجود أنواع القهوة المختصة والمعجنات الطازجة',
    ARRAY['dine-in', 'pickup'],
    ARRAY['قهوة', 'معجنات', 'إيطالي'],
    'أجواء هادئة مناسبة للعمل والدراسة',
    'premium'
  )
on conflict (restaurant_id) do nothing;

-- ============================================================================
-- 3. SEED STAFF ACCOUNTS
-- ============================================================================

insert into public.staff_accounts (
  id, restaurant_id, name, role, passcode_hash, is_owner, is_active
) values
  -- Restaurant 1 staff
  ('11111111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111111', 'أحمد السعيد', 'manager', '$2a$10$DummyHash1234', true, true),
  ('11111111-1111-1111-1111-111111111002', '11111111-1111-1111-1111-111111111111', 'محمد العمري', 'waiter', '$2a$10$DummyHash1234', false, true),
  ('11111111-1111-1111-1111-111111111003', '11111111-1111-1111-1111-111111111111', 'خالد الشمري', 'chef', '$2a$10$DummyHash1234', false, true),
  ('11111111-1111-1111-1111-111111111004', '11111111-1111-1111-1111-111111111111', 'سارة القحطاني', 'cashier', '$2a$10$DummyHash1234', false, true),
  ('11111111-1111-1111-1111-111111111005', '11111111-1111-1111-1111-111111111111', 'عبدالله النمر', 'waiter', '$2a$10$DummyHash1234', false, true),
  
  -- Restaurant 2 staff
  ('22222222-2222-2222-2222-222222222001', '22222222-2222-2222-2222-222222222222', 'فاطمة العلي', 'manager', '$2a$10$DummyHash1234', true, true),
  ('22222222-2222-2222-2222-222222222002', '22222222-2222-2222-2222-222222222222', 'نورة السالم', 'waiter', '$2a$10$DummyHash1234', false, true),
  ('22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222222', 'ريم الدوسري', 'chef', '$2a$10$DummyHash1234', false, true)
on conflict (id) do nothing;

-- ============================================================================
-- 4. SEED RESTAURANT SETTINGS
-- ============================================================================

insert into public.restaurant_settings (
  restaurant_id, tax_rate, tax_inclusive, service_charge_rate,
  delivery_fee, free_delivery_threshold, default_prep_time_minutes,
  notify_new_orders, enable_loyalty_points, loyalty_points_per_currency_unit
) values
  (
    '11111111-1111-1111-1111-111111111111',
    15.0, -- 15% VAT
    false,
    0,
    10.0, -- 10 SAR delivery
    50.0, -- Free delivery over 50 SAR
    20,
    true,
    true,
    1 -- 1 point per 1 SAR
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    15.0,
    true, -- Tax included in prices
    10.0, -- 10% service charge
    0,
    null,
    15,
    true,
    false,
    0
  )
on conflict (restaurant_id) do nothing;

-- ============================================================================
-- 5. SEED MENU CATEGORIES
-- ============================================================================

insert into public.menu_categories (
  restaurant_id, name, display_order, is_active
) values
  -- Restaurant 1 categories
  ('11111111-1111-1111-1111-111111111111', 'برجر', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'ساندويتشات', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'مشويات', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'أطباق جانبية', 4, true),
  ('11111111-1111-1111-1111-111111111111', 'سلطات', 5, true),
  ('11111111-1111-1111-1111-111111111111', 'مشروبات', 6, true),
  
  -- Restaurant 2 categories
  ('22222222-2222-2222-2222-222222222222', 'قهوة ساخنة', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'قهوة باردة', 2, true),
  ('22222222-2222-2222-2222-222222222222', 'معجنات', 3, true),
  ('22222222-2222-2222-2222-222222222222', 'حلويات', 4, true),
  ('22222222-2222-2222-2222-222222222222', 'وجبات خفيفة', 5, true)
on conflict (restaurant_id, name) do nothing;

-- ============================================================================
-- 6. SEED MENU ITEMS
-- ============================================================================

-- Restaurant 1: البيك الذهبي
insert into public.menu_items (
  restaurant_id, name, category, description, price, cost, prep_time_minutes,
  is_available, is_popular, dietary_tags
) values
  -- Burgers
  ('11111111-1111-1111-1111-111111111111', 'سماش برجر كلاسيك', 'برجر', 'برجر لحم بقري مضغوط مع جبنة شيدر ذائبة', 28.00, 12.00, 12, true, true, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'دبل سماش برجر', 'برجر', 'قطعتين لحم مع جبنة شيدر مزدوجة', 38.00, 18.00, 15, true, true, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'ترافل مشروم برجر', 'برجر', 'برجر لحم بقري مع فطر وصوص ترافل', 46.00, 22.00, 15, true, false, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'تشيكن كرسبي برجر', 'برجر', 'صدر دجاج مقلي مع خس وصوص خاص', 32.00, 14.00, 13, true, true, ARRAY['halal']),
  
  -- Sandwiches
  ('11111111-1111-1111-1111-111111111111', 'كريسبي تشيكن ساندويتش', 'ساندويتشات', 'دجاج مقرمش مع خضار طازجة', 26.00, 11.00, 11, true, false, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'شاورما دجاج', 'ساندويتشات', 'شاورما دجاج بالثوم والخضار', 22.00, 9.00, 8, true, true, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'فلافل', 'ساندويتشات', 'فلافل طازج مع طحينة', 18.00, 6.00, 10, true, false, ARRAY['vegetarian', 'halal']),
  
  -- Grills
  ('11111111-1111-1111-1111-111111111111', 'صحن كباب مشكل', 'مشويات', 'كباب حلبي + كفتة + شيش طاووق', 55.00, 25.00, 20, true, true, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'شيش طاووق', 'مشويات', 'دجاج مشوي متبل مع أرز أو خبز', 42.00, 18.00, 18, true, false, ARRAY['halal', 'gluten-free']),
  
  -- Sides
  ('11111111-1111-1111-1111-111111111111', 'بطاطس مقلية', 'أطباق جانبية', 'بطاطس ذهبية مقرمشة', 12.00, 4.00, 8, true, true, ARRAY['vegetarian']),
  ('11111111-1111-1111-1111-111111111111', 'بطاطس لودد', 'أطباق جانبية', 'بطاطس مع جبنة وبيكون', 18.00, 7.00, 10, true, true, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'حلقات بصل', 'أطباق جانبية', 'حلقات بصل مقرمشة', 15.00, 5.00, 9, true, false, ARRAY['vegetarian']),
  
  -- Salads
  ('11111111-1111-1111-1111-111111111111', 'سلطة سيزر', 'سلطات', 'خس مع دجاج مشوي وصوص سيزر', 26.00, 10.00, 9, true, false, ARRAY['halal']),
  ('11111111-1111-1111-1111-111111111111', 'سلطة يونانية', 'سلطات', 'خضار طازجة مع جبنة فيتا', 24.00, 9.00, 8, true, false, ARRAY['vegetarian']),
  
  -- Beverages
  ('11111111-1111-1111-1111-111111111111', 'بيبسي', 'مشروبات', 'مشروب غازي 330 مل', 5.00, 1.50, 2, true, true, ARRAY[]::text[]),
  ('11111111-1111-1111-1111-111111111111', 'عصير برتقال طازج', 'مشروبات', 'عصير برتقال طبيعي', 12.00, 4.00, 5, true, false, ARRAY['fresh']),
  ('11111111-1111-1111-1111-111111111111', 'ماء', 'مشروبات', 'ماء معدني 500 مل', 3.00, 0.80, 1, true, false, ARRAY[]::text[])
on conflict (restaurant_id, name, category) do nothing;

-- Restaurant 2: مقهى الأصالة
insert into public.menu_items (
  restaurant_id, name, category, description, price, cost, prep_time_minutes,
  is_available, is_popular, dietary_tags
) values
  -- Hot Coffee
  ('22222222-2222-2222-2222-222222222222', 'إسبريسو', 'قهوة ساخنة', 'قهوة إسبريسو إيطالية أصلية', 14.00, 4.00, 3, true, false, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'أمريكانو', 'قهوة ساخنة', 'إسبريسو مع ماء ساخن', 16.00, 4.50, 4, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'كابتشينو', 'قهوة ساخنة', 'إسبريسو مع حليب رغوي', 18.00, 5.00, 5, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'لاتيه', 'قهوة ساخنة', 'إسبريسو مع حليب ساخن', 19.00, 5.50, 5, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'فلات وايت', 'قهوة ساخنة', 'إسبريسو مزدوج مع حليب مخملي', 22.00, 6.00, 6, true, false, ARRAY[]::text[]),
  
  -- Cold Coffee
  ('22222222-2222-2222-2222-222222222222', 'آيس لاتيه', 'قهوة باردة', 'لاتيه بارد مع ثلج', 21.00, 6.00, 4, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'سبانيش لاتيه بارد', 'قهوة باردة', 'لاتيه بحليب محلى وفانيليا', 24.00, 7.00, 5, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'كولد برو', 'قهوة باردة', 'قهوة منقوعة على البارد', 20.00, 5.50, 4, true, false, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'فرابتشينو كراميل', 'قهوة باردة', 'قهوة مثلجة مع كراميل', 26.00, 8.00, 6, true, true, ARRAY[]::text[]),
  
  -- Pastries
  ('22222222-2222-2222-2222-222222222222', 'كرواسون', 'معجنات', 'كرواسون فرنسي بالزبدة', 12.00, 4.00, 3, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'كرواسون شوكولاته', 'معجنات', 'كرواسون محشي بالشوكولاته', 15.00, 5.00, 3, true, true, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'سينابون', 'معجنات', 'لفائف قرفة مع صوص كريمي', 18.00, 6.00, 5, true, false, ARRAY[]::text[]),
  ('22222222-2222-2222-2222-222222222222', 'دونات', 'معجنات', 'دونات طازج بنكهات متعددة', 10.00, 3.00, 2, true, false, ARRAY[]::text[]),
  
  -- Desserts
  ('22222222-2222-2222-2222-222222222222', 'تشيز كيك', 'حلويات', 'تشيز كيك كلاسيك', 28.00, 10.00, 3, true, true, ARRAY['vegetarian']),
  ('22222222-2222-2222-2222-222222222222', 'براوني', 'حلويات', 'براوني شوكولاته مع آيس كريم', 24.00, 8.00, 4, true, true, ARRAY['vegetarian']),
  ('22222222-2222-2222-2222-222222222222', 'تارت فواكه', 'حلويات', 'تارت بالفواكه الموسمية', 26.00, 9.00, 3, true, false, ARRAY['vegetarian']),
  
  -- Snacks
  ('22222222-2222-2222-2222-222222222222', 'كلوب ساندويتش', 'وجبات خفيفة', 'ساندويتش دجاج مع بيكون', 32.00, 12.00, 10, true, true, ARRAY['halal']),
  ('22222222-2222-2222-2222-222222222222', 'باني', 'وجبات خفيفة', 'خبز إيطالي محمص مع جبنة', 28.00, 10.00, 8, true, false, ARRAY['vegetarian'])
on conflict (restaurant_id, name, category) do nothing;

-- ============================================================================
-- 7. SEED CUSTOMERS
-- ============================================================================

-- Restaurant 1 customers
insert into public.customers (
  id, restaurant_id, full_name, phone, email, loyalty_points, is_vip, tags
) values
  ('11111111-1111-1111-1111-111111110001', '11111111-1111-1111-1111-111111111111', 'عبدالرحمن الغامدي', '0501234567', 'abdulrahman@example.com', 150, true, ARRAY['vip', 'frequent']),
  ('11111111-1111-1111-1111-111111110002', '11111111-1111-1111-1111-111111111111', 'سلمى الحربي', '0507654321', 'salma@example.com', 85, false, ARRAY['delivery-preferred']),
  ('11111111-1111-1111-1111-111111110003', '11111111-1111-1111-1111-111111111111', 'فهد المطيري', '0509876543', null, 42, false, ARRAY[]::text[]),
  ('11111111-1111-1111-1111-111111110004', '11111111-1111-1111-1111-111111111111', 'نورة السبيعي', '0503456789', 'noura@example.com', 210, true, ARRAY['vip', 'family']),
  ('11111111-1111-1111-1111-111111110005', '11111111-1111-1111-1111-111111111111', 'خالد العتيبي', '0502345678', null, 18, false, ARRAY[]::text[]),
  
  -- Restaurant 2 customers
  ('22222222-2222-2222-2222-222222220001', '22222222-2222-2222-2222-222222222222', 'ريم الدوسري', '0551234567', 'reem@example.com', 95, true, ARRAY['morning-regular']),
  ('22222222-2222-2222-2222-222222220002', '22222222-2222-2222-2222-222222222222', 'محمد الشهري', '0557654321', 'mohammed@example.com', 62, false, ARRAY['student']),
  ('22222222-2222-2222-2222-222222220003', '22222222-2222-2222-2222-222222222222', 'لمى القرني', '0559876543', null, 135, true, ARRAY['vip', 'remote-worker'])
on conflict (restaurant_id, phone) do nothing;

-- ============================================================================
-- 8. SEED TABLES (for dine-in management)
-- ============================================================================

-- Restaurant 1 tables
insert into public.tables (
  restaurant_id, table_number, capacity, status, section
) values
  ('11111111-1111-1111-1111-111111111111', '1', 2, 'available', 'indoor'),
  ('11111111-1111-1111-1111-111111111111', '2', 4, 'available', 'indoor'),
  ('11111111-1111-1111-1111-111111111111', '3', 4, 'available', 'indoor'),
  ('11111111-1111-1111-1111-111111111111', '4', 6, 'available', 'indoor'),
  ('11111111-1111-1111-1111-111111111111', '5', 2, 'available', 'outdoor'),
  ('11111111-1111-1111-1111-111111111111', '6', 4, 'available', 'outdoor'),
  ('11111111-1111-1111-1111-111111111111', 'VIP-1', 8, 'available', 'vip'),
  
  -- Restaurant 2 tables
  ('22222222-2222-2222-2222-222222222222', '1', 2, 'available', 'window'),
  ('22222222-2222-2222-2222-222222222222', '2', 2, 'available', 'window'),
  ('22222222-2222-2222-2222-222222222222', '3', 4, 'available', 'main'),
  ('22222222-2222-2222-2222-222222222222', '4', 4, 'available', 'main'),
  ('22222222-2222-2222-2222-222222222222', '5', 2, 'available', 'quiet'),
  ('22222222-2222-2222-2222-222222222222', '6', 6, 'available', 'main')
on conflict (restaurant_id, table_number) do nothing;

-- ============================================================================
-- 9. SEED SAMPLE ORDERS (Different States for Testing)
-- ============================================================================

-- Helper: Get menu item IDs for order items
do $$
declare
  v_rest1 uuid := '11111111-1111-1111-1111-111111111111';
  v_rest2 uuid := '22222222-2222-2222-2222-222222222222';
  v_order1 uuid;
  v_order2 uuid;
  v_order3 uuid;
  v_order4 uuid;
  v_order5 uuid;
  v_menu_burger uuid;
  v_menu_fries uuid;
  v_menu_cola uuid;
  v_menu_latte uuid;
  v_menu_croissant uuid;
begin
  -- Get menu item IDs
  select id into v_menu_burger from public.menu_items where restaurant_id = v_rest1 and name = 'سماش برجر كلاسيك';
  select id into v_menu_fries from public.menu_items where restaurant_id = v_rest1 and name = 'بطاطس مقلية';
  select id into v_menu_cola from public.menu_items where restaurant_id = v_rest1 and name = 'بيبسي';
  select id into v_menu_latte from public.menu_items where restaurant_id = v_rest2 and name = 'آيس لاتيه';
  select id into v_menu_croissant from public.menu_items where restaurant_id = v_rest2 and name = 'كرواسون شوكولاته';

  -- Order 1: New order (just created)
  insert into public.orders (
    id, restaurant_id, customer_id, staff_id, status, fulfillment_type,
    table_number, created_at
  ) values (
    '11111111-1111-1111-2222-000000000001',
    v_rest1,
    '11111111-1111-1111-1111-111111110001',
    '11111111-1111-1111-1111-111111111002',
    'new',
    'dine-in',
    '2',
    now() - interval '5 minutes'
  ) returning id into v_order1;

  insert into public.order_items (order_id, menu_item_id, name, price, quantity) values
    (v_order1, v_menu_burger, 'سماش برجر كلاسيك', 28.00, 2),
    (v_order1, v_menu_fries, 'بطاطس مقلية', 12.00, 2),
    (v_order1, v_menu_cola, 'بيبسي', 5.00, 2);

  -- Order 2: Preparing order
  insert into public.orders (
    id, restaurant_id, customer_id, staff_id, status, fulfillment_type,
    table_number, created_at, preparing_at
  ) values (
    '11111111-1111-1111-2222-000000000002',
    v_rest1,
    '11111111-1111-1111-1111-111111110002',
    '11111111-1111-1111-1111-111111111002',
    'preparing',
    'pickup',
    null,
    now() - interval '15 minutes',
    now() - interval '12 minutes'
  ) returning id into v_order2;

  insert into public.order_items (order_id, menu_item_id, name, price, quantity, status) values
    (v_order2, v_menu_burger, 'سماش برجر كلاسيك', 28.00, 1, 'preparing'),
    (v_order2, v_menu_fries, 'بطاطس مقلية', 12.00, 1, 'preparing');

  -- Order 3: Ready order (waiting for pickup)
  insert into public.orders (
    id, restaurant_id, customer_id, staff_id, status, fulfillment_type,
    created_at, preparing_at, ready_at
  ) values (
    '11111111-1111-1111-2222-000000000003',
    v_rest1,
    '11111111-1111-1111-1111-111111110003',
    '11111111-1111-1111-1111-111111111005',
    'ready',
    'delivery',
    now() - interval '35 minutes',
    now() - interval '30 minutes',
    now() - interval '5 minutes'
  ) returning id into v_order3;

  insert into public.order_items (order_id, menu_item_id, name, price, quantity, status) values
    (v_order3, v_menu_burger, 'سماش برجر كلاسيك', 28.00, 3, 'ready'),
    (v_order3, v_menu_fries, 'بطاطس مقلية', 12.00, 3, 'ready'),
    (v_order3, v_menu_cola, 'بيبسي', 5.00, 3, 'ready');

  -- Order 4: Completed order from yesterday
  insert into public.orders (
    id, restaurant_id, customer_id, staff_id, status, fulfillment_type,
    payment_method, payment_status, table_number,
    created_at, preparing_at, ready_at, completed_at
  ) values (
    '11111111-1111-1111-2222-000000000004',
    v_rest1,
    '11111111-1111-1111-1111-111111110004',
    '11111111-1111-1111-1111-111111111002',
    'completed',
    'dine-in',
    'card',
    'paid',
    'VIP-1',
    now() - interval '1 day' - interval '2 hours',
    now() - interval '1 day' - interval '1 hour 50 minutes',
    now() - interval '1 day' - interval '1 hour 30 minutes',
    now() - interval '1 day' - interval '1 hour'
  ) returning id into v_order4;

  insert into public.order_items (order_id, menu_item_id, name, price, quantity, status) values
    (v_order4, v_menu_burger, 'سماش برجر كلاسيك', 28.00, 4, 'served'),
    (v_order4, v_menu_fries, 'بطاطس مقلية', 12.00, 4, 'served'),
    (v_order4, v_menu_cola, 'بيبسي', 5.00, 4, 'served');

  -- Order 5: Cafe order (new)
  insert into public.orders (
    id, restaurant_id, customer_id, staff_id, status, fulfillment_type,
    table_number, created_at
  ) values (
    '22222222-2222-2222-3333-000000000001',
    v_rest2,
    '22222222-2222-2222-2222-222222220001',
    '22222222-2222-2222-2222-222222222002',
    'new',
    'dine-in',
    '1',
    now() - interval '2 minutes'
  ) returning id into v_order5;

  insert into public.order_items (order_id, menu_item_id, name, price, quantity) values
    (v_order5, v_menu_latte, 'آيس لاتيه', 21.00, 1),
    (v_order5, v_menu_croissant, 'كرواسون شوكولاته', 15.00, 1);
    
end $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count records in each table
do $$
declare
  v_restaurants int;
  v_staff int;
  v_customers int;
  v_menu_items int;
  v_orders int;
  v_order_items int;
begin
  select count(*) into v_restaurants from public.restaurants;
  select count(*) into v_staff from public.staff_accounts;
  select count(*) into v_customers from public.customers;
  select count(*) into v_menu_items from public.menu_items;
  select count(*) into v_orders from public.orders;
  select count(*) into v_order_items from public.order_items;
  
  raise notice '✅ Seed data summary:';
  raise notice '  - Restaurants: %', v_restaurants;
  raise notice '  - Staff accounts: %', v_staff;
  raise notice '  - Customers: %', v_customers;
  raise notice '  - Menu items: %', v_menu_items;
  raise notice '  - Orders: %', v_orders;
  raise notice '  - Order items: %', v_order_items;
end $$;

