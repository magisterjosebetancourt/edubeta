-- Tabla para Periodos Académicos
CREATE TABLE IF NOT EXISTS academic_periods (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  period_number INTEGER NOT NULL, -- 1, 2, 3, 4
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Periods viewable by everyone" ON academic_periods FOR SELECT USING (true);
CREATE POLICY "Periods manageable by auth users" ON academic_periods FOR ALL USING (auth.role() = 'authenticated');

-- Asegurar que la tabla settings tenga los campos necesarios si no existen
-- (school_name, slogan, academic_year, logo_url ya existen según Settings.tsx)
