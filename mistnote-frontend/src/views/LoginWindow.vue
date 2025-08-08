<template>
  <div class="login-window">
    <!-- 拖动区域 -->
    <div class="drag-area" @mousedown="startDrag"></div>
    
    <!-- 流光背景 -->
    <div class="flowing-light-bg">
      <div class="light-beam light-beam-1"></div>
      <div class="light-beam light-beam-2"></div>
      <div class="light-beam light-beam-3"></div>
      <div class="light-beam light-beam-4"></div>
      <div class="light-beam light-beam-5"></div>
      <div class="gradient-overlay"></div>
    </div>

    <!-- 窗口控制按钮 -->
    <div class="window-controls">
      <button class="control-btn minimize-btn" @click="minimizeWindow">
        <svg viewBox="0 0 12 12" fill="currentColor">
          <rect x="2" y="5.5" width="8" height="1"/>
        </svg>
      </button>
      <button class="control-btn close-btn" @click="closeWindow">
        <svg viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 4.586L2.707 1.293a1 1 0 00-1.414 1.414L4.586 6 1.293 9.293a1 1 0 101.414 1.414L6 7.414l3.293 3.293a1 1 0 001.414-1.414L7.414 6l3.293-3.293a1 1 0 00-1.414-1.414L6 4.586z"/>
        </svg>
      </button>
    </div>

    <!-- 登录表单容器 -->
    <div class="login-container">
      <!-- 头像区域 -->
      <div class="avatar-section">
        <div class="avatar-container">
          <img src="/logo.png" alt="用户头像" class="user-avatar" />
        </div>
      </div>

      <!-- 登录表单 -->
      <div v-show="!showRegisterForm" class="login-form">
        <!-- 用户ID输入 -->
        <div class="input-group">
          <n-input
            v-model="loginForm.userId"
            placeholder="请输入ID"
            size="large"
            class="login-input userid-input"
            :bordered="false"
            maxlength="5"
            @keyup.enter="handleLogin"
            @input="formatUserId"
          >
            <template #prefix>
              <span class="id-prefix">ID:</span>
            </template>
          </n-input>
        </div>

        <!-- 密码输入 -->
        <div class="input-group">
          <n-input
            :value="loginForm.password"
            type="password"
            placeholder="输入密码"
            size="large"
            class="login-input password-input"
            :bordered="false"
            show-password-on="click"
            @keyup.enter="handleLogin"
            @input="handlePasswordInputManual"
            @update:value="handlePasswordInputManual"
          />
        </div>

        <!-- 记住密码选项 -->
        <div class="remember-section">
          <n-checkbox v-model="rememberPassword" size="small">
            <span class="remember-text">已阅读并同意服务协议和隐私保护指引</span>
          </n-checkbox>
        </div>

        <!-- 登录按钮 -->
        <div class="login-button-section">
          <n-button
            type="primary"
            size="large"
            class="login-button"
            :loading="isLoading"
            @click="handleLogin"
            block
          >
            登录
          </n-button>
        </div>

        <!-- 底部链接 -->
        <div class="bottom-links">
          <a href="#" class="link" @click.prevent="showRegister">注册账号</a>
          <a href="#" class="link">忘记密码</a>
        </div>
      </div>

      <!-- 注册表单 -->
      <div v-show="showRegisterForm" class="register-form">
        <!-- 生成的ID显示 -->
        <div class="generated-id">
          <div class="id-label">您的ID</div>
          <div class="id-value">{{ generatedUserId }}</div>
          <div class="id-note">请记住您的ID，登录时需要使用</div>
        </div>

        <!-- 显示名称输入 -->
        <div class="input-group">
          <n-input
            v-model="registerForm.displayName"
            placeholder="请输入您的昵称"
            size="large"
            class="login-input"
            :bordered="false"
            maxlength="30"
            @keyup.enter="handleRegister"
            @input="handleDisplayNameInput"
            @update:value="handleDisplayNameUpdate"
          >
            <template #prefix>
              <span class="input-prefix">昵称:</span>
            </template>
          </n-input>
        </div>

        <!-- 密码输入 -->
        <div class="input-group">
          <n-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            size="large"
            class="login-input"
            :bordered="false"
            show-password-on="click"
            @keyup.enter="handleRegister"
            @input="handlePasswordInput"
            @update:value="handlePasswordUpdate"
          />
        </div>

        <!-- 确认密码输入 -->
        <div class="input-group">
          <n-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            class="login-input"
            :bordered="false"
            show-password-on="click"
            @keyup.enter="handleRegister"
            @input="handleConfirmPasswordInput"
            @update:value="handleConfirmPasswordUpdate"
          />
        </div>

        <!-- 注册按钮 -->
        <div class="login-button-section">
          <n-button
            type="primary"
            size="large"
            class="login-button"
            :loading="isLoading"
            @click="handleRegister"
            block
          >
            注册
          </n-button>
          
          <!-- 临时调试按钮 -->
          <n-button
            type="info"
            size="small"
            @click="debugFormData"
            style="margin-top: 8px;"
            block
          >
            调试查看表单数据
          </n-button>
        </div>

        <!-- 底部链接 -->
        <div class="bottom-links">
          <a href="#" class="link" @click.prevent="hideRegister">返回登录</a>
          <a href="#" class="link" @click.prevent="showRegister">重新生成ID</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { NInput, NButton, NCheckbox, NIcon, useMessage } from 'naive-ui'
import { ChevronDownOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'

const message = useMessage()
const userStore = useUserStore()

// 表单数据
const loginForm = reactive({
  userId: '',
  password: ''
})

// 注册表单数据 - 使用简单的reactive对象
const registerForm = reactive({
  displayName: '',
  password: '',
  confirmPassword: ''
})

const showRegisterForm = ref(false)
const generatedUserId = ref('')

const rememberPassword = ref(false)
const isLoading = ref(false)

// 拖动相关
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// 窗口控制方法
const minimizeWindow = () => {
  window.electronAPI?.minimizeWindow()
}

const closeWindow = () => {
  window.electronAPI?.closeWindow()
}

// 拖动功能
const startDrag = (e) => {
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - dragOffset.value.x
  const deltaY = e.clientY - dragOffset.value.y
  
  // 通知主进程移动窗口
  window.electronAPI?.moveWindow?.(deltaX, deltaY)
  
  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// ID格式化（只允许数字）
const formatUserId = (value) => {
  // 只保留数字
  const numericValue = value.replace(/\D/g, '')
  loginForm.userId = numericValue
}

// 生成5位随机ID
const generateUserId = () => {
  // 生成10000-99999之间的随机数
  return Math.floor(Math.random() * 90000) + 10000
}

// 显示注册表单
const showRegister = () => {
  showRegisterForm.value = true
  generatedUserId.value = generateUserId().toString()
  
  // 重置表单数据
  registerForm.displayName = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
  
  console.log('注册表单已重置:', registerForm)
}

// 隐藏注册表单
const hideRegister = () => {
  showRegisterForm.value = false
}

// 手动输入处理函数
const handleDisplayNameInput = (value) => {
  console.log('昵称输入:', value)
  registerForm.displayName = value
}

const handleDisplayNameUpdate = (value) => {
  console.log('昵称更新:', value)
  registerForm.displayName = value
}

const handlePasswordInput = (value) => {
  console.log('密码输入:', value)
  registerForm.password = value
}

const handlePasswordUpdate = (value) => {
  console.log('密码更新:', value)
  registerForm.password = value
}

const handleConfirmPasswordInput = (value) => {
  console.log('确认密码输入:', value)
  registerForm.confirmPassword = value
}

const handleConfirmPasswordUpdate = (value) => {
  console.log('确认密码更新:', value)
  registerForm.confirmPassword = value
}

// 登录密码输入处理函数
const handleLoginPasswordInput = (value) => {
  console.log('登录密码输入:', value)
  loginForm.password = value
}

const handleLoginPasswordUpdate = (value) => {
  console.log('登录密码更新:', value)
  loginForm.password = value
}

// 手动密码输入处理函数
const handlePasswordInputManual = (value) => {
  console.log('手动密码输入:', value)
  console.log('输入值类型:', typeof value)
  loginForm.password = value
  console.log('更新后 loginForm.password:', loginForm.password)
}

// 调试表单数据
const debugFormData = () => {
  const formData = {
    displayName: registerForm.displayName,
    password: registerForm.password,
    confirmPassword: registerForm.confirmPassword,
    generatedUserId: generatedUserId.value,
    showRegisterForm: showRegisterForm.value
  }
  
  console.log('当前表单数据:', formData)
  message.info(`表单数据: 昵称=${formData.displayName}, 密码长度=${formData.password?.length || 0}, 确认密码长度=${formData.confirmPassword?.length || 0}`)
  
  // 弹窗显示详细信息
  alert(`调试信息:\n昵称: "${formData.displayName}"\n密码: "${formData.password}"\n确认密码: "${formData.confirmPassword}"\nID: ${formData.generatedUserId}`)
}

// 注册处理
const handleRegister = async () => {
  console.log('注册表单数据:', {
    displayName: registerForm.displayName,
    password: registerForm.password,
    confirmPassword: registerForm.confirmPassword,
    generatedUserId: generatedUserId.value
  })
  
  // 使用registerForm对象验证
  const displayName = registerForm.displayName
  const password = registerForm.password
  const confirmPassword = registerForm.confirmPassword
  
  console.log('验证数据:', { displayName, password, confirmPassword })
  
  if (!displayName || displayName.trim() === '') {
    console.log('昵称验证失败:', displayName)
    message.warning('请输入昵称')
    return
  }
  
  if (!password || password.trim() === '') {
    console.log('密码验证失败:', password)
    message.warning('请输入密码')
    return
  }
  
  if (!confirmPassword || confirmPassword.trim() === '') {
    console.log('确认密码验证失败:', confirmPassword)
    message.warning('请确认密码')
    return
  }
  
  if (registerForm.password !== registerForm.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }
  
  if (registerForm.password.length < 6) {
    message.warning('密码长度至少6位')
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await userStore.register({
      userId: generatedUserId.value,
      displayName: displayName,
      password: password
    })

    if (result.success) {
      message.success(`注册成功！您的ID是：${generatedUserId.value}`)
      // 自动填入登录表单
      loginForm.userId = generatedUserId.value
      loginForm.password = registerForm.password
      hideRegister()
      // 自动登录
      setTimeout(() => {
        handleLogin()
      }, 1000)
    } else {
      // 如果ID重复，重新生成
      if (result.message?.includes('ID已存在')) {
        generatedUserId.value = generateUserId().toString()
        message.error('ID重复，已重新生成，请重试')
      } else {
        message.error(result.message || '注册失败')
      }
    }
  } catch (error) {
    console.error('注册错误:', error)
    message.error('注册失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 登录处理
const handleLogin = async () => {
  console.log('=== 登录调试信息 ===')
  console.log('loginForm对象:', loginForm)
  console.log('userId值:', loginForm.userId)
  console.log('password值:', loginForm.password ? '***' : '空')
  console.log('userId类型:', typeof loginForm.userId)
  console.log('password类型:', typeof loginForm.password)
  console.log('userId长度:', loginForm.userId?.length)
  console.log('===================')
  
  if (!loginForm.userId || !loginForm.password) {
    console.log('验证失败: 缺少ID或密码')
    console.log('userId存在:', !!loginForm.userId)
    console.log('password存在:', !!loginForm.password)
    message.warning('请输入ID和密码')
    return
  }
  
  if (loginForm.userId.length !== 5) {
    console.log('验证失败: ID长度不正确', loginForm.userId.length)
    message.warning('ID必须是5位数字')
    return
  }

  console.log('开始发送登录请求...')
  isLoading.value = true
  
  try {
    const loginData = {
      userId: loginForm.userId,
      password: loginForm.password
    }
    console.log('发送的登录数据:', { ...loginData, password: '***' })
    
    const result = await userStore.login(loginData)
    console.log('登录结果:', result)

    if (result.success) {
      message.success('登录成功')
      // 通知主进程登录成功
      window.electronAPI?.loginSuccess()
    } else {
      message.error(result.message || '登录失败')
    }
  } catch (error) {
    console.error('登录错误:', error)
    message.error('登录失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 监控 loginForm 变化
watch(loginForm, (newVal) => {
  console.log('loginForm 变化:', newVal)
}, { deep: true })

// 监控密码字段变化
watch(() => loginForm.password, (newVal, oldVal) => {
  console.log('密码字段变化:', { 旧值: oldVal, 新值: newVal })
})

onMounted(() => {
  // 聚焦到密码输入框
  setTimeout(() => {
    const passwordInput = document.querySelector('.password-input input')
    if (passwordInput) {
      passwordInput.focus()
    }
  }, 500)
})
</script>

<style scoped>
.login-window {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(-45deg, #e8f4f8, #f0e8f5, #f5e8f0, #e8eff5, #f2e8ee, #ebe8f5);
  background-size: 400% 400%;
  animation: gradientFlow 15s ease infinite;
}

/* 拖动区域 */
.drag-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 80px; /* 为窗口控制按钮留出空间 */
  height: 60px;
  z-index: 100; /* 降低z-index，让控制按钮在上层 */
  cursor: move;
  -webkit-app-region: drag;
}

/* 流光背景效果 */
.flowing-light-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 1;
  opacity: 0.15; /* 降低整体透明度让流光更柔和 */
}

.light-beam {
  position: absolute;
  width: 200%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.15) 50%, 
    rgba(255, 255, 255, 0.08) 80%,
    transparent 100%);
  filter: blur(8px); /* 增加模糊度 */
}

.light-beam-1 {
  top: 15%;
  left: -100%;
  height: 2px;
  transform: rotate(-15deg);
  animation: flowingLight 30s ease-in-out infinite; /* 更慢的速度 */
  animation-delay: 0s;
}

.light-beam-2 {
  top: 45%;
  left: -100%;
  height: 4px;
  transform: rotate(8deg);
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.12) 50%, 
    rgba(255, 255, 255, 0.05) 75%,
    transparent 100%);
  animation: flowingLightDiagonal 35s ease-in-out infinite;
  animation-delay: 5s;
  filter: blur(10px);
}

.light-beam-3 {
  top: 75%;
  left: 100%;
  height: 3px;
  transform: rotate(-5deg);
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.06) 20%,
    rgba(255, 255, 255, 0.1) 50%, 
    rgba(255, 255, 255, 0.06) 80%,
    transparent 100%);
  animation: flowingLightReverse 40s ease-in-out infinite;
  animation-delay: 10s;
  filter: blur(12px);
}

/* 添加更多随机光束 */
.light-beam-4 {
  top: 30%;
  left: -100%;
  height: 3px;
  transform: rotate(12deg);
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.04) 30%,
    rgba(255, 255, 255, 0.08) 50%, 
    rgba(255, 255, 255, 0.04) 70%,
    transparent 100%);
  animation: flowingLight 32s ease-in-out infinite;
  animation-delay: 8s;
  filter: blur(15px);
}

