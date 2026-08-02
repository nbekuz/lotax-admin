# LOTAX Mobile API Documentation

Документация для **мобильных frontend-разработчиков**.  
Описывает все HTTP API **этапа 1**.

> **Важно:** бэкенд — **FastAPI** (не Django). Auth — **JWT Bearer**.  
> Content-Type для всех JSON-запросов: `application/json`.

Интерактивный Swagger: `{BASE_URL}/docs`

---

## 1. GENERAL INFO

| Field | Value |
|-------|--------|
| **Project name** | LOTAX (Loyalty Taxi Parks) |
| **Framework** | FastAPI + Pydantic v2 + SQLAlchemy async |
| **Authentication** | JWT (HS256), header `Authorization: Bearer <access_token>` |
| **Content-Type** | `application/json` |
| **API prefix** | `/api/v1` |
| **Token type in body** | `token_type: "bearer"` |

### Base URL

| Environment | Base URL |
|-------------|----------|
| **Local (dev)** | `http://localhost:8000` |
| **Production** | `https://autoconfig.xn--80aubmrd.xn--p1ai` (домен: `autoconfig.лотакс.рф`) |

Примеры ниже используют относительные пути. Полный URL:

```text
{BASE_URL}/api/v1/...
```

### JWT lifetimes (defaults)

| Token | TTL |
|-------|-----|
| Access | **30 minutes** |
| Refresh | **30 days** |

### JWT claims (внутри токена)

| Claim | Description |
|-------|-------------|
| `sub` | UUID пользователя (driver / admin) |
| `type` | `access` \| `refresh` |
| `subject_type` | `driver` \| `admin` |
| `role` | только для admin: `super_admin` \| `director` \| `admin` \| `manager` |
| `iat` / `exp` | issued / expiry |

### Модель тенанта (организация)

```text
LOTAX (super_admin)
 └── Organization «Ситиус»     ← клиент, один ЛК
      ├── Park A
      ├── Park B
      └── Staff: director / admin / manager  (видят только свои парки)
```

- Один логин ЛК → все парки **своей** организации
- Чужие организации **не видны**
- `super_admin` создаёт org + parks + выдаёт director (ссылка + email + пароль)

---

## 2. AUTHENTICATION (JWT FLOW)

Есть **два независимых** входа:

1. **Водитель (мобильное приложение)** — SMS OTP → JWT  
2. **Админ / ЛК / суперадмин** — email + password → JWT  

Оба получают пару:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Как использовать токен

Каждый защищённый запрос:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Рекомендуемый flow на мобильном клиенте

```text
1. POST /auth/driver/sms/request   { phone }
2. Пользователь вводит код из SMS
   (если SMS отключено — вводите код **1111**)
3. POST /auth/driver/sms/verify    { phone, code: "1111" }
4. Сохранить access_token + refresh_token (secure storage)
5. Все API: Authorization: Bearer <access_token>
6. Если 401 → POST /auth/refresh { refresh_token }
7. Если refresh тоже 401 → снова SMS login
```

---

### 2.1 Request SMS OTP (Driver)

- **METHOD:** `POST`
- **URL:** `/api/v1/auth/driver/sms/request`
- **Auth:** Public (без токена)

#### Body params

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `phone` | `string` | **yes** | — | length 10–20 | Телефон E.164, напр. `+79001234567` |

#### Example request

```http
POST /api/v1/auth/driver/sms/request
Content-Type: application/json

{
  "phone": "+79001234567"
}
```

#### Response `200 OK`

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Статус |
| `expires_in_seconds` | `integer` | Через сколько секунд OTP истекает |
| `otp_code` | `string \| null` | Код (только если SMS выключен / dev) |
| `sms_sent` | `boolean` | Реально ли ушло SMS |

```json
{
  "message": "Если водитель найден, код отправлен",
  "expires_in_seconds": 300,
  "otp_code": "4821",
  "sms_sent": false
}
```

#### Errors

