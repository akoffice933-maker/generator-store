# Generator Store

[![CI](https://github.com/akoffice933-maker/generator-store/actions/workflows/ci.yml/badge.svg)](https://github.com/akoffice933-maker/generator-store/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Интернет-магазин генераторов на **Next.js 16**, **PostgreSQL** и **Drizzle ORM**. Включает каталог, B2B-цены для одобренных клиентов, корзину, оформление заказа, сервисные заявки, блог, личный кабинет, защищённый API сотрудников и основу интеграции YooKassa.

> Проект использует демонстрационный каталог и шаблонные юридические/контактные тексты. Перед публичным запуском обязательно укажите фактические реквизиты, условия продажи, доставки, возврата и обработку персональных данных.

![Главная страница Generator Store](public/images/hero-bg.jpg)

## Возможности

### Покупатель

- Каталог с фильтрами по типу, бренду, мощности, фазности, наличию и сортировкой.
- Карточка товара с характеристиками, документами, отзывами и рекомендациями.
- Корзина, сравнение до четырёх товаров и избранное; после входа корзина и избранное синхронизируются с сервером и доступны на другом устройстве.
- Оформление заказа с серверной сверкой цены и остатка.
- Регистрация, вход, личный кабинет и история собственных заказов.
- Блог, калькулятор мощности, расчёт доставки, регистрация гарантии и сервисная заявка.

### B2B и сотрудники

- B2B-регистрация со статусами `pending`, `approved`, `rejected`.
- Оптовые цены выдаются только пользователю с подтверждённым B2B-статусом.
- Панель сотрудника и закрытые API для управления товарами, лидами, заказами, пользователями и статьями.
- Ролевой доступ: `customer`, `manager`, `admin`; append-only audit trail для действий сотрудников.

### Надёжность и безопасность

- Пароли хешируются `bcrypt`.
- Сессия — короткоживущий HTTP-only JWT; на каждом защищённом запросе роль и `sessionVersion` сверяются с PostgreSQL. Смена роли немедленно аннулирует старые сессии пользователя.
- Сервер сам определяет B2B-цену, пересчитывает сумму заказа и атомарно уменьшает остаток в транзакции.
- Идемпотентный `clientRequestId` исключает повторное создание заказа при повторной отправке формы.
- Zod-валидация данных, лимит JSON body, same-origin защита cookie-мутаторов и базовый rate limit.
- Webhook оплаты не доверяет входящему телу: он повторно получает статус платежа через API YooKassa.

## Технологии

| Слой | Используется |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js Route Handlers, Zod |
| Данные | PostgreSQL, Drizzle ORM, Drizzle Kit |
| Авторизация | `jose`, HTTP-only cookies, bcrypt |
| Платежи | YooKassa REST API и webhook verification |
| Качество | ESLint, strict TypeScript, GitHub Actions |

## Архитектура

```text
Browser
  │
  ├── App Router pages / client components
  │       ├── catalog, cart, checkout, account, blog, service
  │       └── local preferences: cart / compare / favorites
  │
  └── /api Route Handlers
          ├── auth       → session cookie + DB user/sessionVersion
          ├── products   → filtered public catalogue + safe price projection
          ├── orders     → server-side pricing + stock transaction + payment init
          ├── payments   → YooKassa create + verified webhook
          ├── leads      → contact/service/warranty requests
          └── admin      → staff/admin protected operations
                         │
                         ▼
                    PostgreSQL
                    Drizzle migrations
```

## Быстрый старт

### Требования

- Node.js **22+**;
- PostgreSQL **14+**;
- `psql` CLI — только для загрузки demo seed;
- npm 10+.

### Установка

```bash
git clone https://github.com/akoffice933-maker/generator-store.git
cd generator-store
cp .env.example .env.local
npm ci
```

Заполните в `.env.local` минимум `DATABASE_URL` и `AUTH_SECRET`:

```bash
# macOS / Linux
openssl rand -base64 48
```

Создайте базу и примените схему:

```bash
npm run db:migrate
npm run db:seed       # только для пустой development-БД
npm run dev
```

Приложение доступно на [http://localhost:3000](http://localhost:3000).

> `scripts/seed.sql` содержит демонстрационные товары, статьи и отзывы. Не запускайте seed на production БД.

## Переменные окружения

Полный пример находится в [`.env.example`](.env.example).

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `DATABASE_URL` | Да | PostgreSQL connection string. В production используйте отдельного пользователя с минимальными правами и TLS. |
| `AUTH_SECRET` | Да | Случайная строка не короче 32 символов для подписи сессии. |
| `NEXT_PUBLIC_APP_URL` | Да в production | Канонический HTTPS URL: используется для same-origin проверки и return URL оплаты. |
| `REDIS_URL` | Да для масштабирования | Railway Redis URL для distributed rate limit и BullMQ worker. Без него используется только development fallback в памяти. |
| `WORKER_CONCURRENCY` | Нет | Параллелизм BullMQ worker, по умолчанию `5`. |
| `YOOKASSA_SHOP_ID` | Для card/SBP | Идентификатор магазина YooKassa. |
| `YOOKASSA_SECRET_KEY` | Для card/SBP | Секретный ключ YooKassa. Хранить только в secret store хостинга. |

Если YooKassa не настроена, checkout показывает только оплату по счёту. Это намеренно: интерфейс не обещает несуществующую онлайн-оплату.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Локальная разработка |
| `npm run typecheck` | Строгая проверка TypeScript |
| `npm run lint` | ESLint и правила React |
| `npm run build` | Production-сборка |
| `npm run check` | `typecheck` + `lint` + `build` |
| `npm run test:e2e` | Playwright E2E: регистрация, корзина/checkout, staff CRUD, B2B и audit trail |
| `npm run test:e2e:setup` | Создание изолированного admin-пользователя для E2E test DB |
| `npm run test:e2e:install` | Установка Chromium и системных зависимостей Playwright |
| `npm run worker` | Отдельный BullMQ worker: обработка transactional outbox и повторная постановка pending jobs |
| `npm run db:generate` | Генерация Drizzle migration после изменения `src/db/schema.ts` |
| `npm run db:migrate` | Применение миграций к БД из `DATABASE_URL` |
| `npm run db:seed` | Demo seed через `psql` |

Перед каждым PR и production deploy запускайте:

```bash
npm ci
npm run check
```

## Работа со схемой данных

1. Измените [`src/db/schema.ts`](src/db/schema.ts).
2. Создайте migration:
   ```bash
   npm run db:generate
   ```
3. Проверьте SQL в `drizzle/<номер>_*.sql`.
4. Примените к локальной БД:
   ```bash
   npm run db:migrate
   ```
5. Закоммитьте schema, migration и snapshot вместе.

Не редактируйте уже применённую production migration. Для изменений создавайте следующую migration.

## API-карта

### Public API

| Endpoint | Метод | Назначение |
| --- | --- | --- |
| `/api/products` | `GET` | Каталог с валидированными query-параметрами и ограниченной пагинацией. |
| `/api/blog` | `GET` | До 100 последних статей. |
| `/api/diagnostics` | `GET` | Список симптомов для сервисного мастера. |
| `/api/auth/register` | `POST` | Регистрация и B2B-заявка. |
| `/api/auth/login` | `POST` | Вход с rate limit. |
| `/api/auth/logout` | `POST` | Завершение текущей сессии. |
| `/api/auth/me` | `GET` | Текущий пользователь без cache. |
| `/api/orders` | `GET`, `POST` | Собственные заказы / создание заказа. |
| `/api/cart`, `/api/cart/[productId]`, `/api/cart/sync` | `GET`, `POST`, `PUT`, `DELETE` | Server-side корзина и merge гостевой корзины после входа. |
| `/api/favorites`, `/api/favorites/[productId]`, `/api/favorites/sync` | `GET`, `POST`, `DELETE` | Server-side избранное и merge гостевых данных после входа. |
| `/api/leads` | `POST` | Контактная или сервисная заявка. |
| `/api/warranty` | `POST` | Регистрация гарантии по серийному номеру. |
| `/api/payments/config` | `GET` | Доступные для клиента онлайн-способы оплаты. |
| `/api/payments/webhook` | `POST` | Webhook YooKassa с серверной проверкой платежа. |

### Staff API

Все `/api/admin/*` endpoints требуют действующую сессию сотрудника. Изменение ролей доступно только `admin`.

| Endpoint | Назначение |
| --- | --- |
| `/api/admin/stats` | Сводные показатели панели сотрудников. |
| `/api/admin/products` | Список и создание товаров. |
| `/api/admin/orders` | Заказы и изменение статусов. |
| `/api/admin/leads` | Сервисные/контактные заявки. |
| `/api/admin/users` | Пользователи, роли и B2B-статусы. |
| `/api/admin/blog` | Статьи блога. |
| `/api/admin/brands`, `/api/admin/categories` | CRUD справочников каталога. |
| `/api/admin/audit` | Read-only append-only журнал действий сотрудников (admin only). |

## Онлайн-оплата YooKassa

1. Создайте магазин в YooKassa и получите `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`.
2. Сохраните значения в secrets хостинга; **не** добавляйте их в Git, URL или клиентские переменные.
3. Укажите production `NEXT_PUBLIC_APP_URL`.
4. В кабинете YooKassa зарегистрируйте webhook:
   ```text
   https://<ваш-домен>/api/payments/webhook
   ```
5. Проверьте сценарии: успешная оплата, отмена, повторный webhook, недоступность API и несоответствие суммы.

При создании заказа сначала проверяются цена и остатки в PostgreSQL. После создания платежа webhook повторно запрашивает его у YooKassa, сверяет `paymentId`, metadata, валюту и сумму; только затем меняет статус заказа на `paid`.

> Для реального фискального чека, НДС, состава позиций и юридических требований настройте payload YooKassa совместно с бухгалтерией/юристом до запуска.

## Deploy на Railway

### 1. PostgreSQL

1. Создайте PostgreSQL service в Railway.
2. Скопируйте Internal или public `DATABASE_URL` в переменные окружения приложения.
3. Создайте `AUTH_SECRET` через `openssl rand -base64 48`.
4. Укажите `NEXT_PUBLIC_APP_URL` с HTTPS domain Railway или собственным доменом.

### 2. Приложение

1. Создайте service из GitHub-репозитория.
2. Railway автоматически определит Next.js и использует `npm run build` / `npm run start`.
3. Добавьте все переменные из таблицы выше.
4. Перед первым запуском примените migrations через Railway shell или release command:
   ```bash
   npm run db:migrate
   ```
5. Выполните `npm run db:seed` только для demo/staging базы.
6. Создайте отдельный **Worker service** из этого же репозитория с start command `npm run worker`; передайте ему те же `DATABASE_URL`, `REDIS_URL` и нужные integration secrets.

### 3. Health check и мониторинг

Используйте `GET /api/health` как простой DB health check. Для production добавьте:

- централизованные логи и алерты на 5xx;
- Sentry или аналог для client/server ошибок;
- резервное копирование PostgreSQL и регулярную проверку восстановления;
- внешний uptime check;
- Railway Redis rate limiter и отдельный BullMQ worker при нескольких web-инстансах.

## Railway Redis и background worker

1. Создайте Redis service в Railway и передайте его private `REDIS_URL` web service и worker service.
2. Web service использует Redis для атомарного distributed rate limit. Если Redis временно недоступен, приложение логирует fallback и использует локальное ограничение; настройте alert на такие события.
3. Web/API создаёт минимальные события в PostgreSQL `background_jobs` в той же бизнес-транзакции. Это transactional outbox: события не теряются, если Redis в момент запроса недоступен.
4. Отдельный worker (`npm run worker`) ставит pending события в BullMQ и обрабатывает повторные попытки с exponential backoff. Сейчас обработчик безопасно фиксирует события `order.created`, `lead.created`, `warranty.registered`, `payment.succeeded`; адаптеры e-mail, СДЭК и уведомлений подключаются на следующем этапе.

## Поиск PostgreSQL

Migration `0003_married_ego.sql` включает `pg_trgm` и GIN-индексы по `products.name` и `products.description`. Текущий `ILIKE` поиск каталога начинает использовать эти индексы на достаточно большом объёме данных. После deploy проверьте план через `EXPLAIN ANALYZE`; для очень коротких запросов PostgreSQL может осознанно выбрать seq scan.

## Production checklist

- [ ] `npm ci && npm run check` зелёные;
- [ ] выполнен `npm run db:migrate`;
- [ ] задан сильный уникальный `AUTH_SECRET`;
- [ ] включены HTTPS и корректный `NEXT_PUBLIC_APP_URL`;
- [ ] заведён отдельный PostgreSQL-пользователь с минимальными правами;
- [ ] реальные контакты, реквизиты, политика конфиденциальности, оферта и правила возврата согласованы и опубликованы;
- [ ] подключены/протестированы доставка и YooKassa либо отключена онлайн-оплата;
- [ ] webhook YooKassa проверен в test mode;
- [ ] добавлены backups, мониторинг, alerts и Redis rate limit;
- [ ] включены GitHub secret scanning, push protection и branch protection для `main`.

## Troubleshooting

| Симптом | Проверка и решение |
| --- | --- |
| `AUTH_SECRET must be set` | Добавьте в `.env.local` строку длиной от 32 символов; перезапустите сервер. |
| Ошибка подключения к БД | Проверьте `DATABASE_URL`, доступность PostgreSQL, TLS/SSL параметры и миграции. |
| Таблицы не найдены | Выполните `npm run db:migrate`. |
| В checkout нет card/SBP | Задайте YooKassa credentials и `NEXT_PUBLIC_APP_URL`, затем перезапустите deploy. |
| Заказ не стал `paid` | Проверьте URL webhook, логи `/api/payments/webhook`, YooKassa credentials и совпадение суммы. |
| B2B-цена не показывается | Пользователь должен иметь `segment=b2b` и `b2bStatus=approved`; обновите сессию после смены статуса. |
| 403 у POST/PUT/DELETE в production | Проверьте корректность `NEXT_PUBLIC_APP_URL`, proxy `Host` / `X-Forwarded-Host` и HTTPS-домен. |

## Структура репозитория

```text
src/
  app/            # App Router pages и Route Handlers
  components/     # переиспользуемые UI-компоненты
  db/             # Drizzle schema и DB pool
  lib/            # auth, prices, rate limit, payment integration
public/images/    # локальные витринные изображения
scripts/          # demo seed
drizzle/          # versioned SQL migrations и snapshots
.github/workflows/# CI
```

## Roadmap

- [x] Полноценные CRUD-экраны для staff API и append-only audit trail админ-действий.
- [x] Server-side избранное и синхронизация корзины между устройствами при входе.
- [x] E2E suite: регистрация, корзина/checkout, staff CRUD, B2B и audit trail (выполняется в CI с PostgreSQL).
- [x] Railway Redis distributed rate limiting и transactional outbox/BullMQ worker.
- [x] PostgreSQL `pg_trgm` GIN-индексы для поиска по каталогу.
- [ ] E2E: YooKassa webhook, отмена/возврат заказа.
- [ ] Реальная интеграция перевозчиков и трекинг доставки.
- [ ] Настройка receipt/VAT payload YooKassa для фактической модели продаж.

## Лицензия и материалы

Лицензия проекта пока не определена. Добавьте `LICENSE` до публичного коммерческого распространения.

Изображения в `public/images/` сгенерированы для демонстрации интерфейса. Перед запуском замените их на лицензированные каталожные фотографии фактических товаров.
