<script setup vapor lang="ts">
import DirectionsDemo from './demos/DirectionsDemo.vue'
import FadeDemo from './demos/FadeDemo.vue'
import FitDemo from './demos/FitDemo.vue'
import LockedDemo from './demos/LockedDemo.vue'
import NestedDemo from './demos/NestedDemo.vue'
import NonModalDemo from './demos/NonModalDemo.vue'
import ScaleDemo from './demos/ScaleDemo.vue'
import SnapPointsDemo from './demos/SnapPointsDemo.vue'
</script>

<template>
  <main class="page">
    <header class="hero">
      <span class="eyebrow">Vue 3.6 · Vapor mode</span>
      <h1>vue-native-drawer</h1>
      <p>
        A drawer that moves like an iOS sheet: snap points, momentum, rubber banding and the card
        stack, all in one flat component written in plain TypeScript and CSS.
      </p>
      <pre class="snippet"><code>&lt;Drawer v-model:open="open"&gt;…&lt;/Drawer&gt;</code></pre>
    </header>

    <section class="grid">
      <SnapPointsDemo />
      <FitDemo />
      <ScaleDemo />
      <NonModalDemo />
      <DirectionsDemo />
      <NestedDemo />
      <LockedDemo />
      <FadeDemo />
    </section>

    <footer class="credits">
      <a href="https://github.com/gaomingzhao-system/vue-native-drawer">GitHub</a>
      · Built with Vue Vapor, VueUse and plain CSS.
    </footer>
  </main>
</template>
