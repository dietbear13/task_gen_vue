<template>
  <v-container>
    <h2>{{ topic }}</h2>
    <v-progress-linear :value="progress" height="15" color="green">
      <strong>{{ progress }}%</strong>
    </v-progress-linear>
  </v-container>
</template>

<script>
export default {
  props: {
    topic: String,
    progress: Number,
  },
};
</script>
