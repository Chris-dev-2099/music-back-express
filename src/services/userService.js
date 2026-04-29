// src/services/userService.js
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export const findByNombre = async (db, nombre_usuario) => {
  return await db.prepare('SELECT * FROM usuarios WHERE nombre_usuario = ?').bind(nombre_usuario).first()
}

export const getAll = async (db) => {
  const { results } = await db.prepare('SELECT id_usuario, tipo_usuario, nombre_usuario, apellido_usuario FROM usuarios ORDER BY id_usuario DESC').all()
  return results || []
}

export const getById = async (db, id) => {
  return await db.prepare('SELECT id_usuario, tipo_usuario, nombre_usuario, apellido_usuario FROM usuarios WHERE id_usuario = ?').bind(id).first()
}

export const create = async (db, { tipo_usuario, nombre_usuario, apellido_usuario, contrasena }) => {
  const exists = await db.prepare('SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?').bind(nombre_usuario).first()
  if (exists) throw new Error('El nombre de usuario ya existe')
  
  const hashedPassword = await bcrypt.hash(contrasena, 10)
  const id = uuidv4()
  
  await db.prepare('INSERT INTO usuarios (id_usuario, tipo_usuario, nombre_usuario, apellido_usuario, contrasena) VALUES (?, ?, ?, ?, ?)')
    .bind(id, tipo_usuario || 'user', nombre_usuario, apellido_usuario, hashedPassword).run()
  
  return { id, tipo_usuario, nombre_usuario, apellido_usuario }
}

export const update = async (db, id, { tipo_usuario, nombre_usuario, apellido_usuario }) => {
  const updates = [], values = []
  if (tipo_usuario !== undefined) { updates.push('tipo_usuario = ?'); values.push(tipo_usuario) }
  if (nombre_usuario !== undefined) { updates.push('nombre_usuario = ?'); values.push(nombre_usuario) }
  if (apellido_usuario !== undefined) { updates.push('apellido_usuario = ?'); values.push(apellido_usuario) }
  
  if (updates.length === 0) throw new Error('No hay campos para actualizar')
  values.push(id)
  
  await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`).bind(...values).run()
  return { id, tipo_usuario, nombre_usuario, apellido_usuario }
}

export const deleteFn = async (db, id) => {
  const result = await db.prepare('DELETE FROM usuarios WHERE id_usuario = ?').bind(id).run()
  if (result.meta?.changes === 0) throw new Error('Usuario no encontrado')
  return { success: true }
}
// module.exports = userService;