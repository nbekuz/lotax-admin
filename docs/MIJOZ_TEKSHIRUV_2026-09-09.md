# Admin panel — bugungi o‘zgarishlar (tekshiruv)

**Sana:** 2026-09-09  
**Kim uchun:** mijoz / QA  
**Maqsad:** faqat o‘zgargan sahifalarni tekshirish

---

## Platforma (super_admin / admin)

| Sahifa | Menu | Nima o‘zgardi | Nima tekshirish |
|--------|------|---------------|-----------------|
| **Organizatsiyalar** | Организации | Telefon, kontakt shaxs, statistika (parklar / haydovchilar / safarlar) | Ro‘yxatda 3 ta raqam + kontakt ko‘rinsin. Yangi org yaratishda telefon va kontakt to‘ldirilsin. |
| **Organizatsiya kartochkasi** | Организации → ochish | Kontakt maydonlari, KPI kartalar, o‘chirish | Tahrir: telefon + kontakt. Faqat **super_admin** da «Удалить» (org va park). Platforma **admin** da Delete **yo‘q**, qo‘shish/tahrir **bor**. |

> Platforma `admin` = super-admin layout (org/park). Direktor paneliga o‘xshamasligi kerak.

---

## Park LК (director / manager)

### 1. Водители
- **Menu:** Водители  
- **O‘zgarish:** to‘liq ism, familiya, telefon (maskasiz)  
- **Tekshiruv:**
  - Jadvalda «Имя», «Фамилия», «Телефон» ochiq (masalan `Иван`, `+7900…`)
  - `И***` / `+7(9**)***` ko‘rinmasin
  - Kartochkada ham to‘liq FIO va telefon

### 2. Карточка водителя
- **Menu:** Водители → haydovchi  
- **O‘zgarish:** ball tuzatish faqat **park**; pending → aktivatsiya  
- **Tekshiruv:**
  - «Изменить баланс» — faqat парковые (system tanlash yo‘q)
  - Status `Ожидает активации` bo‘lsa — «Активировать» tugmasi

### 3. Награды парка
- **Menu:** Награды  
- **O‘zgarish:** faqat park ball; ikonka dropdown  
- **Tekshiruv:**
  - System / park tanlash **yo‘q** (yozuv: парковые баллы)
  - «Иконка» dropdown — katalogdan tanlash, preview
  - Ro‘yxatda ikonka rasmi + nomi
  - Katta rasm (`Изображение`) — alohida, ikonkadan farq qiladi

### 4. Иконки наград *(yangi / yangilangan)*
- **Menu:** Иконки  
- **O‘zgarish:** org katalogi — SVG / PNG / JPG  
- **Tekshiruv:**
  - Director: qo‘shish, tahrir, o‘chirish
  - Manager: faqat ko‘rish
  - Nom + fayl yuklash; noto‘g‘ri formatda xato

### 5. Заявки на награды
- **Menu:** Заявки  
- **O‘zgarish:** birinchi ochilishda **все парки** (park tanlanmagan)  
- **Tekshiruv:**
  - Filtr default: «Все парки» + «Все статусы»
  - Haydovchi FIO va telefon ochiq
  - Park nomi ko‘rinsin (фильтр «Все парки» da)

### 6. Задания
- **Menu:** Задания *(alohida «Шаблоны» yo‘q)*  
- **O‘zgarish:** bitta ekran — default + o‘z vazifalar  
- **Tekshiruv:**
  - Yuqorida «По умолчанию»: slider вкл/выкл
  - «Изменить» — buyurtmalar soni **va** ballar (o‘chirmasdan)
  - Pastida «Свои задания» — faqat qo‘lda yaratilganlar (template dublikati yo‘q)
  - Ball faqat парковые

### 7. Прогресс задания
- **Menu:** Задания → Прогресс  
- **Tekshiruv:** `auto_join` bo‘lsa 0 progressli haydovchilar ham chiqadi (bo‘sh tab bo‘lmasin)

### 8. ТОП-5
- **Menu:** ТОП-5 / leaderboard sozlamalari  
- **O‘zgarish:** «Показывать названия парков» slider  
- **Tekshiruv:**
  - Slider yoqiladi/o‘chiriladi, saqlanadi
  - Metrка — **поездки** (ball emas)

### 9. Соревнования → Лидерборд
- **Menu:** Соревнования → Лидерборд  
- **Tekshiruv:** ustun **Поездки** (ball emas)

### 10. Уровни (darajalar)
- **Menu:** Уровни  
- **Tekshiruv:** saqlagandan keyin ekranda GET dagi `rides` / `rides_threshold` qayta chiqsin (eski qiymat «yopishib» qolmasin)

### 11. Организация (direktor)
- **Menu:** Организация  
- **Tekshiruv:** kontakt / telefon (agar API bersa) + parklar / haydovchilar / safarlar statistikasi

---

## Tez checklist (mijoz)

```
[ ] Организации — kontakt + 3 ta stat
[ ] Org kartochka — Delete faqat super_admin
[ ] Platform admin — Delete yo‘q, Add bor
[ ] Водители — ochiq FIO + telefon
[ ] Водитель — adjust faqat park; Активировать
[ ] Награды — park ball + Иконка dropdown
[ ] Иконки — yuklash SVG/PNG/JPG
[ ] Заявки — default Все парки
[ ] Задания — bitta ekran, slider + Изменить (maqsad+ball)
[ ] ТОП-5 — slider «названия парков»
[ ] Лидерборд мусобақа — поездки
[ ] Уровни — saqlash → qiymatlar to‘g‘ri qaytadi
```

---

## Kim qaysi rol bilan

| Rol | Qayerga kiradi |
|-----|----------------|
| `super_admin` | Platforma: org/park + Delete |
| `admin` (platform) | Platforma: org/park, **Delete yo‘q** |
| `director` | Park LК: barcha tahrir |
| `manager` | Park LК: ko‘rish + заявки; ikonka/nagrada yozish yo‘q |

---

## Eslatma

- Mobil (haydovchi app): oy safarlari plashkasi, ikonka katalog — bu hujjat **faqat admin panel**.
- Liniyadagi soat → tizim ball — backend keyingi etap, bu sprintda yo‘q.
