<template>
  <div class="chat-window" :style="{ '--input-height': inputHeight + 'px' }">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="contact-info">
        <div class="contact-name">{{ contactName }}</div>
        <div class="online-status">
          <div class="status-dot" :class="{ online: isOnline }"></div>
        </div>
      </div>
      
      <div class="header-actions">
        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        </button>

        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </button>

        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l3 3 3-3h5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H6l-2 2V4h17v10z"/>
          </svg>
        </button>

        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
          </svg>
        </button>

        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>

        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="messages-area" ref="messagesArea">
      <div class="messages-container">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{ 'message-sent': message.isSent, 'message-received': !message.isSent }"
        >
          <!-- 接收的消息 -->
          <div v-if="!message.isSent" class="message-wrapper received">
            <div class="message-avatar">
              <img :src="message.avatar || '/logo.png'" :alt="message.sender" />
            </div>
            <div class="message-content">
              <div class="message-info">
                <span class="sender-name">{{ message.sender }}</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-bubble received-bubble">
                <div class="message-text">{{ message.content }}</div>
              </div>
            </div>
          </div>

          <!-- 发送的消息 -->
          <div v-else class="message-wrapper sent">
            <div class="message-content">
              <div class="message-info">
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                <span class="message-status" :class="message.status">
                  <svg v-if="message.status === 'sending'" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <svg v-else-if="message.status === 'sent'" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <svg v-else-if="message.status === 'read'" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                  </svg>
                </span>
              </div>
              <div class="message-bubble sent-bubble">
                <div class="message-text">{{ message.content }}</div>
              </div>
            </div>
            <div class="message-avatar">
              <img :src="userAvatar" alt="我" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入工具栏 -->
    <div class="input-toolbar">
      <div class="toolbar-actions">
        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>

        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm0 12c-1.1 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/>
          </svg>
        </button>

        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
          </svg>
        </button>

        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </button>

        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M2 12.5C2 9.46 4.46 7 7.5 7H18c2.21 0 4 1.79 4 4s-1.79 4-4 4H9.5C8.12 15 7 13.88 7 12.5S8.12 10 9.5 10H17v2H9.5c-.28 0-.5.22-.5.5s.22.5.5.5H18c1.1 0 2-.9 2-2s-.9-2-2-2H7.5C5.57 9 4 10.57 4 12.5S5.57 16 7.5 16H17v2H7.5C4.46 18 2 15.54 2 12.5z"/>
          </svg>
        </button>

        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </button>

        <button class="toolbar-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 2c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
          </svg>
        </button>
      </div>
      
      <div class="input-area">
        <div class="input-container" :class="{ resizing: isResizing }" :style="{ height: inputHeight + 'px' }">
          <!-- 拖拽手柄 -->
          <div class="resize-handle-top" @mousedown="startInputResize"></div>

          <div class="message-input"
               contenteditable="true"
               @input="handleInput"
               @keydown="handleKeydown"
               ref="messageInput">
          </div>
        </div>

        <div class="send-actions">
          <button class="history-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
              <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </button>

          <button class="send-btn" @click="sendMessage">
            发送
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

// 定义props
const props = defineProps({
  contactName: {
    type: String,
    default: '谢智贤'
  },
  isOnline: {
    type: Boolean,
    default: true
  }
})

const messageInput = ref(null)
const messagesArea = ref(null)
const inputContent = ref('')
const inputHeight = ref(80)
const minInputHeight = 60
const maxInputHeight = 200
const isResizing = ref(false)
const userAvatar = ref('/logo.png')

// 消息列表
const messages = ref([
  {
    id: 1,
    content: '你好！最近怎么样？',
    sender: props.contactName,
    avatar: '/logo.png',
    timestamp: new Date(Date.now() - 3600000),
    isSent: false
  },
  {
    id: 2,
    content: '我很好，谢谢！你呢？工作忙吗？',
    timestamp: new Date(Date.now() - 3000000),
    isSent: true,
    status: 'read'
  },
  {
    id: 3,
    content: '还好，最近在做一个新项目，挺有意思的。你有空的话我们可以聊聊。',
    sender: props.contactName,
    avatar: '/logo.png',
    timestamp: new Date(Date.now() - 1800000),
    isSent: false
  },
  {
    id: 4,
    content: '好的，我很感兴趣！什么时候方便？',
    timestamp: new Date(Date.now() - 900000),
    isSent: true,
    status: 'read'
  },
  {
    id: 5,
    content: '今天下午怎么样？我们可以视频聊聊。',
    sender: props.contactName,
    avatar: '/logo.png',
    timestamp: new Date(Date.now() - 300000),
    isSent: false
  }
])

