# LOTAX — Chat (Director LK + Super-admin)

Admin panel chat: **Help (поддержка)** va **ichki chat (директор ↔ менеджер)**.

- Baza URL: `/api/v1`
- Auth: `Authorization: Bearer <admin_jwt>`
- Faqat admin rollar: `director`, `manager`, `super_admin`
- Mobil (`driver`) chat **yo‘q**

**Oxirgi yangilanish:** 2026-09-01

---

## 1. Ikki tur chat

| Tur | `conversation_type` | Kim boshlaydi | Initiator (doimiy) | Receiver (doimiy) |
|-----|---------------------|---------------|--------------------|-------------------|
| **Help / Поддержка** | `support` | Director (Help tugmasi) | Director | Super Admin |
| **Ichki** | `staff` | Director yoki Manager | Director | Manager |

**Muhim:** `initiator` / `receiver` — chat yaratilganda **qotib qoladi**. Request user kim bo‘lishidan qat’i nazar, xabarda `sender_type` shu doimiy rolga qarab beriladi.

| Kim yozdi | `sender_type` |
|-----------|---------------|
| Initiator (odatda director) | `"initiator"` |
| Receiver (super_admin yoki manager) | `"receiver"` |

Qo‘shimcha maydon: `is_mine` — joriy token egasi yuborganmi (`true` / `false`).

---

## 2. UI oqimi

### Director — Help tugmasi

```
[Help] → POST /chat/support → chat ekrani ochiladi
       → GET  /chat/conversations/{id}/messages
       → POST /chat/conversations/{id}/read  (ekranga kirganda)
```

- Bir director uchun **bitta** support chat (qayta bosilsa — xuddi shu chat qaytadi)
- Super admin birinchi marta javob berganda backend uni `receiver` sifatida bog‘laydi

### Director — Manager chat

```
POST /chat/staff  { "manager_id": "<uuid>" }
```

### Manager — Director chat

```
POST /chat/staff  {}
```

`manager_id` **yuborilmasin** — backend avtomatik shu org directorini topadi.

### Super Admin

- Barcha `support` chatlarni ko‘radi
- Ro‘yxat: `GET /chat/conversations`
- Badge: `GET /chat/notifications`

---

## 3. API endpointlar

| Method | Path | Rol | Vazifa |
|--------|------|-----|--------|
| `POST` | `/chat/support` | director | Help chat ochish / olish |
| `POST` | `/chat/staff` | director, manager | Ichki chat ochish / olish |
| `GET` | `/chat/conversations` | director, manager, super_admin | Barcha chatlar |
| `GET` | `/chat/conversations/{id}` | ↑ | Bitta chat |
| `GET` | `/chat/conversations/{id}/messages` | ↑ | Xabarlar |
| `POST` | `/chat/conversations/{id}/messages` | ↑ | Xabar yuborish |
| `POST` | `/chat/conversations/{id}/read` | ↑ | O‘qilgan deb belgilash |
| `GET` | `/chat/notifications` | ↑ | O‘qilmaganlar (badge) |
| `GET` | `/chat/stream` | ↑ | SSE real-time |

---

## 4. Request / Response

### `POST /chat/support`

Body yo‘q.

**Response `ChatConversationResponse`:**

```json
{
  "id": "uuid",
  "conversation_type": "support",
  "organization_id": "uuid",
  "initiator": {
    "id": "uuid",
    "first_name": "Иван",
    "last_name": "Петров",
    "role": "director",
    "email": "director@example.com"
  },
  "receiver": null,
  "unread_count": 0,
  "last_message_preview": null,
  "last_message_at": null,
  "created_at": "2026-09-01T10:00:00Z",
  "my_role": "initiator"
}
```

Super admin uchun `my_role` = `"receiver"`, `receiver` dastlab `null` bo‘lishi mumkin (platforma «Поддержка LOTAX» deb ko‘rsatish).

---

### `POST /chat/staff`

**Director:**

```json
{ "manager_id": "uuid-meneger" }
```

**Manager:**

```json
{}
```

**Response:** xuddi yuqoridagi format, `conversation_type`: `"staff"`, `receiver` — doim to‘ldirilgan.

---

### `GET /chat/conversations/{id}/messages`

Query:

