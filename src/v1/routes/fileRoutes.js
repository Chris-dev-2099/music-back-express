import { listFiles, uploadFile, downloadFile, deleteFile } from '../../controllers/fileController.js'

export async function fileRoutes(request, url, env) {
  const db = env.DB
  const bucket = env.MY_BUCKET

  if (url.pathname === '/api/v1/files'          && request.method === 'GET')    return listFiles(db)
  if (url.pathname === '/api/v1/files'          && request.method === 'POST')   return uploadFile(request, db, bucket)
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'GET')    return downloadFile(url, db, bucket)
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'DELETE') return deleteFile(url, db, bucket)
  return null
}
