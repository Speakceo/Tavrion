# Quick Start - Create Your First User

## Step 1: Create Admin User in Supabase

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** (left sidebar) → **Users**
4. Click the green **"Add user"** button
5. Select **"Create new user"**
6. Fill in:
   - **Email**: `amberadmin001@amberstudent.com`
   - **Password**: `Amber@2024`
   - **Check the box**: "Auto Confirm User"
7. Click **"Create user"**

## Step 2: Create User Profile

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
INSERT INTO user_profiles (id, unique_id, full_name, email, role, department, country, is_active)
SELECT
  id,
  'Amberadmin001',
  'Admin User',
  'amberadmin001@amberstudent.com',
  'admin',
  'Administration',
  'UK',
  true
FROM auth.users
WHERE email = 'amberadmin001@amberstudent.com'
ON CONFLICT (id) DO NOTHING;
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

## Step 3: Login

1. Go back to your app: http://localhost:5173
2. Enter User ID: `Amberadmin001`
3. Click **"Sign In"**
4. You're in!

## Verify It Worked

After running the SQL, you can verify the user profile was created:

```sql
SELECT unique_id, full_name, email, role
FROM user_profiles
WHERE unique_id = 'Amberadmin001';
```

You should see your admin user details.

## Next Steps

Once logged in as admin:
1. Go to **Admin** → **Users** to see the user management interface
2. Create more training users following [SETUP_USERS.md](SETUP_USERS.md)
3. Assign courses to users
4. Test the AI features

## Troubleshooting

**"Invalid User ID" error?**
- Make sure you created the user in Authentication → Users
- Make sure you ran the SQL to create the profile
- Check the user exists: `SELECT * FROM user_profiles WHERE unique_id = 'Amberadmin001';`

**Can't find the SQL Editor?**
- Left sidebar → SQL Editor (looks like a code icon)
- Or go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

**SQL returns no rows?**
- Wait 5-10 seconds after creating the auth user
- Make sure email is exactly: `amberadmin001@amberstudent.com`
- Check user exists: `SELECT * FROM auth.users WHERE email = 'amberadmin001@amberstudent.com';`
