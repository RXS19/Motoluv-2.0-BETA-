import { createClient } from '@supabase/supabase-js';

/**
 * Función de prueba sencilla para verificar la conexión con Supabase.
 * Intenta recuperar un registro de la tabla indicada y registra el resultado en consola.
 *
 * @param {string} tableName - Nombre de la tabla a consultar (por defecto 'motos')
 */
export async function testSupabaseConnection(tableName = 'motos') {
  // Obtener y sanitizar credenciales desde variables de entorno
  const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const apiKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!cleanUrl || !apiKey) {
    console.error('❌ Error: No se encontraron las credenciales de Supabase en las variables de entorno.');
    return { success: false, error: 'Credenciales no encontradas' };
  }

  try {
    // 1. Inicializar cliente de Supabase
    const supabase = createClient(cleanUrl, apiKey);

    console.log(`📡 Intentando conectar con Supabase y recuperar 1 registro de la tabla '${tableName}'...`);

    // 2. Intentar recuperar 1 registro de la tabla
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    // 3. Evaluar respuesta
    if (error) {
      console.error(`❌ Error al conectar o consultar la tabla '${tableName}':`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ ¡Conexión exitosa con Supabase!`);
    console.log(`📊 Tabla consultada: '${tableName}'`);
    if (data && data.length > 0) {
      console.log(`📄 Registro recuperado con éxito:`, data[0]);
    } else {
      console.log(`ℹ️ La tabla '${tableName}' está accesible pero no contiene registros actualmente.`);
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Ocurrió una excepción inesperada durante la conexión:', err.message || err);
    return { success: false, error: err.message || err };
  }
}

// Si se ejecuta directamente desde Node.js (ej: node test-supabase.js)
if (process.argv[1]?.endsWith('test-supabase.js')) {
  const tableArg = process.argv[2] || 'motos';
  testSupabaseConnection(tableArg);
}
