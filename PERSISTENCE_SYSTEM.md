# Sistema de Persistencia del Estado del Juego

## Resumen

Este documento describe el sistema de persistencia implementado para el juego Tutifruti, que permite la tolerancia a fallos del servidor, escalabilidad horizontal y la capacidad de resumir juegos tras caídas.

## Arquitectura

### Componentes Principales

1. **GamePersistenceService**: Maneja la persistencia de snapshots y eventos
2. **GameManager**: Integrado con persistencia automática
3. **GameRecoveryService**: Recuperación automática al iniciar el servidor
4. **Nuevas tablas de base de datos**: `GameSnapshot` y `GameEvent`

### Flujo de Datos

```
Estado en Memoria (GameManager)
    ↓
Eventos (GamePersistenceService.logGameEvent)
    ↓
Snapshots (GamePersistenceService.saveGameSnapshot)
    ↓
Base de Datos (PostgreSQL)
```

## Características Implementadas

### 1. Snapshots Automáticos

- **Intervalo**: Cada 30 segundos para juegos activos
- **Milestones**: Snapshots en momentos importantes:
  - Creación del juego
  - Jugador se une/sale
  - Inicio del juego
  - Inicio de nueva ronda
  - Respuesta enviada

### 2. Event Sourcing

- **Eventos registrados**:
  - `GAME_CREATED`: Creación de juego
  - `PLAYER_JOINED`: Jugador se une
  - `PLAYER_LEFT`: Jugador sale
  - `GAME_STARTED`: Inicio del juego
  - `ROUND_STARTED`: Nueva ronda
  - `ROUND_CREATED`: Ronda creada
  - `PLAYER_CONFIRMED`: Jugador confirma
  - `ANSWER_SUBMITTED`: Respuesta enviada
  - `MILESTONE_SNAPSHOT`: Snapshot en milestone

### 3. Recuperación Automática

- **Al iniciar el servidor**: Recupera todos los juegos activos
- **Verificación de integridad**: Comprueba datos de persistencia
- **Limpieza automática**: Elimina datos de juegos finalizados

## API Endpoints

### Persistencia

```http
# Restaurar juego desde persistencia
POST /api/games/:code/restore

# Guardar snapshot manual
POST /api/games/:code/snapshot

# Obtener información de persistencia
GET /api/games/:code/persistence

# Limpiar datos de persistencia antiguos
DELETE /api/games/:code/persistence
```

### Respuestas de Ejemplo

#### Información de Persistencia

```json
{
  "success": true,
  "persistence": {
    "hasData": true,
    "snapshotCount": 1,
    "eventCount": 15,
    "latestSnapshot": {
      "id": "snapshot-id",
      "roundNumber": 3,
      "createdAt": "2024-01-20T19:12:18.000Z"
    },
    "recentEvents": [
      {
        "type": "ANSWER_SUBMITTED",
        "timestamp": "2024-01-20T19:12:18.000Z"
      }
    ]
  }
}
```

## Configuración

### Variables de Entorno

```env
# Intervalo de snapshots automáticos (ms)
SNAPSHOT_INTERVAL=30000

# Número de snapshots a mantener
SNAPSHOT_KEEP_COUNT=5
```

### Configuración de Base de Datos

Las nuevas tablas se crean automáticamente con la migración:

```sql
-- Tabla de snapshots
CREATE TABLE game_snapshots (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  round_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos
CREATE TABLE game_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

## Uso en Producción

### 1. Inicio del Servidor

El servidor automáticamente:

1. Verifica integridad de datos de persistencia
2. Limpia datos de juegos finalizados
3. Recupera juegos activos
4. Reinicia auto-snapshots para juegos activos

### 2. Tolerancia a Fallos

- **Caída del servidor**: Los juegos se recuperan automáticamente
- **Pérdida de conexión**: Los datos se mantienen en la base de datos
- **Reinicio**: Estado completo restaurado

### 3. Escalabilidad

- **Múltiples nodos**: Cada nodo puede recuperar juegos independientemente
- **Balanceo de carga**: Los juegos se pueden distribuir entre nodos
- **Consistencia**: Los snapshots garantizan consistencia del estado

## Monitoreo y Mantenimiento

### Logs Importantes

```bash
# Recuperación de juegos
🔄 Iniciando recuperación de juegos activos...
✅ Juego ABC123 recuperado exitosamente

# Snapshots
📸 Snapshot guardado para el juego ABC123
Milestone snapshot guardado: GAME_STARTED para el juego ABC123

# Limpieza
🧹 Datos limpiados para el juego XYZ789
```

### Métricas Recomendadas

1. **Tasa de recuperación**: Juegos recuperados / Total de juegos activos
2. **Tiempo de recuperación**: Tiempo desde inicio hasta recuperación completa
3. **Tamaño de datos**: Tamaño total de snapshots y eventos
4. **Frecuencia de snapshots**: Snapshots por minuto

### Limpieza Automática

- **Snapshots**: Se mantienen los últimos 5 por juego
- **Eventos**: Se mantienen todos (para auditoría)
- **Juegos finalizados**: Se limpian después de 24 horas

## Consideraciones de Rendimiento

### Optimizaciones Implementadas

1. **Snapshots diferidos**: No se guardan en cada evento
2. **Milestones inteligentes**: Solo en momentos importantes
3. **Limpieza automática**: Evita acumulación de datos
4. **Recuperación asíncrona**: No bloquea el inicio del servidor

### Recomendaciones

1. **Monitoreo de disco**: Los snapshots pueden crecer rápidamente
2. **Backup regular**: Incluir snapshots en backups
3. **Compresión**: Considerar compresión de snapshots antiguos
4. **Particionamiento**: Para bases de datos grandes

## Troubleshooting

### Problemas Comunes

1. **Juego no se recupera**

   - Verificar que hay datos de persistencia
   - Revisar logs de error
   - Comprobar integridad de datos

2. **Snapshots muy grandes**

   - Ajustar intervalo de snapshots
   - Implementar compresión
   - Limpiar datos antiguos

3. **Recuperación lenta**
   - Optimizar consultas de base de datos
   - Considerar índices adicionales
   - Implementar recuperación paralela

### Comandos de Diagnóstico

```bash
# Verificar integridad
curl http://localhost:3000/api/games/ABC123/persistence

# Forzar snapshot
curl -X POST http://localhost:3000/api/games/ABC123/snapshot

# Restaurar juego
curl -X POST http://localhost:3000/api/games/ABC123/restore
```

## Próximos Pasos

1. **Compresión de snapshots**: Implementar compresión para ahorrar espacio
2. **Recuperación paralela**: Mejorar velocidad de recuperación
3. **Métricas avanzadas**: Dashboard de monitoreo
4. **Backup automático**: Sistema de backup de snapshots
5. **Escalabilidad horizontal**: Distribución de juegos entre nodos
