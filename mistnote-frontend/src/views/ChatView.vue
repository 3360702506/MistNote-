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
        v-if="selectedChatId && selectedChatData"
        :contact-id="selectedChatData.userId || selectedChatData.id"
        :contact-name="selectedChatData.name"
        :contact-avatar="selectedChatData.avatar"
        :is-online="selectedChatData.online"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import ChatList from '../components/ChatList.vue'
import ChatWindow from '../components/ChatWindow.vue'
import avatarCacheService from '@/services/avatarCacheService'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const selectedChatId = ref(null)
const selectedChatData = ref(null)

const goBack = () => {
  router.push('/')
}

const handleChatSelect = (chatData) => {
  console.log('选择聊天:', chatData)
  selectedChatId.value = chatData.id
  selectedChatData.value = chatData
}

// 全局预加载所有好友头像
const preloadAllAvatars = async () => {
  try {
    console.log('开始全局预加载头像...')
    const response = await fetch('http://localhost:5000/api/friends', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        const friendIds = data.data.map(friend => friend.userId || friend._id).filter(Boolean)
        console.log(`预加载 ${friendIds.length} 个好友的头像`)
        await avatarCacheService.preloadAvatars(friendIds)
        console.log('头像预加载完成')
      }
    }
  } catch (error) {
    console.error('全局头像预加载失败:', error)
  }
}

// 在组件挂载时立即开始预加载头像
onMounted(() => {
  console.log('ChatView 已挂载，开始全局头像预加载')
  preloadAllAvatars()
})

// 注意：现在使用真实的聊天数据，不再需要模拟数据
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
