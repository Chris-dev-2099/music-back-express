// src/index.js - Compatible con Cloudflare Workers

// ✅ Hash con Web Crypto (reemplaza bcryptjs)
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password, hash) {
  const hashed = await hashPassword(password)
  return hashed === hash
}

// ✅ JWT con Web Crypto (reemplaza jsonwebtoken)
async function createToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }))
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${body}`))
  const sigArray = Array.from(new Uint8Array(signature))
  const sig = btoa(String.fromCharCode(...sigArray))
  return `${header}.${body}.${sig}`
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const db = env.DB

    // === 🐛 DEBUG ===
    if (url.pathname === '/debug') {
      return new Response(JSON.stringify({
        tieneDB: !!db,
        keys: Object.keys(env)
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // === 📝 REGISTRAR USUARIO ===
    if (url.pathname === '/api/v1/users/register' && request.method === 'POST') {
      try {
        const body = await request.json()
        const { nombre_usuario, contrasena } = body

        if (!nombre_usuario || !contrasena) {
          return new Response(JSON.stringify({ error: 'Campos requeridos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        if (!db) {
          return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const exists = await db
          .prepare('SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?')
          .bind(nombre_usuario)
          .first()

        if (exists) {
          return new Response(JSON.stringify({ error: 'El nombre de usuario ya existe' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const hashedPassword = await hashPassword(contrasena)

        const result = await db
          .prepare('INSERT INTO usuarios (tipo_usuario, nombre_usuario, apellido_usuario, contrasena) VALUES (?, ?, ?, ?)')
          .bind('user', nombre_usuario, '', hashedPassword)
          .run()

        const id = result.meta.last_row_id

        return new Response(JSON.stringify({
          success: true,
          data: { id, nombre_usuario }
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })

      } catch (err) {
        return new Response(JSON.stringify({ error: 'Error: ' + err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // === 🔑 LOGIN ===
    if (url.pathname === '/api/v1/users/login' && request.method === 'POST') {
      try {
        const body = await request.json()
        const { nombre_usuario, contrasena } = body

        if (!db) {
          return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const user = await db
          .prepare('SELECT * FROM usuarios WHERE nombre_usuario = ?')
          .bind(nombre_usuario)
          .first()

        if (!user) {
          return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const isValid = await verifyPassword(contrasena, user.contrasena)

        if (!isValid) {
          return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const token = await createToken(
          { userId: user.id_usuario, nombre_usuario: user.nombre_usuario },
          'dev-secret-change-in-prod'
        )

        const { contrasena: _, ...safeUser } = user

        return new Response(JSON.stringify({
          success: true,
          data: { user: safeUser, token }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })

      } catch (err) {
        return new Response(JSON.stringify({ error: 'Error: ' + err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  }
}