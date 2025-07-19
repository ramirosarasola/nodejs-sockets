# API Documentation - Tutifruti Backend

## Base URL

```
http://localhost:5001
```

## Endpoints

### Usuarios

#### Crear Usuario

```http
POST /users
Content-Type: application/json

{
  "username": "usuario1",
  "email": "usuario1@example.com"
}
```

#### Obtener Usuario por ID

```http
GET /users/:id
```

#### Obtener Usuario por Email

```http
GET /users/email/:email
```

### Juegos

#### Crear Juego

```http
POST /games
Content-Type: application/json

{
  "userId": "user-id-here"
}
```

#### Unirse a Juego

```http
POST /games/join
Content-Type: application/json

{
  "userId": "user-id-here",
  "code": "ABC123"
}
```

#### Obtener Juego por Código

```http
GET /games/code/:code
```

#### Obtener Juego por ID

```http
GET /games/:id
```

#### Obtener Juego con Detalles Completos

```http
GET /games/:gameId/details
```

#### Actualizar Estado de Juego

```http
PUT /games/:gameId/status
Content-Type: application/json

{
  "status": "PLAYING" // WAITING, PLAYING, FINISHED, CANCELLED
}
```

#### Obtener Puntuaciones de Juego

```http
GET /games/:gameId/scores
```

#### Obtener Puntuaciones de Jugadores

```http
GET /games/:gameId/player-scores
```

#### Guardar Puntuación

```http
POST /games/scores
Content-Type: application/json

{
  "gameId": "game-id-here",
  "userId": "user-id-here",
  "score": 100
}
```

#### Obtener Partidas Activas

```http
GET /games/active/list
```

### Rondas

#### Crear Ronda

```http
POST /rounds
Content-Type: application/json

{
  "gameId": "game-id-here",
  "roundNumber": 1,
  "letter": "A"
}
```

#### Guardar Respuesta de Ronda

```http
POST /rounds/answer
Content-Type: application/json

{
  "gameId": "game-id-here",
  "roundNumber": 1,
  "userId": "user-id-here",
  "answers": {
    "nombre": "Ana",
    "apellido": "Alvarez",
    "animal": "Aguila",
    "ciudad": "Amsterdam",
    "color": "Azul",
    "fruta": "Arándano"
  }
}
```

#### Obtener Detalles de Ronda

```http
GET /rounds/:gameId/:roundNumber
```

#### Obtener Todas las Rondas de un Juego

```http
GET /rounds/:gameId
```

#### Finalizar Ronda

```http
PUT /rounds/:gameId/:roundNumber/finish
```

#### Obtener Respuestas de Ronda

```http
GET /rounds/:gameId/:roundNumber/answers
```

### Health Check

#### Verificar Estado del Servidor

```http
GET /health
```

## Respuestas de Error

Todas las respuestas de error siguen este formato:

```json
{
  "error": "Descripción del error"
}
```

### Códigos de Estado HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Ejemplos de Respuestas

### Juego Creado

```json
{
  "id": "game-uuid",
  "code": "ABC123",
  "status": "WAITING",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "startedAt": null,
  "finishedAt": null,
  "players": [
    {
      "id": "player-uuid",
      "gameId": "game-uuid",
      "userId": "user-uuid",
      "score": 0,
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "username": "usuario1",
        "email": "usuario1@example.com"
      }
    }
  ],
  "rounds": [],
  "scores": []
}
```

### Ronda Creada

```json
{
  "id": "round-uuid",
  "gameId": "game-uuid",
  "roundNumber": 1,
  "letter": "A",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": null
}
```

### Respuesta de Ronda

```json
{
  "id": "answer-uuid",
  "roundId": "round-uuid",
  "userId": "user-uuid",
  "answers": {
    "nombre": "Ana",
    "apellido": "Alvarez",
    "animal": "Aguila",
    "ciudad": "Amsterdam",
    "color": "Azul",
    "fruta": "Arándano"
  },
  "score": 10,
  "finishedAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": "user-uuid",
    "username": "usuario1"
  }
}
```

## WebSocket Events

### Eventos del Cliente al Servidor

#### Unirse a Juego

```javascript
socket.emit("join_game", {
  gameCode: "ABC123",
  username: "usuario1",
});
```

#### Iniciar Juego

```javascript
socket.emit("start_game", {
  gameCode: "ABC123",
  username: "usuario1",
});
```

#### Iniciar Siguiente Ronda

```javascript
socket.emit("start_next_round", {
  gameCode: "ABC123",
  username: "usuario1",
});
```

#### Jugador Listo

```javascript
socket.emit("player_ready", {
  gameCode: "ABC123",
  username: "usuario1",
});
```

#### Terminar Ronda

```javascript
socket.emit("tuti_fruti_finished", {
  gameCode: "ABC123",
  username: "usuario1",
  answers: {
    nombre: "Ana",
    apellido: "Alvarez",
    animal: "Aguila",
    ciudad: "Amsterdam",
    color: "Azul",
    fruta: "Arándano",
  },
});
```

### Eventos del Servidor al Cliente

#### Juego Listo para Iniciar

```javascript
socket.on("game_ready_to_start", (data) => {
  console.log("Juego listo para iniciar:", data);
  // data: { timeLeft: 30, totalPlayers: 4, isNewRound: false }
});
```

#### Juego Iniciado

```javascript
socket.on("game_started", (data) => {
  console.log("Juego iniciado:", data);
  // data: { letter: 'A', autoStarted: false, roundNumber: 1, isNewRound: false }
});
```

#### Jugador Confirmado

```javascript
socket.on("player_confirmed", (data) => {
  console.log("Jugador confirmado:", data);
  // data: { username: 'usuario1', confirmedPlayers: ['usuario1', 'usuario2'] }
});
```

#### Ronda Terminada

```javascript
socket.on("round_finished", (data) => {
  console.log("Ronda terminada:", data);
  // data: { finishedBy: 'usuario1', answers: {...}, scores: {...}, roundNumber: 1 }
});
```

#### Lista de Jugadores

```javascript
socket.on("player_list", (players) => {
  console.log("Lista de jugadores:", players);
  // players: [{ id: '...', username: 'usuario1', socketId: '...', score: 0 }]
});
```

#### Unido al Juego

```javascript
socket.on("joined_game", (data) => {
  console.log("Unido al juego:", data);
  // data: { gameCode: 'ABC123', username: 'usuario1' }
});
```

#### Error

```javascript
socket.on("error", (data) => {
  console.error("Error:", data);
  // data: { message: 'Error description' }
});
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

## Notas Importantes

1. **Autenticación**: Actualmente no hay autenticación implementada. Se recomienda agregar JWT o similar para producción.

2. **Validación**: Los datos se validan en el servidor, pero se recomienda validación adicional en el cliente.

3. **Rate Limiting**: No hay rate limiting implementado. Se recomienda agregar para producción.

4. **Logging**: Todos los eventos importantes se registran usando el sistema de logging centralizado.

5. **Base de Datos**: Se usa PostgreSQL con Prisma como ORM. Las migraciones se ejecutan automáticamente.

6. **WebSockets**: Se usa Socket.IO para comunicación en tiempo real.

7. **CORS**: Configurado para permitir todas las origenes en desarrollo. Configurar apropiadamente para producción.
