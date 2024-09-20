import { defineNuxtPlugin } from '#app';
import { createVuetify } from 'vuetify';
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'dark',
    },
  });

  nuxtApp.vueApp.use(vuetify);
});
