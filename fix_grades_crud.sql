-- 1. Políticas de Seguridad para Grades (Grupos)
-- Permitir a los profesores crear, editar y eliminar grados (además de los admins)

alter table public.grades enable row level security;

-- Limpiar políticas viejas
drop policy if exists "Grades are viewable by everyone." on public.grades;
drop policy if exists "Admins can insert grades." on public.grades;

-- Nuevas políticas completas
create policy "Enable read access for all users" on public.grades
  for select using (true);

create policy "Enable insert for admins and teachers" on public.grades
  for insert with check (
    exists (select 1 from public.profiles 
            where id = auth.uid() and role in ('admin', 'teacher'))
  );

create policy "Enable update for admins and teachers" on public.grades
  for update using (
    exists (select 1 from public.profiles 
            where id = auth.uid() and role in ('admin', 'teacher'))
  );

create policy "Enable delete for admins and teachers" on public.grades
  for delete using (
    exists (select 1 from public.profiles 
            where id = auth.uid() and role in ('admin', 'teacher'))
  );