| Code | When |
|------|------|
| `400` | Невалидный телефон |
| `429` | Rate limit (слишком частый запрос, default ~60 сек) |
| `502` | SMS-провайдер не отправил |

> **Anti-enumeration:** для неизвестного/заблокированного номера ответ похож на успешный, но `otp_code=null`, `sms_sent=false`.

---

### 2.2 Verify SMS OTP (Driver Login)

- **METHOD:** `POST`
- **URL:** `/api/v1/auth/driver/sms/verify`
- **Auth:** Public

#### Body params

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `phone` | `string` | **yes** | — | 10–20 | Тот же телефон |
| `code` | `string` | **yes** | — | 4–8 chars | OTP из SMS / `otp_code` |

#### Example request

```http
POST /api/v1/auth/driver/sms/verify
Content-Type: application/json

{
  "phone": "+79001234567",
  "code": "4821"
}
```

#### Response `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Errors

| Code | When |
|------|------|
| `400` | Неверный телефон / OTP истёк / неверный код |
| `403` | Водитель заблокирован |
| `404` | Водитель не найден |

> При успехе статус `pending` → `active`. OTP удаляется из Redis.

---

### 2.3 Admin Login

- **METHOD:** `POST`
- **URL:** `/api/v1/auth/admin/login`
- **Auth:** Public

> **Роли:** один endpoint для **всех** админ-ролей:  
> `super_admin` \| `director` \| `admin` \| `manager`.  
> После логина: JWT claim `role` + поля `role`, `email`, `organization_id` в ответе.  
> Профиль: `GET /api/v1/auth/me/admin`.  
> Свои парки (ЛК): `GET /api/v1/org/parks`.

#### Body params

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `email` | `string` (email) | **yes** | — | valid email | Email админа |
| `password` | `string` | **yes** | — | 8–128 | Пароль |

#### Example request

```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{
  "email": "director@sitius.app",
  "password": "Secret123!"
}
```

#### Response `200 OK`

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "role": "director",
  "email": "director@sitius.app",
  "organization_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Description |
|-------|-------------|
| `role` | `super_admin` \| `director` \| `admin` \| `manager` |
| `organization_id` | UUID организации ЛК; у `super_admin` — `null` |

Куда идти после логина:

| `role` | Дальше |
|--------|--------|
| `super_admin` | `/api/v1/super-admin/...` |
| `director` / `admin` / `manager` | `/api/v1/org/...` + staff/drivers |

#### Errors

| Code | When |
|------|------|
| `401` | Неверный email/пароль |
| `403` | Админ неактивен / заблокирован |

---

### 2.4 Refresh tokens

- **METHOD:** `POST`
- **URL:** `/api/v1/auth/refresh`
- **Auth:** Public (нужен refresh_token в body)

Работает и для **driver**, и для **admin**.

#### Body params

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `refresh_token` | `string` | **yes** | — | Действующий refresh JWT |

#### Example request

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response `200 OK`

Новая пара `access_token` + `refresh_token` (ротация).

#### Errors

| Code | When |
|------|------|
| `401` | Невалидный/истёкший refresh, blocked driver, inactive admin |

---

### 2.5 Current driver profile (`/me`)

- **METHOD:** `GET`
- **URL:** `/api/v1/auth/me/driver`  
  (alias: `GET /api/v1/drivers/me`)
- **Auth:** **Driver JWT** required

#### Headers

| Header | Required | Example |
|--------|----------|---------|
| `Authorization` | **yes** | `Bearer <access_token>` |