| Param | Default | Ma’nosi |
|-------|---------|---------|
| `limit` | 50 | 1–100 |
| `before_id` | — | Eski xabarlar (scroll up) |
| `after_id` | — | Yangi xabarlar (polling) |

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "body": "Нужна помощь",
      "created_at": "2026-09-01T10:01:00Z",
      "sender_admin_id": "uuid",
      "sender_type": "initiator",
      "sender_name": "Иван Петров",
      "is_mine": true
    }
  ],
  "total": 1,
  "has_more": false
}
```

**`sender_type` misoli (support chat):**

| Request user | Kim yozgan | `sender_type` | `is_mine` |
|--------------|------------|---------------|-----------|
| Director | Director | `initiator` | `true` |
| Director | Super Admin | `receiver` | `false` |
| Super Admin | Director | `initiator` | `false` |
| Super Admin | Super Admin | `receiver` | `true` |

UI: o‘z xabarlari o‘ngda (`is_mine: true`), qarshi tomonda chapda.

---

### `POST /chat/conversations/{id}/messages`

```json
{ "body": "Текст сообщения" }
```

- Min: 1 belgi, max: 10000
- Response — bitta `ChatMessageResponse` (yuqoridagi xabar formati)

---

### `POST /chat/conversations/{id}/read`

Body yo‘q.

```json
{ "message": "ok" }
```

Chat ekraniga kirganda va fokusda bo‘lganda chaqiring — `unread_count` nolga tushadi.

---

### `GET /chat/notifications`

Badge uchun (faqat `unread_count > 0` bo‘lgan chatlar):

```json
{
  "items": [
    {
      "conversation_id": "uuid",
      "conversation_type": "support",
      "unread_count": 3,
      "last_message_preview": "Нужна помощь",
      "last_message_at": "2026-09-01T10:01:00Z",
      "peer_name": "Иван Петров"
    }
  ],
  "total_unread": 3
}
```

---

## 5. Real-time (SSE)

### `GET /chat/stream`

- `Accept: text/event-stream`
- Header: `Authorization: Bearer <token>`
- Ulanish ochiq qoladi; ~25 soniyada `ping` keladi

**Event format** (`data:` qatori JSON):

```json
{
  "event": "message",
  "conversation_id": "uuid",
  "message": { "...ChatMessageResponse..." }
}
```

| `event` | Ma’nosi |
|---------|---------|
| `ping` | Keep-alive (ignore qilish mumkin) |
| `message` | Yangi xabar — chat ochiq bo‘lsa ro‘yxatga qo‘shish |
| `read` | Qarshi tomonda o‘qilgan (ixtiyoriy UI yangilash) |

### Frontend integratsiya (tavsiya)

```text
1. Login → EventSource yoki fetch stream ochish: GET /chat/stream
2. event === "message" →
     - agar shu conversation ochiq → xabarni qo‘shish
     - aks holda → badge +1 (yoki GET /notifications)
3. Chat ekrani → POST /read
4. Fallback: har 10–15s GET /messages?after_id=<oxirgi_id>
5. App yopilganda stream ni yopish
```

**Eslatma:** `EventSource` brauzerda custom header qo‘llab-quvvatlamaydi. Variantlar:
- token query param (backend hozircha qo‘llamaydi) — **tavsiya etilmaydi**
- `fetch` + `ReadableStream` + `Authorization` header
- yoki faqat polling (`after_id`)

---

## 6. UI matnlar (ruscha)

| Joy | Matn |
|-----|------|
| Director Help tugmasi | `Помощь` / `Поддержка` |
| Super admin ro‘yxat | `Обращения директоров` |
| Staff chat | `Чат с менеджером` / `Чат с директором` |
| Receiver null (support) | `Поддержка LOTAX` |
| Input placeholder | `Введите сообщение…` |
| Bo‘sh chat | `Нет сообщений. Напишите первым.` |
| Badge | `total_unread` soni |

---

## 7. Xatolar

| Kod | Sabab |
|-----|--------|
| 401 | Token yo‘q / eskirgan |
| 403 | Rol (masalan manager `/support` chaqira olmaydi) |
| 404 | Chat yoki admin topilmadi |
| 422 | Bo‘sh xabar, director `staff` da `manager_id` bermagan |

---

## 8. Checklist (frontend)

### Director LK

- [ ] Help tugmasi → `POST /chat/support`
- [ ] Chat ro‘yxati / oyna
- [ ] Xabarlar: `sender_type` + `is_mine` bo‘yicha joylash
- [ ] Scroll up → `before_id`
- [ ] Chat ochilganda → `POST /read`
- [ ] Manager bilan chat → `POST /chat/staff`

### Manager LK

- [ ] Director bilan chat → `POST /chat/staff` (body bo‘sh)
- [ ] Help tugmasi **yo‘q** (403)

### Super-admin

- [ ] Support chatlar ro‘yxati
- [ ] Javob berish
- [ ] Badge (`/notifications`)
- [ ] SSE yoki polling

### Umumiy

- [ ] JWT bilan barcha `/chat/*` so‘rovlar
- [ ] Real-time: SSE stream yoki `after_id` polling
- [ ] Logout da stream yopish

---

## 9. Swagger

Swagger UI da tag: **«Чат (Директор, Менеджер, Супер-админ)»**

Savollar: backend jamoa.
