import { hashPassword, verifyPassword, createToken } from '../utils/crypto.js'

// Controlador para operaciones de usuarios usando D1 database

export async function register(request, db) {
  const body = await request.json()
  const { nombre_usuario, contrasena } = body

  if (!nombre_usuario || !contrasena)
    return new Response(JSON.stringify({ error: 'Campos requeridos' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const exists = await db.prepare('SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?').bind(nombre_usuario).first()
  if (exists)
    return new Response(JSON.stringify({ error: 'El nombre de usuario ya existe' }), { status: 409, headers: { 'Content-Type': 'application/json' } })

  const hashedPassword = await hashPassword(contrasena)
  const result = await db.prepare('INSERT INTO usuarios (tipo_usuario, nombre_usuario, apellido_usuario, contrasena) VALUES (?, ?, ?, ?)').bind('user', nombre_usuario, '', hashedPassword).run()
  const id = result.meta.last_row_id

  return new Response(JSON.stringify({ success: true, data: { id, nombre_usuario } }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}

export async function login(request, db) {
  const body = await request.json()
  const { nombre_usuario, contrasena } = body

  const user = await db.prepare('SELECT * FROM usuarios WHERE nombre_usuario = ?').bind(nombre_usuario).first()
  if (!user)
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const isValid = await verifyPassword(contrasena, user.contrasena)
  if (!isValid)
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const token = await createToken({ userId: user.id_usuario, nombre_usuario: user.nombre_usuario }, 'dev-secret-change-in-prod')
  const { contrasena: _, ...safeUser } = user

  return new Response(JSON.stringify({ success: true, data: { user: safeUser, token } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function getAll(db) {
  const { results } = await db.prepare('SELECT id_usuario, tipo_usuario, nombre_usuario, apellido_usuario FROM usuarios ORDER BY id_usuario DESC').all()
  return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function deleteUser(url, db) {
  const id = url.pathname.split('/').pop()

  const exists = await db.prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?').bind(id).first()
  if (!exists)
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  await db.prepare('DELETE FROM usuarios WHERE id_usuario = ?').bind(id).run()
  return new Response(JSON.stringify({ success: true, message: 'Usuario eliminado' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function updateUser(request, url, db) {
  const id = url.pathname.split('/').pop()
  const body = await request.json()
  const { tipo_usuario, nombre_usuario, apellido_usuario } = body

  const exists = await db.prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?').bind(id).first()
  if (!exists)
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  const updates = [], values = []
  if (tipo_usuario !== undefined) { updates.push('tipo_usuario = ?'); values.push(tipo_usuario) }
  if (nombre_usuario !== undefined) { updates.push('nombre_usuario = ?'); values.push(nombre_usuario) }
  if (apellido_usuario !== undefined) { updates.push('apellido_usuario = ?'); values.push(apellido_usuario) }

  if (updates.length === 0)
    return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  values.push(id)
  await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`).bind(...values).run()

  return new Response(JSON.stringify({ success: true, data: { id, tipo_usuario, nombre_usuario, apellido_usuario } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}