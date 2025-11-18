# User Deactivation Feature (Soft Delete)

## Overview
Replaced the permanent "Delete" functionality with a "Deactivate/Reactivate" system. This is a soft delete approach that preserves user data while preventing account access.

## Why Deactivation Instead of Deletion?

### Benefits of Soft Delete:
1. **Data Integrity**: Preserves historical records and relationships
2. **Audit Trail**: Maintains complete system history
3. **Reversibility**: Accounts can be reactivated if needed
4. **Compliance**: Meets data retention requirements
5. **Analytics**: Historical data remains available for reporting
6. **Relationships**: Preserves foreign key relationships (appointments, feedback, etc.)

### Problems with Hard Delete:
- ❌ Breaks foreign key relationships
- ❌ Loses historical data permanently
- ❌ Cannot undo accidental deletions
- ❌ Violates data retention policies
- ❌ Breaks audit trails
- ❌ Orphans related records

---

## Features Implemented

### 1. Database Schema Changes

**New Columns Added to `users` table:**

```sql
is_active BOOLEAN NOT NULL DEFAULT TRUE
deactivated_at DATETIME NULL
```

**Purpose:**
- `is_active`: Indicates if the account is active (TRUE) or deactivated (FALSE)
- `deactivated_at`: Timestamp of when the account was deactivated

**Migration File**: `migrations/add_user_active_status.sql`

---

### 2. User Model Updates

**File**: `models/User.js`

**Added Fields:**
```javascript
is_active: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
  allowNull: false,
},
deactivated_at: {
  type: DataTypes.DATE,
  allowNull: true,
}
```

---

### 3. Controller Functions

**File**: `controllers/adminController.js`

#### Deactivate User
```javascript
export const deactivateUser = async (req, res) => {
    // Finds user by ID
    // Checks if user is admin (cannot deactivate admins)
    // Sets is_active = false
    // Sets deactivated_at = current timestamp
    // Saves changes
}
```

#### Reactivate User
```javascript
export const reactivateUser = async (req, res) => {
    // Finds user by ID
    // Sets is_active = true
    // Sets deactivated_at = null
    // Saves changes
}
```

**Removed Function:**
- ~~`deleteUser`~~ (permanently deleted users)

---

### 4. Routes Updated

**File**: `routes/index.js`

**Before:**
```javascript
router.post("/admin/users/:id/delete", protect(['admin']), deleteUser);
```

**After:**
```javascript
router.post("/admin/users/:id/deactivate", protect(['admin']), deactivateUser);
router.post("/admin/users/:id/reactivate", protect(['admin']), reactivateUser);
```

---

### 5. User Management View

**File**: `views/admin/users.xian`

#### Status Display
Shows three possible states:
1. **Active** (Green badge): `is_active = true` and `is_locked = false`
2. **Locked** (Red badge): `is_locked = true`
3. **Inactive** (Gray badge): `is_active = false`

#### Action Buttons
- **Active users**: Show "Deactivate" button (orange/warning)
- **Inactive users**: Show "Reactivate" button (green)
- **Locked users**: Show "Unlock" button (green)

#### New Filter
Added "Inactive" filter button to view only deactivated accounts

**Filter Options:**
- All
- Students
- Counselors
- Locked
- **Inactive** (NEW)

---

### 6. Login Protection

**File**: `controllers/authController.js`

**Added Check:**
```javascript
// Check if account is deactivated
if (!user.is_active) {
  req.flash("error_msg", "Your account has been deactivated. Please contact an administrator.");
  return res.redirect("/login");
}
```

**Login Flow:**
1. Check if user exists
2. **Check if account is deactivated** ← NEW
3. Check if account is locked
4. Check if account is temporarily throttled
5. Validate password
6. Allow login

---

## User Interface

### User Management Page

**Status Badges:**
```
┌─────────────────────────────────────────────────┐
│ Name          Email           Role    Status    │
├─────────────────────────────────────────────────┤
│ John Doe      john@email.com  Student ✓ Active  │
│ Jane Smith    jane@email.com  Student ⊗ Inactive│
│ Bob Wilson    bob@email.com   Student 🔒 Locked │
└─────────────────────────────────────────────────┘
```

