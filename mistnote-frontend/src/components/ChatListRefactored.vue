<template>
  <div class="chat-list-refactored">
    <!-- 搜索框 - 使用 QSearchBox 组件 -->
    <div class="search-section">
      <q-search-box 
        v-model="searchQuery"
        placeholder="搜索聊天"
        @search="handleSearch"
      >
        <template #suffix>
          <q-button 
            type="text"
            circle
            size="small"
            @click="showAddModal = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </q-button>
        </template>
      </q-search-box>
    </div>

    <!-- 聊天列表 - 使用 QListItem 组件 -->
    <div class="chat-list-container">
      <transition-group name="list">
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
          @click="selectChat(chat)"
          @contextmenu="showContextMenu($event, chat)"
        />
      </transition-group>
      
      <!-- 空状态 -->
      <div v-if="filteredChats.length === 0" class="empty-state">
        <img src="/empty-chat.svg" alt="No chats" class="empty-image" />
        <p class="empty-text">暂无聊天记录</p>
        <q-button type="primary" @click="showAddModal = true">
          开始新的聊天
        </q-button>
      </div>
    </div>

    <!-- 添加聊天模态框 - 使用 QModal 组件 -->
    <q-modal
      v-model="showAddModal"
      title="添加聊天"
      size="medium"
      :show-footer="false"
    >
      <div class="add-chat-content">
        <!-- 标签页 -->
        <div class="tabs">
          <q-button
            :type="activeTab === 'friend' ? 'primary' : 'default'"
            @click="activeTab = 'friend'"
          >
            添加好友
          </q-button>
          <q-button
            :type="activeTab === 'group' ? 'primary' : 'default'"
            @click="activeTab = 'group'"
          >
            创建群聊
          </q-button>
        </div>

        <!-- 添加好友表单 -->
        <div v-if="activeTab === 'friend'" class="form-section">
          <div class="form-item">
            <label>用户ID</label>
            <q-search-box
              v-model="friendForm.userId"
              placeholder="请输入5位数用户ID"
              :clearable="true"
              :debounce="0"
            />
          </div>
          
          <div class="form-item">
            <label>备注名称</label>
            <q-search-box
              v-model="friendForm.nickname"
              placeholder="可选，为好友设置备注"
              :clearable="true"
              :debounce="0"
            />
          </div>
          
          <div class="form-item">
            <label>验证消息</label>
            <textarea
              v-model="friendForm.message"
              class="form-textarea"
              placeholder="请输入验证消息"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <q-button @click="showAddModal = false">取消</q-button>
            <q-button 
              type="primary"
              :loading="isAddingFriend"
              @click="addFriend"
            >
              发送好友请求
            </q-button>
          </div>
        </div>

        <!-- 创建群聊表单 -->
        <div v-if="activeTab === 'group'" class="form-section">
          <div class="form-item">
            <label>群聊名称</label>
            <q-search-box
              v-model="groupForm.name"
              placeholder="请输入群聊名称"
              :clearable="true"
              :debounce="0"
            />
          </div>
          
          <div class="form-item">
            <label>群聊描述</label>
            <textarea
              v-model="groupForm.description"
              class="form-textarea"
              placeholder="请输入群聊描述"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <q-button @click="showAddModal = false">取消</q-button>
            <q-button 
              type="primary"
              :loading="isCreatingGroup"
              @click="createGroup"
            >
              创建群聊
            </q-button>
          </div>
        </div>
      </div>
    </q-modal>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        top: contextMenu.y + 'px',
        left: contextMenu.x + 'px'
      }"
      @click.stop
    >
      <div class="context-menu-item" @click="markAsRead">
        <i class="icon-read"></i>
        标记为已读
      </div>
      <div class="context-menu-item" @click="toggleMute">
        <i class="icon-mute"></i>
        {{ contextMenu.chat?.muted ? '取消静音' : '消息免打扰' }}
      </div>
      <div class="context-menu-item" @click="pinChat">
        <i class="icon-pin"></i>
        置顶聊天
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" @click="deleteChat">
        <i class="icon-delete"></i>
        删除聊天
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { 
  QSearchBox, 
  QListItem, 
  QButton, 
  QModal,
  QAvatar,
  QBadge 
} from './qqnt'

