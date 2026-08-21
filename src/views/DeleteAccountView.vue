<script setup lang="ts">
import LegalLayout from '@/layouts/LegalLayout.vue'
</script>

<template>
  <LegalLayout>
    <article class="legal-doc">
      <h1 class="lotax-page-title">Удаление аккаунта</h1>
      <p class="lotax-caption mt-2">Lotax · инструкция для водителей</p>

      <section class="mt-8 space-y-4 text-[15px] leading-relaxed text-ink">
        <p>
          Вы можете
          <strong>удалить свой аккаунт Lotax прямо в мобильном приложении</strong>.
          Отдельная веб-форма для этого не требуется.
        </p>

        <h2 class="text-[18px] font-semibold">Как удалить аккаунт в приложении</h2>
        <ol class="list-decimal space-y-2 pl-5">
          <li>Откройте приложение <strong>Lotax</strong> и войдите в аккаунт.</li>
          <li>Перейдите в раздел <strong>Профиль</strong> → <strong>Настройки</strong>.</li>
          <li>Нажмите <strong>«Удалить аккаунт»</strong>.</li>
          <li>Подтвердите удаление в диалоговом окне.</li>
        </ol>

        <h2 class="text-[18px] font-semibold">Что произойдёт после удаления</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>доступ в приложение по этому номеру телефона будет закрыт;</li>
          <li>профиль водителя и связанные данные лояльности будут удалены или обезличены
            в сроки, предусмотренные политикой конфиденциальности;</li>
          <li>активные заявки на награды могут быть отменены.</li>
        </ul>

        <h2 class="text-[18px] font-semibold">Важно</h2>
        <p>
          Удаление аккаунта необратимо. Баллы и история поездок в Lotax будут недоступны.
          Данные, хранящиеся у вашего таксопарка вне платформы Lotax, регулируются
          правилами парка.
        </p>

        <h2 class="text-[18px] font-semibold">Нужна помощь?</h2>
        <p>
          Если кнопка недоступна или возникла ошибка, откройте
          <a class="text-brand underline" href="/help">помощь</a>
          или напишите:
          <a class="text-brand underline" href="mailto:support@lotax.ru">support@lotax.ru</a>
          . Тема письма: «Удаление аккаунта Lotax» и укажите номер телефона из приложения.
        </p>

        <p class="lotax-caption pt-2">
          См. также
          <a class="text-brand underline" href="/privacy">политику конфиденциальности</a>.
        </p>
      </section>
    </article>
  </LegalLayout>
</template>
