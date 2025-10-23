// server/routes/channels.js

// Подключаем Express для работы с маршрутизатором
const express = require("express");
const router = express.Router(); // создаем отдельный роутер для /channels

// Подключаем модуль для работы с базой данных
const db = require("../db");

// ====================== Получение списка каналов ======================
// GET /channels
router.get("/", (req, res) => {
  // Получаем все каналы из базы данных
  const rows = db.getAllChannels();
  
  // Отправляем массив каналов клиенту в формате JSON
  res.json(rows);
});

// ====================== Создание нового канала ======================
// POST /channels
router.post("/", (req, res) => {
  // Извлекаем name и type из тела запроса
  const { name, type } = req.body;

  // Проверяем, что оба поля переданы
  if (!name || !type) return res.status(400).json({ error: "name+type required" });

  try {
    // Создаем канал в базе данных, обрезая лишние пробелы у name
    const ch = db.createChannel(name.trim(), type);

    // Возвращаем созданный канал с кодом 201 (Created)
    res.status(201).json(ch);
  } catch (err) {
    // Если попытка создать канал с уже существующим именем
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Channel exists" });
    }

    // Логируем другие ошибки в консоль и возвращаем 500
    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

// ====================== Удаление канала ======================
// DELETE /channels/:id
router.delete("/:id", (req, res) => {
  // Преобразуем id из параметра маршрута в число
  const id = Number(req.params.id);

  // Проверяем корректность id
  if (!id) return res.status(400).json({ error: "invalid id" });

  // Пытаемся удалить канал из базы данных
  const ok = db.deleteChannel(id);

  // Если удаление прошло успешно, возвращаем {success: true}
  if (ok) return res.json({ success: true });

  // Если канал с таким id не найден, возвращаем 404
  return res.status(404).json({ error: "not found" });
});

// Экспортируем роутер, чтобы подключить его в index.js
module.exports = router;
