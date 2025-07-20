# Configuración del Backend - Tutifruti

## Pasos para configurar el backend

### 1. Crear archivo .env

Copia el archivo `env.example` a `.env` y configura los valores:

```bash
cp env.example .env
```

### 2. Configurar la base de datos PostgreSQL

Asegúrate de tener PostgreSQL instalado y ejecutándose. Luego:

```bash
# Instalar dependencias
npm install

# Generar el cliente de Prisma
npx prisma generate

# Ejecutar las migraciones
npx prisma migrate dev

# (Opcional) Ver la base de datos
npx prisma studio
```

### 3. Variables de entorno necesarias

```env
# Configuración del servidor
PORT=5001
NODE_ENV=development

# Base de datos PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/tutifruti_db"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Configuración del juego
ROUND_TIMER=30000
POINTS_PER_WIN=10
MIN_PLAYERS=2
MAX_PLAYERS=8
```

### 4. Ejecutar el servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

### 5. Verificar que funciona

- El servidor debe estar ejecutándose en http://localhost:5001
- El endpoint `/health` debe responder con `{"status":"ok"}`
- La base de datos debe estar conectada

### 6. Troubleshooting

#### Error de conexión a la base de datos

- Verifica que PostgreSQL esté ejecutándose
- Confirma que las credenciales en DATABASE_URL sean correctas
- Asegúrate de que la base de datos `tutifruti_db` exista

#### Error de CORS

- Verifica que CORS_ORIGIN apunte a http://localhost:5173 (puerto de Vite)
- El frontend debe estar ejecutándose en el puerto correcto

#### Error de migraciones

- Ejecuta `npx prisma migrate reset` para resetear la base de datos
- Luego ejecuta `npx prisma migrate dev` para aplicar las migraciones

### 7. Estructura de la base de datos

El esquema incluye:

- `users`: Usuarios del sistema
- `games`: Partidas creadas
- `game_players`: Jugadores en cada partida
- `rounds`: Rondas de cada partida
- `round_answers`: Respuestas de los jugadores
- `game_scores`: Puntuaciones de los jugadores
