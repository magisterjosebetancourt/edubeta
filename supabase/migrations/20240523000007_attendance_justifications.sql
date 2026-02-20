-- Tabla attendance_records
do $$ 
begin 
  if not exists (select from pg_attribute where attrelid = 'public.attendance_records'::regclass and attname = 'justified') then
    alter table public.attendance_records add column justified boolean default false;
  end if;
end $$;

-- Asegurar políticas para actualización de justificaciones
DROP POLICY IF EXISTS "Admins and teachers can manage attendance" ON public.attendance_records;
CREATE POLICY "Admins and teachers can manage attendance" ON public.attendance_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
