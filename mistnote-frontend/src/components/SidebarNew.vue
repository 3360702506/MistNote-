<template>
  <div class="sidebar">
    <!-- 用户头像区域 -->
    <div class="user-avatar" @click="toggleUserMenu">
      <img :src="userStore.userAvatar" alt="用户头像" />
      <div v-if="userStore.user?.isOnline" class="status-indicator" :class="userStore.user?.status"></div>
    </div>

    <!-- 用户信息菜单 -->
    <div v-if="showUserMenu" class="user-menu-overlay" @click="closeUserMenu">
      <div class="user-menu" @click.stop>
        <div class="user-menu-header">
          <div class="user-menu-avatar" @click="selectAvatar">
            <img :src="userStore.userAvatar" alt="用户头像" />
            <div class="avatar-edit-hint">点击更换头像</div>
          </div>
          <div class="user-menu-info">
            <div class="user-menu-name">{{ userStore.userNickname }}</div>
            <div class="user-menu-id">ID {{ userStore.userId }}</div>
            <div class="user-menu-status" @click="openStatusEdit">
              <span class="status-dot" :class="userStore.user?.status"></span>
              {{ userStore.statusText }}
            </div>
          </div>
          <div class="user-menu-actions">
            <button class="like-count" @click="handleLike">
              <n-icon class="like-icon">
                <HeartOutline />
              </n-icon>
              {{ userStore.user?.likes || 0 }}
            </button>
          </div>
        </div>

        <div class="user-menu-content">
          <div class="user-menu-item clickable" @click="openSignatureEdit">
            <span class="item-label">签名</span>
            <span class="item-value">{{ userStore.user?.profile?.signature || '点击设置个性签名' }}</span>
            <n-icon class="item-arrow">
              <ChevronForwardOutline />
            </n-icon>
          </div>
          <div class="user-menu-item clickable" @click="openProfileEdit">
            <span class="item-label">资料</span>
            <span class="item-value">编辑个人资料</span>
            <n-icon class="item-arrow">
              <ChevronForwardOutline />
            </n-icon>
          </div>
        </div>

        <div class="user-menu-footer">
          <button class="menu-btn secondary" @click="closeUserMenu">取消</button>
          <button class="menu-btn primary" @click="userStore.logout">退出登录</button>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <div class="nav-menu">
      <div 
        class="nav-item" 
        :class="{ active: activeItem === 'chat' }"
        @click="navigateTo('/chat')"
      >
        <n-icon>
          <ChatbubbleEllipsesOutline />
        </n-icon>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: activeItem === 'contacts' }"
        @click="navigateTo('/contacts')"
      >
        <n-icon>
          <PeopleOutline />
        </n-icon>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: activeItem === 'settings' }"
        @click="navigateTo('/settings')"
      >
        <n-icon>
          <SettingsOutline />
        </n-icon>
      </div>
    </div>

    <!-- 状态编辑模态框 -->
    <n-modal v-model:show="showStatusEdit" class="status-edit-modal">
      <n-card style="width: 400px" title="设置状态" :bordered="false" size="huge" role="dialog">
        <template #header-extra>
          <n-button quaternary circle @click="showStatusEdit = false">
            <n-icon>
              <CloseOutline />
            </n-icon>
          </n-button>
        </template>
        
        <div class="status-options">
          <div 
            v-for="option in statusOptions" 
            :key="option.value"
            class="status-option"
            :class="[option.value, { active: tempStatus === option.value }]"
            @click="tempStatus = option.value"
          >
            <span class="status-dot" :class="option.value"></span>
            <span class="status-text">{{ option.text }}</span>
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <n-button @click="showStatusEdit = false">取消</n-button>
            <n-button type="primary" @click="saveStatus" :loading="userStore.isLoading">保存</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 签名编辑模态框 -->
    <n-modal v-model:show="showSignatureEdit" class="signature-edit-modal">
      <n-card style="width: 400px" title="编辑个性签名" :bordered="false" size="huge" role="dialog">
        <template #header-extra>
          <n-button quaternary circle @click="showSignatureEdit = false">
            <n-icon>
              <CloseOutline />
            </n-icon>
          </n-button>
        </template>
        
        <n-input
          v-model:value="tempSignature"
          type="textarea"
          placeholder="输入你的个性签名..."
          :maxlength="100"
          show-count
          :rows="3"
        />

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <n-button @click="showSignatureEdit = false">取消</n-button>
            <n-button type="primary" @click="saveSignature" :loading="userStore.isLoading">保存</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 编辑资料模态框 -->
    <n-modal v-model:show="showProfileEdit" class="profile-edit-modal">
      <n-card style="width: 500px; max-height: 80vh; overflow-y: auto;" title="编辑个人资料" :bordered="false" size="huge" role="dialog">
        <template #header-extra>
          <n-button quaternary circle @click="showProfileEdit = false">
            <n-icon>
              <CloseOutline />
            </n-icon>
          </n-button>
        </template>
        
        <n-form :model="profileForm" label-placement="left" label-width="80px">
          <n-form-item label="昵称">
            <n-input v-model:value="profileForm.nickname" placeholder="请输入昵称" />
          </n-form-item>
          <n-form-item label="性别">
            <n-radio-group v-model:value="profileForm.gender">
              <n-radio value="male">男</n-radio>
              <n-radio value="female">女</n-radio>
              <n-radio value="other">其他</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="生日">
            <n-date-picker v-model:value="profileForm.birthday" type="date" />
          </n-form-item>
          <n-form-item label="国家">
            <n-input v-model:value="profileForm.country" placeholder="请输入国家" />
          </n-form-item>
          <n-form-item label="省份">
            <n-input v-model:value="profileForm.province" placeholder="请输入省份" />
          </n-form-item>
          <n-form-item label="城市">
            <n-input v-model:value="profileForm.city" placeholder="请输入城市" />
          </n-form-item>
          <n-form-item label="手机">
            <n-input v-model:value="profileForm.phone" placeholder="请输入手机号" />
          </n-form-item>
        </n-form>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <n-button @click="showProfileEdit = false">取消</n-button>
            <n-button type="primary" @click="saveProfile" :loading="userStore.isLoading">保存</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 头像上传输入 -->
    <input
      ref="avatarInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleAvatarUpload"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  ChatbubbleEllipsesOutline, 
  PeopleOutline, 
  SettingsOutline, 
  CloseOutline,
  HeartOutline,
  ChevronForwardOutline
} from '@vicons/ionicons5'
import { 
  NIcon, 
  NButton, 
  NInput, 
  NModal, 
  NCard, 
  NForm, 
  NFormItem, 
  NDatePicker, 
  NRadioGroup, 
  NRadio,
  useMessage
} from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { uploadAPI } from '@/services/api'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

