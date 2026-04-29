# Music Back Express

Backend API para una aplicación de música construida con Cloudflare Workers, D1 Database y R2 Storage.

## Arquitectura

El proyecto está organizado en capas:

- **Routes**: Definición de endpoints de la API
- **Controllers**: Lógica de manejo de requests/responses
- **Services**: Lógica de negocio (no utilizada actualmente)
- **Utils**: Utilidades compartidas como criptografía

## Tecnologías

- **Cloudflare Workers**: Runtime serverless
- **D1 Database**: Base de datos SQL
- **R2 Storage**: Almacenamiento de archivos
- **Node.js**: Entorno de desarrollo

## Endpoints de la API

### Usuarios

- `POST /api/v1/users/register` - Registrar nuevo usuario
- `POST /api/v1/users/login` - Iniciar sesión
- `GET /api/v1/users` - Obtener todos los usuarios
- `PUT /api/v1/users/{id}` - Actualizar usuario
- `DELETE /api/v1/users/{id}` - Eliminar usuario

### Archivos

- `GET /api/v1/files` - Listar archivos
- `PUT /api/v1/files/{filename}` - Subir archivo
- `GET /api/v1/files/{filename}` - Descargar archivo
- `DELETE /api/v1/files/{filename}` - Eliminar archivo

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Desplegar
wrangler deploy
```

## Configuración

Requiere las siguientes variables de entorno en Cloudflare:

- `DB`: Binding a D1 Database
- `MY_BUCKET`: Binding a R2 Bucket