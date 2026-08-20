<script setup lang="ts">
import LegalLayout from '@/layouts/LegalLayout.vue'
</script>

<template>
  <LegalLayout>
    <article class="legal-doc">
      <h1 class="lotax-page-title">Политика конфиденциальности</h1>
      <p class="lotax-caption mt-2">Lotax · редакция от 20.08.2026</p>

      <section class="mt-8 space-y-4 text-[15px] leading-relaxed text-ink">
        <p>
          Настоящая Политика описывает, какие данные обрабатывает сервис
          <strong>Lotax</strong> (мобильное приложение для водителей и личный кабинет
          парка) и как мы их защищаем.
        </p>

        <h2 class="text-[18px] font-semibold">1. Оператор</h2>
        <p>
          Оператор платформы Lotax. По вопросам персональных данных:
          <a class="text-brand underline" href="mailto:privacy@lotax.ru">privacy@lotax.ru</a>.
        </p>

        <h2 id="security" class="text-[18px] font-semibold">2. Какие данные собираем</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>номер телефона и код подтверждения входа (SMS);</li>
          <li>профиль водителя (ФИО, данные парка, идентификаторы Яндекс.Таксопарк);</li>
          <li>поездки, баллы лояльности, заказы наград, реферальный код;</li>
          <li>токен устройства для push-уведомлений;</li>
          <li>технические журналы запросов (IP, время, ошибки API).</li>
        </ul>

        <h2 class="text-[18px] font-semibold">3. Цели обработки</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>авторизация и безопасность аккаунта;</li>
          <li>начисление баллов, задания, соревнования, каталог наград;</li>
          <li>синхронизация поездок с таксопарком;</li>
          <li>уведомления о заданиях, балансе и статусах заявок;</li>
          <li>поддержка и предотвращение злоупотреблений.</li>
        </ul>

        <h2 class="text-[18px] font-semibold">4. Передача третьим лицам</h2>
        <p>
          Данные могут передаваться провайдерам SMS, Firebase Cloud Messaging,
          хостингу API и таксопарку (в рамках интеграции Яндекс), строго для
          работы сервиса. Мы не продаём персональные данные.
        </p>

        <h2 class="text-[18px] font-semibold">5. Хранение и защита</h2>
        <p>
          Доступ к полным ПДн в админ-панели ограничен ролью директора парка и
          аудируется. Токены хранятся в защищённом хранилище устройства.
          Соединение с API выполняется по HTTPS.
        </p>

        <h2 class="text-[18px] font-semibold">6. Права пользователя</h2>
        <p>
          Вы можете запросить уточнение, ограничение обработки или удаление
          аккаунта, обратившись в поддержку парка или на
          <a class="text-brand underline" href="mailto:privacy@lotax.ru">privacy@lotax.ru</a>.
        </p>

        <h2 class="text-[18px] font-semibold">7. Изменения</h2>
        <p>
          Актуальная версия всегда доступна по адресу
          <code class="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">/privacy</code>.
          Продолжая пользоваться приложением, вы подтверждаете согласие с
          этой Политикой.
        </p>
      </section>
    </article>
  </LegalLayout>
</template>
