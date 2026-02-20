-- Optimización de Asistencia: Por Materia y Docente
-- Permite múltiples registros por día (uno por asignatura)

DO $$ 
BEGIN 
  -- 1. Añadir columna subject_id
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.attendance_records'::regclass AND attname = 'subject_id') THEN
    ALTER TABLE public.attendance_records ADD COLUMN subject_id bigint REFERENCES public.subjects(id);
  END IF;

  -- 2. Añadir columna teacher_id
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.attendance_records'::regclass AND attname = 'teacher_id') THEN
    ALTER TABLE public.attendance_records ADD COLUMN teacher_id uuid REFERENCES public.profiles(id);
  END IF;

  -- 3. Añadir columna processed (para el coordinador)
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.attendance_records'::regclass AND attname = 'processed') THEN
    ALTER TABLE public.attendance_records ADD COLUMN processed boolean DEFAULT false;
  END IF;
END $$;

-- 4. Actualizar la restricción de unicidad
-- Primero eliminamos cualquier restricción existente de student_id + fecha
-- Nota: El nombre de la restricción puede variar, usualmente es attendance_records_student_id_date_key o similar
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_id_date_key;

-- Creamos la nueva restricción: Estudiante + Fecha + Asignatura
-- Esto permite que el estudiante tenga una inasistencia en Matemáticas y otra en Ciencias el mismo día
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_unique_per_subject;
ALTER TABLE public.attendance_records 
ADD CONSTRAINT attendance_records_unique_per_subject UNIQUE (student_id, date, subject_id);
