# Arquitectura del Backend - Tutifruti App

## Resumen

Este proyecto ha sido refactorizado para utilizar **Programación Orientada a Objetos** y **patrones de diseño** que mejoran la escalabilidad, mantenibilidad y seguimiento de buenas prácticas. El sistema ahora incluye un schema de base de datos optimizado y servicios especializados.

## Patrones de Diseño Implementados

### 1. Singleton Pattern

- **GameManager**: Gestiona el estado global de todas las partidas
- **DatabaseService**: Maneja las conexiones a la base de datos
- **AppConfig**: Centraliza la configuración de la aplicación
- **Logger**: Sistema de logging centralizado

### 2. Observer Pattern

- **SocketHandler**: Maneja eventos de socket y notifica a los observadores
- **Logger**: Sistema de logging con observadores para diferentes tipos de logs

### 3. Strategy Pattern

- **GameService**: Implementa diferentes estrategias para el manejo del juego
- **DatabaseService**: Diferentes estrategias para operaciones de base de datos
- **RoundService**: Estrategias específicas para manejo de rondas

### 4. Repository Pattern

- **DatabaseService**: Abstrae las operaciones de base de datos
- **GameManager**: Repositorio para el estado de las partidas

### 5. Factory Pattern

- **AppConfig**: Factory para crear configuraciones según el entorno

## Estructura de Clases

### Core Services

#### GameManager (Singleton)

```typescript
class GameManager {
  // Gestiona el estado de todas las partidas
  // Maneja timers, confirmaciones, puntuaciones
  // Patrón Singleton para acceso global
}
```

#### GameService (Strategy)

```typescript
class GameService {
  // Lógica de negocio del juego
  // Manejo de eventos de socket
  // Coordinación entre GameManager y SocketHandler
}
```

#### DatabaseService (Repository + Singleton)

```typescript
class DatabaseService {
  // Operaciones de base de datos
  // Abstracción de Prisma
  // Manejo de errores centralizado
  // Consultas optimizadas con includes
}
```

#### RoundService (Strategy)

```typescript
class RoundService {
  // Lógica específica para rondas
  // Manejo de respuestas y puntuaciones
  // Coordinación con DatabaseService
}
```

### Configuration & Utilities

#### AppConfig (Factory + Singleton)

```typescript
class AppConfig {
  // Configuración centralizada
  // Diferentes configuraciones por entorno
  // Factory para crear configuraciones
}
```

#### Logger (Observer + Singleton)

```typescript
class Logger {
  // Sistema de logging centralizado
  // Diferentes niveles de log
  // Observadores para diferentes destinos
}
```

### Controllers (MVC Pattern)

#### UserController

```typescript
class UserController {
  // Manejo de requests HTTP para usuarios
  // Validación de datos
  // Respuestas estructuradas
}
```

#### GameController

```typescript
class GameController {
  // Manejo de requests HTTP para partidas
  // Operaciones CRUD de partidas
  // Validación de datos
  // Consultas complejas
}
```

#### RoundController

```typescript
class RoundController {
  // Manejo de requests HTTP para rondas
  // Operaciones específicas de rondas
  // Validación de respuestas
}
```

### Socket Handling

#### SocketHandler (Observer)

```typescript
class SocketHandler {
  // Manejo de eventos de socket
  // Validación de datos
  // Coordinación con GameService
}
```

## Schema de Base de Datos

### Modelos Principales

#### User

```sql
- id (UUID, Primary Key)
- username (String, Unique)
- email (String, Unique)
- createdAt (DateTime)
- updatedAt (DateTime)
```

#### Game

```sql
- id (UUID, Primary Key)
- code (String, Unique)
- status (Enum: WAITING, PLAYING, FINISHED, CANCELLED)
- createdAt (DateTime)
- updatedAt (DateTime)
- startedAt (DateTime, Optional)
- finishedAt (DateTime, Optional)
```

#### GamePlayer

```sql
- id (UUID, Primary Key)
- gameId (UUID, Foreign Key)
- userId (UUID, Foreign Key)
- score (Integer, Default: 0)
- joinedAt (DateTime)
- Unique constraint: (gameId, userId)
```

#### Round

```sql
- id (UUID, Primary Key)
- gameId (UUID, Foreign Key)
- roundNumber (Integer)
- letter (String)
- startTime (DateTime)
- endTime (DateTime, Optional)
- Unique constraint: (gameId, roundNumber)
```

#### RoundAnswer

```sql
- id (UUID, Primary Key)
- roundId (UUID, Foreign Key)
- userId (UUID, Foreign Key)
- answers (JSON)
- score (Integer, Default: 0)
- finishedAt (DateTime)
- Unique constraint: (roundId, userId)
```

#### GameScore

```sql
- id (UUID, Primary Key)
- gameId (UUID, Foreign Key)
- userId (UUID, Foreign Key)
- score (Integer)
- createdAt (DateTime)
- Unique constraint: (gameId, userId)
```

### Relaciones

