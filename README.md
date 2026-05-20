# Music Back Express

Backend API para una aplicación de música construida con Cloudflare Workers, D1 Database y R2 Storage.

## Arquitectura

El proyecto está organizado en capas:

- **Routes**: Definición de endpoints de la API
- **Controllers**: Lógica de manejo de requests/responses
- **Services**: Lógica de negocio
- **Utils**: Utilidades compartidas (criptografía, autenticación, validaciones)

## Tecnologías

- **Cloudflare Workers**: Runtime serverless
- **D1 Database**: Base de datos SQL
- **R2 Storage**: Almacenamiento de archivos
- **Node.js**: Entorno de desarrollo

## Endpoints de la API

### Usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/users/register` | ❌ | Registrar nuevo usuario |
| POST | `/api/v1/users/login` | ❌ | Iniciar sesión |
| POST | `/api/v1/users/forgot-password` | ❌ | Solicitar recuperación de contraseña |
| POST | `/api/v1/users/reset-password` | ❌ | Restablecer contraseña con token |
| GET | `/api/v1/users` | ✅ | Obtener todos los usuarios |
| PUT | `/api/v1/users/{id}` | ✅ | Actualizar usuario |
| DELETE | `/api/v1/users/{id}` | ✅ | Eliminar usuario |

**Registro** — `POST /api/v1/users/register`
```json
{
  "nombre_usuario": "ejemplo",
  "correo": "user@example.com",
  "contrasena": "123456",
  "tipo_usuario": "user"
}
```

**Login** — `POST /api/v1/users/login`
```json
{
  "nombre_usuario": "ejemplo",
  "contrasena": "123456"
}
```

**Forgot password** — `POST /api/v1/users/forgot-password`
```json
{
  "correo": "user@example.com"
}
```

**Reset password** — `POST /api/v1/users/reset-password`
```json
{
  "token": "jwt_token_recibido_por_email",
  "contrasena": "nueva123"
}
```

Roles válidos: `user`, `admin`

### Archivos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/files` | Listar canciones (desde D1 con metadatos) |
| POST | `/api/v1/files` | Subir canción (multipart: metadata + archivo) |
| GET | `/api/v1/files/{id}` | Descargar archivo de canción |
| DELETE | `/api/v1/files/{id}` | Eliminar canción (D1 + R2) |

**Subir canción** — `POST /api/v1/files` (multipart/form-data)
- Campo `metadata`: JSON `{ "nombre_cancion": "...", "artista_cancion": "...", "album_cancion": "...", "genero": "..." }`
- Campo `archivo`: archivo de audio

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Desplegar
wrangler deploy
```

## Migración de base de datos

```bash
wrangler d1 execute ciafy --file=migrations/001_remove_apellido_add_correo.sql

# Crear tabla de canciones
wrangler d1 execute ciafy --file=migrations/002_create_canciones.sql
```

## Configuración

Requiere los siguientes bindings en Cloudflare:

- `DB`: Binding a D1 Database
- `MY_BUCKET`: Binding a R2 Bucket
- `JWT_SECRET`: Secreto para firmar tokens (configurar con `wrangler secret put JWT_SECRET`)
- `RESEND_API_KEY`: API key de Resend para envío de correos
- `DOMAIN`: Dominio de la app para el enlace de recuperación
