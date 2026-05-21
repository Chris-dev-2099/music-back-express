import { listFiles, uploadFile, updateSong, downloadFile, deleteFile } from '../../controllers/fileController.js'

export async function songRoutes(request, url, env) {
  const db     = env.DB
  const bucket = env.MY_BUCKET

  if (url.pathname === '/api/v1/song'               && request.method === 'POST')   return uploadFile(request, url, db, bucket, env)
  if (url.pathname === '/api/v1/song'               && request.method === 'GET')    return listFiles(db, env)
  if (url.pathname.match(/^\/api\/v1\/song\/\d+$/)  && request.method === 'PUT')    return updateSong(request, url, db)
  if (url.pathname.startsWith('/api/v1/song/')      && request.method === 'GET')    return downloadFile(url, db, bucket)
  if (url.pathname.startsWith('/api/v1/song/')      && request.method === 'DELETE') return deleteFile(url, db, bucket)

  return null
}
