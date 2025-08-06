<script setup>
import TitleBar from './components/TitleBar.vue'
import { ref } from 'vue'

const appTitle = ref('MistNote')
</script>

<template>
  <div class="app-container">
    <!-- 自定义标题栏 -->
    <TitleBar :title="appTitle" />

    <!-- 路由视图 -->
    <router-view />
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}
</style>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

#app {
  height: 100vh;
}
</style>
