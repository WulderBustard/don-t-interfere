# don-t-interfere

Веб-приложение в стиле Discord с текстовыми и голосовыми каналами, сообщениями в реальном времени, аватарами, статусами пользователей и администраторским управлением.

- `client` — React/Vite.
- `server` — Node.js/Express, HTTPS, Socket.IO, WebRTC signaling и SQLite.

## Требования

- Node.js 22 или 24. Node.js 25+ не поддерживается нативной зависимостью `better-sqlite3`.
- npm.
- OpenSSL для автоматического создания локального HTTPS-сертификата.
- Python 3 с `pip`, C/C++ compiler и `make` могут понадобиться для пересборки нативных npm-зависимостей.
- Браузер с HTTPS, WebRTC и доступом к микрофону.

Arch Linux:

```bash
sudo pacman -S --needed base-devel python-pip
```

Debian/Ubuntu:

```bash
sudo apt install -y \
  build-essential \
  gcc \
  g++ \
  make \
  pkg-config \
  python3 \
  python3-pip \
  python3-venv \
  openssl
```

## Быстрый запуск

```bash
git clone https://github.com/WulderBustard/don-t-interfere.git
cd don-t-interfere

cp server/.env.example server/.env
cp client/.env.example client/.env

npm run setup
npm run build
npm start
```

`npm run setup` устанавливает зависимости и при отсутствии сертификатов создаёт self-signed сертификат для текущего LAN-IP. Для явного адреса используйте `HOST=10.21.3.44 npm run cert:dev`.

После сборки Express отдаёт и API, и готовый React-клиент одним процессом:

```text
https://<IP-сервера>:3001
```

Проверка состояния:

```bash
curl -k https://<IP-сервера>:3001/health
```

Ожидаемый ответ: `OK`.

## Режим разработки

Одна команда запускает backend и Vite одновременно:

```bash
npm run dev
```

- клиент: `https://<IP-сервера>:3000`;
- API и Socket.IO: `https://<IP-сервера>:3001`.

Остановить оба процесса можно сочетанием `Ctrl+C`.

## systemd на Linux

В `deploy/dont-interfere.service` находится unit для пользователя `admin` и каталога `/home/admin/projects/don-t-interfere`. Если путь отличается, измените `User`, `WorkingDirectory`, `ExecStart` и `ReadWritePaths`.

```bash
sudo install -m 0644 deploy/dont-interfere.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dont-interfere.service
```

Управление и логи:

```bash
sudo systemctl status dont-interfere.service
sudo systemctl restart dont-interfere.service
journalctl -u dont-interfere.service -f
```

## Команды из корня проекта

```bash
npm run setup   # установить зависимости клиента и сервера по lock-файлам
npm run cert:dev # создать локальный HTTPS-сертификат, если его ещё нет
npm run dev     # запустить клиент и сервер для разработки
npm run build   # собрать production-клиент
npm start       # запустить Express с собранным клиентом
npm run lint    # проверить клиент ESLint
npm run check   # lint, build и проверка синтаксиса backend
```

## Переменные окружения

Создайте рабочие файлы из примеров. Файлы `.env` не должны попадать в Git.

### `server/.env`

```env
PORT=3001
DB_FILE=./db/data.sqlite
JWT_SECRET=replace-with-a-long-random-value
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=replace-with-a-strong-password

# SSL_KEY_PATH=/etc/letsencrypt/live/example.com/privkey.pem
# SSL_CERT_PATH=/etc/letsencrypt/live/example.com/fullchain.pem
```

`JWT_SECRET` и `ADMIN_PASSWORD` обязательно замените перед публикацией сервера в интернет.

### `client/.env`

Обычно файл можно оставить без значений: клиент автоматически использует hostname, по которому он открыт, и порт API `3001`.

Если API расположен отдельно:

```env
VITE_API_URL=https://api.example.com
# или
VITE_API_HOST=10.21.3.44
VITE_API_PORT=3001
```

После изменения клиентского `.env` выполните `npm run build` заново.

## HTTPS и сертификаты

Для локальной разработки можно использовать self-signed сертификаты в каталогах `client` и `server`. Браузер покажет предупреждение, пока сертификат или выпускающий CA не добавлен в доверенные.

Для рабочего домена задайте `SSL_KEY_PATH` и `SSL_CERT_PATH` в обоих `.env`. Приватные LAN-адреса вида `10.x.x.x` не могут получить публичный сертификат Let's Encrypt; для них используйте локальный доверенный CA, например `mkcert`.

## Администратор

При старте backend создаёт или обновляет администратора из переменных:

```env
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=your-strong-password
```

Администратор может удалять обычных пользователей и любые каналы. Обычный пользователь может удалить только созданный им канал и не может удалить канал `main`.

## Данные приложения

- SQLite: `server/db/data.sqlite`.
- Аватары: `server/uploads/avatars`.
- Максимальный размер аватара: 2 МБ.
- Форматы: JPG, PNG и WEBP; сохранение выполняется в WEBP 128×128.

Создавайте резервные копии базы и каталога аватаров отдельно от Git.

## Основные API-маршруты

- `GET /health` — проверка backend.
- `POST /auth/register` — регистрация.
- `POST /auth/login` — вход.
- `GET|POST /channels` — список и создание каналов.
- `DELETE /channels/:id` — удаление канала.
- `GET /messages` — сообщения.
- `POST /messages/:channelId` — отправка сообщения.
- `GET /users` — пользователи.
- `GET /users/me` — текущий пользователь.
- `PATCH /users/me/presence` — статус и микрофон.
- `POST /users/me/avatar` — загрузка аватара.

Защищённые маршруты принимают JWT в заголовке:

```http
Authorization: Bearer <token>
```

## Структура

```text
.
├── client/             # React/Vite
├── server/             # Express, Socket.IO и SQLite
├── deploy/             # systemd unit
├── scripts/dev.js      # совместный запуск client + server
├── .nvmrc              # рекомендуемая версия Node.js
├── package.json        # общие команды проекта
└── README.md
```
