-- Tabla Assignments (Asignaciones Académicas)
do $$ 
begin 
  if not exists (select from pg_attribute where attrelid = 'public.assignments'::regclass and attname = 'state') then
    alter table public.assignments add column state boolean default true;
  end if;
end $$;
