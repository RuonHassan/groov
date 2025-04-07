# Supabase Authentication Setup for TaskFlow GTD

This guide outlines the steps to set up Supabase Authentication for the TaskFlow GTD application.

## 1. Configure Supabase Auth

1. Log in to your Supabase dashboard: https://app.supabase.co
2. Select your TaskFlow GTD project
3. Navigate to "Authentication" in the sidebar

### Email Auth Settings

1. Go to "Authentication" → "Providers" → "Email"
2. Enable "Email Confirmations" for security (recommended)
3. Customize email templates if desired
4. Configure "Redirect URLs" to point to your application. Add:
   - `http://localhost:3000/update-password` (for local development)
   - Your production URL (e.g., `https://yourapp.com/update-password`)

### (Optional) Configure Additional Providers

If you want to add other login methods:
1. Go to "Authentication" → "Providers"
2. Enable desired providers (Google, GitHub, etc.)
3. Follow the specific setup instructions for each provider

## 2. Create User Profile Table

To store additional user profile information, you'll need to create a users table that extends Supabase Auth's built-in users.

1. Navigate to "SQL Editor" in the Supabase dashboard
2. Run the SQL code from the `sql/user_table.sql` file:

```sql
-- Create a public users table that extends the auth.users with additional profile info
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS (Row Level Security) policies to secure the table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Users can view their own user data." 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own user data." 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "New users can insert their own user data." 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create function to create a profile record when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created on auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This creates:
- A `users` table linked to `auth.users`
- Row-level security policies to ensure users can only access their own data
- A trigger that automatically creates a profile entry when a user signs up

## 3. Configure Row-Level Security (RLS) for Existing Tables

Ensure all your existing tables have appropriate RLS policies to restrict data access to authenticated users.

Example policy for the `tasks` table:

```sql
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own tasks" 
  ON public.tasks 
  USING (user_id = auth.uid());
```

You'll need similar policies for:
- `calendar_events`
- `pomodoro_sessions`
- `forest_trees`

## 4. Testing Authentication

After setting up:

1. Use the newly created login page at `/login`
2. Try creating a new account at `/register`
3. Test password reset functionality at `/reset-password`
4. Verify that authentication state persists correctly

## 5. Further Customization

You can customize:

- Email templates in the Authentication → Email Templates section
- User roles and permissions with more advanced RLS policies
- Add multi-factor authentication for enhanced security

## Troubleshooting

- **"Invalid Login Credentials"**: Ensure the user has confirmed their email (if email confirmation is enabled)
- **Auth token issues**: Check that your Supabase keys and URLs are correctly configured in `.env`
- **Redirect issues**: Verify your redirect URLs are properly configured in Supabase Auth settings 