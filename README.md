# Generator Store

Интернет-магазин генераторов на **Next.js 16**, **PostgreSQL** и **Drizzle ORM**. Репозиторий содержит каталог, B2B-цены после одобрения, корзину, заказы, сервисные заявки, блог, кабинет и защищённые API для сотрудников.

> Перед production-запуском заполните реальные реквизиты и контакты, юридические тексты, настройте резервное копирование БД, rate limit в Redis и платёжного провайдера. Не публикуйте секреты и не используйте demo-данные как реальные условия продажи.

## Быстрый старт

```bash
cp .env.example .env.local
# Укажите DATABASE_URL и сгенерируйте AUTH_SECRET:
# openssl rand -base64 48
npm ci
npm run db:migrate
npm run db:seed       # демонстрационные данные; выполнять только на пустой dev-БД
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Локальная разработка |
| `npm run typecheck` | Проверка TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Production-сборка |
| `npm run check` | TypeScript + ESLint + build |
| `npm run db:generate` | Создать Drizzle migration после изменения schema |
| `npm run db:migrate` | Применить миграции |
| `npm run db:seed` | Загрузить demo-каталог через `psql` |

## Переменные окружения

| Переменная | Обязательна | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | Да | PostgreSQL connection string |
| `AUTH_SECRET` | Да | Случайный секрет не короче 32 символов для подписания сессий |
| `NEXT_PUBLIC_APP_URL` | Да в production | Канонический HTTPS URL, проверка origin и URL возврата платежа |
| `YOOKASSA_SHOP_ID` | Для онлайн-оплаты | Идентификатор магазина YooKassa |
| `YOOKASSA_SECRET_KEY` | Для онлайн-оплаты | Секретный ключ YooKassa |

Без переменных YooKassa checkout оставляет только оплату по счёту. При подключении онлайн-оплаты запрос создаётся через API YooKassa, а webhook повторно запрашивает платёж у провайдера перед сменой заказа на `paid`.

## Безопасность

- Сессия хранит минимум claims и на каждом privileged запросе сверяется с пользователем и `sessionVersion` в БД. При смене роли сессии пользователя аннулируются.
- B2B-цена отдается только пользователю с `segment=b2b` и `b2bStatus=approved`; итог заказа всегда рассчитывается на сервере.
- API ограничивает размер JSON, валидирует payload через Zod, применяет in-process rate limit и проверяет same-origin для cookie-мутаторов.
- В production замените in-process limiter на Redis/edge storage: он не общий для нескольких инстансов.
- Настройте GitHub secret scanning/push protection и никогда не коммитьте `.env`, PAT, ключи провайдеров или deployment bundle.

## Production checklist

1. Используйте отдельного PostgreSQL-пользователя с минимальными правами, TLS и регулярными backup/restore-проверками.
2. Выполните `npm ci && npm run check && npm run db:migrate` до запуска приложения.
3. Укажите фактические контакты, реквизиты, условия доставки/возврата и юридически проверенные privacy/offer страницы.
4. Подключите Redis rate limit, централизованные логи, Sentry/мониторинг и алерты для ошибок платежей/webhook.
5. В YooKassa создайте webhook на `https://<domain>/api/payments/webhook`; обработчик не доверяет телу webhook и сверяет статус с API провайдера.
6. Прогоните e2e для регистрации, B2B-одобрения, checkout, оплаты и отмены.

## Структура

- `src/app` — страницы App Router и API routes;
- `src/db/schema.ts` и `drizzle/` — схема и миграции PostgreSQL;
- `src/lib/auth.ts` — сессии и authorization;
- `src/lib/yookassa.ts` — изолированная интеграция онлайн-оплаты;
- `scripts/seed.sql` — демонстрационные данные.
