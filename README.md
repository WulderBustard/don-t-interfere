# don-t-interfere

Веб-приложение в стиле Discord: регистрация и вход пользователей, текстовые и голосовые каналы, сообщения в реальном времени и список участников.

Проект состоит из двух частей:

- `client` - React/Vite клиент, который открывается в браузере.
- `server` - Node.js/Express сервер с HTTPS, REST API, Socket.IO и SQLite базой данных.

## Требования

Для запуска нужны:

- Node.js `v22.x`.
- npm, устанавливается вместе с Node.js.
- Браузер с поддержкой HTTPS, WebRTC и доступа к микрофону.
- Windows, macOS или Linux.

Для Windows может дополнительно понадобиться:

- Python 3, если native-зависимости придется собирать локально.
- Visual Studio Build Tools с компонентами C++, если `npm install` не найдет готовые prebuild-бинарники для `better-sqlite3`, `sqlite3` или `mediasoup`.

В проекте уже есть self-signed HTTPS сертификаты:

- `client/cert.pem`
- `client/key.pem`
- `server/cert.pem`
- `server/key.pem`

При первом открытии браузер может показать предупреждение о небезопасном сертификате. Для локальной разработки это ожидаемо.

## Быстрый Запуск

Откройте два терминала: один для сервера, второй для клиента.

### 1. Установка зависимостей сервера

```bash
cd server
npm install
```

### 2. Запуск сервера

```bash
npm start
```

Сервер запускается на:

```text
https://localhost:3001
```

Проверка:

```bash
curl -k https://localhost:3001/
```

Ожидаемый ответ:

```text
OK
```

### 3. Установка зависимостей клиента

В новом терминале:

```bash
cd client
npm install
```

Если на Windows установка падает на `better-sqlite3`, можно установить клиентские зависимости без install-скриптов:

```bash
npm install --ignore-scripts
```

Для текущего клиента это допустимо, потому что SQLite используется сервером, а не React-приложением в браузере.

### 4. Запуск клиента

```bash
npm run dev
```

Клиент запускается на:

```text
https://localhost:3000
```

Откройте в браузере:

```text
https://localhost:3000/
```

## Переменные Окружения

### `server/.env`

```env
PORT=3001
DB_FILE=./db/data.sqlite
JWT_SECRET=wdawjgawd;k
```

- `PORT` - порт HTTPS API сервера.
- `DB_FILE` - путь к SQLite базе данных.
- `JWT_SECRET` - секрет для подписи JWT токенов авторизации.

### `client/.env`

```env
VITE_API_URL=https://localhost:3001
```

- `VITE_API_URL` - адрес backend API.
- `VITE_SOCKET_URL` - необязательный адрес Socket.IO для текстового чата. Если не задан, используется `VITE_API_URL`.
- `VITE_VOICE_URL` - необязательный адрес Socket.IO для голосовых каналов. Если не задан, используется `https://localhost:3001`.

После изменения `.env` файлов перезапустите соответствующий процесс.

## Скрипты

### Клиент

Файл: `client/package.json`

- `npm run dev` - запускает Vite dev server.
- `npm run build` - собирает production-версию клиента.
- `npm run preview` - запускает preview production-сборки.
- `npm run lint` - запускает ESLint.

### Сервер

Файл: `server/package.json`

- `npm start` - запускает сервер командой `node index.js`.
- `npm run dev` - запускает сервер через `nodemon`, если он установлен.

## Структура Проекта

```text
.
|-- client
|   |-- public
|   |-- src
|   |   |-- assets
|   |   |-- components
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
|   |-- package.json
|   `-- vite.config.js
|-- server
|   |-- db
|   |-- middleware
|   |-- routes
|   |-- .env
|   |-- cert.pem
|   |-- key.pem
|   |-- db.js
|   |-- index.js
|   `-- package.json
|-- .gitignore
`-- README.md
```

## Клиент: За Что Отвечают Файлы

### `client/index.html`

HTML-точка входа Vite. Содержит `<div id="root"></div>`, в который React монтирует приложение.

### `client/vite.config.js`

Конфигурация Vite:

- включает React plugin;
- запускает dev server на `https://localhost:3000`;
- использует `client/key.pem` и `client/cert.pem`;
- разрешает хосты `localhost` и `127.0.0.1`.

