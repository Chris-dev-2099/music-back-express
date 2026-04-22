import { env } from "cloudflare:workers"
import { httpServerHandler } from "cloudflare:node"
import express from "express"
import v1workRoutes from "./v1/routes/workoutRoutes.js"  // ← .js obligatorio en ES Modules

const app = express()
const port = 3000

app.use(express.json())
app.use('/api/v1/workouts', v1workRoutes)

// ⬆️ Subir archivo
app.put("/files/:key", async (req, res) => {
  const { key } = req.params
  const contentType = req.headers["content-type"] ?? "application/octet-stream"
  await env.MY_BUCKET.put(key, req.body, { httpMetadata: { contentType } })
  res.status(201).json({ success: true, message: `'${key}' subido` })
})

// 📋 Listar archivos
app.get("/files", async (req, res) => {
  const list = await env.MY_BUCKET.list()
  res.json({ success: true, files: list.objects })
})

// ⬇️ Descargar archivo
app.get("/files/:key", async (req, res) => {
  const object = await env.MY_BUCKET.get(req.params.key)
  if (!object) {
    return res.status(404).json({ error: "Archivo no encontrado" })
  }
  res.setHeader("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream")
  const buffer = await object.arrayBuffer()
  res.send(Buffer.from(buffer))
})

// 🗑️ Eliminar archivo
app.delete("/files/:key", async (req, res) => {
  await env.MY_BUCKET.delete(req.params.key)
  res.json({ success: true, message: `'${req.params.key}' eliminado` })
})

app.listen(port)
export default httpServerHandler({ port })