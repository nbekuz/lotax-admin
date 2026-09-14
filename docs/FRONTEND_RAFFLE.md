# LOTAX — розыгрыш (`raffle_coupon`) + супер-админ push

ТЗ для фронта (ЛК директора, супер-админ, мобильное приложение).

- База: `{BASE_URL}/api/v1`
- Auth: `Authorization: Bearer <token>`
- Формат дат: ISO-8601 (`2026-12-31T12:00:00Z`)

---

## Правила продукта (обязательно)

| Кто создаёт награду | Тип баллов | Сколько купонов может купить водитель |
|---------------------|------------|----------------------------------------|
| Директор парка | всегда **park** | **без лимита** (больше баллов → больше билетов → выше шанс) |
| Супер-админ (каталог LOTAX) | всегда **system** | **без лимита** |

Бэкенд сам форсирует:

- `points_type` (директор → `park`, супер-админ raffle → `system`)
- `one_per_driver = false` для `type=raffle_coupon` (даже если UI пришлёт `true`)

Заказ розыгрыша у водителя сразу **`approved`** (не нужно одобрять директором).

Розыгрыш победителя в приложении **нет** — выгрузка файла во внешний рандомайзер.

---

# Часть 1. ЛК директора — создать розыгрыш парка

`POST /admin/rewards` · `multipart/form-data`  
Роль: **`director`**

### Поля (важное)

| Поле | Обязательно | Что слать / UI |
|------|-------------|----------------|
| `park_id` | да | UUID парка |
| `title` | да | «Розыгрыш iPhone» |
| `type` | да | **`raffle_coupon`** |
| `points_cost` | да | стоимость **одного** билета в парковых баллах |
| `raffle_date` | желательно | дата розыгрыша ISO |
| `description` | нет | условия |
| `stock_total` | нет | пусто = без лимита склада; иначе макс. число билетов всего |
| `min_tier` | нет | `bronze` по умолчанию |
| `is_active` | нет | `true` |
| `icon_id` | нет | UUID из `GET /admin/reward-icons` |
| `image` | нет | файл картинки |
| `scope_type` / `park_ids` | по необходимости | охват парков |

### Что убрать из UI для `raffle_coupon`

- Выбор «системные / парковые баллы» — **нет** (всегда парковые).
- Тогл «один купон на водителя» — **нет** (всегда можно много).

### Ответ (фрагмент)

```json
{
  "id": "uuid",
  "title": "Розыгрыш iPhone",
  "type": "raffle_coupon",
  "points_type": "park",
  "points_cost": 50,
  "one_per_driver": false,
  "raffle_date": "2026-12-31T12:00:00Z",
  "is_active": true,
  "park_id": "uuid"
}
```

Список / карточка: `GET /admin/rewards?park_id=…` — те же поля `type`, `one_per_driver`, `raffle_date`.

---

# Часть 2. Супер-админ — системный розыгрыш LOTAX

`POST /super-admin/rewards` · `multipart/form-data`  
Роль: **`super_admin`**

| Поле | Значение |
|------|----------|
| `type` | `raffle_coupon` |
| `points_type` | можно не слать / слать что угодно — бэкенд сохранит **`system`** |
| `one_per_driver` | игнорируется → `false` |
| `raffle_date` | дата розыгрыша |
| `points_cost` | стоимость билета в **системных** баллах |
| `title`, `description`, `stock_total`, `min_tier`, `is_active`, `image` | как у обычной награды |

Список: `GET /super-admin/rewards`.

---

# Часть 3. Мобильное — купить билет

`GET /rewards/catalog` — в каталоге у розыгрыша:

| Поле | UI |
|------|-----|
| `type` | `raffle_coupon` |
| `points_type` | `park` или `system` (какой баланс списывать) |
| `points_cost` | цена одного билета |
| `one_per_driver` | всегда `false` для raffle |
| `raffle_date` | показать «Розыгрыш: …» |
| `icon` / `image_url` | иконка / фото |

`POST /rewards/order`

```json
{ "reward_id": "uuid-награды" }
```

### Ответ

```json
{
  "id": "uuid-заказа",
  "reward_id": "uuid",
  "status": "approved",
  "points_spent": 50,
  "points_type": "park",
  "created_at": "2026-09-10T12:00:00Z"
}
```

### UI водителя

