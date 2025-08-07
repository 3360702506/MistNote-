<template>
  <div 
    class="q-list-item"
    :class="[
      { 
        'active': active,
        'selected': selected,
        'disabled': disabled,
        'clickable': clickable && !disabled,
        'muted': muted
      },
      sizeClass
    ]"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 左侧区域 -->
    <div class="q-list-item-prefix" v-if="$slots.prefix || avatar">
      <slot name="prefix">
        <q-avatar 
          v-if="avatar"
          :src="avatar"
          :text="title"
          :status="avatarStatus"
          :badge="avatarBadge"
          :size="avatarSize"
        />
      </slot>
    </div>
    
    <!-- Badge -->
    <div 
      class="q-list-item-badge" 
      v-if="badge && badge > 0 && !badgeDismissed"
      ref="badgeRef"
      :style="badgeStyle"
      @mousedown="startBadgeDrag"
      @touchstart="startBadgeDrag"
    >
      <q-badge :count="badge" :type="badgeType" />
      <div v-if="isDraggingBadge" class="badge-dismiss-hint">
        {{ dragDistance > DISMISS_THRESHOLD ? '松开清除' : '拖动清除' }}
      </div>
    </div>
    
    <!-- 主内容区域 -->
    <div class="q-list-item-content">
      <div class="q-list-item-header">
        <div class="q-list-item-title">
          <span class="title-text">{{ title }}</span>
          <q-badge 
            v-if="titleBadge"
            :content="titleBadge"
            :type="titleBadgeType"
            size="small"
            class="title-badge"
          />
        </div>
        <div class="q-list-item-time" v-if="time">
          {{ formatTime(time) }}
        </div>
      </div>
      
      <div class="q-list-item-body" v-if="description || $slots.description">
        <slot name="description">
          <div class="q-list-item-description">
            <span class="description-prefix" v-if="descriptionPrefix">
              {{ descriptionPrefix }}
            </span>
            <span class="description-text">{{ description }}</span>
          </div>
        </slot>
      </div>
      
      <div class="q-list-item-footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
    </div>
    
    <!-- 右侧区域 -->
    <div class="q-list-item-suffix" v-if="$slots.suffix || badge || showActions">
      <slot name="suffix">
        <div class="q-list-item-actions" v-if="showActions">
          <q-badge 
            v-if="badge"
            :content="badge"
            :type="badgeType"
            :dot="badgeDot"
            :max="badgeMax"
          />
          <i v-if="muted" class="mute-icon"></i>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import QAvatar from './QAvatar.vue'
import QBadge from './QBadge.vue'

const props = defineProps({
  // 基础属性
  title: String,
  description: String,
  descriptionPrefix: String,
  time: [String, Number, Date],
  
  // 头像相关
  avatar: String,
  avatarStatus: String,
  avatarBadge: [String, Number],
  avatarSize: {
    type: String,
    default: 'medium'
  },
  
  // 徽章相关
  badge: [String, Number],
  badgeType: {
    type: String,
    default: 'danger'
  },
  badgeDot: Boolean,
  badgeMax: {
    type: Number,
    default: 99
  },
  titleBadge: String,
  titleBadgeType: {
    type: String,
    default: 'info'
  },
  
  // 状态
  active: Boolean,
  selected: Boolean,
  disabled: Boolean,
  clickable: {
    type: Boolean,
    default: true
  },
  draggable: Boolean,
  muted: Boolean,
  
  // 尺寸
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['small', 'medium', 'large'].includes(val)
  },
  
  // 其他
  showActions: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['click', 'contextmenu', 'mouseenter', 'mouseleave', 'dragstart', 'dragend', 'badge-dismiss'])

