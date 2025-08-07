<template>
  <div class="contacts-list" :style="{ width: contactsListWidth + 'px' }">
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
        <n-icon size="16" color="#999" class="add-icon" @click="addContact">
          <AddIcon />
        </n-icon>
      </div>
    </div>

    <!-- 好友管理器按钮 -->
    <div class="friend-manager-section">
      <div class="friend-manager-btn" @click="openFriendManager">
        <n-icon size="18" color="#666" class="manager-icon">
          <PeopleIcon />
        </n-icon>
        <span>好友管理器</span>
      </div>
    </div>

    <!-- 通知区域 -->
    <div class="notification-section">
      <div class="notification-item" @click="openFriendNotifications">
        <span class="notification-text">好友通知</span>
        <n-icon size="14" color="#999" class="arrow-icon">
          <ChevronForwardIcon />
        </n-icon>
      </div>
      <div class="notification-item" @click="openGroupNotifications">
        <span class="notification-text">群通知</span>
        <n-icon size="14" color="#999" class="arrow-icon">
          <ChevronForwardIcon />
        </n-icon>
      </div>
    </div>

    <!-- 分组标签 -->
    <div class="group-tabs">
      <div 
        class="group-tab" 
        :class="{ active: activeTab === 'friends' }"
        @click="setActiveTab('friends')"
      >
        好友
      </div>
      <div 
        class="group-tab" 
        :class="{ active: activeTab === 'groups' }"
        @click="setActiveTab('groups')"
      >
        群聊
      </div>
    </div>

    <!-- 联系人分组列表 -->
    <div class="contacts-groups" v-if="activeTab === 'friends'">
      <div
        v-for="group in filteredGroups"
        :key="group.name"
        class="contact-group"
      >
        <div 
          class="group-header" 
          @click="toggleGroup(group.name)"
          :class="{ expanded: expandedGroups.includes(group.name) }"
        >
          <n-icon size="12" color="#666" class="expand-icon">
            <ChevronForwardIcon />
          </n-icon>
          <span class="group-name">{{ group.name }}</span>
          <span class="group-count">{{ group.onlineCount }}/{{ group.totalCount }}</span>
        </div>
        
        <div 
          v-if="expandedGroups.includes(group.name)" 
          class="group-contacts"
        >
          <div
            v-for="contact in group.contacts"
            :key="contact.id"
            class="contact-item"
            :class="{ active: contact.id === activeContactId }"
            @click="selectContact(contact.id)"
          >
            <div class="contact-avatar">
              <img :src="contact.avatar" :alt="contact.name" />
              <div v-if="contact.isOnline" class="online-indicator"></div>
            </div>
            <div class="contact-info">
              <div class="contact-name">{{ contact.name }}</div>
              <div class="contact-signature">{{ contact.signature || '暂无签名' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 群聊列表 -->
    <div class="groups-list" v-else>
      <div class="empty-state">
        <n-icon size="48" color="#ccc">
          <PeopleIcon />
        </n-icon>
        <p>暂无群聊</p>
      </div>
    </div>

    <!-- 拖拽手柄 -->
    <div
      class="resize-handle"
      @mousedown="startResize"
    ></div>
    
    <!-- 添加好友对话框 -->
    <AddFriendDialog 
      :show="showAddFriendDialog"
      @update:show="showAddFriendDialog = $event"
      @friend-request-sent="handleFriendRequestSent"
    />
    
    <!-- 好友请求列表对话框 -->
    <n-modal :show="showFriendRequestList" @update:show="showFriendRequestList = $event" preset="card" title="好友通知" style="width: 500px;">
      <FriendRequestList 
        @friend-added="handleFriendAdded"
      />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon, NModal } from 'naive-ui'
import {
  Search as SearchIcon,
  Add as AddIcon,
  People as PeopleIcon,
  ChevronForward as ChevronForwardIcon
} from '@vicons/ionicons5'
import AddFriendDialog from './AddFriendDialog.vue'
import FriendRequestList from './FriendRequestList.vue'

const searchQuery = ref('')
const activeContactId = ref(null)
const activeTab = ref('friends')
const expandedGroups = ref(['我的设备', '机器人', '特别关心', '我的好友', '朋友', '家人', '同学'])

// 联系人列表宽度控制
const contactsListWidth = ref(280)
const minWidth = 200
const maxWidth = 500
const isResizing = ref(false)

// 模拟联系人数据
const contactsData = ref([
  {
    id: 1,
    name: '谢智贤',
    avatar: '/logo.png',
    isOnline: true,
    signature: '今天也要加油呀！',
    group: '我的好友'
  },
  {
    id: 2,
    name: '张三',
    avatar: '/logo.png',
    isOnline: false,
    signature: '忙碌中...',
    group: '同学'
  },
  {
    id: 3,
    name: '李四',
    avatar: '/logo.png',
    isOnline: true,
    signature: '生活美好',
    group: '朋友'
  },
  {
    id: 4,
    name: '王五',
    avatar: '/logo.png',
    isOnline: false,
    signature: '',
    group: '朋友'
  },
  {
    id: 5,
    name: '小助手',
    avatar: '/logo.png',
    isOnline: true,
    signature: '我是智能助手',
    group: '机器人'
  }
])

// 分组数据
const groupsData = [
  { name: '我的设备', contacts: [], priority: 1 },
  { name: '机器人', contacts: [], priority: 2 },
  { name: '特别关心', contacts: [], priority: 3 },
  { name: '我的好友', contacts: [], priority: 4 },
  { name: '朋友', contacts: [], priority: 5 },
  { name: '家人', contacts: [], priority: 6 },
  { name: '同学', contacts: [], priority: 7 },
  { name: 'xxx', contacts: [], priority: 8 }
]

// 计算分组联系人
const contactGroups = computed(() => {
  const groups = [...groupsData]
  
  // 将联系人分配到对应分组
  contactsData.value.forEach(contact => {
    const group = groups.find(g => g.name === contact.group)
    if (group) {
      group.contacts.push(contact)
    }
  })

  // 计算每个分组的在线人数和总人数
  groups.forEach(group => {
    group.totalCount = group.contacts.length
    group.onlineCount = group.contacts.filter(c => c.isOnline).length
  })

  // 只返回有联系人的分组，并按优先级排序
  return groups.filter(g => g.totalCount > 0).sort((a, b) => a.priority - b.priority)
})

// 过滤分组（根据搜索）
const filteredGroups = computed(() => {
  if (!searchQuery.value) {
    return contactGroups.value
  }
  
  return contactGroups.value.map(group => ({
    ...group,
    contacts: group.contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (contact.signature && contact.signature.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
  })).filter(group => group.contacts.length > 0)
})

// 定义事件
const emit = defineEmits(['contact-select'])

// 选择联系人
const selectContact = (contactId) => {
  activeContactId.value = contactId
  emit('contact-select', contactId)
}

// 切换分组展开/收起
const toggleGroup = (groupName) => {
  const index = expandedGroups.value.indexOf(groupName)
  if (index > -1) {
    expandedGroups.value.splice(index, 1)
  } else {
    expandedGroups.value.push(groupName)
  }
}

// 切换标签
const setActiveTab = (tab) => {
  activeTab.value = tab
}

// 对话框状态
const showAddFriendDialog = ref(false);
const showFriendRequestList = ref(false);

// 功能方法
const addContact = () => {
  showAddFriendDialog.value = true;
}

const openFriendManager = () => {
  console.log('打开好友管理器')
}

const openFriendNotifications = () => {
  showFriendRequestList.value = true;
}

const openGroupNotifications = () => {
  console.log('打开群通知')
}

// 处理好友请求发送成功
const handleFriendRequestSent = (data) => {
  console.log('好友请求已发送:', data);
}

// 处理好友添加成功
const handleFriendAdded = (friend) => {
  console.log('新好友添加:', friend);
  // 这里可以刷新好友列表或添加到现有列表
}

// 拖拽调整宽度
const startResize = (e) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = contactsListWidth.value

  const handleMouseMove = (e) => {
    if (!isResizing.value) return
    
    const deltaX = e.clientX - startX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    contactsListWidth.value = newWidth
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

onMounted(() => {
  // 默认展开所有分组
})

onUnmounted(() => {
  // 清理事件监听器
})
</script>

<style scoped>
.contacts-list {
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
}

.search-section {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.search-box {
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

.friend-manager-section {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.friend-manager-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: #666;
}

.friend-manager-btn:hover {
  background-color: #f5f5f5;
}

.notification-section {
  border-bottom: 1px solid #f0f0f0;
}

.notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: #666;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.group-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.group-tab {
  flex: 1;
  text-align: center;
  padding: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s ease;
  position: relative;
}

.group-tab.active {
  color: #1890ff;
}

.group-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: #1890ff;
}

.contacts-groups {
  flex: 1;
  overflow-y: auto;
}

.contact-group {
  border-bottom: 1px solid #f8f8f8;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  color: #666;
}

.group-header:hover {
  background-color: #f5f5f5;
}

.group-header.expanded .expand-icon {
  transform: rotate(90deg);
}

.expand-icon {
  margin-right: 6px;
  transition: transform 0.2s ease;
}

.group-name {
  flex: 1;
}

.group-count {
  font-size: 12px;
  color: #999;
}

.group-contacts {
  background: #fafafa;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 8px 24px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.contact-item:hover {
  background-color: #f0f0f0;
}

.contact-item.active {
  background-color: #e6f7ff;
}

.contact-avatar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.contact-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #52c41a;
  border: 2px solid white;
  border-radius: 50%;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 2px;
}

.contact-signature {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.groups-list {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  color: #ccc;
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

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
</style>
