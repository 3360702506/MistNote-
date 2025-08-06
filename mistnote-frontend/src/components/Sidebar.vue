<template>
  <div class="sidebar">
    <!-- 用户头像区域 -->
    <div class="user-section">
      <div class="user-avatar" @click="toggleUserMenu">
        <img :src="userInfo.avatar" alt="用户头像" />
        <div class="status-indicator" :class="userInfo.status"></div>
      </div>
    </div>

    <!-- 用户信息菜单 -->
    <div v-if="showUserMenu" class="user-menu-overlay" @click="closeUserMenu">
      <div class="user-menu" :class="`status-${userInfo.status}`" @click.stop>
        <div class="user-menu-header">
          <div class="user-menu-avatar" @click="selectAvatar">
            <img :src="userInfo.avatar" alt="用户头像" />
            <div class="avatar-edit-hint">点击更换头像</div>
          </div>
          <div class="user-menu-info">
            <div class="user-menu-name">{{ userInfo.name }}</div>
            <div class="user-menu-id">ID {{ userInfo.id }}</div>
            <div class="user-menu-status" @click="openStatusEdit">
              <span class="status-dot" :class="userInfo.status"></span>
              {{ userInfo.statusText }}
            </div>
            <div class="user-menu-level">
              <span class="level-icon">⭐</span>
              <span class="level-icon">🌙</span>
              <span class="level-icon">🌙</span>
              <span class="level-icon">🌙</span>
            </div>
          </div>
          <div class="user-menu-actions">
            <div class="like-count" @click="handleLike" ref="likeButton">
              <span class="like-icon">👍</span>
              <span>{{ userInfo.likes }}+</span>
            </div>
            <!-- 飞起的点赞动画 -->
            <div
              v-for="like in flyingLikes"
              :key="like.id"
              class="flying-like"
              :style="like.style"
              @animationend="removeFlyingLike(like.id)"
            >
              👍
            </div>
          </div>
        </div>

        <div class="user-menu-content">
          <div class="user-menu-item">
            <span class="item-label">签名</span>
            <div class="item-value" @click="openSignatureEdit">
              {{ userInfo.signature || '点击设置签名' }}
            </div>
          </div>

          <div class="user-menu-item">
            <span class="item-label">所在地</span>
            <span class="item-value">{{ userInfo.location }}</span>
          </div>

          <div class="user-menu-item clickable" @click="openQQSpace">
            <span class="item-label">信笺</span>
            <span class="item-value">查看我的信笺</span>
            <span class="item-arrow">></span>
          </div>
        </div>

        <div class="user-menu-footer">
          <button class="menu-btn secondary" @click="editProfile">编辑资料</button>
          <button class="menu-btn primary" @click="sendMessage">发消息</button>
        </div>
      </div>
    </div>

    <!-- 文件选择器 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleAvatarChange"
    />

    <!-- 签名编辑模态框 -->
    <div v-if="showSignatureEdit" class="signature-edit-overlay" @click="showSignatureEdit = false">
      <div class="signature-edit-modal" @click.stop>
        <div class="signature-edit-header">
          <h3>编辑个性签名</h3>
          <button class="close-btn" @click="showSignatureEdit = false">×</button>
        </div>
        <div class="signature-edit-content">
          <textarea
            v-model="tempSignature"
            placeholder="请输入个性签名..."
            maxlength="100"
            rows="4"
          ></textarea>
          <div class="char-count">{{ tempSignature.length }}/100</div>
        </div>
        <div class="signature-edit-footer">
          <button class="btn-cancel" @click="cancelSignatureEdit">取消</button>
          <button class="btn-save" @click="saveSignature">保存</button>
        </div>
      </div>
    </div>

    <!-- 状态编辑模态框 -->
    <div v-if="showStatusEdit" class="status-edit-overlay" @click="closeStatusEdit">
      <div class="status-edit-modal" @click.stop>
        <div class="status-edit-header">
          <h3>设置状态</h3>
          <button class="close-btn" @click="closeStatusEdit">×</button>
        </div>
        <div class="status-edit-content">
          <div class="status-options">
            <div 
              v-for="status in statusOptions" 
              :key="status.value"
              class="status-option"
              :class="{ active: tempStatus === status.value, [status.value]: true }"
              @click="selectStatus(status.value)"
            >
              <span class="status-dot" :class="status.value"></span>
              <span class="status-text">{{ status.text }}</span>
            </div>
          </div>
        </div>
        <div class="status-edit-footer">
          <button class="btn-cancel" @click="cancelStatusEdit">取消</button>
          <button class="btn-save" @click="saveStatus">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑资料模态框 -->
    <div v-if="showProfileEdit" class="profile-edit-overlay" @click="closeProfileEdit">
      <div class="profile-edit-modal" @click.stop>
        <div class="profile-edit-header">
          <h3>编辑资料</h3>
          <button class="close-btn" @click="closeProfileEdit">×</button>
        </div>
        <div class="profile-edit-content">
          <!-- 头像编辑 -->
          <div class="profile-avatar-section">
            <div class="profile-avatar" @click="selectAvatar">
              <img :src="userInfo.avatar" alt="用户头像" />
              <div class="avatar-edit-overlay">
                <span>点击更换</span>
              </div>
            </div>
          </div>
          
          <!-- 基本信息编辑 -->
          <div class="profile-form">
            <div class="form-item">
              <label>昵称</label>
              <input 
                v-model="tempProfileData.name" 
                placeholder="请输入昵称..."
                maxlength="20"
                class="form-input"
              />
              <div class="char-count">{{ tempProfileData.name.length }}/20</div>
            </div>
            
            <div class="form-item">
              <label>个性签名</label>
              <textarea 
                v-model="tempProfileData.signature" 
                placeholder="请输入个性签名..."
                maxlength="80"
                rows="3"
                class="form-textarea"
              ></textarea>
              <div class="char-count">{{ tempProfileData.signature.length }}/80</div>
            </div>
            
            <div class="form-item">
              <label>性别</label>
              <select v-model="tempProfileData.gender" class="form-select">
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            
            <div class="form-item">
              <label>生日</label>
              <input 
                v-model="tempProfileData.birthday" 
                type="date"
                class="form-input"
              />
            </div>
            
            <div class="form-item">
              <label>国家</label>
              <select v-model="tempProfileData.country" class="form-select">
                <option value="乌克兰">乌克兰</option>
                <option value="中国">中国</option>
                <option value="美国">美国</option>
                <option value="日本">日本</option>
              </select>
            </div>
            
            <div class="form-row">
              <div class="form-item">
                <label>省份</label>
                <input 
                  v-model="tempProfileData.province" 
                  placeholder="请选择"
                  class="form-input"
                />
              </div>
              <div class="form-item">
                <label>地区</label>
                <input 
                  v-model="tempProfileData.city" 
                  placeholder="基辅"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="profile-edit-footer">
          <button class="btn-cancel" @click="cancelProfileEdit">取消</button>
          <button class="btn-save" @click="saveProfile">保存</button>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <div class="nav-menu">
      <!-- MistNote图标 -->
      <div class="nav-item active" @click="setActive('mistnote')" :class="{ active: activeItem === 'mistnote' }">
        <div class="mistnote-icon">
          <img src="/logo.png" alt="MistNote" />
        </div>
      </div>

      <!-- 联系人 -->
      <div class="nav-item" @click="setActive('contacts')" :class="{ active: activeItem === 'contacts' }">
        <n-icon size="24" color="#fff">
          <PersonIcon />
        </n-icon>
        <div class="notification-badge">5</div>
      </div>

      <!-- 信笺（类似朋友圈） -->
      <div class="nav-item" @click="setActive('moments')" :class="{ active: activeItem === 'moments' }">
        <div class="moments-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="notification-dot"></div>
      </div>

      <!-- 九宫格应用 -->
      <div class="nav-item" @click="setActive('apps')" :class="{ active: activeItem === 'apps' }">
        <div class="grid-icon">
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
          <div class="grid-dot"></div>
        </div>
      </div>
    </div>

    <!-- 底部功能区 -->
    <div class="bottom-section">
      <!-- 收藏 -->
      <div class="nav-item" @click="setActive('favorites')" :class="{ active: activeItem === 'favorites' }">
        <n-icon size="24" color="#fff">
          <StarIcon />
        </n-icon>
      </div>

      <!-- 设置 -->
      <div class="nav-item" @click="setActive('settings')" :class="{ active: activeItem === 'settings' }">
        <n-icon size="24" color="#fff">
          <SettingsIcon />
        </n-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import {
  Person as PersonIcon,
  Star as StarIcon,
  Settings as SettingsIcon
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()

// 根据当前路由确定活跃项
const activeItem = computed(() => {
  if (route.path === '/chat') return 'mistnote'
  if (route.path === '/contacts') return 'contacts'
  return 'mistnote'
})

const setActive = (item) => {
  if (item === 'mistnote') {
    router.push('/chat')
  } else if (item === 'contacts') {
    router.push('/contacts')
  }
  // 其他导航项可以在这里添加路由
}

// 用户菜单相关
const showUserMenu = ref(false)
const showSignatureEdit = ref(false)
const showStatusEdit = ref(false)
const showProfileEdit = ref(false)
const tempSignature = ref('')
const tempStatus = ref('')
const tempProfileData = ref({})
const fileInput = ref(null)
const likeButton = ref(null)

// 状态选项
const statusOptions = ref([
  { value: 'online', text: '在线', color: '#52c41a' },
  { value: 'busy', text: '忙碌', color: '#ff4d4f' },
  { value: 'away', text: '离开', color: '#faad14' },
  { value: 'invisible', text: '隐身', color: '#d9d9d9' },
  { value: 'offline', text: '离线', color: '#8c8c8c' }
])

// 飞起点赞相关
const flyingLikes = ref([])
let likeIdCounter = 0

// 用户信息
const userInfo = ref({
  name: '南山无落梅',
  id: '3031688968',
  avatar: '/logo.png',
  status: 'online',
  statusText: '在线',
  signature: '白露横江，水光接天。纵一苇之所如，凌万顷之茫然',
  location: '基辅',
  likes: 9999
})

// 用户菜单方法
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const closeUserMenu = () => {
  showUserMenu.value = false
}

const selectAvatar = () => {
  fileInput.value?.click()
}

const handleAvatarChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      userInfo.value.avatar = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 签名编辑相关方法
const openSignatureEdit = () => {
  tempSignature.value = userInfo.value.signature
  showSignatureEdit.value = true
}

const saveSignature = () => {
  userInfo.value.signature = tempSignature.value
  showSignatureEdit.value = false
}

const cancelSignatureEdit = () => {
  tempSignature.value = userInfo.value.signature
  showSignatureEdit.value = false
}

// 状态编辑相关方法
const openStatusEdit = () => {
  tempStatus.value = userInfo.value.status
  showStatusEdit.value = true
}

const closeStatusEdit = () => {
  showStatusEdit.value = false
}

const selectStatus = (status) => {
  tempStatus.value = status
}

const saveStatus = () => {
  userInfo.value.status = tempStatus.value
  const statusOption = statusOptions.value.find(option => option.value === tempStatus.value)
  if (statusOption) {
    userInfo.value.statusText = statusOption.text
    userInfo.value.isOnline = tempStatus.value === 'online'
  }
  showStatusEdit.value = false
}

const cancelStatusEdit = () => {
  tempStatus.value = userInfo.value.status
  showStatusEdit.value = false
}

// 编辑资料相关方法
const openProfileEdit = () => {
  // 初始化临时数据
  tempProfileData.value = {
    name: userInfo.value.name,
    signature: userInfo.value.signature,
    gender: '男', // 默认值
    birthday: '1903-01-01', // 默认值
    country: '乌克兰',
    province: '',
    city: '基辅'
  }
  showProfileEdit.value = true
}

const closeProfileEdit = () => {
  showProfileEdit.value = false
}

const saveProfile = () => {
  // 保存用户信息
  userInfo.value.name = tempProfileData.value.name
  userInfo.value.signature = tempProfileData.value.signature
  // 这里可以添加更多字段的保存逻辑
  showProfileEdit.value = false
}

const cancelProfileEdit = () => {
  showProfileEdit.value = false
}

// 点赞功能
const handleLike = () => {
  userInfo.value.likes += 1
  createFlyingLike()
}

// 创建飞起的点赞动画
const createFlyingLike = () => {
  const id = ++likeIdCounter
  const randomDuration = 1.5 + Math.random() * 0.5 // 1.5s 到 2s

  // 随机选择不同的动画路径
  const animations = ['flyUp1', 'flyUp2', 'flyUp3', 'flyUp4']
  const randomAnimation = animations[Math.floor(Math.random() * animations.length)]

  const flyingLike = {
    id,
    style: {
      animation: `${randomAnimation} ${randomDuration}s ease-out forwards`
    }
  }

  flyingLikes.value.push(flyingLike)

  // 确保在动画结束后清理
  setTimeout(() => {
    removeFlyingLike(id)
  }, randomDuration * 1000 + 100)
}

// 移除完成动画的点赞
const removeFlyingLike = (id) => {
  const index = flyingLikes.value.findIndex(like => like.id === id)
  if (index > -1) {
    flyingLikes.value.splice(index, 1)
  }
}

const editProfile = () => {
  openProfileEdit()
}

const sendMessage = () => {
  alert('发消息功能')
}

const openQQSpace = () => {
  alert('打开信笺功能')
}
</script>

<style scoped>
.sidebar {
  width: 60px;
  height: 100%;
  background: linear-gradient(180deg, #1890ff 0%, #096dd9 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.user-section {
  margin-bottom: 16px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.status-indicator.online {
  background-color: #52c41a;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.nav-item {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: rgba(255, 255, 255, 0.1);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.avatar-group {
  display: grid;
  grid-template-columns: repeat(2, 8px);
  grid-template-rows: repeat(2, 8px);
  gap: 2px;
  position: relative;
}

.mini-avatar {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.8);
}

.mini-avatar:nth-child(3) {
  grid-column: 1 / 3;
  width: 18px;
  border-radius: 3px;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.notification-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
}

.grid-icon {
  display: grid;
  grid-template-columns: repeat(3, 4px);
  grid-template-rows: repeat(3, 4px);
  gap: 2px;
}

.grid-dot {
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 1px;
}

.moments-icon {
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mistnote-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mistnote-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.bottom-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: center;
  margin-top: auto;
  padding-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 50px;
  }
  
  .user-avatar,
  .nav-item {
    width: 36px;
    height: 36px;
  }
}

/* 用户菜单样式 */
.user-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 60px 0 0 70px;
}