- Кнопка «Купить билет» — **можно нажимать много раз** (пока хватает баллов / склада).
- Не показывать «уже куплено — нельзя».
- После покупки статус **`approved`** — не ждать одобрения.
- В «Мои заказы» (`GET /rewards/orders`) показывать число купленных билетов по этой награде.
- Подсказка: «Чем больше билетов — тем выше шанс выиграть».

Ошибки:

| Код | Когда |
|-----|--------|
| `400` | мало баллов / награда закончилась |
| `403` | награда не из его парка (park reward) |
| `404` | награда неактивна / нет |

---

# Часть 4. Экспорт для рандомайзера (ЛК)

Одна строка файла = **один купленный билет**.  
Статусы в файле: `pending` и `approved` (для raffle обычно сразу `approved`).

| Роль | Endpoint |
|------|----------|
| Директор / менеджер | `GET /admin/rewards/{reward_id}/raffle-export?format=csv` |
| | `GET /admin/rewards/{reward_id}/raffle-export?format=xlsx` |
| Супер-админ | `GET /super-admin/rewards/{reward_id}/raffle-export?format=csv\|xlsx` |

- Ответ: **файл** (`Content-Disposition: attachment`), не JSON.
- Показывать кнопку только если `type === "raffle_coupon"`.
- Подпись: **«Скачать для рандомайзера»** (CSV и/или Excel).

### Колонки файла

| Колонка | Смысл |
|---------|--------|
| `ticket_no` | номер билета 1…N (порядок покупки) |
| `order_id` | UUID заказа |
| `driver_id` | UUID водителя |
| `driver_name` | ФИО |
| `driver_phone` | телефон |
| `points_spent` | сколько баллов за этот билет |
| `points_type` | `park` / `system` |
| `status` | `approved` / `pending` |
| `purchased_at` | когда купили |
| `reward_title` | название розыгрыша |

Сценарий для директора:

1. Создать награду `raffle_coupon`.
2. Водители покупают билеты.
3. В день розыгрыша — скачать CSV/XLSX → загрузить во внешний рандомайзер.
4. Победителя отметить вручную (отдельного API розыгрыша нет).

---

# Часть 5. Супер-админ — push по организациям

`POST /super-admin/push/notify`  
Роль: **`super_admin`**  
`Content-Type: application/json`

### Вариант A — выбранные организации

```json
{
  "title": "Акция LOTAX",
  "body": "Купите купон розыгрыша и выиграйте приз",
  "organization_ids": ["uuid-org-1", "uuid-org-2"],
  "all_organizations": false,
  "category": "promo",
  "data": { "type": "promo" }
}
```

### Вариант B — все организации платформы

```json
{
  "title": "Акция LOTAX",
  "body": "Текст пуша",
  "all_organizations": true,
  "category": "promo"
}
```

### UI супер-админа

1. Заголовок + текст (обязательно).
2. Чекбокс **«Все организации»** → `all_organizations: true`.
3. Иначе мультиселект организаций → `organization_ids` (не пустой).
4. Категория: по умолчанию `promo` (учитывает настройки уведомлений водителя).
5. Кнопка «Отправить».

### Ответ

```json
{
  "success_count": 120,
  "failure_count": 3,
  "devices_targeted": 123,
  "detail": null,
  "errors": []
}
```

| Ситуация | Поведение UI |
|----------|--------------|
| `422` без org и без `all_organizations` | «Выберите организации или «Все»» |
| `devices_targeted: 0` | «Нет активных устройств» (`detail`) |
| успех | показать `success_count` / `failure_count` |

Директорский push парка **без изменений**:

`POST /admin/push/notify` + `park_id` (как было).

---

# Чеклист фронта

### ЛК директора

- [ ] Тип награды `raffle_coupon` в форме создания
- [ ] Нет выбора system/park и «один на водителя» для raffle
- [ ] Поле даты розыгрыша `raffle_date`
- [ ] Кнопка «Скачать для рандомайзера» (csv/xlsx)

### Супер-админ

- [ ] Создание системного `raffle_coupon` (system-баллы)
- [ ] Экспорт raffle-export
- [ ] Экран push: org multi-select **или** «все организации»

### Мобильное

- [ ] Карточка розыгрыша: дата, цена билета, можно купить повторно
- [ ] После покупки статус `approved`, баланс уменьшился
- [ ] Текст про «больше билетов — выше шанс»
