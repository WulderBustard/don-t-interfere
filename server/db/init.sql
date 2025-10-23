-- Таблица для каналов
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Уникальный идентификатор канала, автоматически увеличивается
  name TEXT NOT NULL UNIQUE,                      -- Название канала, обязательно и уникально
  type TEXT NOT NULL CHECK(type IN ('text','voice')), -- Тип канала: либо 'text', либо 'voice'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- Дата и время создания канала, по умолчанию текущее
);

-- Таблица для сообщений (можно создавать только если понадобится)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Уникальный идентификатор сообщения
  channel_id INTEGER NOT NULL,                    -- ID канала, к которому относится сообщение
  user TEXT,                                      -- Имя пользователя, который отправил сообщение
  text TEXT,                                      -- Текст сообщения
  time TEXT,                                      -- Время отправки сообщения (строка)
  FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE -- Связь с каналом: при удалении канала удаляются все его сообщения
);
