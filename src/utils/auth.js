import jwt from 'jsonwebtoken'

export function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const secret = env?.JWT_SECRET || 'dev-secret-change-in-prod'

  try {
    return jwt.verify(token, secret)
  } catch {
    return null
  }
}
