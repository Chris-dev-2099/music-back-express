CREATE TABLE IF NOT EXISTS canciones (
  id_cancion INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_cancion TEXT NOT NULL,
  artista_cancion TEXT DEFAULT '',
  album_cancion TEXT NOT NULL DEFAULT '',
  genero TEXT DEFAULT '',
  archivo_key TEXT
);
