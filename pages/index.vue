<!--pages/index.vue-->

<template>
  <v-container class="d-flex justify-center">
    <v-col cols="12" sm="8" md="6">
      <h1>Генерация документов</h1>
      <!-- Форма для ввода данных -->
      <v-form @submit.prevent="startGeneration">
        <!-- Поле ввода для ключа -->
        <v-text-field variant="solo-inverted" v-model="serviceAccountKeyPath" label="Ключ Service Account" />

        <!-- Поле ввода для ID папки -->
        <v-text-field variant="solo-inverted" v-model="folderId" label="ID папки Google Drive" />

        <!-- Поле ввода для XMLRiver URL -->
        <v-text-field variant="solo-inverted" v-model="xmlriverUrl" label="XMLRiver URL" />

        <!-- Поле ввода для тем с кнопкой копирования примера -->
        <v-btn @click="copyExample" color="primary" style="margin-bottom: 20px">Скопировать пример</v-btn>
        <v-textarea variant="solo-inverted" v-model="topics" label="Темы" rows="6" placeholder="Введите темы построчно"></v-textarea>

        <v-btn type="submit" color="primary">Начать генерацию</v-btn>
      </v-form>

      <!-- Кнопка для сохранения введённых данных, находится вне формы -->
      <v-btn @click.prevent="saveConfig" color="success" class="mt-4">Сохранить настройки</v-btn>

      <div class="pa-4">
        <ul>
          <li>Вводи темы построчно в формате «ВЧ-информационный запрос: желаемый h2 заголовок 1, желаемый h2 заголовок 2 и т.д.».</li>
          <li>Пример:<br>
            Какую породу кошки выбрать: лучшие породы кошек, как порода влияет на поведение, советы по выбору кошки от эксперта
          </li>
          <li>Двоеточие и запятые с пробелом обязательны, это разделители.</li>
        </ul>
      </div>

      <!-- Индикатор загрузки -->
      <v-progress-circular v-if="loading" indeterminate color="primary" />

      <!-- Отображение прогресса и ссылок -->
      <div v-if="tasks.length > 0" class="mt-4">
        <h2>Прогресс генерации:</h2>
        <v-list>
          <v-list-item v-for="(task, index) in tasks" :key="index">
            <v-list-item-content>
              <v-list-item-title>{{ task.topic }}</v-list-item-title>
              <v-progress-linear :value="task.progress" color="primary"></v-progress-linear>
              <div v-if="task.link">
                <a :href="task.link" target="_blank">Открыть документ</a>
              </div>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </div>

      <!-- Уведомление о копировании примера -->
      <!-- ... -->
    </v-col>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return {
      serviceAccountKeyPath: '',  // Ключ из конфига
      folderId: '',  // ID папки из конфига
      xmlriverUrl: '',  // XMLRiver URL
      topics: '',  // Темы для генерации
      loading: false,  // Флаг загрузки
      tasks: [] as { topic: string; progress: number; link: string }[],  // Задачи генерации
      exampleText: 'Какую породу кошки выбрать: лучшие породы кошек, как порода влияет на поведение, советы по выбору кошки от эксперта',  // Пример для копирования
      snackbarVisible: false,  // Видимость snackbar
      snackbarMessage: ''  // Сообщение snackbar
    };
  },
  async mounted() {
    try {
      const config = await $fetch<{ folder_id: string; service_account_key_path: string; xmlriver_url: string }>('http://localhost:3001/api/config');

      if (config) {
        this.serviceAccountKeyPath = config.service_account_key_path;
        this.folderId = config.folder_id;
        this.xmlriverUrl = config.xmlriver_url;
      }
    } catch (err) {
      console.error('Ошибка при загрузке конфигурации:', err);
    }
  },
  methods: {
    async startGeneration() {
      this.loading = true;
      const topicsArray = this.topics.split('\n').filter(t => t.trim() !== '');

      for (let i = 0; i < topicsArray.length; i++) {
        const topic = topicsArray[i];
        try {
          const { title, h2s } = this.parseTopic(topic);
          this.tasks.push({ topic: title, progress: 0, link: '' });

          // Обновляем прогресс
          this.tasks[i].progress = 10;

          // Отправляем данные на сервер для создания документа
          const response = await this.createDocument(title, h2s);

          // Обновляем прогресс и добавляем ссылку
          this.tasks[i].progress = 100;
          this.tasks[i].link = response.link;

          this.showSnackbar(`Документ "${title}" успешно создан.`);
        } catch (error: any) {
          console.error(`Ошибка при обработке темы "${topic}":`, error);
          this.showSnackbar(`Ошибка при обработке темы "${topic}": ${error.message}`);
        }
      }

      this.loading = false;
    },

    parseTopic(topic: string) {
      const [titlePart, h2Part] = topic.split(':').map(part => part.trim());
      if (!titlePart) {
        throw new Error('Не найден заголовок H1 до двоеточия.');
      }

      const h2s = h2Part ? h2Part.split(/[;,]/).map(h2 => h2.trim()).filter(h2 => h2 !== '') : [];

      return { title: titlePart, h2s };
    },

    async createDocument(title: string, h2s: string[]) {
      // Отправляем запрос на сервер для создания документа
      const response = await $fetch('http://localhost:3001/api/create-document', {
        method: 'POST',
        body: { title, h2s },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response;
    },

    // Метод для сохранения введённых данных
    async saveConfig() {
      try {
        const response = await $fetch('http://localhost:3001/api/save-config', {
          method: 'POST',
          body: {
            service_account_key_path: this.serviceAccountKeyPath,
            folder_id: this.folderId,
            xmlriver_url: this.xmlriverUrl
          },
        });

        console.log('Ответ сервера:', response);
        this.showSnackbar('Настройки успешно сохранены!');
      } catch (err) {
        console.error('Ошибка при сохранении настроек:', err);
        this.showSnackbar('Произошла ошибка при сохранении настроек.');
      }
    },

    // Метод для копирования примера в буфер обмена
    copyExample() {
      try {
        navigator.clipboard.writeText(this.exampleText);
        this.showSnackbar('Пример успешно скопирован в буфер обмена!');
      } catch (err) {
        console.error('Ошибка при копировании примера:', err);
        this.showSnackbar('Не удалось скопировать пример.');
      }
    },

    // Метод для отображения snackbar
    showSnackbar(message: string) {
      this.snackbarMessage = message;
      this.snackbarVisible = true;
    }
  },
});
</script>

<style scoped>
.v-container {
  min-height: 100vh;
  align-items: center;
  justify-content: center;
}
</style>
