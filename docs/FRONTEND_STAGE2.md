# LOTAX — Frontend Stage 2

Документация для **мобильного (Flutter)** и **админ-панели (React)**.  
Этап 2: **Yandex / база парка + двойные баллы + каталог наград + заявки + правила**.

> Backend: FastAPI · Auth: `Authorization: Bearer <access_token>` · Base: `{BASE_URL}/api/v1`  
> Swagger: `{BASE_URL}/docs`

---

## 1. Что входит в этап 2 (экраны)

### Мобильное приложение (водитель)

| Экран | Что показывать |
|-------|----------------|
| Dashboard (часть) | 2 баланса: системные + парковые, tier |
| Баллы | История транзакций (system / park) |
| Награды | 2 каталога: LOTAX (`system`) и парк (`park`) |
| Заявка на награду | Подтверждение списания, статусы заявок |
| Профиль | Уровень + балансы (уже есть из этапа 1) |

### Админ-панель (ЛК организации)

| Экран | Роли |
|-------|------|
| Настройки Yandex Fleet (ключи парка) | только **director** |
| Список водителей (маскированные ПДн) | director / admin / manager |
| Добавление водителя вручную | director / admin |
| Каталог парковых наград (CRUD) | director / admin (manager — только чтение) |
| Модерация заявок (одобрить / отклонить) | director / admin / manager |
| Правила начисления парковых баллов | director / admin |
| Ручная корректировка баллов | admin → park; director → system+park |

### Супер-админ

| Экран | Роль |
|-------|------|
| Системный каталог наград LOTAX | `super_admin` |

---

## 2. Модель баллов (обязательно понять UI)

```text
Системные (LOTAX)  🟡  — единые правила платформы, каталог LOTAX
Парковые           🔵  — правила парка, каталог парка
```

- У водителя **всегда два баланса**.
- Награда всегда привязана к одному типу: `points_type: "system" | "park"`.
- Списывать можно **только** с нужного баланса.
- Tier: `bronze` → `silver` (1000) → `gold` (5000) → `platinum` (15000) по `total_earned_system`.

---

## 3. Mobile API (водитель)

### 3.1 Баланс

`GET /api/v1/points/balance`

**Response**
```json
{
  "balance_system_points": 2450,
  "balance_park_points": 1230,
  "total_earned_system": 4200,
  "total_earned_park": 2100,
  "tier": "silver",
  "next_tier": "gold",
  "next_tier_points_needed": 800
}
```

### 3.2 История баллов

`GET /api/v1/points/history?type=system|park&page=1&page_size=50`

| Query | Описание |
|-------|----------|
| `type` | `system` или `park` |
| `page`, `page_size` | пагинация |

**Элемент**
```json
{
  "id": "...",
  "points_type": "park",
  "type": "earn_ride",
  "amount": 5,
  "balance_after": 1235,
  "description": "За поездку (парковые)",
  "created_at": "2026-08-04T12:00:00Z"
}
```

Типы `type`: `earn_ride`, `earn_task`, `earn_competition`, `earn_referral`, `earn_bonus`, `spend`, `refund`, `adjustment`, `expire`.

UI: `amount > 0` — начисление, `< 0` — списание.

### 3.3 Каталог наград

`GET /api/v1/rewards/catalog?type=system|park&park_id=<uuid>`

- `type=system` — каталог LOTAX  
- `type=park` — каталог парка (`park_id` опционален, если парк водителя известен на бэке)

В карточке есть:
- `points_cost`, `points_type`
- `min_tier`, `is_available`, `unavailable_reason`  
  (`Недостаточно баллов` / `Нужен уровень …` / `Нет в наличии`)

### 3.4 Создать заявку (обмен)

`POST /api/v1/rewards/order`

```json
{
  "reward_id": "uuid",
  "free_shift_date": "2026-08-10T00:00:00Z"
}
```

`free_shift_date` **обязателен**, если `reward.type == "free_shift"`.

После успеха:
- баллы сразу списываются;
- статус заявки `pending`;
- показать: «Заявка отправлена, ждите модерации».

### 3.5 Мои заявки

`GET /api/v1/rewards/orders`

Статусы: `pending` | `approved` | `rejected` | `cancelled` | `fulfilled`

### 3.6 Отмена своей заявки

`DELETE /api/v1/rewards/orders/{id}`

Только в `pending` → баллы возвращаются (`refund`).

---

## 4. Admin API (ЛК)

Login: `POST /api/v1/auth/admin/login` → `role`, `organization_id`.

Сначала:
1. `GET /org/me`
2. `GET /org/parks` → выбрать `park_id`

### 4.1 Yandex ключи парка (director)