- **User** ↔ **GamePlayer** (1:N)
- **User** ↔ **RoundAnswer** (1:N)
- **User** ↔ **GameScore** (1:N)
- **Game** ↔ **GamePlayer** (1:N)
- **Game** ↔ **Round** (1:N)
- **Game** ↔ **GameScore** (1:N)
- **Round** ↔ **RoundAnswer** (1:N)

## Beneficios de la Refactorización

### 1. Escalabilidad

- **Separación de responsabilidades**: Cada clase tiene una responsabilidad específica
- **Inyección de dependencias**: Fácil testing y modificación
- **Patrones reutilizables**: Código más mantenible
- **Schema optimizado**: Consultas eficientes con relaciones bien definidas

### 2. Mantenibilidad

- **Código organizado**: Estructura clara y lógica
- **Documentación**: Cada clase está bien documentada
- **Testing**: Fácil de testear cada componente por separado
- **Migraciones**: Sistema de migraciones automático con Prisma

### 3. Extensibilidad

- **Nuevos features**: Fácil agregar nuevas funcionalidades
- **Modificaciones**: Cambios localizados sin afectar otros componentes
- **Integración**: Fácil integración con nuevos servicios
- **API RESTful**: Endpoints bien estructurados y documentados

### 4. Robustez

- **Manejo de errores**: Centralizado y consistente
- **Logging**: Sistema de logs estructurado
- **Validación**: Validación de datos en múltiples capas
- **Constraints**: Restricciones de base de datos para integridad

## Flujo de Datos

```
Client Request → Router → Controller → Service → Manager → Database
                                    ↓
                              Socket Event → SocketHandler → GameService → GameManager
```

### Flujo de Rondas

```
GameService → RoundService → DatabaseService → Prisma → PostgreSQL
```

## Configuración

### Variables de Entorno

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5435/app_db
CORS_ORIGIN=*
```

### Configuración del Juego

```typescript
gameSettings: {
  roundTimer: 30000, // 30 segundos
  pointsPerWin: 10,
  minPlayers: 2,
  maxPlayers: 8
}
```

## API Endpoints

### Usuarios

- `POST /users` - Crear usuario
- `GET /users/:id` - Obtener usuario por ID
- `GET /users/email/:email` - Obtener usuario por email

### Juegos

- `POST /games` - Crear juego
- `POST /games/join` - Unirse a juego
- `GET /games/code/:code` - Obtener juego por código
- `GET /games/:id` - Obtener juego por ID
- `GET /games/:gameId/details` - Obtener juego con detalles completos
- `PUT /games/:gameId/status` - Actualizar estado de juego
- `GET /games/:gameId/scores` - Obtener puntuaciones
- `GET /games/:gameId/player-scores` - Obtener puntuaciones de jugadores
- `POST /games/scores` - Guardar puntuación
- `GET /games/active/list` - Obtener partidas activas

### Rondas

- `POST /rounds` - Crear ronda
- `POST /rounds/answer` - Guardar respuesta de ronda
- `GET /rounds/:gameId/:roundNumber` - Obtener detalles de ronda
- `GET /rounds/:gameId` - Obtener todas las rondas de un juego
- `PUT /rounds/:gameId/:roundNumber/finish` - Finalizar ronda
- `GET /rounds/:gameId/:roundNumber/answers` - Obtener respuestas de ronda

## Testing

Cada clase puede ser testeada de forma independiente:

```typescript
// Ejemplo de test para GameManager
describe("GameManager", () => {
  it("should create a game", () => {
    const manager = GameManager.getInstance();
    const game = manager.createGame("ABC123");
    expect(game.code).toBe("ABC123");
  });
});

// Ejemplo de test para DatabaseService
describe("DatabaseService", () => {
  it("should create a user", async () => {
    const dbService = DatabaseService.getInstance();
    const user = await dbService.createUser("testuser", "test@example.com");
    expect(user.username).toBe("testuser");
  });
});
```

## Próximos Pasos

1. **Implementar tests unitarios** para cada clase
2. **Agregar validación de datos** más robusta con Joi o Zod
3. **Implementar cache** con Redis para mejorar performance
4. **Agregar métricas** y monitoreo con Prometheus
5. **Implementar rate limiting** con express-rate-limit
6. **Agregar autenticación** con JWT
7. **Implementar WebSocket rooms** para mejor organización
8. **Agregar documentación automática** con Swagger/OpenAPI
9. **Implementar CI/CD** con GitHub Actions
10. **Agregar Docker** para containerización

## Conclusión

Esta refactorización transforma completamente el código de un enfoque procedural a uno orientado a objetos, implementando patrones de diseño que hacen el código más escalable, mantenible y robusto. La separación de responsabilidades, la abstracción de la lógica de negocio y el schema de base de datos optimizado facilitan futuras modificaciones y extensiones del sistema.

El sistema ahora incluye:

- ✅ Arquitectura orientada a objetos completa
- ✅ Patrones de diseño implementados
- ✅ Schema de base de datos optimizado
- ✅ API RESTful documentada
- ✅ Sistema de logging centralizado
- ✅ Manejo de errores robusto
- ✅ WebSockets para tiempo real
- ✅ Configuración centralizada
- ✅ Documentación completa
