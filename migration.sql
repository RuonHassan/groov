-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Make sure the users table exists with correct base structure
DROP TABLE IF EXISTS public.users;
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  calendar_sync_enabled BOOLEAN DEFAULT false,
  default_calendar_id INT4 DEFAULT NULL,
  default_task_color TEXT DEFAULT NULL,
  default_gcal_color TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add calendar_sync_enabled if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'calendar_sync_enabled') THEN
        ALTER TABLE public.users ADD COLUMN calendar_sync_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Add default_calendar_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'default_calendar_id') THEN
        ALTER TABLE public.users ADD COLUMN default_calendar_id INT4 DEFAULT NULL;
    END IF;

    -- Add default_task_color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'default_task_color') THEN
        ALTER TABLE public.users ADD COLUMN default_task_color TEXT DEFAULT NULL;
    END IF;

    -- Add default_gcal_color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'default_gcal_color') THEN
        ALTER TABLE public.users ADD COLUMN default_gcal_color TEXT DEFAULT NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Users can view their own user data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own user data" ON public.users;
DROP POLICY IF EXISTS "New users can insert their own user data" ON public.users;

CREATE POLICY "Users can view their own user data" 
  ON public.users 
  FOR SELECT 
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own user data" 
  ON public.users 
  FOR UPDATE 
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "New users can insert their own user data" 
  ON public.users 
  FOR INSERT 
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Recreate the function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  username_val TEXT;
BEGIN
  -- Generate username, ensuring uniqueness
  username_val := SPLIT_PART(NEW.email, '@', 1);
  
  -- Handle potential duplicate username
  IF EXISTS (SELECT 1 FROM public.users WHERE username = username_val) THEN
    username_val := username_val || '_' || FLOOR(RANDOM() * 1000)::TEXT;
  END IF;

  -- Insert new user with error handling
  BEGIN
    INSERT INTO public.users (
      id, 
      username, 
      email,
      calendar_sync_enabled,
      default_calendar_id,
      default_task_color,
      default_gcal_color
    )
    VALUES (
      NEW.id, 
      username_val,
      NEW.email,
      false,
      NULL,
      NULL,
      NULL
    );
  EXCEPTION WHEN unique_violation THEN
    -- If we hit a unique violation, try one more time with a random suffix
    INSERT INTO public.users (
      id, 
      username, 
      email,
      calendar_sync_enabled,
      default_calendar_id,
      default_task_color,
      default_gcal_color
    )
    VALUES (
      NEW.id, 
      username_val || '_' || FLOOR(RANDOM() * 9999)::TEXT,
      NEW.email,
      false,
      NULL,
      NULL,
      NULL
    );
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 