`GET /api/v1/org/parks/{park_id}/yandex-settings`  
`PATCH /api/v1/org/parks/{park_id}/yandex-settings`

```json
{
  "yandex_park_id": "...",
  "yandex_client_id": "...",
  "yandex_api_key": "..."
}
```

В ответе ключ **не возвращается**, только `has_yandex_api_key: true/false`.

### 4.2 Водители

Уже есть (этап 1): `GET /drivers`, `GET /drivers/{id}`, personal-data (director).

**Ручное добавление (этап 2):**

`POST /api/v1/admin/drivers`

```json
{
  "park_id": "uuid",
  "phone": "+79001112233",
  "first_name": "Иван",
  "last_name": "Петров",
  "middle_name": "Сергеевич",
  "yandex_driver_id": "optional_or_generated"
}
```

### 4.3 Каталог наград парка

| Method | URL | Роли |
|--------|-----|------|
| GET | `/admin/rewards?park_id=` | director/admin/manager |
| POST | `/admin/rewards` | director/admin |
| PATCH | `/admin/rewards/{id}` | director/admin |
| DELETE | `/admin/rewards/{id}` | director/admin (деактивация) |

**POST body**
```json
{
  "park_id": "uuid",
  "title": "Мойка авто",
  "description": "Полная мойка",
  "type": "car_wash",
  "points_type": "park",
  "points_cost": 200,
  "stock_total": 50,
  "min_tier": "bronze",
  "sort_order": 1,
  "is_active": true,
  "image_url": null
}
```

Типы наград: `free_shift` | `certificate` | `fuel_card` | `car_wash` | `merchandise` | `other`

### 4.4 Заявки (модерация)

| Method | URL | Роли |
|--------|-----|------|
| GET | `/admin/orders?park_id=&status=&points_type=` | director/admin/manager |
| POST | `/admin/orders/{id}/approve` | director/admin/manager |
| POST | `/admin/orders/{id}/reject` | director/admin/manager |

**Approve**
```json
{ "comment": "Выдано" }
```

**Reject** (причина обязательна)
```json
{ "reason": "Нет в наличии" }
```

При reject баллы **автоматически возвращаются**.

### 4.5 Правила парковых баллов

| Method | URL |
|--------|-----|
| GET/POST | `/admin/rules?park_id=` / body с `park_id` |
| PATCH/DELETE | `/admin/rules/{id}` |

**Пример `per_ride`**
```json
{
  "park_id": "uuid",
  "name": "5 баллов за поездку",
  "points_type": "park",
  "rule_type": "per_ride",
  "conditions": { "points_per_ride": 5 },
  "is_active": true,
  "priority": 10
}
```

Другие `rule_type`:
- `per_ruble` → `{ "points_per_ruble": 0.05, "min_fare": 200 }`
- `time_multiplier` → `{ "hours": [22,23,0,1,2,3,4,5], "multiplier": 2.0 }`
- `tier_multiplier` → `{ "bronze": 1.0, "silver": 1.2, "gold": 1.5, "platinum": 2.0 }`

Правила применяются **только к новым поездкам** после sync.

### 4.6 Корректировка баллов

`POST /api/v1/admin/drivers/{id}/adjust-points`

```json
{
  "points_type": "park",
  "amount": 100,
  "description": "Бонус за акцию"
}
```

`amount` может быть отрицательным. Manager — **403**.

### 4.7 Системный каталог (super_admin)

`GET/POST/PATCH /api/v1/super-admin/rewards`  
(`park_id` = null, обычно `points_type: "system"`)

---

## 5. Рекомендуемые UI flows

### Водитель: обмен награды
1. Каталог → карточка  
2. Если `is_available=false` — disabled + `unavailable_reason`  
3. Confirm modal: «Списать N баллов?»  
4. POST order → toast success  
5. Вкладка «Мои заявки»

### Админ: модерация
1. Список `pending`  
2. Approve / Reject  
3. Reject → обязательное поле причины  

### Director: подключение Yandex
1. Org parks → park settings  
2. Ввести Client ID / Park ID / API Key  
3. Сохранить → статус «ключ задан»

---

## 6. Checklist приёмки Stage 2 (frontend)

- [ ] Два баланса отображаются раздельно  
- [ ] История фильтруется system/park  
- [ ] Два каталога переключаются  
- [ ] Обмен списывает правильный баланс  
- [ ] Отмена pending возвращает баллы  
- [ ] Admin CRUD наград работает по ролям  
- [ ] Approve/Reject заявок работает  
- [ ] Yandex settings только у director  
- [ ] Маскированные ФИО у manager/admin  

---

*LOTAX Frontend · Stage 2 · Mobile + Admin*
