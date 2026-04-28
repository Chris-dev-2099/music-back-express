import { register, login, getAll, deleteUser, updateUser } from '../../controllers/userController.js'

export async function userRoutes(request, url, db) {
  if (url.pathname === '/api/v1/users/register' && request.method === 'POST') return register(request, db)
  if (url.pathname === '/api/v1/users/login'    && request.method === 'POST') return login(request, db)
  if (url.pathname === '/api/v1/users'          && request.method === 'GET')  return getAll(db)
  if (url.pathname.startsWith('/api/v1/users/') && request.method === 'DELETE') return deleteUser(url, db)
  if (url.pathname.startsWith('/api/v1/users/') && request.method === 'PUT')    return updateUser(request, url, db)
  return null
}