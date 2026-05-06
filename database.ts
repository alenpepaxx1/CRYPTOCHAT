/**
 * Copyright Alen Pepa 2026
 */
import Database from 'better-sqlite3';
import path from 'path';

// Construct absolute path so it runs predictably anywhere
const dbFile = path.resolve(process.cwd(), 'chat.db');
const db = new Database(dbFile);

// Initialize Schema
try {
  db.prepare('ALTER TABLE users ADD COLUMN password TEXT').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN ban_reason TEXT').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN credits REAL DEFAULT 0').run();
} catch (e) {
  // Ignore, likely already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_guest INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    credits REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS credit_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    btc_address TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('world', 'group', 'private')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    action TEXT,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_btc REAL NOT NULL,
    price_usd REAL DEFAULT 0,
    wallet_address TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Ensure the original 'admin' user is always an admin
db.prepare("UPDATE users SET is_admin = 1 WHERE username = 'admin'").run();

try {
  db.prepare('ALTER TABLE products ADD COLUMN price_usd REAL DEFAULT 0').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare("ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'btc'").run();
} catch (e) {
  // Ignore, likely already exists
}

// Add image_url column if it doesn't exist (for existing databases)
try {
  db.prepare('ALTER TABLE products ADD COLUMN image_url TEXT').run();
} catch (e) {
  // Ignore, likely already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY(blocker_id) REFERENCES users(id),
    FOREIGN KEY(blocked_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_ratings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id),
    UNIQUE(seller_id, buyer_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    price_btc REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
  );
`);

// Seed World Chat room if it does not exist
try {
  const worldRoomExists = db.prepare('SELECT 1 FROM rooms WHERE id = ?').get('world');
  if (!worldRoomExists) {
    db.prepare('INSERT INTO rooms (id, name, type) VALUES (?, ?, ?)').run('world', 'World Chat', 'world');
  }
} catch (error) {
  console.error("Error setting up world room:", error);
}

try {
  db.prepare('ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN bio TEXT').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE products ADD COLUMN status TEXT DEFAULT "available"').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN avatar_url TEXT').run();
} catch (e) {
  // Ignore, likely already exists
}

try {
  db.prepare('ALTER TABLE transactions ADD COLUMN dispute_status TEXT').run();
  db.prepare('ALTER TABLE transactions ADD COLUMN dispute_reason TEXT').run();
} catch (e) {
  // Ignore, likely already exists
}

export default db;

// Seed default site settings
const defaultSettings = [
  { key: 'site_name', value: 'CryptoChat' },
  { key: 'site_logo', value: '' }, // empty means default or none
  { key: 'site_tags', value: 'Anonymous, Secure, Crypto, Underground' },
  { key: 'site_version', value: 'Prot.v2.4.0' }
];

defaultSettings.forEach(({key, value}) => {
  try {
    const exists = db.prepare('SELECT 1 FROM site_settings WHERE key = ?').get(key);
    if (!exists) {
      db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)').run(key, value);
    }
  } catch (e) {
    console.error("Error setting default setting:", e);
  }
});
