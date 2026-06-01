# don-t-interfere

Веб-приложение в стиле Discord: регистрация и вход, текстовые и голосовые каналы, сообщения в реальном времени, аватары, статусы пользователей, участники канала и админское управление пользователями.

Проект состоит из двух частей:

- `client` - React/Vite клиент.
- `server` - Node.js/Express HTTPS API, Socket.IO, WebRTC signaling и SQLite.

## Требования

- Node.js `v22.x`.
- npm.
- Браузер с поддержкой HTTPS, WebRTC и доступа к микрофону.
- Для Windows при пересборке native-зависимостей может понадобиться Visual Studio Build Tools C++.

В текущей локальной настройке приложение работает только по IP компьютера:

```text
https://10.21.3.86:3000
```

`localhost` и доменные имена отключены на уровне привязки сервера/клиента.

## Быстрый Запуск

Запустите сервер в первом терминале:

```powershell
cd C:\Users\Admin\Documents\don-t-interfere\server
C:\Users\Admin\tools\node-v22.22.3-win-x64\node.exe index.js
```

Запустите клиент во втором терминале:

```powershell
cd C:\Users\Admin\Documents\don-t-interfere\client
C:\Users\Admin\tools\node-v22.22.3-win-x64\node.exe .\node_modules\vite\bin\vite.js --force
```

Откройте:

```text
https://10.21.3.86:3000
```

Проверка API:

```powershell
curl.exe -k https://10.21.3.86:3001/
```

Ожидаемый ответ:

```text
OK
```

## Установка Зависимостей

Сервер:

```powershell
cd server
npm install
```

Клиент:

```powershell
cd client
npm install
```

## Администратор

При запуске сервер автоматически создает или обновляет админскую учетную запись:

```text
Логин: Admin
Пароль: Admin123!
```

Пароль можно изменить через переменные окружения сервера:

```env
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=Admin123!
```

Возможности администратора:

- удаление обычных пользователей из панели участников;
- удаление любых каналов;
- удаление канала `main` / `Main`.

Обычный пользователь может удалить только канал, который создал сам. Канал `main` обычный пользователь удалить не может.

## Переменные Окружения

### `server/.env`

```env
PORT=3001
DB_FILE=./db/data.sqlite
JWT_SECRET=wdawjgawd;k
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=Admin123!

# SSL_KEY_PATH=C:/Certbot/live/example.com/privkey.pem
# SSL_CERT_PATH=C:/Certbot/live/example.com/fullchain.pem
```

- `PORT` - порт HTTPS API.
- `DB_FILE` - путь к SQLite базе.
- `JWT_SECRET` - секрет подписи JWT.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - админская учетная запись.
- `SSL_KEY_PATH` / `SSL_CERT_PATH` - пути к ключу и сертификату, если используется Let's Encrypt или другой доверенный сертификат.

### `client/.env`

```env
VITE_API_URL=https://10.21.3.86:3001
VITE_API_HOST=10.21.3.86

# SSL_KEY_PATH=C:/Certbot/live/example.com/privkey.pem
# SSL_CERT_PATH=C:/Certbot/live/example.com/fullchain.pem
```

- `VITE_API_URL` - адрес backend API.
- `VITE_API_HOST` - IP backend-хоста для fallback-логики.
- `SSL_KEY_PATH` / `SSL_CERT_PATH` - пути к сертификату для Vite dev server.

После изменения `.env` нужно перезапустить соответствующий процесс.

## HTTPS И Сертификаты

В проекте есть локальные self-signed сертификаты:

- `client/cert.pem`
- `client/key.pem`
- `server/cert.pem`
- `server/key.pem`

Из-за них браузер может показывать предупреждение безопасности. Для приватного LAN-IP `10.21.3.86` публичный Let's Encrypt сертификат получить нельзя. Let's Encrypt подходит для публичного домена или валидируемого публичного IP.

Если у вас есть публичный домен или публичный IP и выпущенный сертификат, укажите:

```env
SSL_KEY_PATH=C:/Certbot/live/example.com/privkey.pem
SSL_CERT_PATH=C:/Certbot/live/example.com/fullchain.pem
```

Для локальной сети без предупреждения браузера используйте локальный доверенный CA, например `mkcert`, и установите корневой сертификат на все устройства.

## Основной Функционал

- Авторизация и регистрация через JWT.
- Автоматическое создание администратора.
- Текстовые каналы и сообщения.
- Сортировка сообщений по `created_at`.
- Группировка сообщений по дням: `Сегодня`, `Вчера`, дата пользователя.
- Отображение времени и полной даты отправки сообщения.
- Голосовые каналы через WebRTC и Socket.IO signaling.
- Список участников голосового канала.
- Реальное включение/отключение микрофона.
- Синхронизация статуса микрофона в интерфейсе и списке участников.
- Пользовательские аватары.
- Статусы пользователей: `online`, `offline`.
- Админское удаление пользователей.
- Права удаления каналов по владельцу.

## Аватары

