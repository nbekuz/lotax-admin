<script setup lang="ts">
import LegalLayout from '@/layouts/LegalLayout.vue'
</script>

<template>
  <LegalLayout>
    <article class="legal-doc">
      <h1 class="lotax-page-title">Помощь</h1>
      <p class="lotax-caption mt-2">Lotax · ответы для водителей</p>

      <section class="mt-8 space-y-4 text-[15px] leading-relaxed text-ink">
        <p>
          <strong>Lotax</strong> — программа лояльности таксопарка: баллы, задания,
          соревнования и награды. Это не приложение для заказа такси.
        </p>

        <h2 class="text-[18px] font-semibold">Вход</h2>
        <ol class="list-decimal space-y-2 pl-5">
          <li>Откройте приложение и введите номер телефона, привязанный к парку.</li>
          <li>Введите код из SMS. Если код не пришёл, подождите минуту и запросите снова.</li>
        </ol>
        <p>
          Если вход не проходит — обратитесь к директору парка: номер должен быть
          в системе Lotax.
        </p>

        <h2 class="text-[18px] font-semibold">Баллы и уровень</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>
            <strong>Системные баллы LOTAX</strong> начисляются за часы на линии
            (ставка и дневной лимит задаёт платформа). Если Яндекс не отдаёт
            «время на линии», система оценивает часы по заказам —
            в истории может быть пометка «оценка по заказам».
          </li>
          <li>
            <strong>Баллы парка</strong> — за выполненные поездки по правилам
            вашего таксопарка. Коэффициент уровня умножает только парковые баллы.
          </li>
          <li>
            В списке поездок приложения учитываются только поездки с начислением
            парковых баллов (отменённые не показываются).
          </li>
          <li>
            Если у парка статусы выключены, блок уровня в приложении скрыт.
          </li>
        </ul>

        <h2 class="text-[18px] font-semibold">Задания, ТОП-5 и награды</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Вы видите только задания, турниры и награды, доступные вашему парку.</li>
          <li>Рейтинг ТОП-5 считается по поездкам, без переключения «мой парк / все».</li>
          <li>
            Награду из каталога можно заказать, если хватает баллов и есть запас.
            Купон на розыгрыш с лимитом «один на водителя» повторно купить нельзя.
          </li>
        </ul>

        <h2 class="text-[18px] font-semibold">Удаление аккаунта</h2>
        <p>
          Профиль → Настройки → «Удалить аккаунт». Подробнее:
          <a class="text-brand underline" href="/delete-account">инструкция</a>.
        </p>

        <h2 class="text-[18px] font-semibold">Связаться с нами</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>
            Поддержка сервиса:
            <a class="text-brand underline" href="mailto:support@lotax.ru">support@lotax.ru</a>
          </li>
          <li>
            Персональные данные:
            <a class="text-brand underline" href="mailto:privacy@lotax.ru">privacy@lotax.ru</a>
          </li>
          <li>Правила парка, баллы и награды парка — у директора вашего таксопарка.</li>
        </ul>
        <p>
          В письме укажите номер телефона из приложения и кратко опишите проблему.
        </p>
      </section>
    </article>
  </LegalLayout>
</template>
