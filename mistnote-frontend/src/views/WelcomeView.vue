<template>
  <div class="welcome-view">
    <div class="welcome-content">
      <h1>欢迎使用 MistNote</h1>
      <p>即时通讯软件正在开发中...</p>

      <!-- 临时测试内容 -->
      <div class="test-controls">
        <button @click="testMinimize">测试最小化</button>
        <button @click="testMaximize">测试最大化</button>
        <button @click="changeTitle">更改标题</button>
        <button @click="goToChat" class="primary-btn">进入聊天</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// 测试方法
const testMinimize = () => {
  if (window.electronAPI) {
    window.electronAPI.minimize()
  }
}

const testMaximize = () => {
  if (window.electronAPI) {
    window.electronAPI.maximize()
  }
}

const changeTitle = () => {
  if (window.electronAPI) {
    window.electronAPI.setTitle('MistNote - 标题已更改')
  }
}

const goToChat = () => {
  router.push('/chat')
}
</script>

<style scoped>
.welcome-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.welcome-content {
  text-align: center;
  padding: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.welcome-content h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 300;
}

.welcome-content p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.test-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.test-controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.test-controls button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.primary-btn {
  background: #1890ff !important;
  border-color: #1890ff !important;
  font-weight: 500;
}

.primary-btn:hover {
  background: #40a9ff !important;
  border-color: #40a9ff !important;
}
</style>
