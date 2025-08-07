<template>
  <div 
    class="q-list-item"
    :class="[
      { 
        'active': active,
        'selected': selected,
        'disabled': disabled,
        'clickable': clickable && !disabled,
        'dragging': isDragging
      },
      sizeClass
    ]"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @contextmenu.prevent="handleContextMenu"
    :draggable="draggable && !disabled"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
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
import { ref, computed } from 'vue'
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

const emit = defineEmits(['click', 'contextmenu', 'mouseenter', 'mouseleave', 'dragstart', 'dragend'])

const isDragging = ref(false)
const isHovered = ref(false)

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

const handleDragStart = (e) => {
  if (props.draggable && !props.disabled) {
    isDragging.value = true
    emit('dragstart', e)
  }
}

const handleDragEnd = (e) => {
  isDragging.value = false
  emit('dragend', e)
}
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