#### Response `200 OK` — открытые ПДн (без маски)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | ID водителя |
| `first_name` | `string \| null` | Имя (открыто) |
| `last_name` | `string \| null` | Фамилия (открыто) |
| `middle_name` | `string \| null` | Отчество (открыто) |
| `phone` | `string \| null` | Телефон (открыто) |
| `display_name` | `string \| null` | Отображаемое имя |
| `balance_system_points` | `integer` | Системные баллы |
| `balance_park_points` | `integer` | Баллы парка |
| `tier` | `string` enum | `bronze` \| `silver` \| `gold` \| `platinum` |
| `status` | `string` enum | `active` \| `blocked` \| `pending` |
| `referral_code` | `string \| null` | Реферальный код |
| `preferred_language` | `string` | `ru` \| `en` \| `uz` |
| `created_at` | `datetime` (ISO) | Дата создания |

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "first_name": "Галина",
  "last_name": "Мамышева",
  "middle_name": "Александровна",
  "phone": "+79832838320",
  "display_name": "Галина М.",
  "balance_system_points": 120,
  "balance_park_points": 45,
  "tier": "bronze",
  "status": "active",
  "referral_code": "ABC123",
  "preferred_language": "ru",
  "created_at": "2026-07-01T12:00:00Z"
}
```

---

### 2.5.1 Update driver profile / language

- **METHOD:** `PATCH`
- **URL:** `/api/v1/drivers/me`
- **Auth:** **Driver JWT**

Телефон **нельзя** менять через этот endpoint (логин по SMS).

#### Body params (хотя бы одно поле)

| Param | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `first_name` | `string \| null` | no | 1–128 | Новое имя |
| `last_name` | `string \| null` | no | 1–128 | Новая фамилия |
| `middle_name` | `string \| null` | no | ≤128 | Отчество (`""` — очистить) |
| `preferred_language` | `string \| null` | no | `ru` \| `en` \| `uz` | Язык приложения |

#### Example request

```http
PATCH /api/v1/drivers/me
Authorization: Bearer <driver_access_token>
Content-Type: application/json

