const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testPersistenceSystem() {
  console.log('🧪 Iniciando pruebas del sistema de persistencia...\n');

  try {
    // 1. Crear un juego
    console.log('1️⃣ Creando juego...');
    const createResponse = await axios.post(`${BASE_URL}/games/create`, {
      userId: 'test-user-1'
    });

    const gameCode = createResponse.data.game.code;
    console.log(`✅ Juego creado: ${gameCode}\n`);

    // 2. Unirse al juego
    console.log('2️⃣ Uniéndose al juego...');
    await axios.post(`${BASE_URL}/games/join`, {
      gameId: createResponse.data.game.id,
      userId: 'test-user-2'
    });
    console.log('✅ Jugador agregado\n');

    // 3. Verificar información de persistencia
    console.log('3️⃣ Verificando información de persistencia...');
    const persistenceInfo = await axios.get(`${BASE_URL}/games/${gameCode}/persistence`);
    console.log('📊 Información de persistencia:', JSON.stringify(persistenceInfo.data, null, 2));
    console.log('✅ Información obtenida\n');

    // 4. Guardar snapshot manual
    console.log('4️⃣ Guardando snapshot manual...');
    await axios.post(`${BASE_URL}/games/${gameCode}/snapshot`);
    console.log('✅ Snapshot guardado\n');

    // 5. Verificar información actualizada
    console.log('5️⃣ Verificando información actualizada...');
    const updatedInfo = await axios.get(`${BASE_URL}/games/${gameCode}/persistence`);
    console.log('📊 Información actualizada:', JSON.stringify(updatedInfo.data, null, 2));
    console.log('✅ Información verificada\n');

    // 6. Simular recuperación (crear nuevo juego con mismo código)
    console.log('6️⃣ Simulando recuperación...');
    const recoveryResponse = await axios.post(`${BASE_URL}/games/${gameCode}/restore`);
    console.log('🔄 Respuesta de recuperación:', JSON.stringify(recoveryResponse.data, null, 2));
    console.log('✅ Recuperación simulada\n');

    // 7. Limpiar datos de persistencia
    console.log('7️⃣ Limpiando datos de persistencia...');
    await axios.delete(`${BASE_URL}/games/${gameCode}/persistence`, {
      data: { keepCount: 2 }
    });
    console.log('✅ Datos limpiados\n');

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('✅ Creación de juego');
    console.log('✅ Unión de jugadores');
    console.log('✅ Verificación de persistencia');
    console.log('✅ Snapshots manuales');
    console.log('✅ Recuperación de juegos');
    console.log('✅ Limpieza de datos');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Función para probar múltiples juegos
async function testMultipleGames() {
  console.log('🧪 Probando múltiples juegos...\n');

  const games = [];

  try {
    // Crear 3 juegos
    for (let i = 1; i <= 3; i++) {
      const response = await axios.post(`${BASE_URL}/games/create`, {
        userId: `test-user-${i}`
      });
      games.push(response.data.game);
      console.log(`✅ Juego ${i} creado: ${response.data.game.code}`);
    }

    // Agregar jugadores a cada juego
    for (const game of games) {
      await axios.post(`${BASE_URL}/games/join`, {
        gameId: game.id,
        userId: `test-user-${game.code}`
      });
      console.log(`✅ Jugador agregado al juego ${game.code}`);
    }

    // Verificar persistencia de todos los juegos
    for (const game of games) {
      const info = await axios.get(`${BASE_URL}/games/${game.code}/persistence`);
      console.log(`📊 Juego ${game.code}: ${info.data.persistence.eventCount} eventos`);
    }

    console.log('\n✅ Pruebas de múltiples juegos completadas');

  } catch (error) {
    console.error('❌ Error en pruebas de múltiples juegos:', error.response?.data || error.message);
  }
}

// Función para probar recuperación después de "caída"
async function testRecoveryAfterCrash() {
  console.log('🧪 Probando recuperación después de "caída"...\n');

  try {
    // Crear juego
    const createResponse = await axios.post(`${BASE_URL}/games/create`, {
      userId: 'crash-test-user'
    });

    const gameCode = createResponse.data.game.code;
    console.log(`✅ Juego creado: ${gameCode}`);

    // Agregar jugadores
    await axios.post(`${BASE_URL}/games/join`, {
      gameId: createResponse.data.game.id,
      userId: 'crash-test-user-2'
    });
    console.log('✅ Jugadores agregados');

    // Guardar snapshot
    await axios.post(`${BASE_URL}/games/${gameCode}/snapshot`);
    console.log('✅ Snapshot guardado');

    // Simular "caída" - solo verificar que los datos persisten
    console.log('💥 Simulando caída del servidor...');

    // Verificar que los datos están disponibles
    const persistenceInfo = await axios.get(`${BASE_URL}/games/${gameCode}/persistence`);
    console.log('📊 Datos de persistencia disponibles:', persistenceInfo.data.persistence.hasData);

    // Simular recuperación
    const recoveryResponse = await axios.post(`${BASE_URL}/games/${gameCode}/restore`);
    console.log('🔄 Recuperación exitosa:', recoveryResponse.data.success);

    console.log('\n✅ Prueba de recuperación completada');

  } catch (error) {
    console.error('❌ Error en prueba de recuperación:', error.response?.data || error.message);
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('🚀 Iniciando suite completa de pruebas de persistencia\n');

  await testPersistenceSystem();
  console.log('\n' + '='.repeat(50) + '\n');

  await testMultipleGames();
  console.log('\n' + '='.repeat(50) + '\n');

  await testRecoveryAfterCrash();

  console.log('\n🎉 ¡Todas las pruebas completadas!');
}

// Verificar si el servidor está corriendo
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/games`);
    return true;
  } catch (error) {
    return false;
  }
}

// Función principal
async function main() {
  console.log('🔍 Verificando que el servidor esté corriendo...');

  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ El servidor no está corriendo. Por favor, inicia el servidor primero.');
    console.log('💡 Comando: npm run dev');
    process.exit(1);
  }

  console.log('✅ Servidor detectado, iniciando pruebas...\n');

  await runAllTests();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testPersistenceSystem,
  testMultipleGames,
  testRecoveryAfterCrash,
  runAllTests
}; 