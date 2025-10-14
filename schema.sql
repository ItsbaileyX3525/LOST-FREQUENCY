-- Simple database schema for fingerprint to hash mapping

CREATE TABLE IF NOT EXISTS user_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL UNIQUE,
    allocatedHash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by fingerprint
CREATE INDEX IF NOT EXISTS idx_fingerprint ON user_hashes(fingerprint);

-- Index for faster lookups by allocatedHash
CREATE INDEX IF NOT EXISTS idx_allocated_hash ON user_hashes(allocatedHash);