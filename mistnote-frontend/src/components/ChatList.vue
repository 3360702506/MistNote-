<template>
  <div class="chat-list" :style="{ width: chatListWidth + 'px' }">
    <!-- 搜索框 - 使用 QSearchBox 组件 -->
    <div class="search-section">
      <q-search-box 
        v-model="searchQuery"
        placeholder="搜索"
        :clearable="true"
        @search="handleSearch"
      >
        <template #suffix>
          <n-icon size="16" color="#999" class="add-icon" @click="addChat">
            <AddIcon />
          </n-icon>
        </template>
      </q-search-box>
    </div>

    <!-- 聊天列表 - 使用 QListItem 组件 -->
    <div class="chat-items">
      <q-list-item
        v-for="chat in filteredChats"
        :key="chat.id"
        :title="chat.name"
        :description="chat.lastMessage"
        :description-prefix="chat.sender ? `${chat.sender}:` : ''"
        :time="chat.time"
        :avatar="chat.avatar"
        :avatar-status="chat.online ? 'online' : 'offline'"
        :badge="chat.unreadCount"
        :badge-type="chat.muted ? 'default' : 'danger'"
        :muted="chat.muted"
        :active="chat.id === activeChatId"
        :draggable="true"
        @click="selectChat(chat.id)"
        @dragstart="(e) => startDrag(e, chat.id)"
        @dragend="(e) => endDrag(e, chat.id)"
        @contextmenu.prevent="(e) => showContextMenu(e, chat)"
        @badge-dismiss="() => clearUnreadCount(chat.id)"
        class="chat-list-item"
      />
    </div>

    <!-- 右键菜单 -->
    <q-context-menu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @close="contextMenuVisible = false"
      @select="handleMenuSelect"
    />

    <!-- 拖拽手柄 -->
    <div
      class="resize-handle"
      @mousedown="startResize"
    ></div>

    <!-- 添加聊天弹窗 - 使用 QModal 组件 -->
    <q-modal
      v-model="showAddModal"
      title="添加聊天"
      size="medium"
      :show-footer="false"
    >
      <div class="add-chat-content">
        
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
    </q-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon, NInput, NButton, NModal, NSelect, NScrollbar, useMessage } from 'naive-ui'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
  ChevronDown as ChevronDownIcon,
  VolumeOff as MuteIcon
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import socketService from '@/services/socket'
import messageService from '@/services/messageService'
import { QSearchBox, QListItem, QModal, QContextMenu } from './qqnt'

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

// 右键菜单控制
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTarget = ref(null)
const contextMenuItems = ref([])

// 模拟聊天数据
const chatList = ref([
  // 初始为空，新好友会动态添加到这里
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
    // 查找完整的聊天数据对象
    const chatData = chatList.value.find(chat => chat.id === chatId)
    if (chatData) {
      console.log('选择聊天数据:', chatData)
      emit('chat-select', chatData)
    } else {
      console.error('未找到聊天数据:', chatId)
    }
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
      // 不在这里显示消息，避免重复通知
      // message.success('好友请求已发送')
      showAddModal.value = false
      
      // 重置表单
      friendForm.value = {
        userId: '',
        nickname: '',
        message: '我是' + (userStore.user?.profile?.displayName || userStore.user?.userId || '用户')
      }
      
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
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        friendOptions.value = result.data.map(friend => ({
          label: friend.nickname || friend.displayName || friend.userId,
          value: friend.userId
        }))
      } else {
        console.error('好友列表数据格式错误:', result)
        friendOptions.value = []
      }
    }
  } catch (error) {
    console.error('加载好友列表失败:', error)
  }
}

