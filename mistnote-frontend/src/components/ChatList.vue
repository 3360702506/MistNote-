<template>
  <div class="chat-list" :style="{ width: chatListWidth + 'px' }">
    <!-- 搜索框 -->
    <div class="search-section">
      <div class="search-box">
        <n-icon size="16" color="#999" class="search-icon">
          <SearchIcon />
        </n-icon>
        <input 
          type="text" 
          placeholder="搜索" 
          v-model="searchQuery"
          class="search-input"
        />
        <n-icon size="16" color="#999" class="add-icon" @click="addChat">
          <AddIcon />
        </n-icon>
      </div>
    </div>

    <!-- 聊天列表 -->
    <div class="chat-items">
      <div
        v-for="chat in filteredChats"
        :key="chat.id"
        class="chat-item-wrapper"
        :class="{
          'dragging': draggingChatId === chat.id,
          'removing': removingChatId === chat.id
        }"
        :style="getDragStyle(chat.id)"
      >
        <div
          class="chat-item"
          :class="{ active: chat.id === activeChatId }"
          @click="selectChat(chat.id)"
          @mousedown="startDrag($event, chat.id)"
          @touchstart="startDrag($event, chat.id)"
        >
        <div class="avatar">
          <img :src="chat.avatar" :alt="chat.name" />
          <div v-if="chat.online" class="online-indicator"></div>
        </div>
        
        <div class="chat-info">
          <div class="chat-header">
            <div class="chat-name">{{ chat.name }}</div>
            <div class="chat-time">{{ chat.time }}</div>
          </div>
          <div class="chat-preview">
            <span class="sender" v-if="chat.sender">{{ chat.sender }}：</span>
            <span class="message">{{ chat.lastMessage }}</span>
          </div>
        </div>
        
        <div class="chat-status">
          <div
            v-if="chat.unreadCount > 0"
            class="unread-badge"
            :class="{
              'badge-dragging': draggingBadgeId === chat.id,
              'badge-removing': removingBadgeId === chat.id,
              'badge-muted': chat.messageType === 'muted'
            }"
            :style="getBadgeDragStyle(chat.id)"
            @mousedown.stop="startBadgeDrag($event, chat.id)"
            @touchstart.stop="startBadgeDrag($event, chat.id)"
          >
            {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
          </div>
          <n-icon v-if="chat.muted" size="14" color="#999" class="mute-icon">
            <MuteIcon />
          </n-icon>
        </div>
        </div>
      </div>
    </div>

    <!-- 拖拽手柄 -->
    <div
      class="resize-handle"
      @mousedown="startResize"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon } from 'naive-ui'
import {
  Search as SearchIcon,
  Add as AddIcon,
  VolumeOff as MuteIcon
} from '@vicons/ionicons5'

const searchQuery = ref('')
const activeChatId = ref(1)

// 聊天列表宽度控制
const chatListWidth = ref(280)
const minWidth = 200
const maxWidth = 500
const isResizing = ref(false)