const isHovered = ref(false)
const isDraggingBadge = ref(false)
const badgeDismissed = ref(false)
const badgeRef = ref(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragX = ref(0)
const dragY = ref(0)
const dragDistance = ref(0)
const DISMISS_THRESHOLD = 80 // 拖动距离阈值

const sizeClass = computed(() => `q-list-item-${props.size}`)

const formatTime = (time) => {
  if (!time) return ''
  
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 7) {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  } else if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

const badgeStyle = computed(() => {
  if (!isDraggingBadge.value) return {}
  return {
    transform: `translate(${dragX.value}px, ${dragY.value}px) scale(${1 + dragDistance.value / 200})`,
    opacity: Math.max(0.3, 1 - dragDistance.value / 150),
    transition: 'none',
    zIndex: 1000
  }
})

const handleClick = (e) => {
  if (!props.disabled && props.clickable) {
    emit('click', e)
  }
}

const handleContextMenu = (e) => {
  if (!props.disabled) {
    emit('contextmenu', e)
  }
}

const handleMouseEnter = (e) => {
  isHovered.value = true
  emit('mouseenter', e)
}

const handleMouseLeave = (e) => {
  isHovered.value = false
  emit('mouseleave', e)
}

const startBadgeDrag = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  isDraggingBadge.value = true
  const touch = e.touches ? e.touches[0] : e
  dragStartX.value = touch.clientX
  dragStartY.value = touch.clientY
  dragX.value = 0
  dragY.value = 0
  dragDistance.value = 0
  
  document.addEventListener('mousemove', handleBadgeDrag)
  document.addEventListener('mouseup', endBadgeDrag)
  document.addEventListener('touchmove', handleBadgeDrag)
  document.addEventListener('touchend', endBadgeDrag)
}

const handleBadgeDrag = (e) => {
  if (!isDraggingBadge.value) return
  
  const touch = e.touches ? e.touches[0] : e
  dragX.value = touch.clientX - dragStartX.value
  dragY.value = touch.clientY - dragStartY.value
  dragDistance.value = Math.sqrt(dragX.value ** 2 + dragY.value ** 2)
}

const endBadgeDrag = (e) => {
  if (!isDraggingBadge.value) return
  
  document.removeEventListener('mousemove', handleBadgeDrag)
  document.removeEventListener('mouseup', endBadgeDrag)
  document.removeEventListener('touchmove', handleBadgeDrag)
  document.removeEventListener('touchend', endBadgeDrag)
  
  if (dragDistance.value > DISMISS_THRESHOLD) {
    // 触发消除动画
    badgeDismissed.value = true
    emit('badge-dismiss')
    
    // 动画效果
    if (badgeRef.value) {
      badgeRef.value.style.transform = `translate(${dragX.value * 2}px, ${dragY.value * 2}px) scale(0)`
      badgeRef.value.style.opacity = '0'
      badgeRef.value.style.transition = 'all 0.3s ease-out'
    }
    
    setTimeout(() => {
      badgeDismissed.value = false
    }, 300)
  } else {
    // 回弹动画
    dragX.value = 0
    dragY.value = 0
    dragDistance.value = 0
    setTimeout(() => {
      isDraggingBadge.value = false
    }, 200)
  }
  
  isDraggingBadge.value = false
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleBadgeDrag)
  document.removeEventListener('mouseup', endBadgeDrag)
  document.removeEventListener('touchmove', handleBadgeDrag)
  document.removeEventListener('touchend', endBadgeDrag)
})
</script>

<style scoped>
.q-list-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
}

/* 尺寸变体 */
.q-list-item-small {
  padding: 6px 10px;
  min-height: 48px;
}

.q-list-item-medium {
  padding: 8px 12px;
  min-height: 64px;
}

.q-list-item-large {
  padding: 12px 16px;
  min-height: 80px;
}

.q-list-item-badge {
  margin-left: auto;
  padding-left: 8px;
  cursor: grab;
  user-select: none;
  position: relative;
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

.q-list-item-badge:active {
  cursor: grabbing;
}

.badge-dismiss-hint {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #999;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 交互状态 */
.q-list-item.clickable {
  cursor: pointer;
}

.q-list-item.clickable:hover {
  background: #f7f7f7;
}

.q-list-item.active {
  background: #e6f4ff;
}

.q-list-item.active:hover {
  background: #d6ebff;
}

.q-list-item.selected {
  background: #f0f7ff;
}

.q-list-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.q-list-item.dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

/* 左侧前缀 */
.q-list-item-prefix {
  flex-shrink: 0;
  margin-right: 12px;
}

/* 主内容区 */
.q-list-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 头部 */
.q-list-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.q-list-item-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.title-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-badge {
  flex-shrink: 0;
}

.q-list-item-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 主体内容 */
.q-list-item-description {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.description-prefix {
  color: #999;
  margin-right: 4px;
  flex-shrink: 0;
}

.description-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧后缀 */
.q-list-item-suffix {
  flex-shrink: 0;
  margin-left: 12px;
}

.q-list-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 静音图标 */
.mute-icon {
  width: 14px;
  height: 14px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'/%3E%3C/svg%3E") no-repeat center;
  background-size: contain;
}

/* 动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.q-list-item {
  animation: slideIn 0.3s ease;
}
</style>