// 全局事件监听
const setupGlobalEventListeners = () => {
  console.log('设置ChatList全局事件监听器')
  console.log('当前用户ID:', userStore.user?._id)
  console.log('当前用户信息:', userStore.user)
  
  // 监听好友请求被接受事件
  const handleFriendRequestAccepted = async (event) => {
    const data = event.detail
    console.log('=== ChatList收到friendRequestAccepted事件 ===', data)
    console.log('当前chatList长度:', chatList.value.length)
    
    try {
      // 使用用户缓存服务获取用户信息
      const { default: userCacheService } = await import('@/services/userCacheService')
      const cachedUserInfo = await userCacheService.getUserInfo(data.friend.userId || data.friend._id)
      
      // 创建新的聊天记录
      const newChat = {
        id: data.friend._id,
        userId: data.friend.userId,
        name: cachedUserInfo?.profile?.displayName || data.friend.profile?.displayName || data.friend.userId,
        avatar: cachedUserInfo?.profile?.avatar || data.friend.profile?.avatar || '/default-avatar.png',
        lastMessage: data.welcomeMessage?.content || '我们已经成为好友了，快来聊天吧~',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 1,
        online: cachedUserInfo?.status === 'online' || true,
        muted: false,
        deleted: false,
        deletedAt: null,
        messageType: 'normal'
      }
      
      // 检查是否已存在，避免重复添加
      const exists = chatList.value.find(chat => chat.id === data.friend._id)
      if (!exists) {
        chatList.value.unshift(newChat) // 添加到列表顶部
        console.log('=== 新聊天项已添加到列表 ===', newChat)
        console.log('更新后chatList长度:', chatList.value.length)
      } else {
        console.log('聊天项已存在，跳过添加')
      }
    } catch (error) {
      console.error('处理好友请求接受事件失败:', error)
      // 如果缓存失败，使用原始数据
      const newChat = {
        id: data.friend._id,
        userId: data.friend.userId,
        name: data.friend.profile?.displayName || data.friend.userId,
        avatar: data.friend.profile?.avatar || '/default-avatar.png',
        lastMessage: data.welcomeMessage?.content || '我们已经成为好友了，快来聊天吧~',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 1,
        online: true,
        muted: false,
        deleted: false,
        deletedAt: null,
        messageType: 'normal'
      }
      
      const exists = chatList.value.find(chat => chat.id === data.friend._id)
      if (!exists) {
        chatList.value.unshift(newChat)
        console.log('=== 新聊天项已添加到列表（使用原始数据）===', newChat)
        console.log('更新后chatList长度:', chatList.value.length)
      }
    }
  }
  
  // 监听新好友添加事件
  const handleFriendAdded = async (event) => {
    const data = event.detail
    console.log('=== ChatList收到friendAdded事件 ===', data)
    console.log('当前chatList长度:', chatList.value.length)
    
    try {
      // 使用用户缓存服务获取用户信息
      const { default: userCacheService } = await import('@/services/userCacheService')
      const cachedUserInfo = await userCacheService.getUserInfo(data.friend.userId || data.friend._id)
      
      // 创建新的聊天记录
      const newChat = {
        id: data.friend._id,
        userId: data.friend.userId,
        name: cachedUserInfo?.profile?.displayName || data.friend.profile?.displayName || data.friend.userId,
        avatar: cachedUserInfo?.profile?.avatar || data.friend.profile?.avatar || '/default-avatar.png',
        lastMessage: '开始聊天吧！',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        online: cachedUserInfo?.status === 'online' || data.friend.isOnline || false,
        muted: false,
        deleted: false,
        deletedAt: null,
        messageType: 'normal'
      }
      
      // 检查是否已存在，避免重复添加
      const exists = chatList.value.find(chat => chat.id === data.friend._id)
      if (!exists) {
        chatList.value.unshift(newChat) // 添加到列表顶部
        console.log('=== 新聊天项已添加到列表 ===', newChat)
        console.log('更新后chatList长度:', chatList.value.length)
      } else {
        console.log('聊天项已存在，跳过添加')
      }
    } catch (error) {
      console.error('处理新好友添加事件失败:', error)
      // 如果缓存失败，使用原始数据
      const newChat = {
        id: data.friend._id,
        userId: data.friend.userId,
        name: data.friend.profile?.displayName || data.friend.userId,
        avatar: data.friend.profile?.avatar || '/default-avatar.png',
        lastMessage: '开始聊天吧！',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        online: data.friend.isOnline || false,
        muted: false,
        deleted: false,
        deletedAt: null,
        messageType: 'normal'
      }
      
      const exists = chatList.value.find(chat => chat.id === data.friend._id)
      if (!exists) {
        chatList.value.unshift(newChat)
        console.log('=== 新聊天项已添加到列表（使用原始数据）===', newChat)
        console.log('更新后chatList长度:', chatList.value.length)
      }
    }
  }
  
  // 添加事件监听器
  window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted)
  window.addEventListener('friendAdded', handleFriendAdded)
  
  // 返回清理函数
  return () => {
    window.removeEventListener('friendRequestAccepted', handleFriendRequestAccepted)
    window.removeEventListener('friendAdded', handleFriendAdded)
  }
}

