import { listFiles, uploadFile, downloadFile, deleteFile } from '../../controllers/fileController.js'

// Manejador de rutas para archivos (API v1)
export async function fileRoutes(request, url, bucket) {
  // Listar archivos: GET /api/v1/files
  if (url.pathname === '/api/v1/files'          && request.method === 'GET')    return listFiles(bucket)
  // Subir archivo: PUT /api/v1/files/{filename}
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'PUT')    return uploadFile(request, url, bucket)
  // Descargar archivo: GET /api/v1/files/{filename}
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'GET')    return downloadFile(url, bucket)
  // Eliminar archivo: DELETE /api/v1/files/{filename}
  if (url.pathname.startsWith('/api/v1/files/') && request.method === 'DELETE') return deleteFile(url, bucket)
  return null
}