### `client/src/main.jsx`

Главная точка входа React:

- создает React root;
- подключает `AuthProvider`;
- настраивает `BrowserRouter`;
- описывает маршруты `/`, `/login` и fallback;
- защищает основное приложение через `ProtectedRoute`.

### `client/src/App.jsx`

Главный экран после входа:

- хранит выбранный канал;
- подключает список каналов, чат, участников и модальные окна;
- создает Socket.IO подключение для новых сообщений;
- отправляет сообщения через API;
- подключает голосовой компонент для voice-каналов.

### `client/src/AuthContext.jsx`

Контекст авторизации:

- хранит текущего пользователя;
- читает `token` и `username` из `localStorage`;
- выполняет login/register через `/auth/login` и `/auth/register`;
- сохраняет JWT токен;
- выполняет logout.

### `client/src/LoginPage.jsx`

Страница входа и регистрации:

- переключает режим входа/регистрации;
- отправляет форму;
- после успешного входа переводит пользователя на `/`.

### `client/src/api.js`

Обертка над HTTP API сервера:

- добавляет `Authorization: Bearer <token>`;
- загружает, создает и удаляет каналы;
- загружает и отправляет сообщения;
- загружает список пользователей.

### `client/src/hooks/useChannels.js`

Хук состояния каналов:

- загружает каналы и сообщения при старте;
- группирует каналы на `text` и `voice`;
- выбирает первый доступный канал;
- добавляет и удаляет каналы через API.

### `client/src/components/ChannelList.jsx`

Левая панель приложения:

- показывает группы текстовых и голосовых каналов;
- подключает блок управления пользователем снизу.

### `client/src/components/ChannelGroup.jsx`

Группа каналов одного типа:

- рисует список каналов;
- переключает активный текстовый канал;
- показывает mini-profile для голосового канала;
- открывает модальное окно создания или удаления канала.

### `client/src/components/ChannelModal.jsx`

Модальное окно:

- создает новый канал;
- подтверждает удаление канала;
- закрывается по `Esc` или клику вне окна.

### `client/src/components/ChatPanel.jsx`

Центральная область чата:

- показывает сообщения выбранного текстового канала;
- отправляет сообщение по Enter;
- поддерживает textarea и кнопку отправки;
- прокручивает чат вниз при новых сообщениях;
- для голосового канала показывает информационное состояние вместо поля ввода.

### `client/src/components/MembersPanel.jsx`

Правая панель участников:

- загружает пользователей через `/users`;
- показывает текущего пользователя;
- отображает статус и состояние микрофона;
- для voice-канала учитывает участников, находящихся в канале.

### `client/src/components/UserControls.jsx`

Нижний блок пользователя:

- показывает имя текущего пользователя;
- переключает статус `online`, `idle`, `dnd`, `offline`;
- переключает mute микрофона;
- открывает меню настроек;
- выполняет logout.

### `client/src/components/VoiceChannelAuto.jsx`

Голосовое подключение:

- запрашивает доступ к микрофону через `navigator.mediaDevices.getUserMedia`;
- подключается к Socket.IO серверу;
- входит в выбранный voice-канал;
- обменивается WebRTC offer/answer/ice сигналами;
- создает `RTCPeerConnection` для участников;
- воспроизводит входящие audio-потоки через скрытые `<audio>` элементы;
- очищает соединения и audio-треки при выходе.

### `client/src/utils/helpers.js`

Вспомогательные функции:

- форматирование статусов;
- CSS-классы для статусов;
- текущее время в формате `HH:MM`.

### `client/src/index.css`

Основные стили приложения:

- сетка интерфейса;
- панели каналов, чата и участников;
- модальные окна;
- сообщения;
- статусы пользователей;
- страница авторизации.

## Сервер: За Что Отвечают Файлы

### `server/index.js`

Главная точка входа backend:

- создает Express-приложение;
- подключает CORS и JSON body parser;
- подключает роуты `/auth`, `/channels`, `/users`, `/messages`;
- защищает часть роутов через JWT middleware;
- создает HTTPS сервер на `server/key.pem` и `server/cert.pem`;
- подключает Socket.IO;
- регистрирует голосовую Socket.IO логику;
- запускает сервер на `PORT`.