{
  "preferred_language": "uz",
  "first_name": "Галина"
}
```

#### Response `200 OK`

Тот же `DriverProfileResponse` (открытый профиль).

---

### 2.6 Current admin profile (`/me`)

- **METHOD:** `GET`
- **URL:** `/api/v1/auth/me/admin`
- **Auth:** **Admin JWT** required

#### Response `200 OK`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | ID |
| `email` | `string` | Email |
| `first_name` | `string` | Имя |
| `last_name` | `string` | Фамилия |
| `role` | `string` enum | `super_admin` \| `director` \| `admin` \| `manager` |
| `status` | `string` enum | `active` \| `blocked` \| `inactive` |
| `park_id` | `uuid \| null` | Опциональный парк (legacy) |
| `organization_id` | `uuid \| null` | Организация ЛК (`null` у super_admin) |
| `created_at` | `datetime` | Создан |

```json
{
  "id": "...",
  "email": "director@sitius.app",
  "first_name": "Иван",
  "last_name": "Петров",
  "role": "director",
  "status": "active",
  "park_id": null,
  "organization_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2026-08-01T10:00:00Z"
}
```

---

### 2.7 Change own password

- **METHOD:** `PATCH`
- **URL:** `/api/v1/auth/me/admin/password`
- **Auth:** **Admin JWT** (любая роль)

#### Body

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `current_password` | `string` | **yes** | текущий пароль |
| `new_password` | `string` | **yes** | мин. 8 символов, ≠ текущему |

```http
PATCH /api/v1/auth/me/admin/password
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "current_password": "Secret123!",
  "new_password": "NewSecret456!"
}
```

#### Response `200 OK`

```json
{ "message": "Пароль успешно изменён" }
```

| Code | When |
|------|------|
| `400` | Неверный текущий пароль / новый = текущему |

---

## 3. DRIVERS API

### 3.1 List drivers (Admin)

- **METHOD:** `GET`
- **URL:** `/api/v1/drivers`
- **Auth:** Admin JWT (любая активная роль)

#### Query params

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `page` | `integer` | no | `1` | ≥ 1 | Номер страницы |
| `page_size` | `integer` | no | `20` | 1–100 | Размер страницы |
| `status` | `string` | no | `null` | `active` \| `blocked` \| `pending` | Фильтр статуса |

#### Example

```http
GET /api/v1/drivers?page=1&page_size=20&status=active
Authorization: Bearer <admin_access_token>
```

#### Response `200 OK`

| Field | Type | Description |
|-------|------|-------------|
| `items` | `DriverListItem[]` | Список (маскированные ПДн) |
| `total` | `integer` | Всего записей |
| `page` | `integer` | Текущая страница |
| `page_size` | `integer` | Размер страницы |

#### `DriverListItem` fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | ID |
| `yandex_driver_id` | `string` | ID в Yandex |
| `yandex_park_id` | `string` | ID парка |
| `display_name` | `string \| null` | Имя |
| `first_name_masked` | `string \| null` | Имя (маска) |
| `last_name_masked` | `string \| null` | Фамилия (маска) |
| `phone_masked` | `string \| null` | Телефон (маска) |
| `balance_system_points` | `integer` | Системные баллы |
| `balance_park_points` | `integer` | Баллы парка |
| `tier` | `enum` | Loyalty tier |
| `status` | `enum` | Статус |
| `referral_code` | `string \| null` | Реферал |
| `created_at` | `datetime` | Создан |

---

### 3.2 My driver profile

- **METHOD:** `GET`
- **URL:** `/api/v1/drivers/me`
- **Auth:** **Driver JWT**

Открытый профиль (см. §2.5). Редактирование: `PATCH /api/v1/drivers/me` (§2.5.1).

```http
GET /api/v1/drivers/me
Authorization: Bearer <driver_access_token>
```

---

### 3.3 Get driver by ID (Admin)

- **METHOD:** `GET`
- **URL:** `/api/v1/drivers/{driver_id}`
- **Auth:** Admin JWT

#### Path params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `driver_id` | `uuid` | **yes** | ID водителя |

#### Errors

| Code | When |
|------|------|
| `404` | Не найден |

---

### 3.4 Personal data — decrypted PDN (super_admin | director)

- **METHOD:** `GET`
- **URL:** `/api/v1/drivers/{driver_id}/personal-data`
- **Auth:** Admin JWT + role **`super_admin`** или **`director`**

Пишет запись в `pdn_access_log` (IP, User-Agent).

#### Path params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `driver_id` | `uuid` | **yes** | ID водителя |

#### Response `200 OK`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | ID |
| `first_name` | `string \| null` | Расшифрованное имя |
| `last_name` | `string \| null` | Фамилия |
| `middle_name` | `string \| null` | Отчество |
| `phone` | `string \| null` | Телефон |
| `display_name` | `string \| null` | Display name |
| `tier` | `enum` | Tier |
| `status` | `enum` | Status |

#### Errors

| Code | When |
|------|------|
| `403` | Не director |
| `404` | Не найден |
| `500` | Ошибка расшифровки |

---

### 3.5 Update balance (Admin)

- **METHOD:** `PATCH`
- **URL:** `/api/v1/drivers/{driver_id}/balance`
- **Auth:** Admin JWT + roles **`director` \| `admin` \| `manager`**

#### Path params

| Param | Type | Required |
|-------|------|----------|
| `driver_id` | `uuid` | **yes** |

#### Body params

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `balance_system_points` | `integer \| null` | conditional | `null` | ≥ 0 | Новый системный баланс |
| `balance_park_points` | `integer \| null` | conditional | `null` | ≥ 0 | Новый баланс парка |

> Нужно указать **хотя бы одно** поле. Иначе `422`.

#### Example request

```http
PATCH /api/v1/drivers/3fa85f64-5717-4562-b3fc-2c963f66afa6/balance
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "balance_system_points": 200,
  "balance_park_points": 50
}
```

#### Response `200 OK`

`DriverListItem` (обновлённый).

---

### 3.6 Update status (Admin)

- **METHOD:** `PATCH`
- **URL:** `/api/v1/drivers/{driver_id}/status`
- **Auth:** Admin JWT + roles **`director` \| `admin`** (не `manager`)

#### Body params

| Param | Type | Required | Values |
|-------|------|----------|--------|
| `status` | `string` | **yes** | `active` \| `blocked` \| `pending` |

#### Example request

```http
PATCH /api/v1/drivers/3fa85f64-5717-4562-b3fc-2c963f66afa6/status
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "status": "blocked"
}
```

#### Response `200 OK`

`DriverListItem`.

---

## 4. SYNC API (Admin / Celery)

Эндпоинты **только ставят задачу** в Celery. Сам синк идёт в фоне.

### 4.1 Sync drivers from Yandex

- **METHOD:** `POST`
- **URL:** `/api/v1/sync/drivers`
- **Auth:** Admin JWT + **`director` \| `admin`**
- **Body:** none

#### Response `200 OK`

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Текст |
| `task_id` | `string` | Celery task id |

```json
{
  "message": "Синхронизация водителей запущена",
  "task_id": "a1b2c3d4-..."
}
```

#### Errors

| Code | When |
|------|------|
| `503` | Celery/Redis недоступен |

---

### 4.2 Sync rides from Yandex

- **METHOD:** `POST`
- **URL:** `/api/v1/sync/rides`
- **Auth:** Admin JWT + **`director` \| `admin`**
- **Body:** none

#### Response `200 OK`

```json
{
  "message": "Синхронизация поездок запущена",
  "task_id": "..."
}
```

> Beat также гоняет sync по расписанию (drivers ~6h, rides ~15 min) — без HTTP.

---

## 5. SERVICE

### Health check

- **METHOD:** `GET`
- **URL:** `/health` (без `/api/v1`)
- **Auth:** Public

```json
{
  "status": "ok",
  "service": "LOTAX"
}
```

---

## 6. ENUMS

### `DriverStatus`
`active` · `blocked` · `pending`

### `DriverTier`
`bronze` · `silver` · `gold` · `platinum`

### `AdminRole`
`director` · `admin` · `manager`

### `AdminStatus`
`active` · `blocked` · `inactive`

---

## 7. ERROR FORMAT

### Ordinary errors (`HTTPException`)

```json
{
  "detail": "Текст ошибки"
}
```

### Validation (`422`)

```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

