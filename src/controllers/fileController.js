import { fileService } from '../services/fileService.js'

const MIME_MAP = {
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a':  'audio/mp4',
  '.aac':  'audio/aac',
  '.wma':  'audio/x-ms-wma'
}

function mimeFromExt(filename) {
  const ext = filename.includes('.')
    ? filename.substring(filename.lastIndexOf('.')).toLowerCase()
    : '.mp3'
  return MIME_MAP[ext] || 'audio/mpeg'
}

function sanitizeKey(name) {
  const base = name.replace(/\.[^/.]+$/, '').replace(/[\/\\:*?"<>|]/g, '_')
  const ext = name.includes('.')
    ? name.substring(name.lastIndexOf('.')).toLowerCase()
    : '.mp3'
  return `${base}${ext}`
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function listFiles(db, env) {
  try {
    const { results } = await db.prepare(
      'SELECT id_cancion, nombre_cancion, artista_cancion, genero, imagen, archivo_key, url_publica FROM canciones ORDER BY id_cancion DESC'
    ).all()

    const data = results.map(r => ({
      id_cancion:       r.id_cancion,
      nombre_cancion:   r.nombre_cancion,
      artista_cancion:  r.artista_cancion,
      genero:           r.genero ? r.genero.split(',').map(g => g.trim()) : [],
      imagen:           r.imagen || '',
      archivo_key:      r.archivo_key,
      url:              r.url_publica
    }))

    return json({ success: true, data })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function uploadFile(request, url, db, bucket, env) {
  try {
    let nombre_cancion  = ''
    let artista_cancion = ''
    let generoRaw       = ''
    let imagen          = ''
    let archivoBody     = null
    let originalName    = ''

    const ct = request.headers.get('content-type') || ''

    if (ct.includes('multipart')) {
      const form = await request.formData()

      const field = (k) => { const v = form.get(k); return !v || typeof v === 'string' ? (v || '') : v.name || '' }
      nombre_cancion  = field('nombre_cancion') || field('nombre')
      artista_cancion = field('artista_cancion') || field('artista')
      generoRaw       = field('genero')

      const file = form.get('archivo')
      if (!file || typeof file === 'string')
        return json({ error: 'No se encontró el archivo en el campo "archivo"' }, 400)

      archivoBody  = await file.arrayBuffer()
      originalName = file.name || ''

      const imgFile = form.get('imagen')
      if (imgFile) {
        if (typeof imgFile === 'string') {
          imagen = imgFile
        } else {
          const imgBody = await imgFile.arrayBuffer()
          if (imgBody.byteLength > 0) {
            const imgKey = `images/${sanitizeKey(imgFile.name || 'imagen.jpg')}`
            await fileService.uploadFile(bucket, imgKey, imgBody, imgFile.type || 'image/jpeg')
            const baseUrl = (env?.R2_PUBLIC_URL || '').replace(/\/+$/, '')
            imagen = `${baseUrl}/${imgKey}`
          }
        }
      }
    } else {
      return json({ error: 'Content-Type debe ser multipart/form-data' }, 400)
    }

    if (!archivoBody || archivoBody.byteLength === 0)
      return json({ error: 'El archivo está vacío' }, 400)

    if (!nombre_cancion)
      return json({ error: 'El nombre de la canción es obligatorio' }, 400)

    const contentType = mimeFromExt(originalName || '.mp3')
    if (contentType !== 'audio/mpeg')
      return json({ error: 'Solo se permiten archivos MP3' }, 400)

    const archivoKey  = sanitizeKey(originalName || `${nombre_cancion}.mp3`)
    const baseUrl     = (env?.R2_PUBLIC_URL || '').replace(/\/+$/, '')
    const urlPublica  = `${baseUrl}/${archivoKey}`

    const generosList = generoRaw ? generoRaw.split(',').map(g => g.trim()) : []
    const generoStr   = generosList.join(', ')

    await fileService.uploadFile(bucket, archivoKey, archivoBody, contentType)

    const result = await db.prepare(
      'INSERT INTO canciones (nombre_cancion, artista_cancion, genero, imagen, archivo_key, url_publica) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(nombre_cancion, artista_cancion, generoStr, imagen, archivoKey, urlPublica).run()

    return json({
      success: true,
      data: {
        id_cancion:      result.meta.last_row_id,
        nombre_cancion,
        artista_cancion,
        genero:          generosList,
        imagen,
        archivo_key:     archivoKey,
        url:             urlPublica
      }
    }, 201)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function updateSong(request, url, db) {
  try {
    const id = url.pathname.split('/').pop()
    const body = await request.json()

    const exists = await db.prepare('SELECT id_cancion FROM canciones WHERE id_cancion = ?').bind(id).first()
    if (!exists)
      return json({ error: 'Canción no encontrada' }, 404)

    const updates = []
    const values  = []

    if (body.nombre_cancion !== undefined) { updates.push('nombre_cancion = ?'); values.push(body.nombre_cancion) }
    if (body.artista_cancion !== undefined) { updates.push('artista_cancion = ?'); values.push(body.artista_cancion) }
    if (body.genero !== undefined) {
      const gl = Array.isArray(body.genero) ? body.genero : [body.genero]
      updates.push('genero = ?'); values.push(gl.join(', '))
    }
    if (body.imagen !== undefined) { updates.push('imagen = ?'); values.push(body.imagen) }

    if (updates.length === 0)
      return json({ error: 'No hay campos para actualizar' }, 400)

    values.push(id)
    await db.prepare(`UPDATE canciones SET ${updates.join(', ')} WHERE id_cancion = ?`).bind(...values).run()

    return json({ success: true, message: 'Canción actualizada' })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function downloadFile(url, db, bucket) {
  try {
    const id = url.pathname.split('/').pop()

    const row = await db.prepare('SELECT archivo_key FROM canciones WHERE id_cancion = ?').bind(id).first()
    if (!row)
      return json({ error: 'Canción no encontrada' }, 404)

    const object = await fileService.getFile(bucket, row.archivo_key)
    if (!object)
      return json({ error: 'Archivo no encontrado en R2' }, 404)

    return new Response(object.body, {
      status: 200,
      headers: { 'Content-Type': object.httpMetadata?.contentType || 'audio/mpeg' }
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function deleteFile(url, db, bucket) {
  try {
    const id = url.pathname.split('/').pop()

    const row = await db.prepare('SELECT archivo_key FROM canciones WHERE id_cancion = ?').bind(id).first()
    if (!row)
      return json({ error: 'Canción no encontrada' }, 404)

    await fileService.deleteFile(bucket, row.archivo_key)
    await db.prepare('DELETE FROM canciones WHERE id_cancion = ?').bind(id).run()

    return json({ success: true, message: 'Canción eliminada' })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