// 响应式数据
const showUserMenu = ref(false)
const showStatusEdit = ref(false)
const showSignatureEdit = ref(false)
const showProfileEdit = ref(false)
const tempStatus = ref('')
const tempSignature = ref('')
const avatarInput = ref(null)

// 个人资料表单
const profileForm = reactive({
  nickname: '',
  gender: '',
  birthday: null,
  country: '',
  province: '',
  city: '',
  phone: ''
})

// 状态选项
const statusOptions = ref([
  { value: 'online', text: '在线' },
  { value: 'busy', text: '忙碌' },
  { value: 'away', text: '离开' },
  { value: 'invisible', text: '隐身' },
  { value: 'offline', text: '离线' }
])

// 计算属性
const activeItem = computed(() => {
  if (route.path.includes('/chat')) return 'chat'
  if (route.path.includes('/contacts')) return 'contacts'
  if (route.path.includes('/settings')) return 'settings'
  return 'chat'
})

// 方法
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const closeUserMenu = () => {
  showUserMenu.value = false
}

const navigateTo = (path) => {
  router.push(path)
}

const openStatusEdit = () => {
  tempStatus.value = userStore.user?.status || 'online'
  showStatusEdit.value = true
}

const saveStatus = async () => {
  const statusOption = statusOptions.value.find(option => option.value === tempStatus.value)
  if (statusOption) {
    const result = await userStore.updateStatus(tempStatus.value, statusOption.text)
    if (result.success) {
      message.success('状态更新成功')
      showStatusEdit.value = false
    } else {
      message.error(result.message || '状态更新失败')
    }
  }
}

