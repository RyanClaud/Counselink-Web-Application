# Login Error Fix - Quick Guide

## Problem
"Server error during login" - This happens because the code is checking for the `is_active` column that doesn't exist in the database yet.

## Solution
You need to add the new columns to your database. Choose ONE of the methods below:

---

## Method 1: Quick SQL Fix (Recommended)

### Step 1: Open your database
Use one of these tools:
- phpMyAdmin
- MySQL Workbench
- Command line: `mysql -u username -p database_name`
- Any database management tool you prefer

### Step 2: Run this SQL
```sql
-- Add the new columns
ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1;
ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL;

-- Make sure all existing users are active
UPDATE users SET is_active = 1 WHERE is_active IS NULL;
```

### Step 3: Verify
```sql
-- Check if columns were added
SHOW COLUMNS FROM users;

-- Check the data
SELECT user_id, email, is_active, deactivated_at FROM users LIMIT 5;
```

You should see:
- `is_active` column with value `1` for all users
- `deactivated_at` column with `NULL` for all users

### Step 4: Restart your server
```bash
# Stop the server (Ctrl+C)
# Then start it again
npm run xian
```

### Step 5: Try logging in
The login should now work!

---

## Method 2: Using the SQL File

### Step 1: Locate the file
Find `ADD_COLUMNS_QUICK_FIX.sql` in your project root

### Step 2: Run it
```bash
mysql -u your_username -p your_database_name < ADD_COLUMNS_QUICK_FIX.sql
```

Replace:
- `your_username` with your MySQL username
- `your_database_name` with your database name

### Step 3: Restart server and test

---

## Method 3: Manual via phpMyAdmin

### Step 1: Open phpMyAdmin
Navigate to your database → users table

### Step 2: Go to "Structure" tab

### Step 3: Click "Add column"

**First Column:**
- Name: `is_active`
- Type: `TINYINT`
- Length: `1`
- Default: `1`
- Null: Unchecked

**Second Column:**
- Name: `deactivated_at`
- Type: `DATETIME`
- Null: Checked (allow NULL)

### Step 4: Save and restart server

---

## Verification Steps

After running the migration, verify everything works:

### 1. Check Database
```sql
DESCRIBE users;
```

You should see:
```
+------------------+--------------+------+-----+---------+
| Field            | Type         | Null | Key | Default |
+------------------+--------------+------+-----+---------+
| ...              | ...          | ...  | ... | ...     |
| is_active        | tinyint(1)   | YES  |     | 1       |
| deactivated_at   | datetime     | YES  |     | NULL    |
+------------------+--------------+------+-----+---------+
```

### 2. Check User Data
```sql
SELECT user_id, email, is_active, is_locked FROM users;
```

All users should have `is_active = 1`

### 3. Test Login
- Try logging in with a student account
- Try logging in with a counselor account
- Try logging in with an admin account

All should work!

### 4. Test Deactivation (Admin only)
- Login as admin
- Go to User Management
- Try deactivating a test user
- Try logging in as that user (should fail)
- Reactivate the user
- Try logging in again (should work)

---

## Troubleshooting

### Error: "Column 'is_active' already exists"
**Solution**: The column is already there! Just restart your server.

### Error: "Unknown column 'is_active' in 'field list'"
**Solution**: The migration didn't run. Follow Method 1 above.

### Error: "Access denied"
**Solution**: Check your database credentials in `.env` file

### Login still fails after migration
**Solution**: 
1. Restart your server completely
2. Clear browser cache
3. Check server console for specific error
4. Verify columns exist: `SHOW COLUMNS FROM users;`

### Users show as "Inactive" in admin panel
**Solution**: Run this SQL:
```sql
UPDATE users SET is_active = 1;
```

---

## What the Code Changes Do

### 1. Safe Check in Login
**Before:**
```javascript
if (!user.is_active) {
    // This crashes if column doesn't exist
}
```

**After:**
```javascript
if (user.is_active !== undefined && !user.is_active) {
    // Only checks if column exists
}
```

### 2. Model Update
Made `is_active` nullable temporarily for backward compatibility:
```javascript
is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: true, // Won't crash if column missing
}
```

---

## After Migration is Complete

Once you've successfully run the migration and verified everything works:

1. ✅ Login works for all users
2. ✅ Admin can deactivate users
3. ✅ Deactivated users cannot login
4. ✅ Admin can reactivate users
5. ✅ Status badges show correctly

---

## Quick Command Reference

### Check if columns exist:
```sql
SHOW COLUMNS FROM users LIKE 'is_active';
SHOW COLUMNS FROM users LIKE 'deactivated_at';
```

### Add columns (if missing):
```sql
ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1;
ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL;
```

### Set all users to active:
```sql
UPDATE users SET is_active = 1;
```

### Check user status:
```sql
SELECT user_id, email, is_active, is_locked FROM users;
```

---

## Need More Help?

If you're still having issues:

1. **Check the server console** - Look for the specific error message
2. **Check database connection** - Make sure `.env` has correct credentials
3. **Verify table exists** - `SHOW TABLES;` should list `users`
4. **Check column types** - `DESCRIBE users;` shows all columns

The most common issue is simply forgetting to run the SQL migration. Make sure you've added the columns to your database!
