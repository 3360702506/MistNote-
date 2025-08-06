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

    <!-- 添加聊天弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="add-chat-modal" @click.stop>
        <div class="modal-header">
          <h3>添加聊天</h3>
          <button class="close-btn" @click="showAddModal = false">×</button>
        </div>
        
        <div class="modal-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'friend' }"
            @click="activeTab = 'friend'"
          >
            添加好友
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'group' }"
            @click="activeTab = 'group'"
          >
            创建群聊
          </button>
        </div>
        
        <div class="modal-content">
          <!-- 添加好友表单 -->
          <div v-if="activeTab === 'friend'" class="add-form">
            <div class="form-group">
              <label class="form-label">用户ID <span class="required">*</span></label>
              <div class="input-wrapper">
                <input
                  v-model="friendForm.userId"
                  type="text"
                  placeholder="请输入5位数用户ID"
                  maxlength="5"
                  class="form-input"
                />
                <span class="input-count">{{ friendForm.userId.length }}/5</span>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">备注名称</label>
              <div class="input-wrapper">
                <input
                  v-model="friendForm.nickname"
                  type="text"
                  placeholder="可选，为好友设置备注名称"
                  class="form-input"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">验证消息 <span class="required">*</span></label>
              <div class="input-wrapper">
                <textarea
                  v-model="friendForm.message"
                  placeholder="我是..."
                  maxlength="100"
                  rows="3"
                  class="form-textarea"
                ></textarea>
                <span class="input-count">{{ friendForm.message.length }}/100</span>
              </div>
            </div>
            
            <div class="form-actions">
              <button class="cancel-btn" @click="showAddModal = false">取消</button>
              <button class="primary-btn" @click="addFriend" :disabled="isAddingFriend">
                <span v-if="isAddingFriend">发送中...</span>
                <span v-else>发送好友请求</span>
              </button>
            </div>
          </div>
          
          <!-- 创建群聊表单 -->
          <div v-if="activeTab === 'group'" class="add-form">
            <div class="form-group">
              <label class="form-label">群聊名称 <span class="required">*</span></label>
              <div class="input-wrapper">
                <input
                  v-model="groupForm.groupName"
                  type="text"
                  placeholder="请输入群聊名称"
                  maxlength="20"
                  class="form-input"
                />
                <span class="input-count">{{ groupForm.groupName.length }}/20</span>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">群聊描述</label>
              <div class="input-wrapper">
                <textarea
                  v-model="groupForm.description"
                  placeholder="可选，描述群聊的用途"
                  maxlength="200"
                  rows="3"
                  class="form-textarea"
                ></textarea>
                <span class="input-count">{{ groupForm.description.length }}/200</span>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">邀请好友</label>
              <div class="select-wrapper">
                <select
                  v-model="groupForm.inviteUsers"
                  multiple
                  class="form-select"
                >
                  <option v-for="friend in friendOptions" :key="friend.value" :value="friend.value">
                    {{ friend.label }}
                  </option>
                </select>
                <div class="select-placeholder" v-if="groupForm.inviteUsers.length === 0">
                  选择要邀请的好友
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button class="cancel-btn" @click="showAddModal = false">取消</button>
              <button class="primary-btn" @click="createGroup" :disabled="isCreatingGroup">
                <span v-if="isCreatingGroup">创建中...</span>
                <span v-else>创建群聊</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon, NModal, NTabs, NTabPane, NForm, NFormItem, NInput, NSelect, NButton } from 'naive-ui'
import {
  Search as SearchIcon,
  Add as AddIcon,
  VolumeOff as MuteIcon
} from '@vicons/ionicons5'
import { useUserStore } from '../stores/user'
import { useMessage } from 'naive-ui'

const userStore = useUserStore()
const message = useMessage()

const searchQuery = ref('')
const activeChatId = ref(1)

// 添加聊天弹窗相关
const showAddModal = ref(false)
const activeTab = ref('friend')
const isAddingFriend = ref(false)
const isCreatingGroup = ref(false)

// 添加好友表单
const friendFormRef = ref(null)
const friendForm = ref({
  userId: '',
  nickname: '',
  message: '我是' + (userStore.user?.profile?.displayName || userStore.user?.userId || '用户')
})

const friendRules = {
  userId: [
    { required: true, message: '请输入用户ID', trigger: 'blur' },
    { pattern: /^\d{5}$/, message: '用户ID必须是5位数字', trigger: 'blur' }
  ],
  message: [
    { required: true, message: '请输入验证消息', trigger: 'blur' }
  ]
}

// 创建群聊表单
const groupFormRef = ref(null)
const groupForm = ref({
  groupName: '',
  description: '',
  inviteUsers: []
})

const groupRules = {
  groupName: [
    { required: true, message: '请输入群聊名称', trigger: 'blur' },
    { min: 2, max: 20, message: '群聊名称长度为2-20个字符', trigger: 'blur' }
  ]
}

// 好友选项（用于创建群聊时邀请）
const friendOptions = ref([])

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
  showAddModal.value = true
  activeTab.value = 'friend'
  // 重置表单
  friendForm.value = {
    userId: '',
    nickname: '',
    message: '我是' + (userStore.user?.profile?.displayName || userStore.user?.userId || '用户')
  }
  groupForm.value = {
    groupName: '',
    description: '',
    inviteUsers: []
  }
}

