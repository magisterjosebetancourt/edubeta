-- 1. Asegurar que la columna 'state' existe en assignments
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.assignments'::regclass AND attname = 'state') THEN
    ALTER TABLE public.assignments ADD COLUMN state BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 2. Corregir Políticas de RLS para Assignments
-- Permitir tanto a admins como a docentes (si es necesario) actualizar el estado
DROP POLICY IF EXISTS "Enable update for admins" ON public.assignments;
DROP POLICY IF EXISTS "Admins manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Enable update for admins and teachers" ON public.assignments;

CREATE POLICY "Enable fully management for admins" ON public.assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Enable update state for assigned teachers" ON public.assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher'))
  );

-- 3. Asegurar que los perfiles se pueden actualizar por admins (para activar/desactivar docentes)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
