import { fileService } from '../services/fileService.js'

export async function listFiles(db, env) {
  const { results } = await db.prepare('SELECT id_cancion, nombre_cancion, artista_cancion, genero, archivo_key FROM canciones ORDER BY id_cancion DESC').all()
  const baseUrl = env?.R2_PUBLIC_URL || ''
  const data = results.map(r => {
    const generos = r.genero ? r.genero.split(',').map(g => g.trim()) : []
    return { ...r, genero: generos, url: `${baseUrl}/${r.archivo_key}` }
  })
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}

export async function uploadFile(request, url, db, bucket, env) {
  let nombre_cancion = url.searchParams.get('nombre')
  let artista_cancion = url.searchParams.get('artista')
  let generoRaw = url.searchParams.get('genero') || ''
  let archivoBody, contentType
  let originalFilename = url.searchParams.get('nombre') || ''

  const ct = request.headers.get('content-type') || ''
  if (ct.includes('multipart/form-data')) {
    const formData = await request.formData()
    nombre_cancion = nombre_cancion || formData.get('nombre') || ''
    artista_cancion = artista_cancion || formData.get('artista') || ''
    const generoCampo = formData.get('genero') || ''
    if (!generoRaw) generoRaw = typeof generoCampo === 'string' ? generoCampo : ''
    const archivo = formData.get('archivo')
    if (archivo) {
      archivoBody = await archivo.arrayBuffer()
      contentType = archivo.type || 'audio/mpeg'
      originalFilename = archivo.name
      nombre_cancion = nombre_cancion || originalFilename.replace(/\.[^/.]+$/, '')
    }
  } else {
    archivoBody = await request.arrayBuffer()
    contentType = ct || 'audio/mpeg'
  }

  nombre_cancion = nombre_cancion || 'Sin nombre'
  artista_cancion = artista_cancion || 'Desconocido'
  const generosList = generoRaw ? generoRaw.split(',').map(g => g.trim()) : []
  const generoStr = generosList.join(', ')

  if (!archivoBody || archivoBody.byteLength === 0)
    return new Response(JSON.stringify({ error: 'Archivo vacío' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const nombreArchivo = originalFilename || `${nombre_cancion}.mp3`
  const ext = nombreArchivo.includes('.') ? nombreArchivo.substring(nombreArchivo.lastIndexOf('.')) : '.mp3'
  const base = nombreArchivo.replace(/\.[^/.]+$/, '')
  const archivoKey = `${base.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`
  await fileService.uploadFile(bucket, archivoKey, archivoBody, contentType)

  const result = await db.prepare(
    'INSERT INTO canciones (nombre_cancion, artista_cancion, album_cancion, genero, archivo_key) VALUES (?, ?, ?, ?, ?)'
  ).bind(nombre_cancion, artista_cancion, '', generoStr, archivoKey).run()

  const baseUrl = env?.R2_PUBLIC_URL || ''
  return new Response(JSON.stringify({
    success: true,
    data: { id_cancion: result.meta.last_row_id, archivo_key: archivoKey, url: `${baseUrl}/${archivoKey}` }
  }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}

export async function updateSong(request, url, db) {
  const id = url.pathname.split('/').pop()
  const { nombre_cancion, artista_cancion, genero } = await request.json()

  const exists = await db.prepare('SELECT id_cancion FROM canciones WHERE id_cancion = ?').bind(id).first()
  if (!exists)
    return new Response(JSON.stringify({ error: 'Canción no encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  const updates = [], values = []
  if (nombre_cancion !== undefined) { updates.push('nombre_cancion = ?'); values.push(nombre_cancion) }
  if (artista_cancion !== undefined) { updates.push('artista_cancion = ?'); values.push(artista_cancion) }
  if (genero !== undefined) {
    const generosList = Array.isArray(genero) ? genero : [genero]
    updates.push('genero = ?'); values.push(generosList.join(', '))
  }
  if (updates.length === 0)
    return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  values.push(id)
  await db.prepare(`UPDATE canciones SET ${updates.join(', ')} WHERE id_cancion = ?`).bind(...values).run()

  return new Response(JSON.stringify({ success: true, message: 'Canción actualizada' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function downloadFile(url, db, bucket) {
  const id = url.pathname.split('/').pop()

  const cancion = await db.prepare('SELECT archivo_key FROM canciones WHERE id_cancion = ?').bind(id).first()
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

  const cancion = await db.prepare('SELECT archivo_key FROM canciones WHERE id_cancion = ?').bind(id).first()
  if (!cancion)
    return new Response(JSON.stringify({ error: 'Canción no encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  await fileService.deleteFile(bucket, cancion.archivo_key)
  await db.prepare('DELETE FROM canciones WHERE id_cancion = ?').bind(id).run()

  return new Response(JSON.stringify({ success: true, message: 'Canción eliminada' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