// 添加好友
const addFriend = async () => {
  try {
    // 表单验证
    await friendFormRef.value?.validate()
    
    isAddingFriend.value = true
    
    // 调用后端API添加好友
    const response = await fetch('http://localhost:5000/api/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        targetUserId: friendForm.value.userId,
        nickname: friendForm.value.nickname,
        message: friendForm.value.message
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      message.success('好友请求已发送')
      showAddModal.value = false
      
      // 可选：刷新好友列表或聊天列表
      await loadFriends()
    } else {
      message.error(result.message || '发送好友请求失败')
    }
  } catch (error) {
    console.error('添加好友失败:', error)
    message.error('添加好友失败，请检查网络连接')
  } finally {
    isAddingFriend.value = false
  }
}

// 创建群聊
const createGroup = async () => {
  try {
    // 表单验证
    await groupFormRef.value?.validate()
    
    isCreatingGroup.value = true
    
    // 调用后端API创建群聊
    const response = await fetch('http://localhost:5000/api/groups/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        groupName: groupForm.value.groupName,
        description: groupForm.value.description,
        inviteUsers: groupForm.value.inviteUsers
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      message.success('群聊创建成功')
      showAddModal.value = false
      
      // 添加新群聊到聊天列表
      chatList.value.unshift({
        id: result.group.id,
        name: result.group.name,
        avatar: result.group.avatar || '/logo.png',
        lastMessage: '群聊已创建',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        online: false,
        muted: false,
        messageType: 'normal',
        isGroup: true
      })
    } else {
      message.error(result.message || '创建群聊失败')
    }
  } catch (error) {
    console.error('创建群聊失败:', error)
    message.error('创建群聊失败，请检查网络连接')
  } finally {
    isCreatingGroup.value = false
  }
}

// 加载好友列表（用于群聊邀请）
const loadFriends = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/friends', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    if (response.ok) {
      const friends = await response.json()
      friendOptions.value = friends.map(friend => ({
        label: friend.nickname || friend.displayName || friend.userId,
        value: friend.userId
      }))
    }
  } catch (error) {
    console.error('加载好友列表失败:', error)
  }
}

// 组件初始化
onMounted(() => {
  // 如果用户已登录，加载好友列表
  if (userStore.token) {
    loadFriends()
  }
})

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

/* 模态框遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 添加聊天弹窗样式 - 与主题保持一致 */
.add-chat-modal {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* 弹窗头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

/* 标签页 */
.modal-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #333;
  background: #f9f9f9;
}

.tab-btn.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  font-weight: 500;
}

/* 弹窗内容 */
.modal-content {
  padding: 20px;
}

.add-form {
  padding: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 原生按钮样式 - 与应用主题保持一致 */
.form-actions .cancel-btn {
  min-width: 80px;
  height: 32px;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #666;
  padding: 0 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-weight: 400;
  outline: none;
}

.form-actions .cancel-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.form-actions .cancel-btn:active {
  background: #f5f5f5;
}

.form-actions .primary-btn {
  min-width: 80px;
  height: 32px;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid #1890ff;
  background: #1890ff;
  color: #fff;
  padding: 0 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-weight: 500;
  outline: none;
}

.form-actions .primary-btn:hover:not(:disabled) {
  background: #40a9ff;
  border-color: #40a9ff;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);
}

.form-actions .primary-btn:active:not(:disabled) {
  background: #096dd9;
  border-color: #096dd9;
}

.form-actions .primary-btn:disabled {
  background: #f5f5f5;
  border-color: #d9d9d9;
  color: #bfbfbf;
  cursor: not-allowed;
}

/* 表单项间距 */
.add-form .n-form-item {
  margin-bottom: 16px;
}

.add-form .n-form-item:last-child {
  margin-bottom: 0;
}

/* 标签样式 */
.add-form .n-form-item-label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  margin-bottom: 8px;
}

/* 表单组 */
.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

/* 表单标签 */
.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.required {
  color: #ff4d4f;
}

/* 输入框包装器 */
.input-wrapper {
  position: relative;
}

/* 输入框样式 - 与主界面保持一致 */
.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: #fff;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #999;
}

.form-input:hover {
  border-color: #40a9ff;
}

.form-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 文本域样式 */
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: #fff;
  transition: all 0.2s ease;
  outline: none;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-textarea::placeholder {
  color: #999;
}

.form-textarea:hover {
  border-color: #40a9ff;
}

.form-textarea:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 字符计数 */
.input-count {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 12px;
  color: #999;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 4px;
  border-radius: 2px;
}

/* 选择器样式 - 与主界面保持一致 */
.select-wrapper {
  position: relative;
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: #fff;
  transition: all 0.2s ease;
  outline: none;
  min-height: 80px;
  box-sizing: border-box;
}

.form-select:hover {
  border-color: #40a9ff;
}

.form-select:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-select option {
  padding: 8px 12px;
  color: #333;
}

.form-select option:checked {
  background: #1890ff;
  color: #fff;
}

.select-placeholder {
  position: absolute;
  top: 8px;
  left: 12px;
  color: #999;
  font-size: 14px;
  pointer-events: none;
}

/* 标签页样式 */
.add-chat-modal .n-tabs {
  margin: 0;
}

.add-chat-modal .n-tabs .n-tab-pane {
  padding: 0;
}

.add-chat-modal .n-tabs .n-tabs-nav {
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.add-chat-modal .n-tabs .n-tabs-tab {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  padding: 12px 16px;
  transition: color 0.2s ease;
  border: none;
  background: transparent;
}

.add-chat-modal .n-tabs .n-tabs-tab:hover {
  color: #333;
}

.add-chat-modal .n-tabs .n-tabs-tab--active {
  color: #1890ff;
  font-weight: 600;
}

.add-chat-modal .n-tabs .n-tabs-tab-line {
  background: #1890ff;
  height: 2px;
}
</style>
