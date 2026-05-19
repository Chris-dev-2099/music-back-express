import bcrypt from 'bcryptjs'

export const findByNombre = async (db, nombre_usuario) => {
  return await db.prepare('SELECT * FROM usuarios_ciafy WHERE nombre_usuario = ?').bind(nombre_usuario).first()
}

export const findByCorreo = async (db, correo) => {
  return await db.prepare('SELECT * FROM usuarios_ciafy WHERE correo = ?').bind(correo).first()
}

export const getAll = async (db) => {
  const { results } = await db.prepare('SELECT id_usuarios, tipo_usuario, nombre_usuario, correo FROM usuarios_ciafy ORDER BY id_usuarios DESC').all()
  return results || []
}

export const getById = async (db, id) => {
  return await db.prepare('SELECT id_usuarios, tipo_usuario, nombre_usuario, correo FROM usuarios_ciafy WHERE id_usuarios = ?').bind(id).first()
}

export const create = async (db, { tipo_usuario, nombre_usuario, correo, contrasena }) => {
  const exists = await db.prepare('SELECT id_usuarios FROM usuarios_ciafy WHERE nombre_usuario = ? OR correo = ?').bind(nombre_usuario, correo).first()
  if (exists) throw new Error('El nombre de usuario o correo ya existe')

  const hashedPassword = await bcrypt.hash(contrasena, 10)

  const result = await db.prepare('INSERT INTO usuarios_ciafy (tipo_usuario, nombre_usuario, correo, contrasena) VALUES (?, ?, ?, ?)')
    .bind(tipo_usuario || 'user', nombre_usuario, correo, hashedPassword).run()

  return { id: result.meta.last_row_id, tipo_usuario, nombre_usuario, correo }
}

export const update = async (db, id, { tipo_usuario, nombre_usuario, correo }) => {
  const updates = [], values = []
  if (tipo_usuario !== undefined) { updates.push('tipo_usuario = ?'); values.push(tipo_usuario) }
  if (nombre_usuario !== undefined) { updates.push('nombre_usuario = ?'); values.push(nombre_usuario) }
  if (correo !== undefined) { updates.push('correo = ?'); values.push(correo) }

  if (updates.length === 0) throw new Error('No hay campos para actualizar')
  values.push(id)

  await db.prepare(`UPDATE usuarios_ciafy SET ${updates.join(', ')} WHERE id_usuarios = ?`).bind(...values).run()
  return { id, tipo_usuario, nombre_usuario, correo }
}

export const deleteFn = async (db, id) => {
  const result = await db.prepare('DELETE FROM usuarios_ciafy WHERE id_usuarios = ?').bind(id).run()
  if (result.meta?.changes === 0) throw new Error('Usuario no encontrado')
  return { success: true }
}
