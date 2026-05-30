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

export async function updateSong(request, url, db, bucket, env) {
  try {
    const id = url.pathname.split('/').pop()

    // Obtener la canción actual para conservar sus valores si no se especifican nuevos
    const song = await db.prepare('SELECT id_cancion, nombre_cancion, artista_cancion, genero, imagen, archivo_key, url_publica FROM canciones WHERE id_cancion = ?').bind(id).first()
    if (!song) {
      return json({ error: 'Canción no encontrada' }, 404)
    }

    let nombre_cancion = undefined
    let artista_cancion = undefined
    let generoRaw = undefined
    let imagen = undefined
    let archivoKey = undefined
    let urlPublica = undefined

    const ct = request.headers.get('content-type') || ''

    if (ct.includes('multipart')) {
      const form = await request.formData()

      const field = (k) => { const v = form.get(k); return !v || typeof v === 'string' ? (v || '') : v.name || '' }
      
      if (form.has('nombre_cancion') || form.has('nombre')) {
        nombre_cancion = field('nombre_cancion') || field('nombre')
      }
      if (form.has('artista_cancion') || form.has('artista')) {
        artista_cancion = field('artista_cancion') || field('artista')
      }
      if (form.has('genero')) {
        generoRaw = field('genero')
      }

      // Procesar nuevo archivo de audio si se adjunta
      const file = form.get('archivo')
      if (file && typeof file !== 'string' && file.size > 0) {
        const archivoBody = await file.arrayBuffer()
        const originalName = file.name || ''
        const contentType = mimeFromExt(originalName || '.mp3')
        if (contentType !== 'audio/mpeg') {
          return json({ error: 'Solo se permiten archivos MP3' }, 400)
        }

        // Eliminar el archivo de audio antiguo de R2 si existe
        if (song.archivo_key) {
          await fileService.deleteFile(bucket, song.archivo_key).catch(() => {})
        }

        archivoKey = sanitizeKey(originalName || `${nombre_cancion || song.nombre_cancion}.mp3`)
        const baseUrl = (env?.R2_PUBLIC_URL || '').replace(/\/+$/, '')
        urlPublica = `${baseUrl}/${archivoKey}`

        await fileService.uploadFile(bucket, archivoKey, archivoBody, contentType)
      }

      // Procesar nueva imagen si se adjunta
      const imgFile = form.get('imagen')
      if (imgFile) {
        if (typeof imgFile === 'string') {
          // Si envían una URL como string, la actualizamos directamente
          if (imgFile !== '') imagen = imgFile
        } else if (imgFile.size > 0) {
          // Si envían un archivo de imagen válido
          const imgBody = await imgFile.arrayBuffer()
          
          // Eliminar imagen antigua de R2 si existía en la carpeta images/
          if (song.imagen && song.imagen.includes('/images/')) {
            const oldImgKey = song.imagen.substring(song.imagen.indexOf('images/'))
            await fileService.deleteFile(bucket, oldImgKey).catch(() => {})
          }

          const imgKey = `images/${sanitizeKey(imgFile.name || 'imagen.jpg')}`
          await fileService.uploadFile(bucket, imgKey, imgBody, imgFile.type || 'image/jpeg')
          const baseUrl = (env?.R2_PUBLIC_URL || '').replace(/\/+$/, '')
          imagen = `${baseUrl}/${imgKey}`
        }
      }
    } else {
      // Parsear como JSON clásico
      const body = await request.json()
      nombre_cancion = body.nombre_cancion
      artista_cancion = body.artista_cancion
      if (body.genero !== undefined) {
        generoRaw = Array.isArray(body.genero) ? body.genero.join(', ') : body.genero
      }
      imagen = body.imagen
    }

    const updates = []
    const values  = []

    if (nombre_cancion !== undefined && nombre_cancion !== '') {
      updates.push('nombre_cancion = ?')
      values.push(nombre_cancion)
    }
    if (artista_cancion !== undefined) {
      updates.push('artista_cancion = ?')
      values.push(artista_cancion)
    }
    if (generoRaw !== undefined) {
      const generosList = generoRaw ? generoRaw.split(',').map(g => g.trim()) : []
      updates.push('genero = ?')
      values.push(generosList.join(', '))
    }
    if (imagen !== undefined) {
      updates.push('imagen = ?')
      values.push(imagen)
    }
    if (archivoKey !== undefined) {
      updates.push('archivo_key = ?')
      values.push(archivoKey)
    }
    if (urlPublica !== undefined) {
      updates.push('url_publica = ?')
      values.push(urlPublica)
    }

    if (updates.length === 0) {
      return json({ error: 'No hay campos para actualizar o los datos proporcionados están vacíos' }, 400)
    }

    values.push(id)
    await db.prepare(`UPDATE canciones SET ${updates.join(', ')} WHERE id_cancion = ?`).bind(...values).run()

    return json({
      success: true,
      message: 'Canción actualizada exitosamente',
      data: {
        id_cancion: Number(id),
        nombre_cancion: nombre_cancion || song.nombre_cancion,
        artista_cancion: artista_cancion !== undefined ? artista_cancion : song.artista_cancion,
        genero: generoRaw !== undefined ? generoRaw.split(',').map(g => g.trim()) : (song.genero ? song.genero.split(',').map(g => g.trim()) : []),
        imagen: imagen !== undefined ? imagen : (song.imagen || ''),
        archivo_key: archivoKey || song.archivo_key,
        url: urlPublica || song.url_publica
      }
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function searchSongs(url, db) {
  try {
    const query = url.searchParams.get('q') || ''
    const artist = url.searchParams.get('artist') || ''
    const genre = url.searchParams.get('genre') || ''

    let sql = 'SELECT id_cancion, nombre_cancion, artista_cancion, genero, imagen, archivo_key, url_publica FROM canciones WHERE 1=1'
    const params = []

    if (query) {
      sql += ' AND (nombre_cancion LIKE ? OR artista_cancion LIKE ?)'
      params.push(`%${query}%`, `%${query}%`)
    }
    if (artist) {
      sql += ' AND artista_cancion LIKE ?'
      params.push(`%${artist}%`)
    }
    if (genre) {
      sql += ' AND genero LIKE ?'
      params.push(`%${genre}%`)
    }

    sql += ' ORDER BY id_cancion DESC'

    const { results } = await db.prepare(sql).bind(...params).all()

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
