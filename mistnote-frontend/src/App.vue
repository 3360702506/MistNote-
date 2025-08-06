<script setup>
import TitleBar from './components/TitleBar.vue'
import LoginWindow from './views/LoginWindow.vue'
import { NMessageProvider } from 'naive-ui'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/user'

const router = useRouter()
const userStore = useUserStore()
const appTitle = ref('MistNote')

// 检查是否是登录窗口
const isLoginWindow = ref(false)

// 检查URL参数来决定显示哪个界面
const checkWindowType = async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const page = urlParams.get('page')
  
  if (page === 'login') {
    isLoginWindow.value = true
  } else {
    isLoginWindow.value = false
    
    // 如果不是登录窗口，尝试恢复用户状态
    console.log('主窗口启动，尝试恢复用户状态...')
    try {
      await userStore.restoreUserFromStorage()
      console.log('用户状态恢复成功:', userStore.user)
    } catch (error) {
      console.error('用户状态恢复失败:', error)
    }
    
    // 导航到聊天页面
    router.push('/chat')
  }
}

onMounted(() => {
  checkWindowType()
})
</script>

<template>
  <n-message-provider>
    <!-- 登录窗口 -->
    <LoginWindow v-if="isLoginWindow" />
    
    <!-- 主应用窗口 -->
    <div v-else class="app-container">
      <!-- 自定义标题栏 -->
      <TitleBar :title="appTitle" />

      <!-- 路由视图 -->
      <router-view />
    </div>
  </n-message-provider>
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
