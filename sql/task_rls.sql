-- 1. Ensure user_id column exists and is of type UUID
DO $$
DECLARE
  col_type TEXT;
BEGIN
  -- Check if column exists
  IF EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tasks' AND column_name='user_id'
  ) THEN
    -- Column exists, check its type
    SELECT data_type INTO col_type FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tasks' AND column_name='user_id';

    IF col_type <> 'uuid' THEN
      -- Type is not UUID, attempt to alter it.
      -- First, drop potential existing foreign key constraints on user_id
      -- (Adjust constraint name if it's different)
      ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
      -- Now, alter the column type
      -- WARNING: This might fail if existing data cannot be cast to UUID!
      ALTER TABLE public.tasks ALTER COLUMN user_id TYPE UUID USING (user_id::text::uuid);
    END IF;
  ELSE
    -- Column does not exist, add it as UUID
    ALTER TABLE public.tasks ADD COLUMN user_id UUID;
  END IF;
END $$;

-- 2. Add Foreign Key constraint to auth.users (if it doesn't already exist)
-- Ensures data integrity and links tasks to Supabase auth users.
DO $$ BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'tasks_user_id_fkey' AND conrelid = 'public.tasks'::regclass
  ) THEN
      ALTER TABLE public.tasks 
      ADD CONSTRAINT tasks_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;
  END IF;
END; $$;

-- 3. Set default value for user_id to the currently logged-in user
-- Applies only to new inserts.
ALTER TABLE public.tasks 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4. Enable Row Level Security (RLS) on the tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (using UUID)

-- Policy for SELECT: Users can only see their own tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" 
  ON public.tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy for INSERT: Users can only insert tasks for themselves
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks" 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can only update their own tasks
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks" 
  ON public.tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy for DELETE: Users can only delete their own tasks
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks" 
  ON public.tasks 
  FOR DELETE 
  USING (auth.uid() = user_id); 