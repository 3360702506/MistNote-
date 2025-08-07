<template>
  <div class="q-avatar" :class="[sizeClass, shapeClass]" :style="customStyle">
    <img 
      v-if="src" 
      :src="src" 
      :alt="alt"
      @error="handleError"
      class="q-avatar-img"
    />
    <div v-else class="q-avatar-text">
      {{ displayText }}
    </div>
    
    <!-- 在线状态指示器 -->
    <div 
      v-if="showStatus && status"
      class="q-avatar-status"
      :class="`status-${status}`"
    ></div>
    
    <!-- 徽章 -->
    <div 
      v-if="badge"
      class="q-avatar-badge"
      :class="{ 'badge-dot': badgeDot }"
    >
      <span v-if="!badgeDot">{{ formattedBadge }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  src: String,
  alt: String,
  size: {
    type: [String, Number],
    default: 'medium',
    validator: (val) => {
      if (typeof val === 'number') return true
      return ['small', 'medium', 'large', 'xlarge'].includes(val)
    }
  },
  shape: {
    type: String,
    default: 'circle',
    validator: (val) => ['circle', 'square'].includes(val)
  },
  text: String,
  backgroundColor: String,
  textColor: String,
  status: {
    type: String,
    validator: (val) => ['online', 'offline', 'busy', 'away', 'invisible'].includes(val)
  },
  showStatus: {
    type: Boolean,
    default: true
  },
  badge: [String, Number],
  badgeDot: Boolean,
  maxBadge: {
    type: Number,
    default: 99
  }
})

const emit = defineEmits(['error'])

const hasError = ref(false)

const sizeClass = computed(() => {
  if (typeof props.size === 'number') return ''
  return `q-avatar-${props.size}`
})

const shapeClass = computed(() => `q-avatar-${props.shape}`)

const customStyle = computed(() => {
  const style = {}
  if (typeof props.size === 'number') {
    style.width = `${props.size}px`
    style.height = `${props.size}px`
  }
  if (props.backgroundColor && (!props.src || hasError.value)) {
    style.backgroundColor = props.backgroundColor
  }
  if (props.textColor && (!props.src || hasError.value)) {
    style.color = props.textColor
  }
  return style
})

const displayText = computed(() => {
  if (!props.text) return ''
  // 取前两个字符或首字母
  return props.text.slice(0, 2).toUpperCase()
})

const formattedBadge = computed(() => {
  if (!props.badge) return ''
  const num = Number(props.badge)
  if (isNaN(num)) return props.badge
  return num > props.maxBadge ? `${props.maxBadge}+` : num
})

const handleError = () => {
  hasError.value = true
  emit('error')
}
</script>

<style scoped>
.q-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
}

/* 尺寸 */
.q-avatar-small {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.q-avatar-medium {
  width: 40px;
  height: 40px;
  font-size: 14px;
}

.q-avatar-large {
  width: 56px;
  height: 56px;
  font-size: 18px;
}

.q-avatar-xlarge {
  width: 80px;
  height: 80px;
  font-size: 24px;
}

/* 形状 */
.q-avatar-circle {
  border-radius: 50%;
}

.q-avatar-square {
  border-radius: 6px;
}

/* 图片 */
.q-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 文字 */
.q-avatar-text {
  font-weight: 500;
  white-space: nowrap;
}

/* 在线状态 */
.q-avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  z-index: 1;
}

.q-avatar-medium .q-avatar-status {
  width: 12px;
  height: 12px;
}

.q-avatar-large .q-avatar-status {
  width: 14px;
  height: 14px;
}

.status-online {
  background: #52c41a;
}

.status-offline {
  background: #d9d9d9;
}

.status-busy {
  background: #f5222d;
}

.status-away {
  background: #faad14;
}

.status-invisible {
  background: #8c8c8c;
}

/* 徽章 */
.q-avatar-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 2;
}

.q-avatar-badge.badge-dot {
  min-width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
</style>