// 拖拽删除控制
const draggingChatId = ref(null)
const removingChatId = ref(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragCurrentX = ref(0)
const dragCurrentY = ref(0)
const isDragging = ref(false)
const dragThreshold = 100 // 拖拽删除的阈值距离

// 小红点拖拽控制
const draggingBadgeId = ref(null)
const removingBadgeId = ref(null)
const badgeDragStartX = ref(0)
const badgeDragStartY = ref(0)
const badgeDragCurrentX = ref(0)
const badgeDragCurrentY = ref(0)
const isBadgeDragging = ref(false)
const badgeDragThreshold = 50 // 小红点拖拽消失的阈值距离

// 模拟聊天数据
const chatList = ref([
  {
    id: 1,
    name: '南山无落梅',
    avatar: '/logo.png',
    lastMessage: '[图片]',
    time: '22:48',
    unreadCount: 0,
    online: true,
    muted: false,
    deleted: false,
    deletedAt: null,
    messageType: 'normal' // normal: 普通消息, muted: 免打扰消息
  },
  {
    id: 2,
    name: 'Qt欧水圣地',
    avatar: '/logo.png',
    lastMessage: '得做产品卖',
    sender: 'ZZ',
    time: '23:34',
    unreadCount: 5,
    online: true,
    muted: true,
    messageType: 'muted'
  },
  {
    id: 3,
    name: 'Electron',
    avatar: '/logo.png',
    lastMessage: '[动画表情]',
    sender: 'CAT',
    time: '23:33',
    unreadCount: 12,
    online: false,
    muted: false,
    messageType: 'normal'
  },
  {
    id: 4,
    name: 'Electron技术交流群',
    avatar: '/logo.png',
    lastMessage: '叫我爱老虎油！！：找真的...',
    time: '23:32',
    unreadCount: 2,
    online: false,
    muted: false,
    messageType: 'normal'
  },
  {
    id: 5,
    name: 'C3编程学习(31)',
    avatar: '/logo.png',
    lastMessage: '我买这些原住民的时候...',
    sender: 'Th',
    time: '23:32',
    unreadCount: 3,
    online: false,
    muted: false,
    messageType: 'normal'
  },
  {
    id: 6,
    name: 'AIGC工具对接',
    avatar: '/logo.png',
    lastMessage: '@九你 凝雪墨...',
    sender: 'Q群管家',
    time: '23:14',
    unreadCount: 8,
    online: false,
    muted: true,
    messageType: 'muted'
  },
  {
    id: 7,
    name: 'C语言C++GO语言...',
    avatar: '/logo.png',
    lastMessage: '[图片]',
    sender: 'SKY交流|SUG',
    time: '23:13',
    unreadCount: 15,
    online: false,
    muted: true,
    messageType: 'muted'
  },
  {
    id: 8,
    name: 'ElaWidgetTool交...',
    avatar: '/logo.png',
    lastMessage: '开房店',
    sender: '山岳两定江(📱68)',
    time: '23:03',
    unreadCount: 99,
    online: false,
    muted: true,
    messageType: 'muted'
  }
])

// 过滤聊天列表
const filteredChats = computed(() => {
  if (!searchQuery.value) {
    return chatList.value
  }
  return chatList.value.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 定义事件
const emit = defineEmits(['chat-select'])

// 选择聊天
const selectChat = (chatId) => {
  if (!isDragging.value) {
    activeChatId.value = chatId
    emit('chat-select', chatId)
  }
}

// 获取拖拽样式
const getDragStyle = (chatId) => {
  if (draggingChatId.value === chatId) {
    const deltaX = dragCurrentX.value - dragStartX.value
    const deltaY = dragCurrentY.value - dragStartY.value
    const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / dragThreshold)

    return {
      transform: `translate(${deltaX}px, ${deltaY}px)`,
      opacity: opacity,
      zIndex: 1000
    }
  }
  return {}
}

// 获取小红点拖拽样式
const getBadgeDragStyle = (chatId) => {
  if (draggingBadgeId.value === chatId) {
    const deltaX = badgeDragCurrentX.value - badgeDragStartX.value
    const deltaY = badgeDragCurrentY.value - badgeDragStartY.value
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const opacity = Math.max(0.2, 1 - distance / badgeDragThreshold)
    const scale = Math.max(0.5, 1 - distance / badgeDragThreshold)

    return {
      transform: `translate(${deltaX}px, ${deltaY}px) scale(${scale})`,
      opacity: opacity,
      zIndex: 1001
    }
  }
  return {}
}

// 添加聊天
const addChat = () => {
  console.log('添加聊天')
}

// 开始拖拽聊天项
const startDrag = (e, chatId) => {
  // 防止与点击事件冲突
  e.preventDefault()

  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY

  draggingChatId.value = chatId
  dragStartX.value = clientX
  dragStartY.value = clientY
  dragCurrentX.value = clientX
  dragCurrentY.value = clientY
  isDragging.value = false

  const handleMouseMove = (e) => {
    const currentX = e.touches ? e.touches[0].clientX : e.clientX
    const currentY = e.touches ? e.touches[0].clientY : e.clientY

    dragCurrentX.value = currentX
    dragCurrentY.value = currentY

    const deltaX = Math.abs(currentX - dragStartX.value)
    const deltaY = Math.abs(currentY - dragStartY.value)

    // 如果移动距离超过阈值，开始拖拽
    if (!isDragging.value && (deltaX > 5 || deltaY > 5)) {
      isDragging.value = true
    }
  }

  const handleMouseUp = () => {
    const deltaX = dragCurrentX.value - dragStartX.value
    const shouldRemove = Math.abs(deltaX) > dragThreshold

    if (shouldRemove && isDragging.value) {
      // 开始删除动画
      removingChatId.value = chatId
      setTimeout(() => {
        // 从列表中移除聊天项
        const index = chatList.value.findIndex(chat => chat.id === chatId)
        if (index > -1) {
          chatList.value.splice(index, 1)
        }
        removingChatId.value = null
      }, 300) // 动画持续时间
    }

    // 清理拖拽状态
    draggingChatId.value = null
    isDragging.value = false

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('touchmove', handleMouseMove)
    document.removeEventListener('touchend', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleMouseMove)
  document.addEventListener('touchend', handleMouseUp)
}

// 开始拖拽小红点
const startBadgeDrag = (e, chatId) => {
  e.preventDefault()
  e.stopPropagation() // 阻止事件冒泡到聊天项

  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY

  draggingBadgeId.value = chatId
  badgeDragStartX.value = clientX
  badgeDragStartY.value = clientY
  badgeDragCurrentX.value = clientX
  badgeDragCurrentY.value = clientY
  isBadgeDragging.value = false

  const handleMouseMove = (e) => {
    const currentX = e.touches ? e.touches[0].clientX : e.clientX
    const currentY = e.touches ? e.touches[0].clientY : e.clientY

    badgeDragCurrentX.value = currentX
    badgeDragCurrentY.value = currentY

    const deltaX = Math.abs(currentX - badgeDragStartX.value)
    const deltaY = Math.abs(currentY - badgeDragStartY.value)

    // 如果移动距离超过阈值，开始拖拽
    if (!isBadgeDragging.value && (deltaX > 3 || deltaY > 3)) {
      isBadgeDragging.value = true
    }
  }

  const handleMouseUp = () => {
    const deltaX = badgeDragCurrentX.value - badgeDragStartX.value
    const deltaY = badgeDragCurrentY.value - badgeDragStartY.value
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const shouldRemoveBadge = distance > badgeDragThreshold

    if (shouldRemoveBadge && isBadgeDragging.value) {
      // 开始小红点消失动画
      removingBadgeId.value = chatId
      setTimeout(() => {
        // 清除未读消息数量
        const chat = chatList.value.find(chat => chat.id === chatId)
        if (chat) {
          chat.unreadCount = 0
        }
        removingBadgeId.value = null
      }, 300) // 动画持续时间
    }

    // 清理拖拽状态
    draggingBadgeId.value = null
    isBadgeDragging.value = false

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('touchmove', handleMouseMove)
    document.removeEventListener('touchend', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleMouseMove)
  document.addEventListener('touchend', handleMouseUp)
}

// 开始调整大小
const startResize = (e) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = chatListWidth.value

  const handleMouseMove = (e) => {
    if (!isResizing.value) return

    const deltaX = e.clientX - startX
    const newWidth = startWidth + deltaX

    // 限制宽度范围
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      chatListWidth.value = newWidth
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
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// 组件挂载和卸载时的清理
onMounted(() => {
  // 可以在这里添加初始化逻辑
})

onUnmounted(() => {
  // 清理可能残留的事件监听器
  document.body.style.cursor = 'default'
  document.body.style.userSelect = 'auto'
})
</script>

<style scoped>
.chat-list {
  height: 100%;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 200px;
  max-width: 500px;
}

.search-section {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 8px 12px;
  gap: 8px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #333;
}

.search-input::placeholder {
  color: #999;
}

.add-icon {
  cursor: pointer;
  transition: color 0.2s ease;
}

.add-icon:hover {
  color: #1890ff;
}

.chat-items {
  flex: 1;
  overflow-y: auto;
}

.chat-item-wrapper {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-item-wrapper.dragging {
  transition: none;
}

.chat-item-wrapper.removing {
  animation: bubbleDisappear 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f5f5f5;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.chat-item:hover {
  background-color: #f8f9fa;
}

.chat-item.active {
  background-color: #e6f7ff;
}

.avatar {
  position: relative;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #52c41a;
  border: 2px solid #fff;
  border-radius: 50%;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.chat-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  margin-left: 8px;
}

.chat-preview {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
}

.sender {
  color: #999;
  flex-shrink: 0;
}

.message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.unread-badge {
  background: #ff4d4f;
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.unread-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
}

.unread-badge.badge-dragging {
  cursor: grabbing;
  transition: none;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
}

.unread-badge.badge-removing {
  animation: badgeDisappear 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* 免打扰消息的灰色小红点 */
.unread-badge.badge-muted {
  background: #8c8c8c;
  color: white;
}

.unread-badge.badge-muted:hover {
  background: #595959;
  box-shadow: 0 2px 8px rgba(140, 140, 140, 0.3);
}

.unread-badge.badge-muted.badge-dragging {
  box-shadow: 0 4px 12px rgba(140, 140, 140, 0.4);
}

.mute-icon {
  opacity: 0.6;
}

/* 滚动条样式 */
.chat-items::-webkit-scrollbar {
  width: 4px;
}

.chat-items::-webkit-scrollbar-track {
  background: transparent;
}

.chat-items::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 2px;
}

.chat-items::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

/* 拖拽手柄样式 */
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background-color: #1890ff;
}

.resize-handle:active {
  background-color: #096dd9;
}

/* 气泡消失动画 */
@keyframes bubbleDisappear {
  0% {
    opacity: 1;
    transform: scale(1);
    height: auto;
  }
  50% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(0.6);
    height: 0;
    padding: 0;
    margin: 0;
    border: none;
  }
}

/* 拖拽时的视觉反馈 */
.chat-item-wrapper.dragging .chat-item {
  background-color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 拖拽阈值指示器 */
.chat-item-wrapper.dragging::after {
  content: '';
  position: absolute;
  right: -100px;
  top: 50%;
  transform: translateY(-50%);
  width: 80px;
  height: 2px;
  background: linear-gradient(to right, transparent, #ff4d4f);
  opacity: 0.6;
  pointer-events: none;
}

/* 小红点消失动画 */
@keyframes badgeDisappear {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 0;
    transform: scale(0);
  }
}

/* 小红点拖拽时的粒子效果 */
.unread-badge.badge-dragging::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 77, 79, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(1.5);
  animation: badgePulse 0.6s ease-in-out infinite alternate;
  pointer-events: none;
}

/* 免打扰消息拖拽时的粒子效果 */
.unread-badge.badge-muted.badge-dragging::before {
  background: radial-gradient(circle, rgba(140, 140, 140, 0.6) 0%, transparent 70%);
}

@keyframes badgePulse {
  0% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0.2;
  }
}
</style>
