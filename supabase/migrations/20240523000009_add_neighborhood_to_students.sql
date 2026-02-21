-- Add neighborhood column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Comment for documentation
COMMENT ON COLUMN students.neighborhood IS 'Barrio o ubicación de residencia del estudiante para caracterización socioeconómica.';
