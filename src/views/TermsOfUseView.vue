<script setup lang="ts">
import LegalLayout from '@/layouts/LegalLayout.vue'
</script>

<template>
  <LegalLayout>
    <article class="legal-doc">
      <h1 class="lotax-page-title">Условия использования</h1>
      <p class="lotax-caption mt-2">Lotax · редакция от 20.08.2026</p>

      <section class="mt-8 space-y-4 text-[15px] leading-relaxed text-ink">
        <p>
          Настоящие Условия регулируют использование мобильного приложения
          <strong>Lotax</strong> водителями таксопарков и связанного личного кабинета.
        </p>

        <h2 class="text-[18px] font-semibold">1. Сервис</h2>
        <p>
          Lotax — платформа лояльности: баллы, задания, соревнования, награды и
          уведомления. Сервис предоставляется «как есть» в рамках договора с
          вашим таксопарком.
        </p>

        <h2 class="text-[18px] font-semibold">2. Аккаунт</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>вход выполняется по номеру телефона и SMS-коду;</li>
          <li>вы обязаны указывать достоверные данные и не передавать доступ третьим лицам;</li>
          <li>парк или оператор могут ограничить доступ при нарушении правил.</li>
        </ul>

        <h2 class="text-[18px] font-semibold">3. Баллы и награды</h2>
        <p>
          Баллы начисляются по правилам парка и платформы. Заявки на награды
          модерируются. Парк вправе изменить правила, пороги уровней и каталог
          с предварительным уведомлением в приложении или ЛК.
        </p>

        <h2 class="text-[18px] font-semibold">4. Запрещённые действия</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>обход ограничений, накрутка поездок или баллов;</li>
          <li>попытки несанкционированного доступа к API или чужим данным;</li>
          <li>использование сервиса в целях, противоречащих закону РФ.</li>
        </ul>

        <h2 class="text-[18px] font-semibold">5. Ответственность</h2>
        <p>
          Lotax не является стороной трудовых или гражданских отношений между
          водителем и таксопарком. Мы не несём ответственность за сбои сторонних
          сервисов (SMS, Яндекс.Таксопарк, магазины приложений), если иное не
          предусмотрено договором.
        </p>

        <h2 class="text-[18px] font-semibold">6. Изменения условий</h2>
        <p>
          Актуальная версия:
          <code class="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">/termofuse</code>.
          Существенные изменения могут сопровождаться уведомлением в приложении.
        </p>

        <h2 class="text-[18px] font-semibold">7. Контакты</h2>
        <p>
          Вопросы по сервису:
          <a class="text-brand underline" href="mailto:support@lotax.ru">support@lotax.ru</a>.
        </p>
      </section>
    </article>
  </LegalLayout>
</template>
