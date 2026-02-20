-- 1. Políticas de Seguridad para Profiles (Docentes)
-- Permitir a los admins eliminar perfiles
drop policy if exists "Enable delete for admins" on public.profiles;
create policy "Enable delete for admins" on public.profiles
  for delete using (
    exists (select 1 from public.profiles 
            where id = auth.uid() and role = 'admin')
  );

-- 2. Agregar columna 'state' a las tablas principales
-- Usamos 'state' como boolean (true = activo, false = inactivo)

-- Tabla Profiles (Profesores)
do $$ 
begin 
  if not exists (select from pg_attribute where attrelid = 'public.profiles'::regclass and attname = 'state') then
    alter table public.profiles add column state boolean default true;
  end if;
end $$;

-- Tabla Grades (Grados)
do $$ 
begin 
  if not exists (select from pg_attribute where attrelid = 'public.grades'::regclass and attname = 'state') then
    alter table public.grades add column state boolean default true;
  end if;
end $$;

-- Tabla Students (Estudiantes)
do $$ 
begin 
  if not exists (select from pg_attribute where attrelid = 'public.students'::regclass and attname = 'state') then
    alter table public.students add column state boolean default true;
  end if;
end $$;

-- Tabla Subjects (Materias)
do $$ 
begin 
  if not exists (select from pg_attribute where attrelid = 'public.subjects'::regclass and attname = 'state') then
    alter table public.subjects add column state boolean default true;
  end if;
end $$;