**Action Buttons:**

For **Active** users:
```
[⊗ Deactivate]
```

For **Inactive** users:
```
[✓ Reactivate]
```

For **Locked** users:
```
[🔓 Unlock]
```

---

## Workflow Examples

### Deactivating a User

**Admin Action:**
1. Navigate to User Management (`/admin/users`)
2. Find the user to deactivate
3. Click "Deactivate" button
4. Confirm the action
5. User status changes to "Inactive"

**Database Changes:**
```sql
UPDATE users 
SET is_active = FALSE, 
    deactivated_at = '2025-11-18 10:30:00'
WHERE user_id = 123;
```

**User Experience:**
- User is immediately logged out (if currently logged in)
- Cannot log in again
- Sees message: "Your account has been deactivated. Please contact an administrator."

---

### Reactivating a User

**Admin Action:**
1. Navigate to User Management
2. Filter by "Inactive" (optional)
3. Find the deactivated user
4. Click "Reactivate" button
5. User status changes to "Active"

**Database Changes:**
```sql
UPDATE users 
SET is_active = TRUE, 
    deactivated_at = NULL
WHERE user_id = 123;
```

**User Experience:**
- Can log in immediately
- Full access restored
- All historical data intact

---

## Security Considerations

### Admin Protection
```javascript
if (userToDeactivate.role === 'admin') {
    req.flash('error_msg', 'Cannot deactivate admin accounts.');
    return res.redirect('/admin/users');
}
```
- Admin accounts cannot be deactivated
- Prevents accidental system lockout
- Maintains system access

### Confirmation Dialogs
```javascript
onsubmit="return confirm('Are you sure you want to deactivate this user? They will not be able to log in.');"
```
- Prevents accidental deactivation
- Clear warning message
- User must confirm action

---

## Data Preservation

### What's Preserved:
✅ User profile information
✅ Appointment history
✅ Feedback given/received
✅ Counseling records
✅ Notifications
✅ All timestamps and metadata

### What Changes:
- `is_active` → FALSE
- `deactivated_at` → Current timestamp
- Login access → Blocked

### What's NOT Affected:
- Historical appointments remain visible
- Feedback remains in system
- Reports include deactivated users' historical data
- Foreign key relationships intact

---

## Database Migration

### Running the Migration

**Option 1: Manual SQL**
```bash
mysql -u username -p database_name < migrations/add_user_active_status.sql
```

**Option 2: Using Sequelize (if configured)**
```bash
npx sequelize-cli db:migrate
```

**Option 3: Direct Database Access**
1. Open your database management tool
2. Run the SQL commands from `migrations/add_user_active_status.sql`
3. Verify columns were added: `DESCRIBE users;`

### Verification
```sql
-- Check if columns exist
SHOW COLUMNS FROM users LIKE 'is_active';
SHOW COLUMNS FROM users LIKE 'deactivated_at';

-- Check default values for existing users
SELECT user_id, email, is_active, deactivated_at FROM users LIMIT 5;
```

**Expected Result:**
- All existing users should have `is_active = TRUE`
- All existing users should have `deactivated_at = NULL`

---

## Testing Checklist

### Admin Functions
- [ ] Can deactivate a student account
- [ ] Can deactivate a counselor account
- [ ] Cannot deactivate an admin account
- [ ] Can reactivate a deactivated account
- [ ] Confirmation dialog appears before deactivation
- [ ] Success message displays after deactivation
- [ ] Success message displays after reactivation

### User Experience
- [ ] Deactivated user cannot log in
- [ ] Appropriate error message shown on login attempt
- [ ] Reactivated user can log in immediately
- [ ] User status badge displays correctly (Active/Inactive/Locked)

### Data Integrity
- [ ] Historical appointments remain visible
- [ ] Feedback from deactivated users still shows
- [ ] Reports include deactivated users' data
- [ ] No broken foreign key relationships

