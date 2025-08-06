<template>
  <div class="title-bar" :class="{ 'is-maximized': isMaximized }">
    <!-- 应用图标和标题 -->
    <div class="title-bar-left">
      <div class="app-icon">
        <img src="/logo.png" alt="MistNote" />
      </div>
      <div class="app-title">{{ title }}</div>
    </div>

    <!-- 可拖拽区域 -->
    <div class="title-bar-center drag-region"></div>

    <!-- 窗口控制按钮 -->
    <div class="title-bar-right">
      <div class="window-controls">
        <!-- 最小化按钮 -->
        <button
          class="control-button minimize-btn"
          @click="minimizeWindow"
          @keydown.enter="minimizeWindow"
          @keydown.space.prevent="minimizeWindow"
          title="最小化 (Alt + F9)"
          tabindex="0"
          aria-label="最小化窗口"
        >
          <n-icon size="12">
            <MinusIcon />
          </n-icon>
        </button>

        <!-- 最大化/还原按钮 -->
        <button
          class="control-button maximize-btn"
          @click="toggleMaximize"
          @keydown.enter="toggleMaximize"
          @keydown.space.prevent="toggleMaximize"
          :title="isMaximized ? '还原 (Alt + F5)' : '最大化 (Alt + F10)'"
          tabindex="0"
          :aria-label="isMaximized ? '还原窗口' : '最大化窗口'"
        >
          <n-icon size="12">
            <MaximizeIcon v-if="!isMaximized" />
            <RestoreIcon v-else />
          </n-icon>
        </button>

        <!-- 关闭按钮 -->
        <button
          class="control-button close-btn"
          @click="closeWindow"
          @keydown.enter="closeWindow"
          @keydown.space.prevent="closeWindow"
          title="关闭 (Alt + F4)"
          tabindex="0"
          aria-label="关闭窗口"
        >
          <n-icon size="12">
            <CloseIcon />
          </n-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { NIcon } from 'naive-ui'
import { 
  Remove as MinusIcon,
  Square as MaximizeIcon,
  Copy as RestoreIcon,
  Close as CloseIcon
} from '@vicons/ionicons5'

// Props
const props = defineProps({
  title: {
    type: String,
    default: 'MistNote'
  }
})

// 响应式数据
const isMaximized = ref(false)

// 保存事件监听器引用
let fullscreenChangeHandler = null

// 窗口控制方法
const minimizeWindow = () => {
  if (window.electronAPI && window.electronAPI.minimize) {
    window.electronAPI.minimize()
  }
}

const toggleMaximize = () => {
  if (window.electronAPI && window.electronAPI.maximize) {
    window.electronAPI.maximize()
  }
}

const closeWindow = () => {
  if (window.electronAPI && window.electronAPI.close) {
    window.electronAPI.close()
  }
}

// 监听窗口状态变化
const handleWindowStateChange = () => {
  console.log('设置窗口状态监听器')
  try {
    if (window.ipcRenderer) {
      // 监听窗口最大化事件
      window.ipcRenderer.on('window-maximized', () => {
        console.log('收到窗口最大化事件')
        isMaximized.value = true
      })

      // 监听窗口还原事件
      window.ipcRenderer.on('window-unmaximized', () => {
        console.log('收到窗口还原事件')
        isMaximized.value = false
      })

      // 监听主进程消息（用于调试）
      window.ipcRenderer.on('main-process-message', (event, message) => {
        console.log('收到主进程消息:', message)
      })
    } else {
      console.warn('ipcRenderer 不可用，无法监听窗口状态变化')

      // 在浏览器环境中监听全屏状态变化
      fullscreenChangeHandler = () => {
        isMaximized.value = !!document.fullscreenElement
        console.log('全屏状态变化:', isMaximized.value)
      }
      document.addEventListener('fullscreenchange', fullscreenChangeHandler)
    }
  } catch (error) {
    console.error('设置窗口状态监听器时出错:', error)
  }
}

// 清理事件监听器
const cleanupEventListeners = () => {
  console.log('清理事件监听器')
  try {
    if (window.ipcRenderer) {
      window.ipcRenderer.removeAllListeners('window-maximized')
      window.ipcRenderer.removeAllListeners('window-unmaximized')
      window.ipcRenderer.removeAllListeners('main-process-message')
    }

    // 清理浏览器事件监听器
    if (fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler)
      fullscreenChangeHandler = null
    }
  } catch (error) {
    console.error('清理事件监听器时出错:', error)
  }
}

// 键盘快捷键处理
const handleKeyboardShortcuts = (event) => {
  // Alt + F4: 关闭窗口
  if (event.altKey && event.key === 'F4') {
    event.preventDefault()
    closeWindow()
  }
  // Alt + F9: 最小化窗口
  else if (event.altKey && event.key === 'F9') {
    event.preventDefault()
    minimizeWindow()
  }
  // Alt + F10: 最大化窗口
  else if (event.altKey && event.key === 'F10') {
    event.preventDefault()
    toggleMaximize()
  }
  // Alt + F5: 还原窗口
  else if (event.altKey && event.key === 'F5' && isMaximized.value) {
    event.preventDefault()
    toggleMaximize()
  }
}

onMounted(() => {
  console.log('TitleBar 组件已挂载')
  handleWindowStateChange()

  // 添加键盘快捷键监听
  document.addEventListener('keydown', handleKeyboardShortcuts)

  // 检查初始窗口状态
  setTimeout(() => {
    console.log('检查初始窗口状态')
    if (document.fullscreenElement) {
      isMaximized.value = true
    }
  }, 100)
})

onUnmounted(() => {
  console.log('TitleBar 组件即将卸载')
  cleanupEventListeners()

  // 移除键盘快捷键监听
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 36px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  user-select: none;
  position: relative;
  z-index: 1000;
}

.title-bar.is-maximized {
  height: 34px;
}

.title-bar-left {
  display: flex;
  align-items: center;
  padding-left: 8px;
  min-width: 120px;
}

.app-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.app-title {
  font-size: 12px;
  font-weight: 400;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-bar-center {
  flex: 1;
  height: 100%;
}

.drag-region {
  -webkit-app-region: drag;
}

.title-bar-right {
  display: flex;
  align-items: center;
  height: 100%;
}

.window-controls {
  display: flex;
  height: 100%;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.control-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.control-button:active {
  background-color: rgba(0, 0, 0, 0.15);
}

.close-btn:hover {
  background-color: #e81123;
  color: white;
}

.close-btn:active {
  background-color: #c50e1f;
}

/* 平台特定样式 */
@media (platform: darwin) {
  .title-bar {
    padding-left: 70px; /* macOS 红绿灯按钮空间 */
  }
  
  .window-controls {
    display: none; /* macOS 使用系统原生控制按钮 */
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-title {
    display: none;
  }
  
  .title-bar-left {
    min-width: 24px;
  }
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .title-bar {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .app-title {
    color: #ecf0f1;
  }
  
  .control-button {
    color: #bdc3c7;
  }
  
  .control-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .control-button:active {
    background-color: rgba(255, 255, 255, 0.15);
  }
}
</style>
