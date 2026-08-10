# LOTAX — Frontend Stage 3

Документация для **мобильного (Flutter)** и **админ-панели (React)**.  
Этап 3: **задания, соревнования, рефералы, ТОП-5, полный dashboard**.

> Backend: FastAPI · Auth: Bearer JWT · Base: `{BASE_URL}/api/v1`  
> Swagger: `{BASE_URL}/docs`  
> Stage 2 (баллы/каталог) уже должен быть подключён.

---

## 1. Что входит в этап 3 (экраны)

### Мобильное приложение

| Экран / блок | Описание |
|--------------|----------|
| **Главная (Dashboard)** | 2 баланса, tier, превью заданий (≤3), активное соревнование, ТОП-5, реферал-блок |
| **Задания** | Вкладки: Активные / Выполненные / Завершённые, progress-bar, join |
| **Соревнования** | Список, детали, лидерборд |
| **ТОП-5** | day / week / month, имена вида «Иван П.» |
| **Рефералы** | Мой код, применить чужой код (1 раз), статистика, список друзей |
| Push settings / device token | Сохранение настроек (отправка FCM — позже) |

### Админ-панель

| Экран | Роли |
|-------|------|
| CRUD заданий | director / admin (manager — read) |
| Прогресс участников задания | director / admin / manager |
| CRUD соревнований + finalize | director / admin |
| Лидерборд соревнования | director / admin / manager |
| Настройки реферальной программы | director / admin |
| Статистика рефералов | director / admin |

---

## 2. Mobile: Dashboard

`GET /api/v1/driver/dashboard`

Один запрос для главной. Пример ответа:

```json
{
  "balance_system_points": 2450,
  "balance_park_points": 1230,
  "tier": "silver",
  "next_tier": "gold",
  "next_tier_points_needed": 800,
  "tasks_preview": [
    {
      "id": "...",
      "title": "100 поездок за неделю",
      "task_type": "ride_count",
      "target_value": 100,
      "reward_points_type": "park",
      "reward_points": 500,
      "end_date": "...",
      "my_progress": 78,
      "is_joined": true
    }
  ],
  "competition_preview": {
    "id": "...",
    "title": "Лучший водитель месяца",
    "criteria": "max_points",
    "end_date": "...",
    "my_rank": 7,
    "my_score": 756,
    "participants_count": 245
  },
  "top_drivers_preview": {
    "period": "week",
    "items": [
      { "rank": 1, "display_name": "Алексей М.", "points": 890, "is_me": false }
    ],
    "my_rank": 4,
    "is_me_in_top": true
  },
  "referral": {
    "referral_code": "LOT7K2AB",
    "total_referrals": 3,
    "activated_referrals": 1,
    "has_applied_code": false
  }
}
```

**UI советы**
- Pull-to-refresh → снова `GET /driver/dashboard`
- Progress: `my_progress / target_value`
- В ТОП-5 строка с `is_me=true` выделяется
- Реферал: кнопки «Копировать» / «Поделиться»

---

## 3. Mobile: Задания

### Список
`GET /api/v1/tasks?tab=active|completed|expired`

### Детали
`GET /api/v1/tasks/{id}`

### Участие (если `auto_join=false`)
`POST /api/v1/tasks/{id}/join`

**Типы заданий (`task_type`)**

| Код | Смысл | Progress |
|-----|-------|----------|
| `ride_count` | N поездок | +1 за поездку |
| `earn_points` | Набрать N баллов | по начисленным |
| `fare_total` | Сумма ₽ | + fare |
| `streak_days` | Дни подряд | daily job |
| `custom` | Ручной трекинг админом | админ |

Карточка:
- progress-bar + «Осталось: X»
- дедлайн
- награда: `+N` system/park

---

## 4. Mobile: Соревнования

`GET /api/v1/competitions`  
`GET /api/v1/competitions/{id}`  
`GET /api/v1/competitions/{id}/leaderboard`

**Критерии**
- `max_points` — максимум баллов (system/park/both по настройке)
- `max_rides` — максимум поездок

Лидерборд:
- `display_name` вида «Иван П.» (не полное ФИО)
- своя строка: `is_me`
- место / score / до лидера (считать на клиенте: `leader.score - my.score`)

---

## 5. Mobile: ТОП-5

`GET /api/v1/drivers/top?period=day|week|month`

```json
{
  "period": "week",
  "items": [
    { "rank": 1, "display_name": "Алексей М.", "points": 890, "is_me": false },
    { "rank": 4, "display_name": "Иван П.", "points": 756, "is_me": true }
  ],
  "my_rank": 4
}
```

Переключатель периода на UI → новый запрос.

> Важно: маршрут `/drivers/top` зарегистрирован **до** `/drivers/{id}` — используйте именно этот path.

---

## 6. Mobile: Рефералы

### Мой код
`GET /api/v1/referral/my-code`  
→ `referral_code`, `share_text`

