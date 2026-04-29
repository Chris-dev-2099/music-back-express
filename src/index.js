import { userRoutes } from './v1/routes/userRoutes.js'
import { fileRoutes } from './v1/routes/fileRoutes.js'

// Punto de entrada principal para el Cloudflare Worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const db = env.DB  // Base de datos D1
    const bucket = env.MY_BUCKET  // Bucket R2 para archivos

    // Verificar que la base de datos esté disponible
    if (!db) return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })

    // Intentar rutas de usuarios
    const userResponse = await userRoutes(request, url, db)
    if (userResponse) return userResponse

    // Intentar rutas de archivos
    const fileResponse = await fileRoutes(request, url, bucket)
    if (fileResponse) return fileResponse

    // Si no coincide ninguna ruta, devolver 404
    return new Response('Not Found', { status: 404 })
  }
}