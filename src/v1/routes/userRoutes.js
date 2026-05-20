import { register, login, forgotPassword, resetPassword, getAll, deleteUser, updateUser } from '../../controllers/userController.js'
import { authenticate } from '../../utils/auth.js'

function unauth() {
  return new Response(JSON.stringify({ error: 'Token requerido o inválido' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
}

export async function userRoutes(request, url, env) {
  const db = env.DB

  if (url.pathname === '/api/v1/users/register'       && request.method === 'POST') return register(request, db)
  if (url.pathname === '/api/v1/users/login'           && request.method === 'POST') return login(request, db, env)
  if (url.pathname === '/api/v1/users/forgot-password' && request.method === 'POST') return forgotPassword(request, db, env)
  if (url.pathname === '/api/v1/users/reset-password'  && request.method === 'POST') return resetPassword(request, db, env)

  if (!url.pathname.startsWith('/api/v1/users')) return null

  const user = authenticate(request, env)
  if (!user) return unauth()

  if (url.pathname === '/api/v1/users'          && request.method === 'GET')  return getAll(db)
  if (url.pathname.startsWith('/api/v1/users/') && request.method === 'DELETE') return deleteUser(url, db)
  if (url.pathname.startsWith('/api/v1/users/') && request.method === 'PUT')    return updateUser(request, url, db)
  return null
}
