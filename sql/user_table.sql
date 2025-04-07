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