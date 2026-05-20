import { fileService } from '../services/fileService.js'

export async function listFiles(db) {
  const { results } = await db.prepare('SELECT * FROM canciones ORDER BY id_canciones DESC').all()
  return new Response(JSON.stringify({ success: true, data: results }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}

export async function uploadFile(request, db, bucket) {
  const formData = await request.formData()
  const metadata = JSON.parse(formData.get('metadata'))
  const archivo = formData.get('archivo')

  const { nombre_cancion, artista_cancion, album_cancion, genero } = metadata
  const archivoKey = `${Date.now()}_${archivo.name}`
  const body = await archivo.arrayBuffer()

  await fileService.uploadFile(bucket, archivoKey, body, archivo.type)
  const result = await db.prepare(
    'INSERT INTO canciones (nombre_cancion, artista_cancion, album_cancion, genero, archivo_key) VALUES (?, ?, ?, ?, ?)'
  ).bind(nombre_cancion, artista_cancion, album_cancion || null, genero || null, archivoKey).run()

  return new Response(JSON.stringify({
    success: true,
    data: { id_canciones: result.meta.last_row_id, archivo_key: archivoKey }
  }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}

export async function downloadFile(url, db, bucket) {
  const id = url.pathname.split('/').pop()

  const cancion = await db.prepare('SELECT archivo_key FROM canciones WHERE id_canciones = ?').bind(id).first()
  if (!cancion)
    return new Response(JSON.stringify({ error: 'Canción no encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  const object = await fileService.getFile(bucket, cancion.archivo_key)
  if (!object)
    return new Response(JSON.stringify({ error: 'Archivo no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream'
  return new Response(object.body, {
    status: 200, headers: { 'Content-Type': contentType }
  })
}

export async function deleteFile(url, db, bucket) {
  const id = url.pathname.split('/').pop()

  const cancion = await db.prepare('SELECT archivo_key FROM canciones WHERE id_canciones = ?').bind(id).first()
  if (!cancion)
    return new Response(JSON.stringify({ error: 'Canción no encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  await fileService.deleteFile(bucket, cancion.archivo_key)
  await db.prepare('DELETE FROM canciones WHERE id_canciones = ?').bind(id).run()

  return new Response(JSON.stringify({ success: true, message: 'Canción eliminada' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
