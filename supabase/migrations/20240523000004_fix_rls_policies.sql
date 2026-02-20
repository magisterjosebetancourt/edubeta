-- 1. Políticas para Students
DROP POLICY IF EXISTS "Enable update for admins and teachers" ON public.students;
CREATE POLICY "Enable update for admins and teachers" ON public.students
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "Enable delete for admins" ON public.students;
CREATE POLICY "Enable delete for admins" ON public.students
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Políticas para Grades
DROP POLICY IF EXISTS "Enable update for admins" ON public.grades;
CREATE POLICY "Enable update for admins" ON public.grades
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Enable delete for admins" ON public.grades;
CREATE POLICY "Enable delete for admins" ON public.grades
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Políticas para Subjects
DROP POLICY IF EXISTS "Enable update for admins" ON public.subjects;
CREATE POLICY "Enable update for admins" ON public.subjects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Enable delete for admins" ON public.subjects;
CREATE POLICY "Enable delete for admins" ON public.subjects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Políticas para Assignments
DROP POLICY IF EXISTS "Enable update for admins" ON public.assignments;
CREATE POLICY "Enable update for admins" ON public.assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Enable delete for admins" ON public.assignments;
CREATE POLICY "Enable delete for admins" ON public.assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Política de Actualización para Profiles (para que admins puedan activar/desactivar docentes)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
