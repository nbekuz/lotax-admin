# Lotax Admin

Админ-панель для **Lotax** (Vue 3 · Ant Design Vue · Tailwind · Pinia · Axios).

API: см. [../docs/MOBILE_API.md](../docs/MOBILE_API.md)

## Стек

- Vue 3 + TypeScript + Vite
- Ant Design Vue 4
- Tailwind CSS 3
- Pinia
- Axios (JWT + refresh)
- Vue Router

## Возможности (Phase 1)

| Роль | Возможности |
|------|-------------|
| `director` | Водители, ПДн, баланс, статус, sync |
| `admin` | Водители, баланс, статус, sync |
| `manager` | Водители, баланс |

## Запуск

```bash
cd admin
npm install
npm run dev
```

Откроется `http://localhost:5173`.

В dev режиме Vite проксирует `/api` на production host (см. `vite.config.ts`).  
Для прямого URL задайте `VITE_API_BASE_URL` в `.env`.

## Сборка

```bash
npm run build
npm run preview
```

## Auth flow

1. `POST /api/v1/auth/admin/login`
2. Токены в `localStorage`
3. `GET /api/v1/auth/me/admin`
4. При 401 → `POST /api/v1/auth/refresh`