const openSignatureEdit = () => {
  tempSignature.value = userStore.user?.profile?.signature || ''
  showSignatureEdit.value = true
}

const saveSignature = async () => {
  const result = await userStore.updateProfile({
    profile: { signature: tempSignature.value }
  })
  if (result.success) {
    message.success('签名更新成功')
    showSignatureEdit.value = false
  } else {
    message.error(result.message || '签名更新失败')
  }
}

const openProfileEdit = () => {
  const profile = userStore.user?.profile || {}
  profileForm.nickname = profile.nickname || ''
  profileForm.gender = profile.gender || ''
  profileForm.birthday = profile.birthday ? new Date(profile.birthday).getTime() : null
  profileForm.country = profile.country || ''
  profileForm.province = profile.province || ''
  profileForm.city = profile.city || ''
  profileForm.phone = profile.phone || ''
  showProfileEdit.value = true
}

const saveProfile = async () => {
  const profileData = {
    profile: {
      nickname: profileForm.nickname,
      gender: profileForm.gender,
      birthday: profileForm.birthday ? new Date(profileForm.birthday) : null,
      country: profileForm.country,
      province: profileForm.province,
      city: profileForm.city,
      phone: profileForm.phone
    }
  }
  
  const result = await userStore.updateProfile(profileData)
  if (result.success) {
    message.success('资料更新成功')
    showProfileEdit.value = false
  } else {
    message.error(result.message || '资料更新失败')
  }
}

const selectAvatar = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    const response = await uploadAPI.uploadAvatar(file)
    if (response.success) {
      // 更新用户头像
      await userStore.updateProfile({
        profile: { avatar: response.data.avatarUrl }
      })
      message.success('头像更新成功')
    }
  } catch (error) {
    message.error('头像上传失败')
  }
  
  // 清空文件输入
  event.target.value = ''
}

const handleLike = () => {
  // 点赞动画效果
  message.success('感谢点赞！')
}

// 生命周期
onMounted(() => {
  // 从本地存储恢复用户状态
  userStore.restoreUserFromStorage()
})
</script>

<style scoped>
.sidebar {
  width: 60px;
  height: 100vh;
  background: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  position: relative;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  margin-bottom: 30px;
  transition: transform 0.2s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
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
  border: 2px solid #2c3e50;
}

.status-indicator.online {
  background: #52c41a;
}

.status-indicator.busy {
  background: #ff4d4f;
}

.status-indicator.away {
  background: #faad14;
}

.status-indicator.invisible {
  background: #d9d9d9;
}

.status-indicator.offline {
  background: #8c8c8c;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nav-item {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #95a5a6;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ecf0f1;
}

.nav-item.active {
  background: #3498db;
  color: white;
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
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 320px;
  overflow: hidden;
  animation: slideIn 0.2s ease-out;
}

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
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.user-menu-status:hover {
  background: rgba(0, 0, 0, 0.05);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #52c41a;
}

.status-dot.busy {
  background: #ff4d4f;
}

.status-dot.away {
  background: #faad14;
}

.status-dot.invisible {
  background: #d9d9d9;
}

.status-dot.offline {
  background: #8c8c8c;
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
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.like-count:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
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

/* 状态选择样式 */
.status-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.status-option:hover {
  background: #f5f5f5;
}

.status-option.active {
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(24, 144, 255, 0.05) 100%);
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.status-text {
  font-size: 14px;
  color: #333;
}
</style>
