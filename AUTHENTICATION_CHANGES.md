# Authentication System Changes

## Overview

The authentication system has been updated from email/password to a unique ID-based system with pre-created user accounts.

## What Changed

### 1. Database Schema
- Added `unique_id` column to `user_profiles` table
- Added `password_hash` column (for future use)
- Created index on `unique_id` for fast lookups
- Made `email` field nullable

### 2. Authentication Flow

**Before:**
- Users signed up with email and password
- Users logged in with email and password
- Open registration

**After:**
- Users are pre-created by admins
- Users login with unique ID only (e.g., `Ambertraining001`)
- Password is handled automatically (default: `Amber@2024`)
- No public signup

### 3. Login Page Changes

The login page now:
- Accepts unique ID instead of email/password
- Shows helper text with ID format examples
- Displays default password information
- Removed signup link

### 4. Admin Dashboard Enhancements

Admins can now:
- View user unique IDs in the users table
- Edit user names inline (click edit icon)
- Save changes with check/cancel buttons
- Search by unique ID, name, or email
- Users are sorted by unique ID

### 5. User Accounts

**Admin Accounts:**
- Format: `Amberadmin001`
- Email: `amberadmin001@amberstudent.com`
- Role: Admin
- Full system access

**Training Accounts:**
- Format: `Ambertraining001` to `Ambertraining100`
- Emails: `ambertraining001@amberstudent.com` to `ambertraining100@amberstudent.com`
- Role: Employee
- Standard course access

**Default Password (All):** `Amber@2024`

## Technical Implementation

### AuthContext Updates
```typescript
signInWithUniqueId(uniqueId: string)
// Converts: Ambertraining001 → ambertraining001@amberstudent.com
// Uses default password: Amber@2024
// Calls Supabase auth.signInWithPassword
```

### Type Updates
```typescript
interface UserProfile {
  unique_id: string;  // NEW
  // ... other fields
}
```

### Database Migration
```sql
ALTER TABLE user_profiles ADD COLUMN unique_id text UNIQUE;
ALTER TABLE user_profiles ADD COLUMN password_hash text;
CREATE INDEX idx_user_profiles_unique_id ON user_profiles(unique_id);
```

## User Creation Process

See [SETUP_USERS.md](SETUP_USERS.md) for detailed instructions.

Quick process:
1. Create auth user in Supabase Auth (email + password)
2. Create user profile with unique_id
3. User can now login with unique ID

## Benefits

1. **Simplified Login**: Users only need to remember their ID
2. **Controlled Access**: Admins control who has accounts
3. **Consistent IDs**: Easy to identify and reference users
4. **Bulk Creation**: Can create 100 users programmatically
5. **Name Flexibility**: Admins can update display names anytime

## Migration Notes

- Existing users need `unique_id` populated
- Temp values assigned if null: `temp_${id}`
- Update via admin dashboard or SQL

## Security

- Authentication still uses Supabase Auth
- Passwords stored securely in auth.users
- RLS policies unchanged
- Session management unchanged
- JWT tokens work identically

## User Experience

**Login Flow:**
1. User opens app
2. Enters: `Ambertraining001`
3. Clicks "Sign In"
4. Automatically authenticated
5. Redirected to dashboard

**Admin Management:**
1. Admin views all users with unique IDs
2. Click edit icon next to name
3. Type new name
4. Click checkmark to save
5. Name updated across system

## Files Modified

- `src/contexts/AuthContext.tsx` - Added unique ID login
- `src/pages/Login.tsx` - Updated UI for unique ID
- `src/pages/admin/Users.tsx` - Added inline editing
- `src/types/index.ts` - Added unique_id field
- Database migration for schema changes

## Files Created

- `SETUP_USERS.md` - User creation guide
- `AUTHENTICATION_CHANGES.md` - This document
- `create-users.sql` - SQL for bulk user creation

## Testing

1. Create test admin user
2. Login with `Amberadmin001`
3. Navigate to Admin → Users
4. Edit a user name
5. Verify save works
6. Create training user
7. Login with training ID
8. Verify access level

## Future Enhancements

- Password reset via admin
- Bulk user import
- User export functionality
- Activity logs per user
- Custom password per user
