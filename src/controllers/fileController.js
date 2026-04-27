// src/controllers/fileController.js
export const listFiles = async (req, res) => {
  try {
    const list = await req.env.MY_BUCKET.list()
    res.json({ success: true, files: list.objects })
  } catch (err) {
    res.status(500).json({ error: 'Error interno: ' + err.message })
  }
}

export const uploadFile = async (req, res) => {
  try {
    const { key } = req.params
    const contentType = req.headers["content-type"] ?? "application/octet-stream"
    await req.env.MY_BUCKET.put(key, req.body, { httpMetadata: { contentType } })
    res.status(201).json({ success: true, message: `'${key}' subido` })
  } catch (err) {
    res.status(500).json({ error: 'Error interno: ' + err.message })
  }
}

export const downloadFile = async (req, res) => {
  try {
    const object = await req.env.MY_BUCKET.get(req.params.key)
    if (!object) return res.status(404).json({ error: "Archivo no encontrado" })
    
    res.setHeader("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream")
    const buffer = await object.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (err) {
    res.status(500).json({ error: 'Error interno: ' + err.message })
  }
}

export const deleteFile = async (req, res) => {
  try {
    await req.env.MY_BUCKET.delete(req.params.key)
    res.json({ success: true, message: `'${req.params.key}' eliminado` })
  } catch (err) {
    res.status(500).json({ error: 'Error interno: ' + err.message })
  }
}

// ❌ BORRA ESTA LÍNEA si existe:
// module.exports = fileController;