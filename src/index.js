import { userRoutes } from './v1/routes/userRoutes.js'
import { fileRoutes } from './v1/routes/fileRoutes.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const db = env.DB
    const bucket = env.MY_BUCKET

    if (!db) return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })

    const userResponse = await userRoutes(request, url, db)
    if (userResponse) return userResponse

    const fileResponse = await fileRoutes(request, url, bucket)
    if (fileResponse) return fileResponse

    return new Response('Not Found', { status: 404 })
  }
}