// 状态管理
const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const searchQuery = ref('')
const activeChatId = ref(null)
const showAddModal = ref(false)
const activeTab = ref('friend')
const isAddingFriend = ref(false)
const isCreatingGroup = ref(false)

// 聊天列表数据
const chats = ref([
  {
    id: '1',
    name: '张三',
    avatar: '/avatars/user1.jpg',
    lastMessage: '明天见！',
    sender: null,
    time: new Date(),
    unreadCount: 2,
    online: true,
    muted: false
  },
  {
    id: '2',
    name: '项目组',
    avatar: '/avatars/group1.jpg',
    lastMessage: '会议纪要已发送',
    sender: '李四',
    time: new Date(Date.now() - 3600000),
    unreadCount: 5,
    online: false,
    muted: true
  }
])

// 表单数据
const friendForm = ref({
  userId: '',
  nickname: '',
  message: ''
})

const groupForm = ref({
  name: '',
  description: ''
})

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  chat: null
})

// 计算属性
const filteredChats = computed(() => {
  if (!searchQuery.value) return chats.value
  
  const query = searchQuery.value.toLowerCase()
  return chats.value.filter(chat => 
    chat.name.toLowerCase().includes(query) ||
    chat.lastMessage.toLowerCase().includes(query)
  )
})

// 方法
const handleSearch = (query) => {
  console.log('搜索:', query)
}

const selectChat = (chat) => {
  activeChatId.value = chat.id
  router.push(`/chat/${chat.id}`)
}

const showContextMenu = (event, chat) => {
  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    chat
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

const markAsRead = () => {
  if (contextMenu.value.chat) {
    contextMenu.value.chat.unreadCount = 0
  }
  hideContextMenu()
}

const toggleMute = () => {
  if (contextMenu.value.chat) {
    contextMenu.value.chat.muted = !contextMenu.value.chat.muted
  }
  hideContextMenu()
}

const pinChat = () => {
  // 实现置顶逻辑
  hideContextMenu()
}

const deleteChat = () => {
  if (contextMenu.value.chat) {
    const index = chats.value.findIndex(c => c.id === contextMenu.value.chat.id)
    if (index > -1) {
      chats.value.splice(index, 1)
    }
  }
  hideContextMenu()
}

const addFriend = async () => {
  isAddingFriend.value = true
  try {
    // 调用API添加好友
    console.log('添加好友:', friendForm.value)
    // await friendAPI.sendRequest(friendForm.value)
    showAddModal.value = false
    friendForm.value = { userId: '', nickname: '', message: '' }
  } catch (error) {
    console.error('添加好友失败:', error)
  } finally {
    isAddingFriend.value = false
  }
}

const createGroup = async () => {
  isCreatingGroup.value = true
  try {
    // 调用API创建群聊
    console.log('创建群聊:', groupForm.value)
    // await groupAPI.create(groupForm.value)
    showAddModal.value = false
    groupForm.value = { name: '', description: '' }
  } catch (error) {
    console.error('创建群聊失败:', error)
  } finally {
    isCreatingGroup.value = false
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped>
.chat-list-refactored {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  position: relative;
}

/* 搜索区域 */
.search-section {
  padding: 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

/* 聊天列表容器 */
.chat-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-image {
  width: 120px;
  height: 120px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  color: #999;
  font-size: 14px;
  margin-bottom: 20px;
}

/* 添加聊天内容 */
.add-chat-content {
  padding: 20px;
}

.tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-textarea {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  border-color: #0088ff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  z-index: 3000;
  min-width: 160px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-item.danger {
  color: #ff4d4f;
}

.context-menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

/* 自定义滚动条 */
.chat-list-container::-webkit-scrollbar {
  width: 6px;
}

.chat-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.chat-list-container::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.chat-list-container::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