### Статистика
`GET /api/v1/referral/stats`

### Список приглашённых
`GET /api/v1/referral/list`  
→ имя (маска) + прогресс поездок / «Выполнено»

### Применить чужой код (только 1 раз, обычно после первого входа)
`POST /api/v1/referral/apply`

```json
{ "referral_code": "LOT7K2AB" }
```

Ошибки UX:
- свой код → нельзя
- уже применял → нельзя
- не найден → «Промокод не найден»
- пропустить экран, если пользователь нажал Skip

Экран «Есть промокод?» показывать **один раз** при первом входе (`has_applied_code` / локальный flag).

---

## 7. Mobile: Device / Push prefs

`PUT /api/v1/driver/device-token`
```json
{ "device_token": "fcm_token", "platform": "android" }
```

`PUT /api/v1/driver/push-settings`
```json
{
  "earn_points": true,
  "tasks": true,
  "competitions": true,
  "referrals": true,
  "promo": true
}
```

Статус заявок (по ТЗ) отключать нельзя — если добавите отдельный ключ, держите его всегда `true` в UI.

---

## 8. Admin: Задания

| Method | URL | Роли |
|--------|-----|------|
| GET | `/admin/tasks?park_id=` | director/admin/manager |
| POST | `/admin/tasks` | director/admin |
| PATCH/DELETE | `/admin/tasks/{id}` | director/admin |
| GET | `/admin/tasks/{id}/progress` | director/admin/manager |

**POST body**
```json
{
  "park_id": "uuid",
  "title": "100 поездок за неделю",
  "description": "Сделай 100 поездок",
  "task_type": "ride_count",
  "target_value": 100,
  "reward_points_type": "park",
  "reward_points": 500,
  "start_date": "2026-08-01T00:00:00Z",
  "end_date": "2026-08-08T23:59:59Z",
  "auto_join": true,
  "status": "active",
  "notify_on_create": false
}
```

Статусы: `draft` → `scheduled` → `active` → `completed`  
Редактирование: на `active` обычно только описание / end_date (см. ограничения бэка).

Экран прогресса: участники, %, выполнили, средний progress.

---

## 9. Admin: Соревнования

| Method | URL |
|--------|-----|
| GET/POST | `/admin/competitions?park_id=` |
| PATCH/DELETE | `/admin/competitions/{id}` |
| GET | `/admin/competitions/{id}/leaderboard` |
| POST | `/admin/competitions/{id}/finalize` |

**POST body**
```json
{
  "park_id": "uuid",
  "title": "Лучший водитель августа",
  "criteria": "max_points",
  "count_points_type": "park",
  "start_date": "2026-08-01T00:00:00Z",
  "end_date": "2026-08-31T23:59:59Z",
  "prize_places": 3,
  "prizes": [
    { "place": 1, "points": 1000 },
    { "place": 2, "points": 500 },
    { "place": 3, "points": 250 }
  ],
  "prize_points_type": "park",
  "status": "active"
}
```

Жизненный цикл:
`draft` → `scheduled` → `active` → `finalizing` → `completed`  
Celery сам стартует/завершает по датам; `finalize` — ручной запуск подведения итогов.

В лидерборде для manager — маскированные имена; для director — можно показывать полнее (если бэк отдаёт маску, не расшифровывайте на клиенте).

---

## 10. Admin: Реферальная программа

`GET /api/v1/admin/referral/settings?park_id=`  
`PUT /api/v1/admin/referral/settings?park_id=`

```json
{
  "is_active": true,
  "rides_required": 50,
  "referrer_bonus": 100,
  "referee_bonus": 50,
  "bonus_points_type": "park",
  "max_referrals": 0,
  "share_text_template": "Присоединяйся! Код {CODE}. Ссылка: {LINK}"
}
```

`GET /api/v1/admin/referral/stats?park_id=` — всего / активировано / баллов выдано / топ рефереров.

---

## 11. Навигация мобильного приложения (рекомендация)

```text
Tab1 Главная     → /driver/dashboard
Tab2 Баллы       → /points/*          (Stage 2)
Tab3 Задания     → /tasks + competitions
Tab4 Награды     → /rewards/*         (Stage 2)
Tab5 Профиль     → /drivers/me + referral + push
```

---

## 12. Checklist приёмки Stage 3 (frontend)

- [ ] Dashboard собирается из одного API  
- [ ] Задания: progress-bar + join  
- [ ] Соревнование: лидерборд + своя строка  
- [ ] ТОП-5: day/week/month, имена «Имя Ф.»  
- [ ] Реферал: copy/share + apply один раз  
- [ ] Admin CRUD заданий/соревнований по ролям  
- [ ] Finalize соревнования доступен admin/director  
- [ ] Referral settings сохраняются и влияют на новых рефералов  

---

*LOTAX Frontend · Stage 3 · Mobile + Admin*