.light-beam-5 {
  top: 55%;
  left: 100%;
  height: 2px;
  transform: rotate(-20deg);
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.05) 35%,
    rgba(255, 255, 255, 0.09) 50%, 
    rgba(255, 255, 255, 0.05) 65%,
    transparent 100%);
  animation: flowingLightReverse 38s ease-in-out infinite;
  animation-delay: 15s;
  filter: blur(10px);
}

@keyframes flowingLight {
  0% {
    left: -100%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes flowingLightDiagonal {
  0% {
    left: -100%;
    top: -20%;
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.8;
  }
  100% {
    left: 100%;
    top: 120%;
    opacity: 0;
  }
}

@keyframes flowingLightReverse {
  0% {
    left: 100%;
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    left: -100%;
    opacity: 0;
  }
}

@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at 30% 80%,
    rgba(180, 160, 210, 0.15) 0%,
    transparent 50%
  ),
  radial-gradient(
    circle at 70% 20%,
    rgba(160, 190, 220, 0.15) 0%,
    transparent 50%
  ),
  radial-gradient(
    circle at 50% 50%,
    rgba(170, 150, 200, 0.1) 0%,
    transparent 70%
  );
  animation: pulseGlow 4s ease-in-out infinite alternate;
}

@keyframes pulseGlow {
  0% {
    opacity: 0.2;
    transform: scale(1);
  }
  100% {
    opacity: 0.4;
    transform: scale(1.05);
  }
}