.user-menu {
  position: absolute;
  top: 70px;
  left: 10px;
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 1);
  z-index: 1000;
  overflow: hidden;
  transition: all 0.3s ease;
  animation: slideIn 0.2s ease-out;
}

/* 移除状态背景渐变，保持纯白色背景 */

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-menu-header {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.user-menu-avatar {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.user-menu-avatar:hover {
  transform: scale(1.05);
}

.user-menu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  text-align: center;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.user-menu-avatar:hover .avatar-edit-hint {
  opacity: 1;
}

.user-menu-info {
  flex: 1;
}

.user-menu-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.user-menu-id {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.user-menu-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
}

.status-dot.offline {
  background: #d9d9d9;
}

.user-menu-level {
  display: flex;
  gap: 4px;
}

.level-icon {
  font-size: 16px;
}

.user-menu-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.like-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
}

.like-icon {
  font-size: 16px;
}

.user-menu-content {
  padding: 0 20px;
}

.user-menu-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.user-menu-item:last-child {
  border-bottom: none;
}

.user-menu-item.clickable {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-menu-item.clickable:hover {
  background-color: #f5f5f5;
  margin: 0 -20px;
  padding-left: 20px;
  padding-right: 20px;
}

.item-label {
  width: 60px;
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
}

.item-value {
  flex: 1;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.item-arrow {
  color: #ccc;
  font-size: 14px;
}

.user-menu-footer {
  padding: 16px 20px;
  display: flex;
  gap: 12px;
  background: #fafafa;
}

.menu-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-btn.secondary {
  background: #f5f5f5;
  color: #666;
}

.menu-btn.secondary:hover {
  background: #e6e6e6;
}

.menu-btn.primary {
  background: #1890ff;
  color: white;
}

.menu-btn.primary:hover {
  background: #40a9ff;
}

/* 签名编辑模态框样式 */
.signature-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.signature-edit-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90vw;
  overflow: hidden;
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.signature-edit-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.signature-edit-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
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

.signature-edit-content {
  padding: 20px 24px;
}

.signature-edit-content textarea {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color 0.2s ease;
}

.signature-edit-content textarea:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.signature-edit-footer {
  padding: 16px 24px 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-save {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e6e6e6;
}

.btn-save {
  background: #1890ff;
  color: white;
}

.btn-save:hover {
  background: #40a9ff;
}

/* 点赞按钮样式 */
.user-menu-actions {
  position: relative;
  overflow: visible;
}

.like-count {
  cursor: pointer;
  transition: transform 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  outline: none;
  background: none;
  position: relative;
}

.like-count:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.1);
}

.like-count:active {
  transform: scale(0.95);
}

/* 飞起点赞动画 */
.flying-like {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  pointer-events: none;
  z-index: 10;
  color: #1890ff;
  font-weight: bold;
  text-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
  border: none;
  outline: none;
  background: none;
  user-select: none;
}

@keyframes flyUp1 {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0px) scale(1) rotate(0deg);
  }
  20% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(-20px) scale(1.2) rotate(10deg);
  }
  50% {
    opacity: 0.5;
    transform: translateX(calc(-50% + 25px)) translateY(-60px) scale(1.0) rotate(25deg);
  }
  80% {
    opacity: 0.2;
    transform: translateX(calc(-50% + 40px)) translateY(-90px) scale(0.7) rotate(35deg);
  }
  100% {
    opacity: 0;
    transform: translateX(calc(-50% + 50px)) translateY(-110px) scale(0.4) rotate(45deg);
  }
}

