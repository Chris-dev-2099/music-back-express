var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/crypto.js
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
  const hashed = await hashPassword(password);
  return hashed === hash;
}
__name(verifyPassword, "verifyPassword");
async function createToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1e3) + 7 * 24 * 60 * 60 }));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${body}.${sig}`;
}
__name(createToken, "createToken");

// src/controllers/userController.js
async function register(request, db) {
  const body = await request.json();
  const { nombre_usuario, contrasena } = body;
  if (!nombre_usuario || !contrasena)
    return new Response(JSON.stringify({ error: "Campos requeridos" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const exists = await db.prepare("SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?").bind(nombre_usuario).first();
  if (exists)
    return new Response(JSON.stringify({ error: "El nombre de usuario ya existe" }), { status: 409, headers: { "Content-Type": "application/json" } });
  const hashedPassword = await hashPassword(contrasena);
  const result = await db.prepare("INSERT INTO usuarios (tipo_usuario, nombre_usuario, apellido_usuario, contrasena) VALUES (?, ?, ?, ?)").bind("user", nombre_usuario, "", hashedPassword).run();
  const id = result.meta.last_row_id;
  return new Response(JSON.stringify({ success: true, data: { id, nombre_usuario } }), { status: 201, headers: { "Content-Type": "application/json" } });
}
__name(register, "register");
async function login(request, db) {
  const body = await request.json();
  const { nombre_usuario, contrasena } = body;
  const user = await db.prepare("SELECT * FROM usuarios WHERE nombre_usuario = ?").bind(nombre_usuario).first();
  if (!user)
    return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const isValid = await verifyPassword(contrasena, user.contrasena);
  if (!isValid)
    return new Response(JSON.stringify({ error: "Contrase\xF1a incorrecta" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const token = await createToken({ userId: user.id_usuario, nombre_usuario: user.nombre_usuario }, "dev-secret-change-in-prod");
  const { contrasena: _, ...safeUser } = user;
  return new Response(JSON.stringify({ success: true, data: { user: safeUser, token } }), { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(login, "login");
async function getAll(db) {
  const { results } = await db.prepare("SELECT id_usuario, tipo_usuario, nombre_usuario, apellido_usuario FROM usuarios ORDER BY id_usuario DESC").all();
  return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(getAll, "getAll");
async function deleteUser(url, db) {
  const id = url.pathname.split("/").pop();
  const exists = await db.prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ?").bind(id).first();
  if (!exists)
    return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404, headers: { "Content-Type": "application/json" } });
  await db.prepare("DELETE FROM usuarios WHERE id_usuario = ?").bind(id).run();
  return new Response(JSON.stringify({ success: true, message: "Usuario eliminado" }), { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(deleteUser, "deleteUser");
async function updateUser(request, url, db) {
  const id = url.pathname.split("/").pop();
  const body = await request.json();
  const { tipo_usuario, nombre_usuario, apellido_usuario } = body;
  const exists = await db.prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ?").bind(id).first();
  if (!exists)
    return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404, headers: { "Content-Type": "application/json" } });
  const updates = [], values = [];
  if (tipo_usuario !== void 0) {
    updates.push("tipo_usuario = ?");
    values.push(tipo_usuario);
  }
  if (nombre_usuario !== void 0) {
    updates.push("nombre_usuario = ?");
    values.push(nombre_usuario);
  }
  if (apellido_usuario !== void 0) {
    updates.push("apellido_usuario = ?");
    values.push(apellido_usuario);
  }
  if (updates.length === 0)
    return new Response(JSON.stringify({ error: "No hay campos para actualizar" }), { status: 400, headers: { "Content-Type": "application/json" } });
  values.push(id);
  await db.prepare(`UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`).bind(...values).run();
  return new Response(JSON.stringify({ success: true, data: { id, tipo_usuario, nombre_usuario, apellido_usuario } }), { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(updateUser, "updateUser");

// src/v1/routes/userRoutes.js
async function userRoutes(request, url, db) {
  if (url.pathname === "/api/v1/users/register" && request.method === "POST") return register(request, db);
  if (url.pathname === "/api/v1/users/login" && request.method === "POST") return login(request, db);
  if (url.pathname === "/api/v1/users" && request.method === "GET") return getAll(db);
  if (url.pathname.startsWith("/api/v1/users/") && request.method === "DELETE") return deleteUser(url, db);
  if (url.pathname.startsWith("/api/v1/users/") && request.method === "PUT") return updateUser(request, url, db);
  return null;
}
__name(userRoutes, "userRoutes");

// src/controllers/fileController.js
async function listFiles(bucket) {
  const list = await bucket.list();
  return new Response(JSON.stringify({ success: true, files: list.objects }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(listFiles, "listFiles");
async function uploadFile(request, url, bucket) {
  const key = url.pathname.split("/").pop();
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const body = await request.arrayBuffer();
  await bucket.put(key, body, { httpMetadata: { contentType } });
  return new Response(JSON.stringify({ success: true, message: `'${key}' subido` }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}
__name(uploadFile, "uploadFile");
async function downloadFile(url, bucket) {
  const key = url.pathname.split("/").pop();
  const object = await bucket.get(key);
  if (!object) return new Response(JSON.stringify({ error: "Archivo no encontrado" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
  return new Response(object.body, {
    status: 200,
    headers: { "Content-Type": contentType }
  });
}
__name(downloadFile, "downloadFile");
async function deleteFile(url, bucket) {
  const key = url.pathname.split("/").pop();
  await bucket.delete(key);
  return new Response(JSON.stringify({ success: true, message: `'${key}' eliminado` }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(deleteFile, "deleteFile");

// src/v1/routes/fileRoutes.js
async function fileRoutes(request, url, bucket) {
  if (url.pathname === "/api/v1/files" && request.method === "GET") return listFiles(bucket);
  if (url.pathname.startsWith("/api/v1/files/") && request.method === "PUT") return uploadFile(request, url, bucket);
  if (url.pathname.startsWith("/api/v1/files/") && request.method === "GET") return downloadFile(url, bucket);
  if (url.pathname.startsWith("/api/v1/files/") && request.method === "DELETE") return deleteFile(url, bucket);
  return null;
}
__name(fileRoutes, "fileRoutes");

// src/index.js
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const db = env.DB;
    const bucket = env.MY_BUCKET;
    if (!db) return new Response(JSON.stringify({ error: "Base de datos no disponible" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
    const userResponse = await userRoutes(request, url, db);
    if (userResponse) return userResponse;
    const fileResponse = await fileRoutes(request, url, bucket);
    if (fileResponse) return fileResponse;
    return new Response("Not Found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-HQ6UPc/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-HQ6UPc/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
