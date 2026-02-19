-- 1. Tabla de Invitaciones
create table if not exists public.teacher_invites (
  email text primary key,
  token text not null,
  full_name text,
  created_at timestamp with time zone default now()
);

-- 2. Seguridad (RLS) para la tabla de invitaciones
alter table public.teacher_invites enable row level security;

-- Permitir a usuarios autenticados (Admins/Docentes existentes) ver y crear invitaciones
create policy "Authenticated users can manage invites"
  on public.teacher_invites
  for all
  using (auth.role() = 'authenticated');

-- 3. Función de Validación antes del Registro
-- Esta función se ejecutará ANTES de que un usuario se cree en Auth.
-- Si no tiene invitación válida o el token no coincide, se bloquea el registro.
create or replace function public.validate_teacher_invite()
returns trigger as $$
declare
  invite_record record;
  submitted_token text;
begin
  -- Buscar invitación por email
  select * into invite_record from public.teacher_invites where email = new.email;
  
  if invite_record is null then
    raise exception 'No existe una invitación para este correo electrónico.';
  end if;
  
  -- Obtener el token enviado desde el cliente (en raw_user_meta_data)
  submitted_token := new.raw_user_meta_data->>'invite_token';
  
  if submitted_token is null or submitted_token != invite_record.token then
     raise exception 'Token de invitación inválido o no proporcionado.';
  end if;
  
  -- Si pasa, asignamos automáticamente el rol 'teacher' y el nombre
  new.raw_user_meta_data = jsonb_set(new.raw_user_meta_data, '{role}', '"teacher"');
  new.raw_user_meta_data = jsonb_set(new.raw_user_meta_data, '{full_name}', to_jsonb(invite_record.full_name));

  return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger para conectar la validación al registro de usuarios
-- IMPORTANTE: Esto bloqueará cualquier registro público que no tenga invitación.
drop trigger if exists on_auth_user_created_check_invite on auth.users;
create trigger on_auth_user_created_check_invite
  before insert on auth.users
  for each row execute procedure public.validate_teacher_invite();

-- 5. Función para limpiar la invitación después del registro exitoso
-- Se agrega la columna email a profiles si no existe
alter table public.profiles add column if not exists email text;

create or replace function public.handle_invite_consumed()
returns trigger as $$
begin
  delete from public.teacher_invites where email = new.email;
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', 'teacher', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- 6. Trigger post-registro
drop trigger if exists on_auth_user_created_consume_invite on auth.users;
create trigger on_auth_user_created_consume_invite
  after insert on auth.users
  for each row execute procedure public.handle_invite_consumed();

-- 7. Sincronizar emails existentes (por si ya creaste un profesor)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null and p.role = 'teacher';
