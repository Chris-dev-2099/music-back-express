import { hashPassword, verifyPassword, createToken } from '../utils/crypto.js'

const ROLES_VALIDOS = ['user', 'admin']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validarRegistro(body) {
  const { nombre_usuario, correo, contrasena, tipo_usuario } = body
  const errores = []

  if (!nombre_usuario || nombre_usuario.length < 3)
    errores.push('nombre_usuario debe tener al menos 3 caracteres')
  if (!correo || !EMAIL_REGEX.test(correo))
    errores.push('correo no tiene un formato válido')
  if (!contrasena || contrasena.length < 6)
    errores.push('contrasena debe tener al menos 6 caracteres')
  if (!tipo_usuario || !ROLES_VALIDOS.includes(tipo_usuario))
    errores.push(`tipo_usuario debe ser uno de: ${ROLES_VALIDOS.join(', ')}`)

  return errores.length ? errores : null
}

export async function register(request, db) {
  const body = await request.json()
  const { nombre_usuario, correo, contrasena, tipo_usuario } = body

  const errores = validarRegistro(body)
  if (errores)
    return new Response(JSON.stringify({ error: 'Datos inválidos', detalles: errores }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const existe = await db.prepare('SELECT id_usuarios FROM usuarios_ciafy WHERE nombre_usuario = ? OR correo = ?').bind(nombre_usuario, correo).first()
  if (existe)
    return new Response(JSON.stringify({ error: 'El nombre de usuario o correo ya existe' }), { status: 409, headers: { 'Content-Type': 'application/json' } })

  const hashedPassword = await hashPassword(contrasena)
  const result = await db.prepare('INSERT INTO usuarios_ciafy (tipo_usuario, nombre_usuario, correo, contrasena) VALUES (?, ?, ?, ?)').bind(tipo_usuario, nombre_usuario, correo, hashedPassword).run()
  const id = result.meta.last_row_id

  return new Response(JSON.stringify({ success: true, data: { id, nombre_usuario, correo, tipo_usuario } }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}

export async function login(request, db, env) {
  const body = await request.json()
  const { nombre_usuario, contrasena } = body

  if (!nombre_usuario || !contrasena)
    return new Response(JSON.stringify({ error: 'Campos requeridos: nombre_usuario, contrasena' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const user = await db.prepare('SELECT * FROM usuarios_ciafy WHERE nombre_usuario = ?').bind(nombre_usuario).first()
  if (!user)
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const isValid = await verifyPassword(contrasena, user.contrasena)
  if (!isValid)
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const secret = env?.JWT_SECRET || 'dev-secret-change-in-prod'
  const token = createToken({ userId: user.id_usuarios, nombre_usuario: user.nombre_usuario, tipo_usuario: user.tipo_usuario }, secret)
  const { contrasena: _, ...safeUser } = user

  return new Response(JSON.stringify({ success: true, data: { user: safeUser, token } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function getAll(db) {
  const { results } = await db.prepare('SELECT id_usuarios, tipo_usuario, nombre_usuario, correo FROM usuarios_ciafy ORDER BY id_usuarios DESC').all()
  return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function deleteUser(url, db) {
  const id = url.pathname.split('/').pop()

  const exists = await db.prepare('SELECT id_usuarios FROM usuarios_ciafy WHERE id_usuarios = ?').bind(id).first()
  if (!exists)
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  await db.prepare('DELETE FROM usuarios_ciafy WHERE id_usuarios = ?').bind(id).run()
  return new Response(JSON.stringify({ success: true, message: 'Usuario eliminado' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function updateUser(request, url, db) {
  const id = url.pathname.split('/').pop()
  const body = await request.json()
  const { tipo_usuario, nombre_usuario, correo } = body

  const errores = []
  if (correo !== undefined && !EMAIL_REGEX.test(correo))
    errores.push('correo no tiene un formato válido')
  if (tipo_usuario !== undefined && !ROLES_VALIDOS.includes(tipo_usuario))
    errores.push(`tipo_usuario debe ser uno de: ${ROLES_VALIDOS.join(', ')}`)
  if (nombre_usuario !== undefined && nombre_usuario.length < 3)
    errores.push('nombre_usuario debe tener al menos 3 caracteres')
  if (errores.length)
    return new Response(JSON.stringify({ error: 'Datos inválidos', detalles: errores }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const exists = await db.prepare('SELECT id_usuarios FROM usuarios_ciafy WHERE id_usuarios = ?').bind(id).first()
  if (!exists)
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  const updates = [], values = []
  if (tipo_usuario !== undefined) { updates.push('tipo_usuario = ?'); values.push(tipo_usuario) }
  if (nombre_usuario !== undefined) { updates.push('nombre_usuario = ?'); values.push(nombre_usuario) }
  if (correo !== undefined) { updates.push('correo = ?'); values.push(correo) }

  if (updates.length === 0)
    return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  values.push(id)
  await db.prepare(`UPDATE usuarios_ciafy SET ${updates.join(', ')} WHERE id_usuarios = ?`).bind(...values).run()

  return new Response(JSON.stringify({ success: true, data: { id, tipo_usuario, nombre_usuario, correo } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
