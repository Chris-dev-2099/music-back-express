import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function createToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function signToken(payload, secret, options = {}) {
  return jwt.sign(payload, secret, { expiresIn: options.expiresIn || '7d' })
}

export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret)
  } catch {
    return null
  }
}
