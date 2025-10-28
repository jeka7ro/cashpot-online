-- Migration: Add cvt_series field to metrology table
-- Run this migration to add the cvt_series column to existing metrology tables

-- Add cvt_series column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'metrology' AND column_name = 'cvt_series'
  ) THEN
    ALTER TABLE metrology ADD COLUMN cvt_series VARCHAR(50);
  END IF;
END $$;

-- Add serial_number column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'metrology' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE metrology ADD COLUMN serial_number VARCHAR(255);
  END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'metrology' 
ORDER BY ordinal_position;