### `server/db.js`

Слой работы с SQLite:

- открывает базу `DB_FILE`;
- создает таблицы `users`, `channels`, `messages`, если их нет;
- содержит методы для каналов, сообщений и пользователей.

### `server/db/data.sqlite`

Файл SQLite базы данных. В нем хранятся:

- пользователи;
- каналы;
- сообщения.

### `server/db/init.sql`

SQL-схема для таблиц каналов и сообщений. Сейчас основное создание таблиц также продублировано в `server/db.js`.

### `server/middleware/authMiddleware.js`

JWT middleware:

- читает заголовок `Authorization`;
- проверяет Bearer token;
- кладет decoded payload в `req.user`;
- возвращает `401`, если токен отсутствует или неверный.

### `server/routes/auth.js`

Маршруты авторизации:

- `POST /auth/register` - создает пользователя, хеширует пароль через `bcrypt`, возвращает JWT;
- `POST /auth/login` - проверяет пользователя и пароль, возвращает JWT.

### `server/routes/channels.js`

Маршруты каналов:

- `GET /channels` - возвращает список каналов;
- `POST /channels` - создает канал типа `text` или `voice`;
- `DELETE /channels/:id` - удаляет канал.

Маршрут подключен через `authMiddleware`, поэтому требует JWT токен.

### `server/routes/messages.js`

Маршруты сообщений:

- `GET /messages` - возвращает сообщения, сгруппированные по каналам;
- `POST /messages/:channelId` - сохраняет сообщение и рассылает событие `message:new` через Socket.IO.

Маршрут подключен через `authMiddleware`, поэтому требует JWT токен.

### `server/routes/users.js`

Маршрут пользователей:

- `GET /users` - возвращает список зарегистрированных пользователей без паролей.

Маршрут подключен через `authMiddleware`, поэтому требует JWT токен.

### `server/routes/voice.js`

Socket.IO логика голосовых каналов:

- хранит участников voice-каналов в памяти процесса;
- обрабатывает `join-channel` и `leave-channel`;
- отправляет список существующих участников;
- рассылает `members-update`;
- прокидывает WebRTC-сигналы `signal:offer`, `signal:answer`, `signal:ice`;
- удаляет пользователя из каналов при disconnect.

## API

### Публичные маршруты

- `GET /` - проверка сервера, возвращает `OK`.
- `POST /auth/register` - регистрация.
- `POST /auth/login` - вход.

### Защищенные маршруты

Для этих маршрутов нужен заголовок:

```http
Authorization: Bearer <token>
```

- `GET /channels`
- `POST /channels`
- `DELETE /channels/:id`
- `GET /messages`
- `POST /messages/:channelId`
- `GET /users`

## Socket.IO События

### Текстовый чат

- `message:new` - сервер отправляет новое сообщение всем подключенным клиентам.

### Голосовые каналы

- `join-channel` - клиент входит в voice-канал.
- `leave-channel` - клиент выходит из voice-канала.
- `existing-peers` - сервер отправляет новому клиенту список уже подключенных участников.
- `members-update` - сервер рассылает актуальный список участников.
- `signal:offer` - WebRTC offer.
- `signal:answer` - WebRTC answer.
- `signal:ice` - WebRTC ICE candidate.

## Возможные Проблемы

### `Access is denied` при запуске через PowerShell

На Windows PowerShell может блокировать `npm.ps1`. Используйте `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

### `better-sqlite3.node is not a valid Win32 application`

Обычно это означает, что native-бинарник был установлен под другую версию Node.js или платформу. Переустановите зависимости под Node.js 22:

```bash
cd server
npm rebuild better-sqlite3 sqlite3
```

Если не помогло:

```bash
rm -rf node_modules package-lock.json
npm install
```

На Windows вместо `rm -rf` используйте удаление папки через Проводник или PowerShell:

```powershell
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

### Браузер не дает доступ к микрофону

Проверьте:

- страница открыта по `https://localhost:3000`;
- в браузере разрешен доступ к микрофону;
- сертификат принят в браузере;
- сервер `https://localhost:3001` запущен.

### Порт уже занят

Если заняты порты `3000` или `3001`, остановите старые процессы или измените порты в:

- `client/vite.config.js`
- `server/.env`
- `client/.env`