### Auth errors

| Code | Meaning |
|------|---------|
| `401` | Нет / невалидный / истёкший access token |
| `403` | Нет прав (роль / blocked) |

При `401` клиент должен пробовать refresh.

---

## 8. AUTH MATRIX (quick)

| Endpoint | Public | Driver JWT | Admin JWT | Role |
|----------|--------|------------|-----------|------|
| `POST /auth/driver/sms/request` | ✓ | | | |
| `POST /auth/driver/sms/verify` | ✓ | | | |
| `POST /auth/admin/login` | ✓ | | | |
| `POST /auth/refresh` | ✓ | | | |
| `GET /auth/me/driver` | | ✓ | | открытый профиль |
| `PATCH /drivers/me` | | ✓ | | edit ФИО + язык |
| `GET /auth/me/admin` | | | ✓ | any active |
| `PATCH /auth/me/admin/password` | | | ✓ | any active |
| `GET /org/me` | | | ✓ | director / admin / manager |
| `GET /org/parks` | | | ✓ | director / admin / manager |
| `GET /org/parks/{id}` | | | ✓ | director / admin / manager |
| `GET /drivers` | | | ✓ | any |
| `GET /drivers/me` | | ✓ | | |
| `GET /drivers/{id}` | | | ✓ | any |
| `GET /drivers/{id}/personal-data` | | | ✓ | **super_admin** / **director** |
| `PATCH /drivers/{id}/balance` | | | ✓ | director / admin / **manager** |
| `PATCH /drivers/{id}/status` | | | ✓ | director / **admin** |
| `POST /sync/drivers` | | | ✓ | director / admin |
| `POST /sync/rides` | | | ✓ | director / admin |
| `GET /admins` | | | ✓ | director / admin |
| `GET /admins/managers` | | | ✓ | director / admin |
| `POST /admins` | | | ✓ | director / admin* |
| `GET /admins/{id}` | | | ✓ | director / admin* |
| `PATCH /admins/{id}` | | | ✓ | director / admin* |
| `GET /health` | ✓ | | | |

