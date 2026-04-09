const { Redis } = require('@upstash/redis');

// Usar credenciales directas para el test
const redis = new Redis({
  url: 'https://glad-duckling-60522.upstash.io',
  token: 'AexqAAIncDFkOTI4YmI2ZGYzYWY0YzE1ODdiYTkwMGU3M2VjZWRjNnAxNjA1MjI',
});

async function run() {
  console.log('--- Diagnóstico de Redis ---');
  try {
    const start = Date.now();
    const ping = await redis.ping();
    const latency = Date.now() - start;
    console.log(`✅ Conexión: ${ping}`);
    console.log(`⏱️ Latencia: ${latency}ms`);

    const hits = await redis.get('metrics:session_cache:hits') || 0;
    const misses = await redis.get('metrics:session_cache:misses') || 0;
    
    console.log(`📊 Hits totales: ${hits}`);
    console.log(`📊 Misses totales: ${misses}`);
    
    // Probar escritura
    await redis.set('test:connection', 'OK', { ex: 60 });
    const testVal = await redis.get('test:connection');
    console.log(`💾 Test Escritura/Lectura: ${testVal}`);

  } catch (err) {
    console.error('❌ Error en Redis:', err);
  }
}

run();
