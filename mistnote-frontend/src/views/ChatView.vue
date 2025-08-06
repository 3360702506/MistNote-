<template>
  <div class="chat-view">
    <!-- 左侧边栏 -->
    <Sidebar />

    <!-- 聊天列表 -->
    <ChatList @chat-select="handleChatSelect" />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 聊天窗口 -->
      <ChatWindow
        v-if="selectedChatId"
        :contact-name="getSelectedChatName()"
        :is-online="getSelectedChatOnlineStatus()"
      />

      <!-- 占位符 -->
      <div v-else class="chat-placeholder-container">
        <div class="chat-placeholder-header">
          <h2>选择一个聊天开始对话</h2>
          <button @click="goBack" class="back-btn">返回首页</button>
        </div>
        <div class="chat-placeholder">
          <div class="placeholder-icon">💬</div>
          <p>请从左侧选择一个聊天开始对话</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import ChatList from '../components/ChatList.vue'
import ChatWindow from '../components/ChatWindow.vue'

const router = useRouter()
const selectedChatId = ref(null)

const goBack = () => {
  router.push('/')
}

const handleChatSelect = (chatId) => {
  selectedChatId.value = chatId
}

// 模拟聊天数据
const chatData = {
  1: { name: '谢智贤', isOnline: true },
  2: { name: '张三', isOnline: false },
  3: { name: '李四', isOnline: true },
  4: { name: '王五', isOnline: false }
}

const getSelectedChatName = () => {
  return chatData[selectedChatId.value]?.name || '未知联系人'
}

const getSelectedChatOnlineStatus = () => {
  return chatData[selectedChatId.value]?.isOnline || false
}
</script>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  height: 100%;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-placeholder-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-placeholder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.chat-placeholder-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: white;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.back-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.chat-placeholder p {
  font-size: 16px;
  margin: 0;
}
</style>
