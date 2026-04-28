import { listFiles, uploadFile, downloadFile, deleteFile } from '../../controllers/fileController.js'

export async function fileRoutes(request, url, bucket) {
  if (url.pathname === '/api/v1/files'          && request.method === 'GET')    return listFiles(bucket)
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'PUT')    return uploadFile(request, url, bucket)
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'GET')    return downloadFile(url, bucket)
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'DELETE') return deleteFile(url, bucket)
  return null
}