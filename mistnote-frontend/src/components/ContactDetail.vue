<template>
  <div class="contact-detail" v-if="contact">
    <!-- 用户头部信息 -->
    <div class="user-header">
      <!-- 用户头像和基本信息 -->
      <div class="user-main-info">
        <div class="user-avatar">
          <img :src="contact.avatar" :alt="contact.name" />
          <div v-if="contact.isOnline" class="status-indicator" :class="contact.status"></div>
        </div>
        <div class="user-info">
          <h2 class="user-name">{{ contact.name }}</h2>
          <div class="user-id">ID {{ contact.qq }}</div>
          <div class="user-status">
            <span class="status-dot" :class="contact.status"></span>
            {{ contact.isOnline ? '在线' : '离线' }}
          </div>
        </div>
      </div>
      
      <!-- 点赞区域 -->
      <div class="like-section">
        <div class="like-count" @click="handleLike" ref="likeButton">
          <span class="like-icon">👍</span>
          <span>{{ contact.likes }}+</span>
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

    <!-- 用户详细信息 -->
    <div class="user-details">
      <!-- 基本信息行 -->
      <div class="info-row">
        <div class="info-item">
          <span class="info-icon">♂</span>
          <span class="info-text">{{ contact.gender }}</span>
        </div>
        <div class="info-item">
          <span class="info-text">{{ contact.age }}</span>
        </div>
        <div class="info-item">
          <span class="info-text">{{ contact.birthday }}</span>
        </div>
        <div class="info-item">
          <span class="info-text">{{ contact.constellation }}</span>
        </div>
        <div class="info-item">
          <span class="info-text">{{ contact.location }}</span>
        </div>
        <div class="info-item">
          <span class="info-text">{{ contact.level }}</span>
        </div>
      </div>

      <!-- 等级图标 -->
      <div class="level-icons">
        <span class="level-icon">⭐</span>
        <span class="level-icon">🌙</span>
        <span class="level-icon">🌙</span>
        <span class="level-icon">🌙</span>
      </div>

      <!-- 好友分组 -->
      <div class="friend-group">
        <div class="group-item">
          <span class="group-icon">👥</span>
          <span class="group-label">好友分组</span>
          <span class="group-value">{{ contact.group }}</span>
          <span class="group-arrow">▼</span>
        </div>
      </div>

      <!-- 个性签名 -->
      <div class="signature-section">
        <div class="signature-item">
          <span class="signature-icon">✏️</span>
          <span class="signature-label">签名</span>
          <div class="signature-content">{{ contact.signature }}</div>
        </div>
      </div>

      <!-- QQ空间 -->
      <div class="qzone-section">
        <div class="qzone-item" @click="openQQSpace">
          <span class="qzone-icon">⭐</span>
          <span class="qzone-label">QQ空间</span>
          <span class="qzone-desc">查看我的QQ空间</span>
          <span class="qzone-arrow">></span>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="action-buttons">
      <button class="action-btn secondary" @click="editProfile">编辑资料</button>
      <button class="action-btn primary" @click="sendMessage">发消息</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Props
const props = defineProps({
  contact: {
    type: Object,
    required: true
  }
})

// 飞起点赞相关
const flyingLikes = ref([])
let likeIdCounter = 0
const likeButton = ref(null)

// 点赞方法
const handleLike = () => {
  // 创建飞起的点赞动画
  const animations = ['flyUp1', 'flyUp2', 'flyUp3', 'flyUp4']
  const randomAnimation = animations[Math.floor(Math.random() * animations.length)]
  
  const newLike = {
    id: likeIdCounter++,
    style: {
      animation: `${randomAnimation} 1.5s ease-out forwards`
    }
  }
  
  flyingLikes.value.push(newLike)
  
  // 增加点赞数（这里只是演示，实际应该调用API）
  if (props.contact.likes < 99999) {
    props.contact.likes++
  }
}

// 移除飞起的点赞
const removeFlyingLike = (id) => {
  const index = flyingLikes.value.findIndex(like => like.id === id)
  if (index > -1) {
    flyingLikes.value.splice(index, 1)
  }
}

// 方法
const sendMessage = () => {
  console.log('发送消息给:', props.contact.name)
  // 跳转到聊天页面
  router.push('/chat')
}

const editProfile = () => {
  console.log('编辑资料:', props.contact.name)
}

const openQQSpace = () => {
  console.log('打开QQ空间:', props.contact.name)
}
</script>

<style scoped>
.contact-detail {
  flex: 1;
  background: white;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 用户头部信息 */
.user-header {
  padding: 24px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
}

.user-main-info {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border: 3px solid white;
  border-radius: 50%;
}

.status-indicator.online {
  background: #52c41a;
}

.status-indicator.offline {
  background: #d9d9d9;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.user-id {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #52c41a;
}

.status-dot.offline {
  background: #d9d9d9;
}

/* 点赞区域 */
.like-section {
  position: relative;
  display: flex;
  align-items: center;
}

.like-count {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
  position: relative;
}

.like-count:hover {
  transform: scale(1.1);
  background: rgba(24, 144, 255, 0.1);
}

.like-count:active {
  transform: scale(0.95);
}

.like-icon {
  font-size: 16px;
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
  user-select: none;
}

/* 用户详细信息 */
.user-details {
  flex: 1;
  padding: 24px;
}

/* 基本信息行 */
.info-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
}

.info-icon {
  color: #1890ff;
  font-weight: bold;
}

.info-text {
  color: #333;
}

/* 等级图标 */
.level-icons {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.level-icon {
  font-size: 18px;
}

/* 好友分组 */
.friend-group {
  margin-bottom: 24px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.group-item:hover {
  background: #e9ecef;
}

.group-icon {
  font-size: 16px;
}

.group-label {
  font-size: 14px;
  color: #666;
  min-width: 60px;
}

.group-value {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.group-arrow {
  font-size: 12px;
  color: #999;
}

/* 个性签名 */
.signature-section {
  margin-bottom: 24px;
}

.signature-item {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.signature-icon {
  font-size: 16px;
  margin-top: 2px;
}

.signature-label {
  font-size: 14px;
  color: #666;
  min-width: 40px;
  margin-top: 2px;
}

.signature-content {
  flex: 1;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

/* QQ空间 */
.qzone-section {
  margin-bottom: 32px;
}

.qzone-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.qzone-item:hover {
  background: #e9ecef;
}

.qzone-icon {
  font-size: 16px;
  color: #1890ff;
}

.qzone-label {
  font-size: 14px;
  color: #666;
  min-width: 60px;
}

.qzone-desc {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.qzone-arrow {
  font-size: 14px;
  color: #999;
}

/* 底部操作按钮 */
.action-buttons {
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  background: white;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #1890ff;
  color: white;
}

.action-btn.primary:hover {
  background: #40a9ff;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.action-btn.secondary:hover {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

/* 点赞动画 */
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
</style>