const handleInput = (e) => {
  inputContent.value = e.target.innerText
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const sendMessage = () => {
  if (inputContent.value.trim()) {
    const newMessage = {
      id: Date.now(),
      content: inputContent.value.trim(),
      timestamp: new Date(),
      isSent: true,
      status: 'sending'
    }

    messages.value.push(newMessage)
    messageInput.value.innerText = ''
    inputContent.value = ''

    // 滚动到底部
    scrollToBottom()

    // 模拟发送状态变化
    setTimeout(() => {
      newMessage.status = 'sent'
    }, 1000)

    setTimeout(() => {
      newMessage.status = 'read'
    }, 2000)
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  const now = new Date()
  const messageTime = new Date(timestamp)
  const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60))

  if (diffInMinutes < 1) {
    return '刚刚'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours}小时前`
  } else {
    return messageTime.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesArea.value) {
    // 使用 requestAnimationFrame 确保 DOM 更新完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = messagesArea.value
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    })
  }
}

// 开始调整输入框高度
const startInputResize = (e) => {
  isResizing.value = true
  const startY = e.clientY
  const startHeight = inputHeight.value

  const handleMouseMove = (e) => {
    if (!isResizing.value) return

    const deltaY = startY - e.clientY // 向上拖拽为正值
    const newHeight = startHeight + deltaY

    // 限制高度范围
    if (newHeight >= minInputHeight && newHeight <= maxInputHeight) {
      inputHeight.value = newHeight
    }
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
}

// 组件卸载时的清理
onUnmounted(() => {
  document.body.style.cursor = 'default'
  document.body.style.userSelect = 'auto'
})
</script>

<style scoped>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f3e8ff 0%, #e6f3ff 100%);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  height: 60px;
  min-height: 60px;
  max-height: 60px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contact-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.online-status {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  color: #1890ff;
  background-color: #f0f8ff;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  /* 确保滚动容器有正确的高度计算 */
  min-height: 0;
  background: transparent;
  /* 使用 calc 计算高度，确保输入框变高时只压缩消息区域 */
  height: calc(100vh - 60px - var(--input-height, 80px) - 40px);
  max-height: calc(100vh - 60px - var(--input-height, 80px) - 40px);
}

.messages-container {
  width: 100%;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
}

.message-item {
  margin-bottom: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.message-wrapper {
  display: flex;
  gap: 12px;
  max-width: 80%;
  align-items: flex-start;
}

.message-wrapper.received {
  align-self: flex-start;
}

.message-wrapper.sent {
  align-self: flex-end;
  margin-left: auto;
  flex-direction: row;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #f0f0f0;
}

.message-content {
  display: flex;
  flex-direction: column;
}

.message-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #999;
}

.sent .message-info {
  justify-content: flex-end;
}

.sender-name {
  font-weight: 500;
  color: #666;
}

.message-time {
  color: #999;
}

.message-status {
  display: flex;
  align-items: center;
  color: #999;
}

.message-status.sending {
  color: #faad14;
}

.message-status.sent {
  color: #52c41a;
}

.message-status.read {
  color: #1890ff;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  line-height: 1.4;
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.received-bubble {
  background: white;
  border: 1px solid #e8e8e8;
  border-bottom-left-radius: 6px;
}

.sent-bubble {
  background: #1890ff;
  color: white;
  border-bottom-right-radius: 6px;
}

.message-text {
  font-size: 14px;
}

.input-toolbar {
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(232, 232, 232, 0.5);
  padding: 12px 20px;
  flex-shrink: 0;
  box-sizing: border-box;
  min-height: 140px;
  max-height: 300px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  color: #1890ff;
  background-color: #f0f8ff;
}

.input-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-shrink: 0;
  padding: 20px;
  background: transparent;
}

.input-container {
  flex: 1;
  position: relative;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

/* 移除焦点时的边框效果 */

.resize-handle-top {
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  cursor: ns-resize;
  background: transparent;
  z-index: 10;
}

.resize-handle-top:hover {
  background: transparent;
}

.resize-handle-top:active {
  background: transparent;
}

/* 确保拖拽时输入容器没有边框 */
.input-container.resizing {
  border: none !important;
  box-shadow: none !important;
}

.message-input {
  width: 100%;
  height: 100%;
  padding: 12px;
  border: none;
  outline: none;
  overflow-y: auto;
  line-height: 1.5;
  font-size: 14px;
  color: #333;
  resize: none;
  background: transparent;
}

.message-input:empty::before {
  content: '请输入消息...';
  color: #bfbfbf;
  pointer-events: none;
}

.send-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.history-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.history-btn:hover {
  color: #666;
  background-color: #f5f5f5;
}

.send-btn {
  min-width: 80px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #1890ff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.send-btn:hover {
  background: #40a9ff;
}

.send-btn:active {
  background: #096dd9;
}

/* 滚动条样式 */
.messages-area::-webkit-scrollbar,
.message-input::-webkit-scrollbar {
  width: 4px;
}

.messages-area::-webkit-scrollbar-track,
.message-input::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb,
.message-input::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 2px;
}

.messages-area::-webkit-scrollbar-thumb:hover,
.message-input::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
