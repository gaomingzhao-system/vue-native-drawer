<script setup vapor lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <article class="card">
    <h2 class="card-title">{{ title }}</h2>
    <p class="card-description">{{ description }}</p>
    <div class="card-actions">
      <slot />
    </div>
  </article>
</template>