Аватары загружаются через:

```http
POST /users/me/avatar
```

Файлы сохраняются в:

```text
server/uploads/avatars
```

Ограничения:

- максимум `2 МБ`;
- форматы `JPG`, `PNG`, `WEBP`;
- изображение приводится к `128x128`;
- сохраняется обработанная `.webp` версия;
- старый аватар пользователя удаляется при повторной загрузке;
- реальные загруженные файлы игнорируются Git, в репозитории хранится только `.gitkeep`.

## Форматы Данных

Пользователь:

```js
{
  id,
  username,
  avatar_url,
  status: "online" | "offline",
  mic_muted: boolean,
  is_admin: boolean,
  last_seen,
  created_at
}
```

Канал:

```js
{
  id,
  name,
  type: "text" | "voice",
  owner_username,
  created_at
}
```

Сообщение:

```js
{
  id,
  channel_id,
  user,
  text,
  time,
  created_at
}
```

`created_at` хранится в надежном формате даты/времени и используется для сортировки и группировки сообщений.

## API

Публичные маршруты:

- `GET /` - проверка сервера.
- `POST /auth/register` - регистрация.
- `POST /auth/login` - вход.

Защищенные маршруты требуют:

```http
Authorization: Bearer <token>
```

Маршруты:

- `GET /channels`
- `POST /channels`
- `DELETE /channels/:id`
- `GET /messages`
- `GET /messages/:channelId`
- `POST /messages/:channelId`
- `GET /users`
- `GET /users/me`
- `PATCH /users/me/presence`
- `POST /users/me/avatar`
- `DELETE /users/:username` - только админ.

## Socket.IO

Текстовый чат:

- `message:new` - новое сообщение.
- `user:updated` - обновление пользователя.
- `user:deleted` - удаление пользователя.

Голосовые каналы:

- `join-channel`
- `leave-channel`
- `existing-peers`
- `members-update`
- `signal:offer`
- `signal:answer`
- `signal:ice`

## Структура Проекта

```text
.
|-- client
|   |-- src
|   |   |-- components
|   |   |   |-- ChannelGroup.jsx
|   |   |   |-- ChannelList.jsx
|   |   |   |-- ChatPanel.jsx
|   |   |   |-- MembersPanel.jsx
|   |   |   |-- UserAvatar.jsx
|   |   |   |-- UserControls.jsx
|   |   |   `-- VoiceChannelAuto.jsx
|   |   |-- hooks
|   |   |-- utils
|   |   |-- api.js
|   |   |-- App.jsx
|   |   |-- AuthContext.jsx
|   |   |-- LoginPage.jsx
|   |   |-- main.jsx
|   |   `-- index.css
|   |-- .env
|   |-- cert.pem
|   |-- key.pem
|   `-- vite.config.js
|-- server
|   |-- db
|   |-- middleware
|   |-- routes
|   |   |-- auth.js
|   |   |-- channels.js
|   |   |-- messages.js
|   |   |-- users.js
|   |   `-- voice.js
|   |-- uploads
|   |   `-- avatars
|   |-- .env
|   |-- cert.pem
|   |-- key.pem
|   |-- db.js
|   `-- index.js
|-- .gitignore
`-- README.md
```

## Назначение Основных Файлов

- `client/src/App.jsx` - главный экран, состояние пользователей, каналов, сообщений и socket-подключений.
- `client/src/AuthContext.jsx` - авторизация, хранение JWT и текущего пользователя.
- `client/src/LoginPage.jsx` - страница входа и регистрации.
- `client/src/api.js` - HTTP API wrapper.
- `client/src/components/ChannelGroup.jsx` - список каналов, подключение к голосу, права на удаление каналов.
- `client/src/components/ChatPanel.jsx` - сообщения, сортировка, группировка по датам.
- `client/src/components/MembersPanel.jsx` - участники, статусы, микрофоны, удаление пользователей админом.
- `client/src/components/UserControls.jsx` - нижняя панель пользователя, аватар, микрофон, выход.
- `client/src/components/VoiceChannelAuto.jsx` - WebRTC голосовое подключение.
- `server/index.js` - HTTPS Express server и Socket.IO.
- `server/db.js` - SQLite схема, миграции и методы работы с данными.
- `server/routes/auth.js` - вход и регистрация.
- `server/routes/channels.js` - каналы и права удаления.
- `server/routes/messages.js` - сообщения.
- `server/routes/users.js` - пользователи, аватары, админское удаление.
- `server/routes/voice.js` - Socket.IO signaling для голосовых каналов.

## Полезные Команды

Проверка клиента:

```powershell
cd client
npm run lint
npm run build
```

Проверка серверного синтаксиса:

```powershell
cd server
C:\Users\Admin\tools\node-v22.22.3-win-x64\node.exe --check index.js
C:\Users\Admin\tools\node-v22.22.3-win-x64\node.exe --check db.js
```

Остановка процессов на портах `3000` и `3001`:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 3000,3001 } |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
