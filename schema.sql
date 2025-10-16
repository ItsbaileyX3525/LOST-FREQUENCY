-- Simple database schema for fingerprint to hash mapping

CREATE TABLE IF NOT EXISTS user_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL UNIQUE,
    allocatedHash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    completedHash TEXT NOT NULL,
    related_encoded TEXT
);

-- Table for storing encoded hashes with their encoding type
CREATE TABLE IF NOT EXISTS encoded_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_name TEXT NOT NULL UNIQUE,
    encoded_value TEXT NOT NULL
);

-- Index for faster lookups by fingerprint
CREATE INDEX IF NOT EXISTS idx_fingerprint ON user_hashes(fingerprint);
-- Index for faster lookups by allocatedHash
CREATE INDEX IF NOT EXISTS idx_allocated_hash ON user_hashes(allocatedHash);
-- Index for faster lookups by part_name in encoded_hashes
-- CREATE INDEX IF NOT EXISTS idx_part_name ON encoded_hashes(part_name);