const db = require('./db');

console.log('🔧 Initializing CampusCafe database...\n');

// ── Create Tables ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    student_number TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    cafe_id INTEGER REFERENCES cafes(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    description TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    rating REAL DEFAULT 0,
    open_hours TEXT,
    location TEXT,
    color TEXT DEFAULT '#c8a97e'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER REFERENCES cafes(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image TEXT,
    is_available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER REFERENCES cafes(id),
    title TEXT NOT NULL,
    description TEXT,
    discount TEXT,
    badge TEXT,
    valid_until TEXT,
    image TEXT,
    related_product_ids TEXT DEFAULT '',
    target_role TEXT DEFAULT 'all',
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    cafe_id INTEGER REFERENCES cafes(id),
    status TEXT DEFAULT 'preparing',
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL,
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    cancel_reason TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS loyalty_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    cafe_id INTEGER NOT NULL REFERENCES cafes(id),
    stamps INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    UNIQUE(user_id, cafe_id)
  );
`);

console.log('✅ Tables created');

// ── Seed Data ──────────────────────────────────────────
const existingCafes = db.prepare('SELECT COUNT(*) as count FROM cafes').get();
if (existingCafes.count > 0) {
  console.log('📦 Data already seeded. Skipping.\n');
  process.exit(0);
}

// ── Categories ─────────────────────────────────────────
const insertCategory = db.prepare('INSERT INTO categories (name, display_name, icon, description) VALUES (?, ?, ?, ?)');
insertCategory.run('coffee', 'Coffee', '☕', 'Hot brewed and espresso-based drinks');
insertCategory.run('cold drinks', 'Cold Drinks', '🧊', 'Iced beverages and refreshing coolers');
insertCategory.run('dessert', 'Desserts', '🍰', 'Sweet treats and baked goods');
insertCategory.run('food', 'Food', '🍽️', 'Savory bites and snacks');
insertCategory.run('bakery', 'Fırın Ürünleri', '🥐', 'Taze fırın ürünleri');
console.log('✅ Categories seeded');

// ── Cafes ──────────────────────────────────────────────
const insertCafe = db.prepare('INSERT INTO cafes (id, name, slug, description, image, rating, open_hours, location, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
insertCafe.run(1, 'Kalamış Kahvecisi', 'kalamis-kahvecisi', 'Akdeniz Üniversitesi\'nin en sevilen kahve durağı. Geleneksel Türk kahvesi ve modern espresso çeşitleriyle kampüsün kalbi.', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600', 4.8, '08:00 - 22:00', 'Merkez Kampüs, A Blok Yanı', '#c8a97e');
insertCafe.run(2, 'Sokak Kahvecisi', 'sokak-kahvecisi', 'Sokak lezzetleriyle harmanlanmış kahve deneyimi. Öğrenci dostu fiyatlarıyla kampüsün vazgeçilmezi.', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600', 4.6, '07:30 - 21:00', 'Merkez Kampüs, Kütüphane Karşısı', '#e07a5f');
insertCafe.run(3, 'Smooth Coffee', 'smooth-coffee', 'Modern ve minimal tasarımıyla öne çıkan Smooth Coffee, özel harman kahveleri ve smoothie\'leriyle fark yaratıyor.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', 4.7, '08:30 - 22:30', 'Merkez Kampüs, Mühendislik Fakültesi', '#81b29a');
insertCafe.run(4, 'Break Simit Fırını', 'break-simit-firini', 'Akdeniz Üniversitesi çarşısının vazgeçilmez lezzet durağı. Taze simit, poğaça, börek ve açma ile güne enerjik başla.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600', 4.5, '06:30 - 20:00', 'Kampüs Çarşısı', '#d4a574');
console.log('✅ Cafes seeded');

// ── Products ───────────────────────────────────────────
const insertProduct = db.prepare('INSERT INTO products (id, cafe_id, name, category, price, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)');

// Kalamış Kahvecisi (café 1)
insertProduct.run(101, 1, 'Türk Kahvesi', 'coffee', 30, 'Geleneksel ince öğütülmüş, cezve ile pişirilmiş otantik Türk kahvesi.', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400');
insertProduct.run(102, 1, 'Caffè Latte', 'coffee', 48, 'Özel harman espresso ve buharla ısıtılmış süt.', 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400');
insertProduct.run(103, 1, 'Cappuccino', 'coffee', 45, 'Espresso, sıcak süt ve yoğun süt köpüğü üçlüsü.', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400');
insertProduct.run(104, 1, 'Mocha', 'coffee', 52, 'Çikolata ve espresso birleşimi, üstü krema.', 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400');
insertProduct.run(105, 1, 'Soğuk Kahve', 'cold drinks', 40, 'Buz üzerinde servis edilen özel soğuk demleme kahve.', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400');
insertProduct.run(106, 1, 'Limonata', 'cold drinks', 28, 'Taze sıkılmış limon ve nane ile serinletici içecek.', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400');
insertProduct.run(107, 1, 'Cheesecake', 'dessert', 60, 'New York usulü kremsi cheesecake, meyveli sos eşliğinde.', 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400');
insertProduct.run(108, 1, 'Brownie', 'dessert', 42, 'Fudgy çikolatalı brownie, ceviz parçacıklı.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400');

// Sokak Kahvecisi (café 2)
insertProduct.run(201, 2, 'Filtre Kahve', 'coffee', 25, 'Günlük taze çekilmiş çekirdeklerle hazırlanan filtre kahve.', 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400');
insertProduct.run(202, 2, 'Americano', 'coffee', 32, 'Çift shot espresso ve sıcak su, sade ve güçlü.', 'https://images.unsplash.com/photo-1521302200778-33500795e128?w=400');
insertProduct.run(203, 2, 'Latte Macchiato', 'coffee', 40, 'Katmanlı süt ve espresso, göz alıcı sunum.', 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400');
insertProduct.run(204, 2, 'Sıcak Çikolata', 'coffee', 38, 'Gerçek çikolatadan yapılmış, marshmallow\'lu sıcak çikolata.', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400');
insertProduct.run(205, 2, 'Ice Tea', 'cold drinks', 22, 'Ev yapımı şeftalili soğuk çay, buz gibi.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400');
insertProduct.run(206, 2, 'Ayran', 'cold drinks', 15, 'Geleneksel köy ayranı, taze ve köpüklü.', 'https://images.unsplash.com/photo-1584949602334-4e99f98286a8?w=400');
insertProduct.run(207, 2, 'Waffle', 'dessert', 55, 'Çikolata sos ve meyve eşliğinde sıcak waffle.', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400');
insertProduct.run(208, 2, 'Kurabiye', 'dessert', 18, 'Taze fırından çıkmış ev yapımı kurabiye.', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400');
insertProduct.run(209, 2, 'Tost', 'food', 35, 'Kaşarlı ve domatesli ızgara tost, kampüsün klasiği.', 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400');

// Smooth Coffee (café 3)
insertProduct.run(301, 3, 'Flat White', 'coffee', 50, 'Velvety mikroköpük ve çift shot espresso, pürüzsüz.', 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400');
insertProduct.run(302, 3, 'V60 Pour Over', 'coffee', 55, 'El yapımı V60 demleme, single origin çekirdek.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400');
insertProduct.run(303, 3, 'Espresso', 'coffee', 28, 'Tek shot, yoğun ve aromatik espresso.', 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400');
insertProduct.run(304, 3, 'Matcha Latte', 'coffee', 52, 'Premium Japon matcha tozu ve kremalı sütle.', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400');
insertProduct.run(305, 3, 'Mango Smoothie', 'cold drinks', 45, 'Taze mango, muz ve yoğurt ile hazırlanan smoothie.', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400');
insertProduct.run(306, 3, 'Açaí Bowl', 'cold drinks', 65, 'Açaí, granola, taze meyve ve bal eşliğinde.', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400');
insertProduct.run(307, 3, 'Berry Smoothie', 'cold drinks', 42, 'Karışık orman meyveleri ve yoğurt smoothie\'si.', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400');
insertProduct.run(308, 3, 'Tiramisu', 'dessert', 62, 'İtalyan usulü mascarpone ve espresso ile hazırlanmış tiramisu.', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400');
insertProduct.run(309, 3, 'Energy Ball', 'dessert', 20, 'Hurma, yulaf ve kakao ile yapılmış sağlıklı atıştırmalık.', 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400');

// Break Simit Fırını (café 4) — fırın ürünleri, içecek yok
insertProduct.run(401, 4, 'Simit', 'bakery', 12, 'Susamlı, çıtır çıtır, taze fırından çıkmış geleneksel simit.', 'https://images.unsplash.com/photo-1593085260707-5377ba37f868?w=400');
insertProduct.run(402, 4, 'Peynirli Poğaça', 'bakery', 18, 'İçi bol beyaz peynirli, yumuşacık taze poğaça.', 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=400');
insertProduct.run(403, 4, 'Zeytinli Poğaça', 'bakery', 18, 'Kıyılmış siyah zeytin ile hazırlamış nefis poğaça.', 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=400');
insertProduct.run(404, 4, 'Ispanaklı Börek', 'bakery', 25, 'El açması yufka ile hazırlanmış ıspanaklı börek.', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400');
insertProduct.run(405, 4, 'Kıymalı Börek', 'bakery', 28, 'Kıymalı, soğanlı, baharatlı geleneksel börek.', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400');
insertProduct.run(406, 4, 'Açma', 'bakery', 10, 'Yumuşacık, tereyağlı taze açma.', 'https://images.unsplash.com/photo-1549931319-a545753467c8?w=400');
insertProduct.run(407, 4, 'Kaşarlı Tost', 'food', 30, 'Bol kaşarlı, ızgara tost. Yanında turşu ile servis edilir.', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400');
insertProduct.run(408, 4, 'Sucuklu Tost', 'food', 35, 'Kaşar ve sucuk ile hazırlanan doyurucu tost.', 'https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?w=400');
insertProduct.run(409, 4, 'Çay', 'food', 8, 'Demlik çay, Rize\'nin en iyisi. İnce belli bardakta servis edilir.', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400');
console.log('✅ Products seeded');

// ── Campaigns (her biri bir kafeye bağlı, ilişkili ürün ID'leri) ─────
const insertCampaign = db.prepare('INSERT INTO campaigns (cafe_id, title, description, discount, badge, valid_until, image, related_product_ids, target_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

// Kalamış Kahvecisi kampanyaları
insertCampaign.run(1, 'Öğrenci İndirimi ☕', 'Öğrenci kartını göster, tüm kahvelerde %20 indirim kazan! Her hafta içi geçerli.', '%20', 'Öğrencilere Özel', '2026-06-30', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', '101,102,103,104', 'student');
insertCampaign.run(1, '2 Al 1 Öde 🎉', '2 latte veya cappuccino al, ucuz olanı bizden! Arkadaşınla gel, birlikte keyfini çıkar.', '2 Al 1 Öde', 'Popüler', '2026-05-15', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400', '102,103', 'all');
insertCampaign.run(1, 'Akademisyen Molası 🎓', 'Akademik personele özel: tüm kahvelerde %15 indirim. Kampüs kartınızı gösterin.', '%15', 'Akademisyenlere Özel', '2026-06-30', 'https://images.unsplash.com/photo-1521302200778-33500795e128?w=400', '101,102,103,104', 'teacher');

// Sokak Kahvecisi kampanyaları
insertCampaign.run(2, 'Kahve + Tost Combo 🥪', 'Herhangi bir kahve ile tost al, toplam %15 indirimli. Doyurucu kampüs kahvaltısı!', '%15', 'Combo', '2026-05-31', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400', '201,202,203,204,209', 'all');
insertCampaign.run(2, 'Sabahçı Kuşu ☀️', 'Saat 10:00\'dan önce gel, siparişinin tamamında %10 indirim. Erken kalkanın hakkı!', '%10', '10:00 Öncesi', '2026-04-30', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400', '', 'all');

// Smooth Coffee kampanyaları
insertCampaign.run(3, 'Matcha Festivali 🍵', 'Bu ay tüm matcha içeceklerinde %25 indirim! Signature Iced Matcha Latte\'yi dene.', '%25', 'Sınırlı Süre', '2026-03-31', 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400', '304', 'all');
insertCampaign.run(3, 'Smoothie Günü 🥤', 'Her cuma tüm smoothie\'ler %20 indirimli. Hafta sonuna sağlıklı başla!', '%20', 'Her Cuma', '2026-06-30', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400', '305,306,307', 'all');
insertCampaign.run(3, 'Hoca Dostu Latte ☕🎓', 'Öğretim üyelerine özel: Flat White ve V60 %20 indirimli!', '%20', 'Akademisyenlere Özel', '2026-06-30', 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400', '301,302', 'teacher');

// Break Simit Fırını kampanyaları
insertCampaign.run(4, 'Simit + Çay = 15 ₺ 🫖', 'Simit ve çay ikilisi sadece 15 ₺! Kampüsün en uygun kahvaltısı.', '15 ₺', 'Her Gün', '2026-06-30', 'https://images.unsplash.com/photo-1593085260707-5377ba37f868?w=400', '401,409', 'all');
insertCampaign.run(4, '3 Poğaça Al 2 Öde 🥐', '3 poğaça al, sadece 2 tanesinin ücretini öde. Arkadaşlarınla paylaş!', '3 Al 2 Öde', 'Fırsat', '2026-05-31', 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=400', '402,403', 'all');
insertCampaign.run(4, 'Börek Saati 🕐', 'Her gün 14:00-16:00 arası tüm böreklerde %30 indirim!', '%30', '14:00-16:00', '2026-04-30', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400', '404,405', 'all');

console.log('✅ Campaigns seeded');

// ── Demo Users ─────────────────────────────────────────
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);
const demoPassword = bcrypt.hashSync('test123', salt);

const insertUser = db.prepare(
  'INSERT INTO users (first_name, last_name, student_number, email, password_hash, role, cafe_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

// Student
insertUser.run('Demo', 'Öğrenci', '20230505001', null, demoPassword, 'student', null);
// Teacher
insertUser.run('Ahmet', 'Hoca', null, 'hoca@akdeniz.edu.tr', demoPassword, 'teacher', null);
// Cafe Owners (one per cafe)
insertUser.run('Kalamış', 'Yönetici', null, 'kalamis@cafe.com', demoPassword, 'cafeOwner', 1);
insertUser.run('Sokak', 'Yönetici', null, 'sokak@cafe.com', demoPassword, 'cafeOwner', 2);
insertUser.run('Smooth', 'Yönetici', null, 'smooth@cafe.com', demoPassword, 'cafeOwner', 3);
insertUser.run('Break', 'Yönetici', null, 'break@cafe.com', demoPassword, 'cafeOwner', 4);

console.log('✅ Demo users seeded');

console.log('\n🎉 Database initialized successfully!');
console.log(`📁 Database file: ${require('path').join(__dirname, 'db', 'campuscafe.db')}`);
console.log('\n📋 Demo Hesapları:');
console.log('   Öğrenci  → No: 20230505001  Şifre: test123');
console.log('   Öğretmen → Email: hoca@akdeniz.edu.tr  Şifre: test123');
console.log('   Kalamış  → Email: kalamis@cafe.com  Şifre: test123');
console.log('   Sokak    → Email: sokak@cafe.com  Şifre: test123');
console.log('   Smooth   → Email: smooth@cafe.com  Şifre: test123');
console.log('   Break    → Email: break@cafe.com  Şifre: test123\n');
