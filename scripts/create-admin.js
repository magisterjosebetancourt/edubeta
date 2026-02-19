const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente para no depender de dotenv
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ No se encontró el archivo .env.local');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales en .env.local (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)');
  console.log('Asegúrate de copiar la "service_role" key de tu dashboard de Supabase (Project Settings > API).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@edubeta.com';
  const password = 'admin123';
  const fullName = 'Admin User';

  console.log(`⏳ Creando usuario administrador: ${email}...`);

  // 1. Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) {
    console.error('❌ Error creando usuario Auth:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ Usuario Auth creado (ID: ${userId})`);

  // 2. Crear/Actualizar Profile con rol 'admin'
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName,
      role: 'admin',
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('❌ Error creando perfil:', profileError.message);
  } else {
    console.log('✅ Perfil de administrador configurado correctamente.');
    console.log('\n🎉 ¡Listo! Ya puedes iniciar sesión con:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  }
}

createAdmin();
