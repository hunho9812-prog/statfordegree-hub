-- Fix: Allow all custom column types (not just checkbox)
-- Run this in the Supabase SQL Editor

-- Drop any existing CHECK constraint on the type column
ALTER TABLE table_columns DROP CONSTRAINT IF EXISTS table_columns_type_check;
ALTER TABLE table_columns DROP CONSTRAINT IF EXISTS table_columns_type_fkey;

-- Drop any enum type and recreate column as plain text
DO $$
BEGIN
  -- If the column uses an enum type, convert it to text first
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_columns' AND column_name = 'type'
      AND udt_name != 'text' AND udt_name != 'varchar'
  ) THEN
    ALTER TABLE table_columns ALTER COLUMN type TYPE text USING type::text;
  END IF;
END $$;

-- Ensure column is plain text with no constraint
ALTER TABLE table_columns ALTER COLUMN type SET DEFAULT 'checkbox';

-- Add a new permissive CHECK constraint (optional, for data integrity)
ALTER TABLE table_columns DROP CONSTRAINT IF EXISTS table_columns_type_valid;
ALTER TABLE table_columns ADD CONSTRAINT table_columns_type_valid
  CHECK (type IN ('checkbox', 'text', 'number', 'date', 'assignee', 'status'));

-- Verify
SELECT id, label, type FROM table_columns;
