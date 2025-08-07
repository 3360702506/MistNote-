<template>
  <div class="contacts-view">
    <!-- 左侧边栏 -->
    <Sidebar />

    <!-- 联系人列表 -->
    <ContactsList 
      @contact-select="handleContactSelect" 
      @show-friend-notifications="showFriendNotifications"
    />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 好友通知 -->
      <FriendNotification
        v-if="showNotifications"
        @friend-added="handleFriendAdded"
      />
      
      <!-- 联系人详情 -->
      <ContactDetail
        v-else-if="selectedContactId"
        :contact="getSelectedContact()"
      />

      <!-- 占位符 -->
      <div v-else class="contact-placeholder-container">
        <div class="contact-placeholder">
          <div class="placeholder-logo">
            <img src="/logo.png" alt="MistNote" />
          </div>
          <h2>MistNote</h2>
          <p>选择一个联系人查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import ContactsList from '../components/ContactsList.vue'
import ContactDetail from '../components/ContactDetail.vue'
import FriendNotification from '../components/FriendNotification.vue'

const selectedContactId = ref(null)
const showNotifications = ref(false)

const handleContactSelect = (contactId) => {
  selectedContactId.value = contactId
  showNotifications.value = false
}

const showFriendNotifications = () => {
  showNotifications.value = true
  selectedContactId.value = null
}

const handleFriendAdded = (friend) => {
  // 处理好友添加成功的逻辑
  console.log('Friend added:', friend)
  // 可以在这里刷新好友列表或其他操作
}

// 模拟联系人数据
const contactsData = {
  1: { 
    id: 1,
    name: '南山无落梅', 
    qq: '3031688968',
    avatar: '/logo.png',
    isOnline: true,
    status: 'online',
    signature: '白露横江，水光接天。纵一苇之所如，凌万顷之茫然',
    gender: '男',
    age: '122岁',
    birthday: '1月1日',
    constellation: '摩羯座',
    location: '基辅',
    level: '其辅',
    likes: 9999,
    group: '我的好友',
    phone: '138****8888',
    email: 'nanshan@example.com'
  },
  2: { 
    id: 2,
    name: '张三', 
    qq: '1234567890',
    avatar: '/logo.png',
    isOnline: false,
    status: 'offline',
    signature: '忙碌中...',
    gender: '男',
    age: '25岁',
    birthday: '3月15日',
    constellation: '双鱼座',
    location: '北京',
    level: '普通用户',
    likes: 156,
    group: '同学',
    phone: '139****9999',
    email: 'zhangsan@example.com'
  },
  3: { 
    id: 3,
    name: '李四', 
    qq: '9876543210',
    avatar: '/logo.png',
    isOnline: true,
    status: 'online',
    signature: '生活美好',
    gender: '女',
    age: '23岁',
    birthday: '7月20日',
    constellation: '巨蟹座',
    location: '上海',
    level: 'VIP用户',
    likes: 888,
    group: '朋友',
    phone: '137****7777',
    email: 'lisi@example.com'
  }
}

const getSelectedContact = () => {
  return contactsData[selectedContactId.value] || null
}
</script>

<style scoped>
.contacts-view {
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

.contact-placeholder-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-placeholder {
  text-align: center;
  color: #999;
}

.placeholder-logo {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  opacity: 0.3;
}

.placeholder-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.contact-placeholder h2 {
  font-size: 24px;
  font-weight: 300;
  margin-bottom: 8px;
  color: #666;
}

.contact-placeholder p {
  font-size: 16px;
  margin: 0;
}
</style>