\* director: admin+manager; admin: faqat manager

---

## 8.1 Staff CRUD (ЛК организации)

Сотрудники создаются **внутри своей организации** (`organization_id` копируется у создателя).  
Чужие организации не видны.

### Create
`POST /api/v1/admins`
```json
{
  "email": "manager@sitius.app",
  "password": "Secret123!",
  "first_name": "Ali",
  "last_name": "Karimov",
  "role": "manager"
}
```

**Права:** `director` → `admin`|`manager`; `admin` → только `manager`.  
`role=director` через этот API **нельзя** (только super-admin).

### List
- `GET /api/v1/admins` — все управляемые **своей** орг.
- `GET /api/v1/admins?role=manager` — только manager
- `GET /api/v1/admins?role=admin` — только admin (только director)
- `GET /api/v1/admins/managers` — alias менеджеров

### Update (пароль / status / FIO)
`PATCH /api/v1/admins/{id}`
```json
{
  "password": "NewSecret123!",
  "status": "blocked"
}
```

Свой пароль меняйте через `PATCH /api/v1/auth/me/admin/password`, не через `/admins/{id}`.

---

## 8.2 Organization ЛК (клиент с несколькими парками)

**Модель:** организация (например «Ситиус») → несколько таксопарков.  
Сотрудники ЛК (`director` / `admin` / `manager`) видят **только парки своей организации**.

### Checklist ЛК после логина

```text
1. POST /auth/admin/login
2. GET  /org/me            → организация + роль
3. GET  /org/parks         → список своих парков
4. GET  /admins            → сотрудники (director/admin)
5. PATCH /auth/me/admin/password  → сменить пароль при первом входе
```

### `GET /api/v1/org/me`

**Auth:** director | admin | manager

```json
{
  "organization": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Ситиус",
    "legal_name": "ООО Ситиус",
    "subscription_active": true,
    "is_active": true,
    "notes": null,
    "parks_count": 2,
    "created_at": "2026-08-01T10:00:00Z",
    "updated_at": "2026-08-01T10:00:00Z"
  },
  "role": "director",
  "email": "director@sitius.app",
  "first_name": "Иван",
  "last_name": "Петров",
  "admin_id": "..."
}
```

Если подписка организации выключена → `403`.

### `GET /api/v1/org/parks`

Query: `page`, `page_size` (как везде).

```json
{
  "items": [
    {
      "id": "...",
      "organization_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Ситиус Центр",
      "legal_name": null,
      "yandex_park_id": "xxx",
      "yandex_client_id": "yyy",
      "has_yandex_api_key": true,
      "subscription_active": true,
      "is_active": true,
      "notes": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 20
}
```

### `GET /api/v1/org/parks/{park_id}`

Парк **только своей** организации. Чужой UUID → `404`.

### Смена своего пароля

