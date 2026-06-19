# First Time Setup Instructions

Since no users exist yet, follow these steps to create your first admin user:

## Step 1: Create Initial User via Signup

1. Go to the application and click "Sign Up" or navigate to `/signup`
2. Fill in the form with:
   - **Full Name**: Admin User
   - **Email**: amberadmin001@amberstudent.com
   - **Password**: Amber@2024
3. Click "Sign Up"

## Step 2: Update User Role to Admin

After signing up, you need to manually update the user's role in the database:

### Option A: Using Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this SQL command:

```sql
UPDATE user_profiles
SET role = 'admin',
    unique_id = 'Amberadmin001'
WHERE email = 'amberadmin001@amberstudent.com';
```

### Option B: Using Supabase Table Editor

1. Go to your Supabase Dashboard
2. Navigate to Table Editor > user_profiles
3. Find the user with email `amberadmin001@amberstudent.com`
4. Edit the row:
   - Set `role` to `admin`
   - Set `unique_id` to `Amberadmin001`
5. Save changes

## Step 3: Sign Out and Sign In with User ID

1. Sign out from the application
2. Go to the login page
3. Sign in with:
   - **User ID**: Amberadmin001
   - (Password remains: Amber@2024)

## Step 4: Create Additional Users

Now that you're logged in as an admin, you can:

1. Go to **Admin Panel > Users**
2. Click "**Add Single User**" to create individual users like Amber001, Amber002
3. Or click "**Bulk Create Training Users**" to create 100 training users (Ambertraining001-100)

## Default Credentials

All users created through the admin panel will have:
- **Password**: Amber@2024
- **Email format**: [userid]@amberstudent.com (e.g., amber001@amberstudent.com)

## Creating Amber001 and Amber002

Once you're logged in as admin:

1. Go to Admin Panel > Users
2. Click "Add Single User"
3. For Amber001:
   - User ID: Amber001
   - Full Name: Test User 001
   - Role: Employee
   - Department: Testing
   - Country: UK
4. Click "Add User"
5. Repeat for Amber002

---

**Note**: You can now sign in with any user using their User ID (not email) on the login page.
