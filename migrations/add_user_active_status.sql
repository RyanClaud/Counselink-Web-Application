-- Migration: Add is_active and deactivated_at columns to users table
-- This allows soft deletion (deactivation) of user accounts instead of permanent deletion

-- Add is_active column (defaults to true for existing users)
ALTER TABLE users 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add deactivated_at column to track when account was deactivated
ALTER TABLE users 
ADD COLUMN deactivated_at DATETIME NULL;

-- Add index for better query performance
CREATE INDEX idx_users_is_active ON users(is_active);

-- Optional: Add comment to explain the columns
-- ALTER TABLE users MODIFY COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indicates if the user account is active';
-- ALTER TABLE users MODIFY COLUMN deactivated_at DATETIME NULL COMMENT 'Timestamp when the account was deactivated';
