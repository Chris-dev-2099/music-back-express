# Music Back Express

Backend API para una aplicación de música construida con Cloudflare Workers, D1 Database y R2 Storage.

## Arquitectura

El proyecto está organizado en capas:

- **Routes**: Definición de endpoints de la API (User routes, Song / Playlist / Favorite routes)
- **Controllers**: Lógica de manejo de requests/responses
- **Services**: Lógica de negocio (manejo directo de D1 y R2)
- **Utils**: Utilidades compartidas (criptografía, autenticación, validaciones)

## Tecnologías

- **Cloudflare Workers**: Runtime serverless rápido y distribuido globalmente.
- **D1 Database**: Base de datos SQL relacional basada en SQLite.
- **R2 Storage**: Almacenamiento de objetos compatible con S3.
- **Node.js**: Entorno de desarrollo.

---

## Endpoints de la API

### 1. Usuarios e Inicio de Sesión
Rutas bajo `/api/v1/users` para registrarse, iniciar sesión, y administrar credenciales.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/users/register` | ❌ | Registrar nuevo usuario |
| POST | `/api/v1/users/login` | ❌ | Iniciar sesión (Devuelve Token JWT) |
| POST | `/api/v1/users/forgot-password` | ❌ | Solicitar recuperación de contraseña (Devuelve token en pruebas) |
| POST | `/api/v1/users/reset-password` | ❌ | Restablecer contraseña con token |
| GET | `/api/v1/users` | ✅ | Obtener todos los usuarios registrados |
| PUT | `/api/v1/users/{id}` | ✅ | Actualizar datos del usuario |
| DELETE | `/api/v1/users/{id}` | ✅ | Eliminar usuario |

*Nota: Todas las rutas marcadas con ✅ requieren incluir el Header `Authorization: Bearer <token_jwt>`.*

---

### 2. Gestión de Canciones
Rutas bajo `/api/v1/song` para subir, listar, editar, buscar y descargar canciones.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/v1/song` | ❌ | Listar todas las canciones |
| POST | `/api/v1/song` | ❌ | Subir una nueva canción (Audio MP3 + Portada a R2) |
| GET | `/api/v1/song/search` | ❌ | Buscar canciones por nombre, artista o género |
| PUT | `/api/v1/song/{id}` | ❌ | Editar metadatos, audio o portada de una canción |
| GET | `/api/v1/song/{id}` | ❌ | Descargar / Stream de archivo de canción MP3 |
| DELETE | `/api/v1/song/{id}` | ❌ | Eliminar canción de la DB y sus archivos en R2 |

#### Detalle de Endpoints de Canciones:

*   **Subir Canción (POST `/api/v1/song` - `multipart/form-data`)**
    *   `nombre_cancion` (Texto, Obligatorio)
    *   `artista_cancion` (Texto, Opcional)
    *   `genero` (Texto, Opcional, ej: "Pop, Rock")
    *   `archivo` (File MP3, Obligatorio)
    *   `imagen` (File JPG/PNG, Opcional)

*   **Buscar Canciones (GET `/api/v1/song/search`)**
    *   Parámetros URL Query admitidos:
        *   `q`: Búsqueda general por nombre de canción o artista (ej: `?q=Milo`)
        *   `artist`: Filtrar por artista específico (ej: `?artist=Yo`)
        *   `genre`: Filtrar por género específico (ej: `?genre=Rock`)

*   **Editar Canción (PUT `/api/v1/song/{id}`)**
    *   Soporta tanto cuerpo en formato `JSON` como en `multipart/form-data` (útil si se desea subir una nueva carátula o reemplazar el audio).
    *   **Importante:** Si no se suministra un nuevo archivo `imagen` o `archivo`, los recursos existentes en D1/R2 se conservan intactos sin riesgo de pérdida de datos.

---