// 初始化聊天列表
const initializeChatList = async () => {
  console.log('初始化聊天列表')
  
  try {
    // 获取好友列表并同步到聊天列表
    console.log('获取好友列表并同步到聊天列表...')
    const response = await fetch('http://localhost:5000/api/friends', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('获取到好友列表:', data)
      
      if (data.success && data.data) {
        // 使用用户缓存服务获取用户信息
        const { default: userCacheService } = await import('@/services/userCacheService')
        
        // 预加载好友的用户信息
        const friendIds = data.data.map(friend => friend.userId || friend._id)
        await userCacheService.preloadUsers(friendIds)
        
        // 将好友转换为聊天项（使用缓存的用户信息）
        const friendChats = await Promise.all(data.data.map(async (friend) => {
          try {
            // 从缓存获取用户信息
            const cachedUserInfo = await userCacheService.getUserInfo(friend.userId || friend._id)
            
            return {
              id: friend._id,
              userId: friend.userId,
              name: cachedUserInfo?.profile?.displayName || friend.profile?.displayName || friend.userId,
              avatar: cachedUserInfo?.profile?.avatar || friend.profile?.avatar || '/default-avatar.png',
              lastMessage: '开始聊天吧！',
              time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              unreadCount: 0,
              online: cachedUserInfo?.status === 'online' || friend.isOnline || false,
              muted: false,
              deleted: false,
              deletedAt: null,
              messageType: 'normal'
            }
          } catch (error) {
            console.error(`获取用户信息失败: ${friend.userId}`, error)
            // 如果缓存失败，使用原始数据
            return {
              id: friend._id,
              userId: friend.userId,
              name: friend.profile?.displayName || friend.userId,
              avatar: friend.profile?.avatar || '/default-avatar.png',
              lastMessage: '开始聊天吧！',
              time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              unreadCount: 0,
              online: friend.isOnline || false,
              muted: false,
              deleted: false,
              deletedAt: null,
              messageType: 'normal'
            }
          }
        }))
        
        // 更新聊天列表
        chatList.value = friendChats
        console.log('聊天列表已同步，共', friendChats.length, '个好友')
      }
    } else {
      console.error('获取好友列表失败:', response.status)
    }
  } catch (error) {
    console.error('获取好友列表出错:', error)
  }
  
  // TODO: 从API获取聊天记录数据
  // 这里可以添加获取聊天记录的逻辑
}

// 清理全局事件监听器
let cleanupGlobalListeners = null

// 生命周期
onMounted(() => {
  console.log('ChatList组件已挂载')
  
  // 初始化聊天列表（获取好友列表并同步）
  initializeChatList()
  
  // 设置全局事件监听器
  const cleanup = setupGlobalEventListeners()
  
  // 在组件卸载时清理
  onUnmounted(() => {
    console.log('清理ChatList全局事件监听器')
    cleanup()
  })
})

