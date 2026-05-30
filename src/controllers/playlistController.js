import { authenticate } from '../utils/auth.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// ==========================================
// 1. FAVORITOS
// ==========================================

export async function addFavorite(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const body = await request.json()
    const { cancion_id } = body

    if (!cancion_id) {
      return json({ error: 'El campo cancion_id es obligatorio' }, 400)
    }

    // Verificar si la canción existe
    const song = await db.prepare('SELECT id_cancion FROM canciones WHERE id_cancion = ?').bind(cancion_id).first()
    if (!song) {
      return json({ error: 'La canción no existe' }, 404)
    }

    // Verificar si ya está en favoritos
    const alreadyFavorited = await db.prepare(
      'SELECT id_favorito FROM favoritos WHERE usuario_id = ? AND cancion_id = ?'
    ).bind(user.userId, cancion_id).first()

    if (alreadyFavorited) {
      return json({ success: true, message: 'La canción ya se encuentra en favoritos' })
    }

    await db.prepare(
      'INSERT INTO favoritos (usuario_id, cancion_id) VALUES (?, ?)'
    ).bind(user.userId, cancion_id).run()

    return json({ success: true, message: 'Canción agregada a favoritos exitosamente' }, 201)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function getFavorites(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const { results } = await db.prepare(
      `SELECT c.id_cancion, c.nombre_cancion, c.artista_cancion, c.genero, c.imagen, c.archivo_key, c.url_publica, f.fecha_agregado 
       FROM favoritos f 
       JOIN canciones c ON f.cancion_id = c.id_cancion 
       WHERE f.usuario_id = ? 
       ORDER BY f.id_favorito DESC`
    ).bind(user.userId).all()

    const data = results.map(r => ({
      id_cancion:       r.id_cancion,
      nombre_cancion:   r.nombre_cancion,
      artista_cancion:  r.artista_cancion,
      genero:           r.genero ? r.genero.split(',').map(g => g.trim()) : [],
      imagen:           r.imagen || '',
      archivo_key:      r.archivo_key,
      url:              r.url_publica,
      fecha_agregado:   r.fecha_agregado
    }))

    return json({ success: true, data })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function removeFavorite(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const cancion_id = url.pathname.split('/').pop()

    const result = await db.prepare(
      'DELETE FROM favoritos WHERE usuario_id = ? AND cancion_id = ?'
    ).bind(user.userId, cancion_id).run()

    if (result.meta?.changes === 0) {
      return json({ error: 'Favorito no encontrado o ya eliminado' }, 404)
    }

    return json({ success: true, message: 'Canción eliminada de favoritos exitosamente' })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

// ==========================================
// 2. PLAYLISTS
// ==========================================

export async function createPlaylist(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const body = await request.json()
    const { nombre_playlist, descripcion_playlist } = body

    if (!nombre_playlist) {
      return json({ error: 'El nombre de la playlist es obligatorio' }, 400)
    }

    const result = await db.prepare(
      'INSERT INTO playlists (nombre_playlist, descripcion_playlist, usuario_id) VALUES (?, ?, ?)'
    ).bind(nombre_playlist, descripcion_playlist || '', user.userId).run()

    return json({
      success: true,
      data: {
        id_playlist: result.meta.last_row_id,
        nombre_playlist,
        descripcion_playlist: descripcion_playlist || '',
        usuario_id: user.userId
      }
    }, 201)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function getPlaylists(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const { results } = await db.prepare(
      'SELECT id_playlist, nombre_playlist, descripcion_playlist, fecha_creacion FROM playlists WHERE usuario_id = ? ORDER BY id_playlist DESC'
    ).bind(user.userId).all()

    return json({ success: true, data: results })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function getPlaylistDetails(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const id = url.pathname.split('/').pop()

    // Verificar pertenencia de la playlist
    const playlist = await db.prepare(
      'SELECT * FROM playlists WHERE id_playlist = ? AND usuario_id = ?'
    ).bind(id, user.userId).first()

    if (!playlist) {
      return json({ error: 'Playlist no encontrada' }, 404)
    }

    // Obtener las canciones de la playlist
    const { results } = await db.prepare(
      `SELECT c.id_cancion, c.nombre_cancion, c.artista_cancion, c.genero, c.imagen, c.archivo_key, c.url_publica, pc.fecha_agregado
       FROM playlist_canciones pc
       JOIN canciones c ON pc.cancion_id = c.id_cancion
       WHERE pc.playlist_id = ?
       ORDER BY pc.id_playlist_cancion ASC`
    ).bind(id).all()

    const canciones = results.map(r => ({
      id_cancion:       r.id_cancion,
      nombre_cancion:   r.nombre_cancion,
      artista_cancion:  r.artista_cancion,
      genero:           r.genero ? r.genero.split(',').map(g => g.trim()) : [],
      imagen:           r.imagen || '',
      archivo_key:      r.archivo_key,
      url:              r.url_publica,
      fecha_agregado:   r.fecha_agregado
    }))

    return json({
      success: true,
      data: {
        id_playlist: playlist.id_playlist,
        nombre_playlist: playlist.nombre_playlist,
        descripcion_playlist: playlist.descripcion_playlist,
        fecha_creacion: playlist.fecha_creacion,
        canciones
      }
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function updatePlaylist(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const id = url.pathname.split('/').pop()
    const body = await request.json()
    const { nombre_playlist, descripcion_playlist } = body

    // Verificar si la playlist pertenece al usuario
    const exists = await db.prepare(
      'SELECT id_playlist FROM playlists WHERE id_playlist = ? AND usuario_id = ?'
    ).bind(id, user.userId).first()

    if (!exists) {
      return json({ error: 'Playlist no encontrada' }, 404)
    }

    const updates = []
    const values = []

    if (nombre_playlist !== undefined && nombre_playlist !== '') {
      updates.push('nombre_playlist = ?')
      values.push(nombre_playlist)
    }
    if (descripcion_playlist !== undefined) {
      updates.push('descripcion_playlist = ?')
      values.push(descripcion_playlist)
    }

    if (updates.length === 0) {
      return json({ error: 'No hay campos para actualizar' }, 400)
    }

    values.push(id, user.userId)
    await db.prepare(
      `UPDATE playlists SET ${updates.join(', ')} WHERE id_playlist = ? AND usuario_id = ?`
    ).bind(...values).run()

    return json({ success: true, message: 'Playlist actualizada exitosamente' })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function deletePlaylist(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    const id = url.pathname.split('/').pop()

    // Eliminar la playlist (la cascada en SQLite eliminará las entradas en playlist_canciones)
    const result = await db.prepare(
      'DELETE FROM playlists WHERE id_playlist = ? AND usuario_id = ?'
    ).bind(id, user.userId).run()

    if (result.meta?.changes === 0) {
      return json({ error: 'Playlist no encontrada o ya eliminada' }, 404)
    }

    return json({ success: true, message: 'Playlist eliminada exitosamente' })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function addSongToPlaylist(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    // El ID viene en la ruta: /api/v1/playlists/{id}/songs
    const pathParts = url.pathname.split('/')
    const playlistId = pathParts[pathParts.indexOf('playlists') + 1]

    const body = await request.json()
    const { cancion_id } = body

    if (!cancion_id) {
      return json({ error: 'El campo cancion_id es obligatorio' }, 400)
    }

    // Verificar propiedad de la playlist
    const playlist = await db.prepare(
      'SELECT id_playlist FROM playlists WHERE id_playlist = ? AND usuario_id = ?'
    ).bind(playlistId, user.userId).first()

    if (!playlist) {
      return json({ error: 'Playlist no encontrada' }, 404)
    }

    // Verificar si la canción existe
    const song = await db.prepare('SELECT id_cancion FROM canciones WHERE id_cancion = ?').bind(cancion_id).first()
    if (!song) {
      return json({ error: 'La canción no existe' }, 404)
    }

    // Verificar si la canción ya está en la playlist
    const alreadyExists = await db.prepare(
      'SELECT id_playlist_cancion FROM playlist_canciones WHERE playlist_id = ? AND cancion_id = ?'
    ).bind(playlistId, cancion_id).first()

    if (alreadyExists) {
      return json({ success: true, message: 'La canción ya se encuentra en la playlist' })
    }

    await db.prepare(
      'INSERT INTO playlist_canciones (playlist_id, cancion_id) VALUES (?, ?)'
    ).bind(playlistId, cancion_id).run()

    return json({ success: true, message: 'Canción agregada a la playlist exitosamente' }, 201)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function removeSongFromPlaylist(request, url, db, env) {
  try {
    const user = authenticate(request, env)
    if (!user) return json({ error: 'Token requerido o inválido' }, 401)

    // Ruta: /api/v1/playlists/{id}/songs/{songId}
    const pathParts = url.pathname.split('/')
    const playlistId = pathParts[pathParts.indexOf('playlists') + 1]
    const songId = pathParts.pop()

    // Verificar propiedad de la playlist
    const playlist = await db.prepare(
      'SELECT id_playlist FROM playlists WHERE id_playlist = ? AND usuario_id = ?'
    ).bind(playlistId, user.userId).first()

    if (!playlist) {
      return json({ error: 'Playlist no encontrada' }, 404)
    }

    const result = await db.prepare(
      'DELETE FROM playlist_canciones WHERE playlist_id = ? AND cancion_id = ?'
    ).bind(playlistId, songId).run()

    if (result.meta?.changes === 0) {
      return json({ error: 'La canción no se encontraba en esta playlist' }, 404)
    }

    return json({ success: true, message: 'Canción eliminada de la playlist exitosamente' })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