@keyframes flyUp2 {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0px) scale(1) rotate(0deg);
  }
  20% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(-15px) scale(1.1) rotate(-8deg);
  }
  50% {
    opacity: 0.5;
    transform: translateX(calc(-50% - 20px)) translateY(-55px) scale(1.0) rotate(-20deg);
  }
  80% {
    opacity: 0.2;
    transform: translateX(calc(-50% - 35px)) translateY(-85px) scale(0.8) rotate(-30deg);
  }
  100% {
    opacity: 0;
    transform: translateX(calc(-50% - 45px)) translateY(-105px) scale(0.5) rotate(-40deg);
  }
}

@keyframes flyUp3 {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0px) scale(1) rotate(0deg);
  }
  20% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(-25px) scale(1.3) rotate(15deg);
  }
  50% {
    opacity: 0.5;
    transform: translateX(calc(-50% + 10px)) translateY(-65px) scale(0.9) rotate(30deg);
  }
  80% {
    opacity: 0.2;
    transform: translateX(calc(-50% + 15px)) translateY(-95px) scale(0.6) rotate(40deg);
  }
  100% {
    opacity: 0;
    transform: translateX(calc(-50% + 20px)) translateY(-115px) scale(0.3) rotate(50deg);
  }
}

@keyframes flyUp4 {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0px) scale(1) rotate(0deg);
  }
  20% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(-18px) scale(1.15) rotate(-12deg);
  }
  50% {
    opacity: 0.5;
    transform: translateX(calc(-50% - 30px)) translateY(-50px) scale(1.1) rotate(-25deg);
  }
  80% {
    opacity: 0.2;
    transform: translateX(calc(-50% - 25px)) translateY(-80px) scale(0.7) rotate(-35deg);
  }
  100% {
    opacity: 0;
    transform: translateX(calc(-50% - 20px)) translateY(-100px) scale(0.4) rotate(-45deg);
  }
}