// 开始拖拽聊天项
const startDrag = (e, chatId) => {
  // 设置拖拽数据
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', chatId)
  }
  draggingChatId.value = chatId
  isDragging.value = true
}

// 结束拖拽聊天项
const endDrag = (e, chatId) => {
  draggingChatId.value = null
  isDragging.value = false
}

// 显示右键菜单
const showContextMenu = (e, chat) => {
  e.preventDefault()
  e.stopPropagation()
  
  contextMenuTarget.value = chat
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  
  // 根据聊天类型设置菜单项
  if (chat.type === 'friend' || !chat.type) {
    // 单人聊天菜单
    contextMenuItems.value = [
      { label: '置顶', action: () => togglePin(chat) },
      { label: '复制ID', action: () => copyUserId(chat) },
      { label: '标记未读', action: () => markAsUnread(chat) },
      { type: 'separator' },
      { label: '打开独立聊天窗口', action: () => openChatWindow(chat) },
      { label: '设置免打扰', action: () => toggleMute(chat) },
      { type: 'separator' },
      { label: '从消息列表中移除', action: () => removeChat(chat), danger: true },
      { label: '屏蔽此人消息', action: () => blockUser(chat), danger: true }
    ]
  } else {
    // 群聊菜单（可扩展）
    contextMenuItems.value = [
      { label: '置顶', action: () => togglePin(chat) },
      { label: '复制群号', action: () => copyUserId(chat) },
      { label: '标记未读', action: () => markAsUnread(chat) },
      { type: 'separator' },
      { label: '打开独立聊天窗口', action: () => openChatWindow(chat) },
      { label: '消息免打扰', action: () => toggleMute(chat) },
      { type: 'separator' },
      { label: '退出群聊', action: () => leaveGroup(chat), danger: true }
    ]
  }
  
  contextMenuVisible.value = true
}

// 处理菜单选择
const handleMenuSelect = (item) => {
  console.log('Menu item selected:', item)
}

// 菜单操作函数
const togglePin = (chat) => {
  chat.pinned = !chat.pinned
  console.log('Toggle pin:', chat.id)
}

const copyUserId = (chat) => {
  const userId = chat.userId || chat.id
  navigator.clipboard.writeText(userId.toString())
  message.success(`已复制ID: ${userId}`)
}

const markAsUnread = (chat) => {
  chat.unreadCount = chat.unreadCount || 1
  console.log('Mark as unread:', chat.id)
}

const openChatWindow = (chat) => {
  console.log('Open chat window:', chat.id)
  // TODO: 实现独立聊天窗口
}

const toggleMute = (chat) => {
  chat.muted = !chat.muted
  console.log('Toggle mute:', chat.id)
}

const removeChat = (chat) => {
  const index = chatList.value.findIndex(c => c.id === chat.id)
  if (index > -1) {
    chatList.value.splice(index, 1)
    message.success('已从消息列表中移除')
  }
}

const blockUser = (chat) => {
  console.log('Block user:', chat.id)
  message.warning('屏蔽功能暂未实现')
}

const leaveGroup = (chat) => {
  console.log('Leave group:', chat.id)
  message.warning('退群功能暂未实现')
}

// 清除未读消息数（badge拖动消除）
const clearUnreadCount = (chatId) => {
  const chat = chatList.value.find(c => c.id === chatId)
  if (chat) {
    chat.unreadCount = 0
    console.log('清除未读消息数:', chatId)
    
    // 可以添加动画效果或其他处理
    // 例如：向服务器发送已读状态
    // markAsRead(chatId)
  }
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

// 清理拖拽相关的样式
const cleanupDragStyles = () => {
  document.body.style.cursor = 'default'
  document.body.style.userSelect = 'auto'
}
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
  padding: 0;
}

/* QListItem 组件样式覆盖 */
.chat-list-item {
  margin: 0;
  border-radius: 0;
  transition: all 0.3s ease;
}

.chat-list-item:hover {
  background-color: #f8f9fa;
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
