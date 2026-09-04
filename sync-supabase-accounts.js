import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.SUPABASE_URL || '').trim();
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabase = createClient(cleanUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const accountsToProvision = [
  {
    email: 'admin.demo@motoluv.mx',
    password: 'MotoluvSecure2026!',
    name: 'Rodrigo Salinas Motoluv',
    phone: '5544332211',
    city: 'Ciudad de México',
    role: 'both',
    bank_account: {
      bank_name: 'BBVA Bancomer',
      bank_clabe: '000000000000000000',
      bank_holder: 'DEMO MOTOLUV'
    }
  },
  {
    email: 'demo@motoluv.mx',
    password: 'demo1234',
    name: 'Demo Motoluv',
    phone: '5500000000',
    city: 'Ciudad de México',
    role: 'both',
    bank_account: {
      bank_name: 'Santander México',
      bank_clabe: '000000000000000000',
      bank_holder: 'DEMO MOTOLUV'
    }
  },
  {
    email: 'comprador@motoluv.mx',
    password: 'comprador123',
    name: 'Comprador Motoluv',
    phone: '5511223344',
    city: 'Guadalajara',
    role: 'comprador',
    bank_account: null
  },
  {
    email: 'vendedor@motoluv.mx',
    password: 'vendedor123',
    name: 'Vendedor Certificado',
    phone: '5599887766',
    city: 'Monterrey',
    role: 'vendedor',
    bank_account: {
      bank_name: 'Banorte',
      bank_clabe: '000000000000000000',
      bank_holder: 'DEMO MOTOLUV'
    }
  }
];

async function syncAllAccountsToSupabase() {
  console.log('================================================================');
  console.log('🔄 SINCRONIZANDO CUENTAS DIRECTAMENTE EN SUPABASE AUTH Y DATABASE');
  console.log('================================================================\n');
  console.log('Supabase URL:', cleanUrl);

  for (const acc of accountsToProvision) {
    console.log(`\n📌 Procesando cuenta: ${acc.email} (${acc.name})...`);
    let authUserId = null;

    // 1. Crear / Actualizar en Supabase Auth (Pestaña "Authentication -> Users" en Supabase)
    if (serviceKey) {
      try {
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: {
            full_name: acc.name,
            name: acc.name,
            phone: acc.phone,
            city: acc.city,
            role: acc.role
          }
        });

        if (createError) {
          if (createError.message.includes('already') || createError.message.includes('exists')) {
            console.log('   ℹ️ Ya existía en Supabase Auth. Buscando ID del usuario...');
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingAuth = listData?.users?.find(u => u.email === acc.email);
            if (existingAuth) {
              authUserId = existingAuth.id;
              console.log('   ✅ ID en Supabase Auth recuperado:', authUserId);
            }
          } else {
            console.warn('   ⚠️ Error en Supabase Auth admin.createUser:', createError.message);
          }
        } else if (createData?.user) {
          authUserId = createData.user.id;
          console.log('   ✅ Creado exitosamente en Supabase Auth (ID:', authUserId, ')');
        }
      } catch (err) {
        console.warn('   ⚠️ Excepción en Supabase Auth:', err.message);
      }
    } else {
      // Intentar signUp con Anon key
      const { data: signUpData } = await supabase.auth.signUp({
        email: acc.email,
        password: acc.password,
        options: { data: { full_name: acc.name, phone: acc.phone, city: acc.city, role: acc.role } }
      });
      if (signUpData?.user) authUserId = signUpData.user.id;
    }

    // 2. Insertar / Actualizar en la tabla 'public.users' (Pestaña "Table Editor -> users" en Supabase)
    const dbId = authUserId || `user_${acc.email.split('@')[0]}`;
    console.log(`   📝 Guardando en la tabla 'public.users' de Supabase con ID: ${dbId}...`);

    const userPayload = {
      id: dbId,
      email: acc.email,
      name: acc.name,
      phone: acc.phone,
      city: acc.city,
      role: acc.role,
      bank_account: acc.bank_account,
      created_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('users')
      .upsert([userPayload], { onConflict: 'email' });

    if (dbError) {
      console.error('   ❌ Error al guardar en tabla public.users:', dbError.message);
    } else {
      console.log(`   ✅ Sincronizado en la tabla 'public.users' de Supabase!`);
    }
  }

  // Verificar estado actual de la tabla users en Supabase
  console.log('\n================================================================');
  console.log('📊 VERIFICANDO LISTADO COMPLETO EN LA TABLA public.users:');
  const { data: allUsers, error: listErr } = await supabase.from('users').select('id, name, email, role, city, created_at');
  if (listErr) {
    console.error('Error listando usuarios:', listErr.message);
  } else {
    console.table(allUsers);
  }

  // Si tenemos serviceKey, verificar listado en Auth
  if (serviceKey) {
    console.log('\n🔐 VERIFICANDO USUARIOS EN SUPABASE AUTH (Authentication):');
    const { data: authList } = await supabase.auth.admin.listUsers();
    console.table(authList?.users?.map(u => ({ id: u.id, email: u.email, confirmed: u.email_confirmed_at ? 'SI' : 'NO' })));
  }

  console.log('================================================================');
  console.log('🎉 TODAS LAS CUENTAS QUEDARON PROVISIONADAS EN SUPABASE!');
  console.log('================================================================');
}

syncAllAccountsToSupabase();