/* 点击时的额外反馈动画 */
.like-count:active .like-icon {
  animation: likePress 0.2s ease;
}

@keyframes likePress {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

/* 状态编辑模态框样式 */
.status-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.status-edit-modal {
  background: white;
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

.status-edit-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-edit-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-edit-content {
  padding: 20px 24px;
}

.status-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.status-option:hover {
  background: #f5f5f5;
}

.status-option.active {
  border-color: currentColor;
  font-weight: 500;
}

/* 不同状态的颜色 */
.status-option.online {
  color: #52c41a;
}

.status-option.online.active {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.15) 0%, rgba(82, 196, 26, 0.05) 100%);
  border-color: #52c41a;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

.status-option.busy {
  color: #ff4d4f;
}

.status-option.busy.active {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.05) 100%);
  border-color: #ff4d4f;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
}

.status-option.away {
  color: #faad14;
}

.status-option.away.active {
  background: linear-gradient(135deg, rgba(250, 173, 20, 0.15) 0%, rgba(250, 173, 20, 0.05) 100%);
  border-color: #faad14;
  box-shadow: 0 2px 8px rgba(250, 173, 20, 0.2);
}

.status-option.invisible {
  color: #d9d9d9;
}

.status-option.invisible.active {
  background: linear-gradient(135deg, rgba(217, 217, 217, 0.15) 0%, rgba(217, 217, 217, 0.05) 100%);
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(217, 217, 217, 0.2);
}

