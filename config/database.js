const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'smsf.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      balance DECIMAL(10,2) DEFAULT 0,
      role VARCHAR(10) DEFAULT 'user',
      status TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      firefox_service_id VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      country VARCHAR(50) DEFAULT '',
      operator VARCHAR(50) DEFAULT '',
      description VARCHAR(255) DEFAULT '',
      maxPrice DECIMAL(10,2) DEFAULT 0,
      require_mobile TINYINT DEFAULT 0,
      timeout INT DEFAULT 300,
      sort_order INT DEFAULT 0,
      status TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_key VARCHAR(50) UNIQUE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      is_used TINYINT DEFAULT 0,
      used_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      FOREIGN KEY (used_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      phone_number VARCHAR(30),
      firefox_order_id VARCHAR(50),
      sms_code TEXT,
      sms_content TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      amount DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration: add new columns to services if they don't exist
  const cols = db.pragma('table_info(services)').map(c => c.name);
  const migrations = [
    ['country', "VARCHAR(50) DEFAULT ''"],
    ['operator', "VARCHAR(50) DEFAULT ''"],
    ['description', "VARCHAR(255) DEFAULT ''"],
    ['maxPrice', 'DECIMAL(10,2) DEFAULT 0'],
    ['require_mobile', 'TINYINT DEFAULT 0'],
    ['timeout', 'INT DEFAULT 300'],
    ['sort_order', 'INT DEFAULT 0']
  ];
  migrations.forEach(([col, def]) => {
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE services ADD COLUMN ${col} ${def}`);
    }
  });

  // Migration: add sms_content to orders
  const orderCols = db.pragma('table_info(orders)').map(c => c.name);
  if (!orderCols.includes('sms_content')) {
    db.exec('ALTER TABLE orders ADD COLUMN sms_content TEXT');
  }

  // Insert default admin if not exists (random password printed to console)
  const bcrypt = require('bcryptjs');
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminUser) {
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(8).toString('hex');
    const hash = bcrypt.hashSync(randomPassword, 10);
    db.prepare('INSERT INTO users (username, password, role, balance) VALUES (?, ?, ?, ?)').run('admin', hash, 'admin', 9999);
    console.log('========================================');
    console.log('  Default admin account created:');
    console.log('  Username: admin');
    console.log('  Password: ' + randomPassword);
    console.log('  Please change the password after login.');
    console.log('========================================');
  }
}

module.exports = { db, initDB };
