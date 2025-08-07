<template>
  <div class="friend-notification-container">
    <div class="header">
      <h2>好友通知</h2>
    </div>
    
    <div class="notification-list">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="requests.length === 0" class="empty-state">
        <p class="empty-text">暂无新的好友通知</p>
      </div>

      <!-- 通知列表 -->
      <div v-else class="requests-container">
        <div v-for="request in requests" :key="request._id" class="notification-item">
          <div class="item-avatar">
            <img :src="request.sender?.profile?.avatar || '/default-avatar.png'" 
                 :alt="request.sender?.profile?.displayName || '用户'" />
          </div>
          
          <div class="item-content">
            <div class="item-info">
              <span class="user-name">
                {{ request.sender?.profile?.displayName || request.sender?.username || '未知用户' }}
              </span>
              <span class="request-text">请求加为好友</span>
              <span class="request-time">{{ formatTime(request.createdAt) }}</span>
            </div>
          </div>

          <div class="item-actions">
            <button 
              v-if="request.status === 'pending'"
              class="btn-action btn-accept" 
              @click.stop="handleResponse(request._id, 'accept')"
              :disabled="processingRequests.has(request._id)"
            >
              同意
            </button>
            <button 
              v-if="request.status === 'pending'"
              class="btn-action btn-reject" 
              @click.stop="handleResponse(request._id, 'reject')"
              :disabled="processingRequests.has(request._id)"
            >
              拒绝
            </button>
            <span v-if="request.status === 'accepted'" class="status-text accepted">
              已同意
            </span>
            <span v-if="request.status === 'rejected'" class="status-text rejected">
              已拒绝
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineEmits } from 'vue'
import { useUserStore } from '@/stores/user'

const requests = ref([])
const loading = ref(false)
const messageEl = ref(null)
const processingRequests = ref(new Set()) // 正在处理的请求ID集合
const lastFetchTime = ref(0) // 上次请求时间
const FETCH_COOLDOWN = 2000 // 请求冷却时间（毫秒）
const userStore = useUserStore()
const emit = defineEmits(['show-message', 'friend-added'])

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // 小于1分钟
  if (diff < 60000) return '刚刚'
  
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  // 小于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  
  // 小于7天
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }
  
  // 显示日期
  return date.toLocaleDateString('zh-CN')
}

// 显示消息提示
const showMessage = (type, text) => {
  const messageEl = document.createElement('div')
  messageEl.className = `custom-message custom-message-${type}`
  messageEl.textContent = text
  document.body.appendChild(messageEl)
  
  setTimeout(() => {
    messageEl.classList.add('show')
  }, 10)
  
  setTimeout(() => {
    messageEl.classList.remove('show')
    setTimeout(() => {
      document.body.removeChild(messageEl)
    }, 300)
  }, 3000)
}

// 获取好友请求列表（带防抖）
const fetchFriendRequests = async (force = false) => {
  // 防止频繁请求
  if (loading.value) return
  
  // 检查冷却时间
  const now = Date.now()
  if (!force && now - lastFetchTime.value < FETCH_COOLDOWN) {
    console.log('请求冷却中，跳过此次请求')
    return
  }
  
  try {
    loading.value = true
    lastFetchTime.value = now
    
    const response = await fetch('http://localhost:5000/api/friends/requests', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    if (response.status === 429) {
      console.warn('请求过于频繁，请稍后再试')
      showMessage('warning', '请求过于频繁，请稍后再试')
      // 增加冷却时间
      lastFetchTime.value = now + 5000
      return
    }
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // 确保每个请求都有status字段
        requests.value = (data.data.received || []).map(req => ({
          ...req,
          status: req.status || 'pending'
        }))
      }
    } else {
      const errorText = await response.text()
      console.error('获取好友请求失败:', errorText)
    }
  } catch (error) {
    console.error('获取好友请求失败:', error)
    if (error.message !== 'Failed to fetch') {
      showMessage('error', '获取好友请求失败')
    }
  } finally {
    loading.value = false
  }
}