### 3. Canciones Favoritas (Favoritos)
Permite a cada usuario autenticado gestionar su catálogo personal de canciones favoritas.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/favorites` | ✅ | Agregar una canción a favoritos |
| GET | `/api/v1/favorites` | ✅ | Obtener el catálogo de favoritos del usuario |
| DELETE | `/api/v1/favorites/{songId}` | ✅ | Eliminar una canción de favoritos |

#### Ejemplos:
*   **Añadir a Favoritos (POST `/api/v1/favorites`):**
    ```json
    {
      "cancion_id": 5
    }
    ```
*   **Respuesta de Listar Favoritos (GET `/api/v1/favorites`):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id_cancion": 5,
          "nombre_cancion": "Freaks",
          "artista_cancion": "Surf Curse",
          "genero": ["Rock", "Indie"],
          "imagen": "https://pub-xxx.r2.dev/images/cover.jpg",
          "url": "https://pub-xxx.r2.dev/freaks.mp3",
          "fecha_agregado": "2026-05-21 02:15:00"
        }
      ]
    }
    ```

---

### 4. Listas de Reproducción (Playlists)
Gestión completa de listas de reproducción personalizadas asociadas al usuario autenticado.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/playlists` | ✅ | Crear una nueva lista de reproducción |
| GET | `/api/v1/playlists` | ✅ | Obtener todas las playlists creadas por el usuario |
| GET | `/api/v1/playlists/{id}` | ✅ | Obtener detalles y canciones de una playlist |
| PUT | `/api/v1/playlists/{id}` | ✅ | Actualizar nombre o descripción de una playlist |
| DELETE | `/api/v1/playlists/{id}` | ✅ | Eliminar una playlist completa |
| POST | `/api/v1/playlists/{id}/songs` | ✅ | Agregar una canción a la playlist |
| DELETE | `/api/v1/playlists/{id}/songs/{songId}` | ✅ | Eliminar una canción de la playlist |

#### Ejemplos:
*   **Crear Playlist (POST `/api/v1/playlists`):**
    ```json
    {
      "nombre_playlist": "Mi Rock Favorito",
      "descripcion_playlist": "Colección de clásicos e indie"
    }
    ```
*   **Añadir Canción a Playlist (POST `/api/v1/playlists/{id}/songs`):**
    ```json
    {
      "cancion_id": 4
    }
    ```
*   **Detalle de una Playlist (GET `/api/v1/playlists/{id}`):**
    ```json
    {
      "success": true,
      "data": {
        "id_playlist": 1,
        "nombre_playlist": "Mi Rock Favorito",
        "descripcion_playlist": "Colección de clásicos e indie",
        "fecha_creacion": "2026-05-21 02:30:15",
        "canciones": [
          {
            "id_cancion": 4,
            "nombre_cancion": "Freaks",
            "artista_cancion": "Surf Curse",
            "genero": ["Rock"],
            "imagen": "https://pub-xxx.r2.dev/images/pato.png",
            "url": "https://pub-xxx.r2.dev/freaks.mp3",
            "fecha_agregado": "2026-05-21 02:35:40"
          }
        ]
      }
    }
    ```

---

## Códigos de Error Comunes

*   `400 Bad Request`: Parámetro obligatorio faltante (ej: `nombre_cancion`), archivo vacío o tipo MIME no admitido.
*   `401 Unauthorized`: Token JWT ausente, inválido o expirado.
*   `404 Not Found`: Canción, Playlist o recurso inexistente en la base de datos D1.
*   `500 Internal Server Error`: Excepción no controlada. Se entrega detalle del error en formato JSON para fácil depuración.

---

## Configuración y Despliegue

### Variables de Entorno y Bindings
Asegura estos campos en tu archivo `wrangler.jsonc` antes de desplegar:

```json
  "vars": {
    "JWT_SECRET": "dev-secret-change-in-prod",
    "DOMAIN": "https://apimusic.ca-arboleda26.workers.dev",
    "R2_PUBLIC_URL": "https://pub-5f9e3cb40881454887b1062b9ec4d12a.r2.dev"
  },
```

### Ejecutar Desarrollo
```bash
npm run dev
```

### Desplegar a Producción
```bash
npx wrangler deploy
```
