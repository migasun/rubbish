<template>
  <v-list-item
    :href="link"
    target="_blank"
    link
  >
    <template v-slot:prepend v-if="icon">
      <v-icon :icon="icon"></v-icon>
    </template>
    <v-list-item-title>{{ title }}</v-list-item-title>
    <v-list-item-subtitle>{{ caption }}</v-list-item-subtitle>
  </v-list-item>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'EssentialLink',
  props: {
    title: {
      type: String,
      required: true
    },

    caption: {
      type: String,
      default: ''
    },

    link: {
      type: String,
      default: '#'
    },

    icon: {
      type: String,
      default: ''
    }
  }
})
</script>