// 处理好友请求响应
const handleResponse = async (requestId, action) => {
  // 防止重复点击
  if (processingRequests.value.has(requestId)) {
    return
  }
  
  processingRequests.value.add(requestId)
  
  try {
    const response = await fetch(`http://localhost:5000/api/friends/requests/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ action })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        showMessage('success', action === 'accept' ? '已同意好友请求' : '已拒绝好友请求')
        
        // 更新请求状态而不是立即移除
        const request = requests.value.find(r => r._id === requestId)
        if (request) {
          request.status = action === 'accept' ? 'accepted' : 'rejected'
        }
        
        // 延迟移除，让用户看到状态变化
        setTimeout(() => {
          const index = requests.value.findIndex(r => r._id === requestId)
          if (index > -1) {
            requests.value.splice(index, 1)
          }
        }, 1500)
      }
    } else {
      showMessage('error', '操作失败，请重试')
    }
  } catch (error) {
    console.error('处理好友请求失败:', error)
    showMessage('error', '处理好友请求失败')
  }
}

// Socket.IO事件监听
const setupSocketListeners = () => {
  const socket = userStore.socket
  if (!socket) return
  
  // 先移除旧的监听器，避免重复
  socket.off('friendRequestReceived')
  socket.off('friendRequestAccepted')
  socket.off('friendRequestRejected')
  
  // 监听收到新的好友请求
  socket.on('friendRequestReceived', (data) => {
    console.log('收到新的好友请求:', data)
    requests.value.unshift({
      _id: data.requestId,
      sender: data.sender,
      message: data.message,
      createdAt: data.createdAt
    })
    showMessage('info', `收到来自 ${data.sender.profile?.displayName || data.sender.userId} 的好友请求`)
  })
  
  // 监听好友请求被接受
  socket.on('friendRequestAccepted', (data) => {
    console.log('好友请求被接受:', data)
    showMessage('success', `${data.friend.profile?.displayName || data.friend.userId} 接受了您的好友请求`)
    
    // 显示欢迎消息
    if (data.welcomeMessage) {
      setTimeout(() => {
        showMessage('info', data.welcomeMessage.content)
      }, 1000)
    }
    
    emit('friend-added', data.friend)
  })
  
  // 监听好友请求被拒绝
  socket.on('friendRequestRejected', (data) => {
    console.log('好友请求被拒绝:', data)
    showMessage('warning', `${data.rejectedBy.profile?.displayName || data.rejectedBy.userId} 拒绝了您的好友请求`)
  })
}

// 清理Socket监听器
const cleanupSocketListeners = () => {
  const socket = userStore.socket
  if (!socket) return
  
  socket.off('friendRequestReceived')
  socket.off('friendRequestAccepted')
  socket.off('friendRequestRejected')
}

// 重新获取好友请求（供外部调用）
const refreshRequests = () => {
  fetchFriendRequests()
}

onMounted(() => {
  fetchFriendRequests()
  setupSocketListeners()
})

onUnmounted(() => {
  cleanupSocketListeners()
})

// 暴露方法供父组件调用
defineExpose({
  refreshRequests
})
</script>

<style scoped>
.friend-notification-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.header {
  padding: 20px 24px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

/* 通知列表 */
.notification-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-text {
  font-size: 14px;
  color: #999;
}

/* 通知项 - 类似截图中的样式 */
.notification-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 1px;
  background: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f7f7f7;
}

.item-avatar {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  flex-shrink: 0;
}

.item-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #1890ff;
  text-decoration: none;
  cursor: pointer;
}

.user-name:hover {
  text-decoration: underline;
}

.request-text {
  font-size: 14px;
  color: #333;
}

.request-time {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.item-actions {
  margin-left: 12px;
}

.btn-action {
  padding: 4px 12px;
  border: none;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: #999;
}

.btn-accept {
  color: #52c41a;
}

.btn-reject {
  color: #ff4d4f;
}

.btn-action:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-text {
  font-size: 12px;
  padding: 4px 12px;
}

.status-text.accepted {
  color: #52c41a;
}

.status-text.rejected {
  color: #999;
}

/* 自定义消息提示 */
.custom-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
  color: white;
  opacity: 0;
  transition: all 0.3s;
  z-index: 9999;
  pointer-events: none;
}

.custom-message.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.custom-message-success {
  background: #52c41a;
}

.custom-message-error {
  background: #ff4d4f;
}

.custom-message-warning {
  background: #faad14;
}

.custom-message-info {
  background: #1890ff;
}

/* 滚动条样式 */
.notification-list::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-track {
  background: transparent;
}

.notification-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.notification-list::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
