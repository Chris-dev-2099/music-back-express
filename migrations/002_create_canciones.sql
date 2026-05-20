CREATE TABLE IF NOT EXISTS canciones (
  id_canciones INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_cancion TEXT NOT NULL,
  artista_cancion TEXT NOT NULL,
  album_cancion TEXT,
  genero TEXT,
  archivo_key TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);