См. [§ 2.7](#27-change-own-password): `PATCH /api/v1/auth/me/admin/password`.

---

## 8.3 Super Admin (глобальная панель LOTAX)

**Роль:** `super_admin` — все организации и парки.  
Login: `POST /api/v1/auth/admin/login` → `"role": "super_admin"`, `organization_id: null`.

### Endpoints

| Method | URL | Описание |
|--------|-----|----------|
| `GET` | `/api/v1/super-admin/organizations` | Список организаций |
| `POST` | `/api/v1/super-admin/organizations` | Создать организацию |
| `GET` | `/api/v1/super-admin/organizations/{id}` | Организация |
| `PATCH` | `/api/v1/super-admin/organizations/{id}` | Обновить |
| `PATCH` | `/api/v1/super-admin/organizations/{id}/subscription` | Подписка орг. |
| `GET` | `/api/v1/super-admin/organizations/{id}/parks` | Парки организации |
| `POST` | `/api/v1/super-admin/organizations/{id}/parks` | Добавить парк |
| `PATCH` | `/api/v1/super-admin/parks/{park_id}` | Обновить парк |
| `POST` | `/api/v1/super-admin/organizations/{id}/directors` | Выдать director |
| `GET` | `/api/v1/super-admin/organizations/{id}/staff` | Сотрудники ЛК |
| `GET` | `/api/v1/super-admin/settings` | Глобальные настройки |
| `PUT` | `/api/v1/super-admin/settings` | Обновить настройки |

### Онбординг клиента (пример)

**1. Создать организацию**

```http
POST /api/v1/super-admin/organizations
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Ситиус",
  "legal_name": "ООО Ситиус",
  "subscription_active": true,
  "notes": "Пилот"
}
```

**2. Добавить парки**

```http
POST /api/v1/super-admin/organizations/{org_id}/parks
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Ситиус Центр",
  "yandex_park_id": "...",
  "yandex_client_id": "...",
  "yandex_api_key": "...",
  "subscription_active": true
}
```

**3. Выдать директора (доступ в ЛК)**

```http
POST /api/v1/super-admin/organizations/{org_id}/directors
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "email": "director@sitius.app",
  "password": "Secret123!",
  "first_name": "Иван",
  "last_name": "Петров"
}
```

**4. Передать клиенту:** ссылка на ЛК + `email` + `password`.

### Подписка организации

```http
PATCH /api/v1/super-admin/organizations/{org_id}/subscription
Content-Type: application/json

{ "subscription_active": false }
```

При `false` сотрудники ЛК получают `403` на `/org/...`.

### Создать суперадмина (CLI)

```bash
docker compose exec api python -m scripts.create_admin \
  --email super@lotax.app \
  --password 'Secret123!' \
  --role super_admin
```

---

## 9. MOBILE CHECKLIST (водитель)

1. Запросить OTP: `POST /api/v1/auth/driver/sms/request`
2. Ввести код → `POST /api/v1/auth/driver/sms/verify`
3. Сохранить `access_token` + `refresh_token`
4. Профиль: `GET /api/v1/drivers/me` (открытые ПДн)
5. Язык / ФИО: `PATCH /api/v1/drivers/me`
6. На каждый запрос: `Authorization: Bearer <access_token>`
7. При `401`: `POST /api/v1/auth/refresh` → обновить токены
8. Если refresh fail → снова SMS login

---

## 10. NOT AVAILABLE IN PHASE 1

- Регистрация водителя через API (водители приходят из Yandex sync)
- Создание `director` через `/admins` (только super_admin → организация)
- Ride list / loyalty redeem endpoints
- WebSockets
- Push notifications API

### Bootstrap на сервере

```bash
# 1) Super-admin
python -m scripts.create_admin \
  --email super@lotax.app \
  --password 'Secret123!' \
  --role super_admin

# 2) Дальше через API (Swagger / curl):
#    POST /super-admin/organizations
#    POST /super-admin/organizations/{id}/parks
#    POST /super-admin/organizations/{id}/directors
```

Director клиенту выдаёт только `super_admin` через  
`POST /api/v1/super-admin/organizations/{id}/directors`.

---

## 11. ADMIN PANEL CHECKLIST (ЛК)

1. Логин: `POST /api/v1/auth/admin/login`
2. Сохранить tokens; смотреть `role` + `organization_id`
3. `GET /api/v1/org/me` — организация
4. `GET /api/v1/org/parks` — свои парки
5. Staff: `GET/POST/PATCH /api/v1/admins`
6. Свой пароль: `PATCH /api/v1/auth/me/admin/password`
7. При `401` → refresh; при fail → снова login

---

*Generated for LOTAX Phase 1 · Mobile + Admin frontend · FastAPI JWT API*
