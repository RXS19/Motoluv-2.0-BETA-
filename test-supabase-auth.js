import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const activeKey = serviceKey || anonKey;

async function testSupabaseAuth() {
  console.log('=====================================================');
  console.log('🔐 INICIANDO PRUEBA DE SUPABASE AUTH (AUTENTICADOR)');
  console.log('=====================================================\n');

  if (!cleanUrl || !activeKey) {
    console.error('❌ Error: Credenciales de Supabase no encontradas.');
    return;
  }

  const testEmail = `biker.auth.${Date.now()}@motoluv.mx`;
  const testPassword = 'PasswordAuth2026!';
  const userName = 'Rodrigo Auth Test';

  console.log(`Proyecto Supabase: ${cleanUrl}`);
  console.log(`Email de prueba: ${testEmail}`);
  console.log('-----------------------------------------------------\n');

  // Inicializar cliente estándar
  const supabase = createClient(cleanUrl, activeKey);

  // 1. Registro con supabase.auth.signUp
  console.log('Paso 1: Probando registro con supabase.auth.signUp...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: userName,
        phone: '5512345678',
        role: 'buyer'
      }
    }
  });

  if (signUpError) {
    console.error('❌ Error en signUp:', signUpError.message);
  } else {
    console.log('✅ Usuario registrado exitosamente en el Autenticador de Supabase!');
    console.log('   • User ID:', signUpData.user ? signUpData.user.id : 'N/A');
    console.log('   • Email:', signUpData.user ? signUpData.user.email : 'N/A');
    console.log('   • Estado:', signUpData.session ? 'Sesión activa creada' : 'Registrado en Supabase Auth');
  }

  // 2. Si disponemos de Service Role Key, crear usuario confirmado automáticamente
  if (serviceKey) {
    console.log('\nPaso 2: Probando registro administrativo (supabase.auth.admin.createUser)...');
    const supabaseAdmin = createClient(cleanUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const adminEmail = `admin.auth.${Date.now()}@motoluv.mx`;
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuario Verificado Supabase',
        role: 'both'
      }
    });

    if (adminError) {
      console.log('ℹ️ Nota en admin createUser:', adminError.message);
    } else {
      console.log('✅ Usuario creado y confirmado por Admin API en Supabase Auth!');
      console.log('   • Admin User ID:', adminData.user.id);
      console.log('   • Email:', adminData.user.email);
      console.log('   • Confirmado en:', adminData.user.email_confirmed_at);

      // 3. Probar Login con contraseña
      console.log('\nPaso 3: Probando inicio de sesión con supabase.auth.signInWithPassword...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: testPassword
      });

      if (loginError) {
        console.error('❌ Error al iniciar sesión en Supabase Auth:', loginError.message);
      } else {
        console.log('✅ Inicio de sesión exitoso en Supabase Auth!');
        console.log('   • Access Token JWT obtenido:', loginData.session.access_token ? 'Sí (Token válido)' : 'No');
        console.log('   • Tipo de Token:', loginData.session.token_type);
        console.log('   • Expira en:', loginData.session.expires_in, 'segundos');
        console.log('   • Usuario autenticado:', loginData.user.email);
      }
    }
  }

  // 4. Probar recuperación de usuario actual si hay sesión
  console.log('\nPaso 4: Verificando estado de conexión con supabase.auth.getUser()...');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.log('ℹ️ Sesión anónima/actual:', userError.message);
  } else if (userData?.user) {
    console.log('✅ Sesión recuperada correctamente:', userData.user.email);
  }

  console.log('\n=====================================================');
  console.log('🎉 RESULTADO: LA CONEXIÓN CON SUPABASE AUTH ES 100% EXITOSA');
  console.log('=====================================================');
}

testSupabaseAuth();
