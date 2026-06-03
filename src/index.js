import { userRoutes } from './v1/routes/userRoutes.js'
import { songRoutes } from './v1/routes/songRoutes.js'


function withCORS(response, origin) {
  if (!response) return response

  const allowedOrigin = origin || '*'

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning')
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Vary', 'Origin')

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
    const origin = request.headers.get('Origin') || request.headers.get('Referer') || ''

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      })
    }

    // Verificar que la base de datos esté disponible
    if (!db) {
      return withCORS(new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }), origin)
    }

    
    // Intentar rutas de usuarios
    const userResponse = await userRoutes(request, url, env)
    if (userResponse) return withCORS(userResponse, origin)

    // Intentar rutas de canciones
    const songResponse = await songRoutes(request, url, env)
    if (songResponse) return withCORS(songResponse, origin)

    // Si no coincide ninguna ruta, devolver 404
    return withCORS(new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }), origin)
  }
}