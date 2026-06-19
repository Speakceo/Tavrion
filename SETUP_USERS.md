# Simple User Setup Guide

The authentication system has been simplified - users login with just their User ID, no password needed.

## Step 1: Create Admin001 User

Run this SQL in your Supabase SQL Editor:

```sql
INSERT INTO user_profiles (id, unique_id, full_name, email, role, department, country, is_active)
VALUES (
  gen_random_uuid(),
  'Admin001',
  'Admin User',
  'admin001@amberstudent.com',
  'admin',
  'Administration',
  'Global',
  true
)
ON CONFLICT (unique_id) DO NOTHING;
```

## Step 2: Login as Admin001

1. Go to the login page
2. Enter User ID: **Admin001**
3. Click Sign In

That's it! No password needed.

## Step 3: Create More Users

Once logged in as Admin001:

1. Go to **Admin Panel > Users**
2. Click **"Create Amber001-200"** to create 200 users at once (Amber001 through Amber200)
3. Or click **"Add Single User"** to create individual users with custom names

## How It Works

- Users login with just their User ID
- No passwords, no emails required
- Admin panel creates users directly in the database
- All users are active by default

## User IDs

- Admin: **Admin001**
- Regular users: **Amber001** to **Amber200**
- Any custom IDs you create in the admin panel
