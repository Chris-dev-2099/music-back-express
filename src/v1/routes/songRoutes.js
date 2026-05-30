import { listFiles, uploadFile, updateSong, downloadFile, deleteFile, searchSongs } from '../../controllers/fileController.js'
import { 
  addFavorite, getFavorites, removeFavorite,
  createPlaylist, getPlaylists, getPlaylistDetails, updatePlaylist, deletePlaylist,
  addSongToPlaylist, removeSongFromPlaylist 
} from '../../controllers/playlistController.js'

export async function songRoutes(request, url, env) {
  const db     = env.DB
  const bucket = env.MY_BUCKET

  // 1. GESTIÓN DE CANCIONES (Endpoints Públicos / Generales)
  if (url.pathname === '/api/v1/song' && request.method === 'POST') {
    return uploadFile(request, url, db, bucket, env)
  }
  if (url.pathname === '/api/v1/song' && request.method === 'GET') {
    return listFiles(db, env)
  }
  if (url.pathname === '/api/v1/song/search' && request.method === 'GET') {
    return searchSongs(url, db)
  }
  if (url.pathname.match(/^\/api\/v1\/song\/\d+$/) && request.method === 'PUT') {
    return updateSong(request, url, db, bucket, env)
  }
  if (url.pathname.startsWith('/api/v1/song/') && request.method === 'GET') {
    return downloadFile(url, db, bucket)
  }
  if (url.pathname.startsWith('/api/v1/song/') && request.method === 'DELETE') {
    return deleteFile(url, db, bucket)
  }

  // 2. GESTIÓN DE FAVORITOS (Requieren Autenticación)
  if (url.pathname === '/api/v1/favorites' && request.method === 'POST') {
    return addFavorite(request, url, db, env)
  }
  if (url.pathname === '/api/v1/favorites' && request.method === 'GET') {
    return getFavorites(request, url, db, env)
  }
  if (url.pathname.match(/^\/api\/v1\/favorites\/\d+$/) && request.method === 'DELETE') {
    return removeFavorite(request, url, db, env)
  }

  // 3. GESTIÓN DE PLAYLISTS (Requieren Autenticación)
  if (url.pathname === '/api/v1/playlists' && request.method === 'POST') {
    return createPlaylist(request, url, db, env)
  }
  if (url.pathname === '/api/v1/playlists' && request.method === 'GET') {
    return getPlaylists(request, url, db, env)
  }
  if (url.pathname.match(/^\/api\/v1\/playlists\/\d+$/) && request.method === 'GET') {
    return getPlaylistDetails(request, url, db, env)
  }
  if (url.pathname.match(/^\/api\/v1\/playlists\/\d+$/) && request.method === 'PUT') {
    return updatePlaylist(request, url, db, env)
  }
  if (url.pathname.match(/^\/api\/v1\/playlists\/\d+$/) && request.method === 'DELETE') {
    return deletePlaylist(request, url, db, env)
  }

  // Agregar canciones a una playlist
  if (url.pathname.match(/^\/api\/v1\/playlists\/\d+\/songs$/) && request.method === 'POST') {
    return addSongToPlaylist(request, url, db, env)
  }
  // Eliminar canciones de una playlist
  if (url.pathname.match(/^\/api\/v1\/playlists\/\d+\/songs\/\d+$/) && request.method === 'DELETE') {
    return removeSongFromPlaylist(request, url, db, env)
  }

  return null
}
