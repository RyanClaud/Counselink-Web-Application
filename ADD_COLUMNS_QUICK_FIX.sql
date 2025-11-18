-- Quick fix: Add is_active and deactivated_at columns to users table
-- Run this SQL in your database to fix the login error

-- Check if columns already exist (optional, for safety)
-- If you get an error that column already exists, that's fine - just skip to the next step

-- Add is_active column
ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1;

-- Add deactivated_at column  
ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL;

-- Update all existing users to be active
UPDATE users SET is_active = 1 WHERE is_active IS NULL;

-- Verify the columns were added
SELECT user_id, email, is_active, deactivated_at FROM users LIMIT 5;
