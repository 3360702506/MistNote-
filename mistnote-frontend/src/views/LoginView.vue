<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>MistNote</h1>
        <p>即时通讯，连接你我</p>
      </div>

      <div class="login-tabs">
        <div class="tab-buttons">
          <button 
            :class="['tab-button', { active: activeTab === 'login' }]"
            @click="activeTab = 'login'"
          >
            登录
          </button>
          <button 
            :class="['tab-button', { active: activeTab === 'register' }]"
            @click="activeTab = 'register'"
          >
            注册
          </button>
        </div>

        <div class="tab-content">
          <!-- 登录表单 -->
          <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <div class="input-wrapper">
                <span class="input-icon">📧</span>
                <input
                  v-model="loginForm.email"
                  type="email"
                  placeholder="邮箱地址"
                  required
                  autocomplete="email"
                />
              </div>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  v-model="loginForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="密码"
                  required
                  autocomplete="current-password"
                />
                <button 
                  type="button" 
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              class="submit-button"
              :disabled="userStore.isLoading"
            >
              {{ userStore.isLoading ? '登录中...' : '登录' }}
            </button>
          </form>

          <!-- 注册表单 -->
          <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="login-form">
            <div class="form-group">
              <div class="input-wrapper">
                <span class="input-icon">👤</span>
                <input
                  v-model="registerForm.username"
                  type="text"
                  placeholder="用户名"
                  required
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="form-group">
              <div class="input-wrapper">
                <span class="input-icon">📧</span>
                <input
                  v-model="registerForm.email"
                  type="email"
                  placeholder="邮箱地址"
                  required
                  autocomplete="email"
                />
              </div>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  v-model="registerForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="密码"
                  required
                  autocomplete="new-password"
                />
                <button 
                  type="button" 
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  v-model="registerForm.confirmPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="确认密码"
                  required
                  autocomplete="new-password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              class="submit-button"
              :disabled="userStore.isLoading"
            >
              {{ userStore.isLoading ? '注册中...' : '注册' }}
            </button>
          </form>
        </div>
      </div>

      <!-- 连接状态指示器 -->
      <div class="connection-status">
        <div class="status-item">
          <span :class="['status-dot', { connected: backendStatus.connected }]"></span>
          <span>后端服务: {{ backendStatus.connected ? '已连接' : '未连接' }}</span>
        </div>
        <div class="status-item">
          <span :class="['status-dot', { connected: databaseStatus.connected }]"></span>
          <span>数据库: {{ databaseStatus.connected ? '已连接' : '未连接' }}</span>
        </div>
      </div>

      <!-- 测试账号提示 -->
      <div class="test-accounts">
        <div class="alert">
          <h4>测试账号</h4>
          <p>可以使用以下测试账号登录：</p>
          <ul>
            <li @click="fillTestAccount('admin')">管理员: admin@mistnote.com / 123456</li>
            <li @click="fillTestAccount('test1')">测试用户1: test1@mistnote.com / 123456</li>
            <li @click="fillTestAccount('test2')">测试用户2: test2@mistnote.com / 123456</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { healthAPI } from '@/services/api'

const router = useRouter()
const userStore = useUserStore()

// 简单的消息提示功能
const showMessage = (text, type = 'info') => {
  const messageEl = document.createElement('div')
  messageEl.textContent = text
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1890ff'};
    color: white;
    border-radius: 6px;
    z-index: 9999;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  `
  document.body.appendChild(messageEl)
  
  setTimeout(() => {
    messageEl.style.opacity = '0'
    messageEl.style.transform = 'translateX(100%)'
    setTimeout(() => document.body.removeChild(messageEl), 300)
  }, 3000)
}

// 响应式数据
const activeTab = ref('login')
const showPassword = ref(false)
const loginFormRef = ref(null)
const registerFormRef = ref(null)

// 登录表单
const loginForm = reactive({
  email: '',
  password: ''
})

// 注册表单
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 连接状态
const backendStatus = reactive({
  connected: false,
  checking: false
})

const databaseStatus = reactive({
  connected: false,
  checking: false
})

// 表单验证规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应在3-20位之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value) => {
        return value === registerForm.password
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ]
}

// 方法
const handleLogin = async () => {
  try {
    // 简单的表单验证
    if (!loginForm.email || !loginForm.password) {
      showMessage('请填写完整的登录信息', 'error')
      return
    }
    
    const result = await userStore.login({
      email: loginForm.email,
      password: loginForm.password
    })
    
    if (result.success) {
      showMessage('登录成功！', 'success')
      router.push('/chat')
    } else {
      showMessage(result.message || '登录失败', 'error')
    }
  } catch (error) {
    console.error('登录失败:', error)
    showMessage('登录失败，请稍后重试', 'error')
  }
}

const handleRegister = async () => {
  try {
    // 简单的表单验证
    if (!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      showMessage('请填写完整的注册信息', 'error')
      return
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      showMessage('两次输入的密码不一致', 'error')
      return
    }
    
    const result = await userStore.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    
    if (result.success) {
      showMessage('注册成功！', 'success')
      router.push('/chat')
    } else {
      showMessage(result.message || '注册失败', 'error')
    }
  } catch (error) {
    console.error('注册失败:', error)
    showMessage('注册失败，请稍后重试', 'error')
  }
}

const checkBackendStatus = async () => {
  backendStatus.checking = true
  try {
    const response = await healthAPI.check()
    backendStatus.connected = response.status === 'OK'
    databaseStatus.connected = true // 如果后端健康检查通过，说明数据库也连接正常
  } catch (error) {
    backendStatus.connected = false
    databaseStatus.connected = false
    console.error('后端连接检查失败:', error)
  } finally {
    backendStatus.checking = false
  }
}

// 快速填充测试账号
const fillTestAccount = (type = 'admin') => {
  const accounts = {
    admin: { email: 'admin@mistnote.com', password: '123456' },
    test1: { email: 'test1@mistnote.com', password: '123456' },
    test2: { email: 'test2@mistnote.com', password: '123456' }
  }
  
  const account = accounts[type]
  if (account) {
    loginForm.email = account.email
    loginForm.password = account.password
    activeTab.value = 'login'
  }
}

// 生命周期
onMounted(() => {
  // 检查用户是否已登录
  if (userStore.isLoggedIn) {
    router.push('/chat')
    return
  }
  
  // 检查后端连接状态
  checkBackendStatus()
  
  // 定期检查连接状态
  setInterval(checkBackendStatus, 30000) // 每30秒检查一次
})

// 暴露方法供外部调用
defineExpose({
  fillTestAccount
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-header p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.login-tabs {
  margin-bottom: 20px;
}

.connection-status {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.test-accounts {
  margin-top: 20px;
}

.test-accounts ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.test-accounts li {
  margin: 4px 0;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.test-accounts li:hover {
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
  
  .login-header h1 {
    font-size: 28px;
  }
}
</style>