/* 窗口控制按钮 */
.window-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 1001; /* 确保控制按钮在拖动区域之上 */
  -webkit-app-region: no-drag; /* 确保控制按钮区域不被拖动 */
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.close-btn:hover {
  background: #ff5f56;
  color: white;
}

.control-btn svg {
  width: 12px;
  height: 12px;
}

/* 登录容器 */
.login-container {
  position: relative;
  z-index: 10;
  width: 340px;
  padding: 50px 35px;
  background: transparent;
  border-radius: 20px;
}

/* 头像区域 */
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.avatar-container {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.user-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 登录表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  position: relative;
}

:deep(.login-input) {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  padding: 0 18px;
  font-size: 15px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

:deep(.login-input:hover) {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.5);
}

:deep(.login-input:focus-within) {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(25, 118, 210, 0.5);
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15);
}

:deep(.login-input .n-input__input-el) {
  padding: 14px 0;
}

.username-input :deep(.n-input__input-el) {
  font-weight: 500;
  color: #333;
}

/* 记住密码区域 */
.remember-section {
  margin: 8px 0;
}

.remember-text {
  font-size: 12px;
  color: #1976d2;
  margin-left: 8px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

/* 登录按钮 */
.login-button-section {
  margin: 16px 0;
}

:deep(.login-button) {
  height: 50px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
  border: none;
  box-shadow: 0 3px 12px rgba(25, 118, 210, 0.3);
  transition: all 0.3s ease;
}

:deep(.login-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.4);
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
}

:deep(.login-button:active) {
  transform: translateY(0);
}

/* 底部链接 */
.bottom-links {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.link {
  color: #1565c0;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.link:hover {
  color: #0d47a1;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.7);
}

/* 响应式调整 */
@media (max-height: 600px) {
  .login-container {
    padding: 30px 25px;
  }
  
  .avatar-container {
    width: 60px;
    height: 60px;
  }
}
</style>
