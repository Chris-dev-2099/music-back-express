import { register, login, getAll, deleteUser, updateUser } from '../../controllers/userController.js'

// Manejador de rutas para usuarios (API v1)
export async function userRoutes(request, url, db) {
  // Registrar usuario: POST /api/v1/users/register
  if (url.pathname === '/api/v1/users/register' && request.method === 'POST') return register(request, db)
  // Iniciar sesión: POST /api/v1/users/login
  if (url.pathname === '/api/v1/users/login'    && request.method === 'POST') return login(request, db)
  // Obtener todos los usuarios: GET /api/v1/users
  if (url.pathname === '/api/v1/users'          && request.method === 'GET')  return getAll(db)
  // Eliminar usuario: DELETE /api/v1/users/{id}
  if (url.pathname.startsWith('/api/v1/users/') && request.method === 'DELETE') return deleteUser(url, db)
  // Actualizar usuario: PUT /api/v1/users/{id}
  if (url.pathname.startsWith('/api/v1/users/') && request.method === 'PUT')    return updateUser(request, url, db)
  return null
}