.status-option.offline {
  color: #8c8c8c;
}

.status-option.offline.active {
  background: linear-gradient(135deg, rgba(140, 140, 140, 0.15) 0%, rgba(140, 140, 140, 0.05) 100%);
  border-color: #8c8c8c;
  box-shadow: 0 2px 8px rgba(140, 140, 140, 0.2);
}

.status-option .status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-option .status-dot.online {
  background: #52c41a;
}

.status-option .status-dot.busy {
  background: #ff4d4f;
}

.status-option .status-dot.away {
  background: #faad14;
}

.status-option .status-dot.invisible {
  background: #d9d9d9;
}

.status-option .status-dot.offline {
  background: #8c8c8c;
}

.status-text {
  font-size: 14px;
}

.status-edit-footer {
  padding: 16px 24px 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 编辑资料模态框样式 */
.profile-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.profile-edit-modal {
  background: white;
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

.profile-edit-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.profile-edit-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.profile-edit-content {
  padding: 20px 24px;
}

.profile-avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.profile-avatar:hover {
  transform: scale(1.05);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
  font-size: 12px;
}

.profile-avatar:hover .avatar-edit-overlay {
  opacity: 1;
}

.profile-form {
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

.form-input,
.form-textarea,
.form-select {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-item {
  flex: 1;
}

.profile-edit-footer {
  padding: 16px 24px 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  position: sticky;
  bottom: 0;
  background: white;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

/* 模态框动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
}

/* 状态点颜色联动 */
.status-dot.online {
  background: #52c41a !important;
}

.status-dot.busy {
  background: #ff4d4f !important;
}

.status-dot.away {
  background: #faad14 !important;
}

.status-dot.invisible {
  background: #d9d9d9 !important;
}

.status-dot.offline {
  background: #8c8c8c !important;
}
</style>