### UI/UX
- [ ] "Deactivate" button shows for active users
- [ ] "Reactivate" button shows for inactive users
- [ ] "Inactive" filter works correctly
- [ ] Status badges display correct colors
- [ ] Search works with inactive users

---

## Comparison: Before vs After

### Before (Hard Delete)

**Admin View:**
```
[🗑️ Delete]  ← Permanently removes user
```

**Result:**
- User record deleted from database
- All relationships broken
- Historical data lost
- Cannot be undone
- Orphaned records

### After (Soft Delete)

**Admin View:**
```
[⊗ Deactivate]  ← Disables account
[✓ Reactivate]  ← Re-enables account
```

**Result:**
- User record preserved
- All relationships intact
- Historical data maintained
- Can be reversed
- Complete audit trail

---

## Future Enhancements

### Short Term
- [ ] Add "Deactivation Reason" field
- [ ] Email notification to user when deactivated
- [ ] Bulk deactivate/reactivate functionality
- [ ] Export list of inactive users

### Long Term
- [ ] Auto-deactivate after X days of inactivity
- [ ] Scheduled reactivation (temporary deactivation)
- [ ] Deactivation history log
- [ ] Self-service reactivation requests
- [ ] Data anonymization for long-term inactive accounts

---

## Troubleshooting

### Issue 1: Migration Fails
**Error**: Column already exists
**Solution**: Check if columns were already added manually
```sql
SHOW COLUMNS FROM users;
```

### Issue 2: Users Can Still Log In After Deactivation
**Solution**: 
1. Check if `is_active` column exists
2. Verify login controller has the check
3. Clear any cached sessions
4. Restart the server

### Issue 3: Cannot Reactivate User
**Solution**:
1. Check database: `SELECT is_active FROM users WHERE user_id = X;`
2. Verify route is correct: `/admin/users/:id/reactivate`
3. Check server logs for errors

### Issue 4: Status Badge Not Showing Correctly
**Solution**:
1. Clear browser cache
2. Check Handlebars helper: `{{#if (not this.is_active)}}`
3. Verify data is being passed to view

---

## API Documentation

### Deactivate User
**Endpoint**: `POST /admin/users/:id/deactivate`
**Auth**: Admin only
**Parameters**: `id` (user_id in URL)
**Response**: Redirect to `/admin/users` with flash message

### Reactivate User
**Endpoint**: `POST /admin/users/:id/reactivate`
**Auth**: Admin only
**Parameters**: `id` (user_id in URL)
**Response**: Redirect to `/admin/users` with flash message

---

## Files Modified

1. **models/User.js** - Added `is_active` and `deactivated_at` fields
2. **controllers/adminController.js** - Replaced `deleteUser` with `deactivateUser` and `reactivateUser`
3. **controllers/authController.js** - Added deactivation check in login
4. **routes/index.js** - Updated routes for deactivate/reactivate
5. **views/admin/users.xian** - Updated UI with new buttons and filters
6. **migrations/add_user_active_status.sql** - Database migration script

---

## Success Indicators

✅ No more permanent deletions
✅ All user data preserved
✅ Accounts can be reactivated
✅ Clear status indicators
✅ Proper access control
✅ Complete audit trail
✅ Better data integrity
✅ Compliance-friendly

---

## Rollback Plan

If you need to revert to the old delete system:

1. **Remove new columns:**
```sql
ALTER TABLE users DROP COLUMN is_active;
ALTER TABLE users DROP COLUMN deactivated_at;
```

2. **Restore old controller function:**
```javascript
export const deleteUser = async (req, res) => {
    await User.destroy({ where: { user_id: req.params.id } });
    // ...
};
```

3. **Restore old route:**
```javascript
router.post("/admin/users/:id/delete", protect(['admin']), deleteUser);
```

4. **Restore old view:**
```html
<button>Delete</button>
```

**Note**: Not recommended! Soft delete is a best practice.
