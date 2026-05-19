import { fileService } from '../services/fileService.js'

export async function listFiles(bucket) {
  const list = await fileService.listFiles(bucket)
  return new Response(JSON.stringify({ success: true, files: list.objects }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}

export async function uploadFile(request, url, bucket) {
  const key = url.pathname.split('/').pop()
  const contentType = request.headers.get('content-type') ?? 'application/octet-stream'
  const body = await request.arrayBuffer()
  await fileService.uploadFile(bucket, key, body, contentType)
  return new Response(JSON.stringify({ success: true, message: `'${key}' subido` }), {
    status: 201, headers: { 'Content-Type': 'application/json' }
  })
}

export async function downloadFile(url, bucket) {
  const key = url.pathname.split('/').pop()
  const object = await fileService.getFile(bucket, key)
  if (!object) return new Response(JSON.stringify({ error: 'Archivo no encontrado' }), {
    status: 404, headers: { 'Content-Type': 'application/json' }
  })
  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream'
  return new Response(object.body, {
    status: 200, headers: { 'Content-Type': contentType }
  })
}

export async function deleteFile(url, bucket) {
  const key = url.pathname.split('/').pop()
  await fileService.deleteFile(bucket, key)
  return new Response(JSON.stringify({ success: true, message: `'${key}' eliminado'` }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
