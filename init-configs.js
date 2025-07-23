const { execSync } = require('child_process');

console.log('🚀 Inicializando configuraciones por defecto...');

try {
  // Ejecutar el script de inicialización
  execSync('npx ts-node src/scripts/initializeConfigs.ts', {
    stdio: 'inherit',
    cwd: __dirname
  });

  console.log('✅ Configuraciones inicializadas exitosamente');
} catch (error) {
  console.error('❌ Error ejecutando el script de inicialización:', error.message);
  process.exit(1);
} 