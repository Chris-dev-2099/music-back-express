import { userRoutes } from './v1/routes/userRoutes.js'
import { fileRoutes } from './v1/routes/fileRoutes.js'


function withCORS(response) {
  if (!response) return response
  
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  })
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const db = env.DB  // Base de datos D1
    const bucket = env.MY_BUCKET  // Bucket R2 para archivos

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400', // 24 horas
        },
      })
    }

    // Verificar que la base de datos esté disponible
    if (!db) {
      return withCORS(new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }))
    }

    
    // Intentar rutas de usuarios
    const userResponse = await userRoutes(request, url, env)
    if (userResponse) return withCORS(userResponse)

    // Intentar rutas de archivos
    const fileResponse = await fileRoutes(request, url, bucket)
    if (fileResponse) return withCORS(fileResponse)

    // Si no coincide ninguna ruta, devolver 404
    return withCORS(new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }))
  }
}