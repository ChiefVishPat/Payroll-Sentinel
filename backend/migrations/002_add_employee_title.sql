-- Add title column to employees table if missing
ALTER TABLE employees ADD COLUMN IF NOT EXISTS title TEXT;
