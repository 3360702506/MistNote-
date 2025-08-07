<template>
  <span 
    class="q-badge"
    :class="[
      typeClass,
      sizeClass,
      {
        'q-badge-dot': dot,
        'q-badge-standalone': standalone
      }
    ]"
    :style="customStyle"
  >
    <span v-if="!dot" class="q-badge-content">
      {{ displayContent }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: [String, Number],
  type: {
    type: String,
    default: 'danger',
    validator: (val) => ['primary', 'success', 'warning', 'danger', 'info', 'default'].includes(val)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['small', 'medium', 'large'].includes(val)
  },
  dot: Boolean,
  max: {
    type: Number,
    default: 99
  },
  showZero: Boolean,
  standalone: Boolean,
  color: String,
  textColor: String
})

const typeClass = computed(() => `q-badge-${props.type}`)
const sizeClass = computed(() => `q-badge-${props.size}`)

const displayContent = computed(() => {
  const num = Number(props.content)
  
  if (isNaN(num)) {
    return props.content
  }
  
  if (num === 0 && !props.showZero) {
    return ''
  }
  
  return num > props.max ? `${props.max}+` : num
})

const customStyle = computed(() => {
  const style = {}
  if (props.color) {
    style.backgroundColor = props.color
  }
  if (props.textColor) {
    style.color = props.textColor
  }
  return style
})
</script>

<style scoped>
.q-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 10px;
  transition: all 0.2s ease;
}

/* 独立徽章（非相对定位） */
.q-badge-standalone {
  position: relative;
}

/* 尺寸 */
.q-badge-small {
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 14px;
}

.q-badge-medium {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
}

.q-badge-large {
  min-width: 22px;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 22px;
}

/* 点状徽章 */
.q-badge-dot {
  min-width: 0;
  padding: 0;
  border-radius: 50%;
}

.q-badge-dot.q-badge-small {
  width: 6px;
  height: 6px;
}

.q-badge-dot.q-badge-medium {
  width: 8px;
  height: 8px;
}

.q-badge-dot.q-badge-large {
  width: 10px;
  height: 10px;
}

/* 类型颜色 */
.q-badge-primary {
  background: #1890ff;
  color: #fff;
}

.q-badge-success {
  background: #52c41a;
  color: #fff;
}

.q-badge-warning {
  background: #faad14;
  color: #fff;
}

.q-badge-danger {
  background: #ff4d4f;
  color: #fff;
}

.q-badge-info {
  background: #909399;
  color: #fff;
}

.q-badge-default {
  background: #f0f0f0;
  color: #666;
}

/* 内容 */
.q-badge-content {
  display: inline-block;
}

/* 动画效果 */
@keyframes badgePulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.q-badge-danger {
  animation: badgePulse 2s ease-in-out infinite;
}

.q-badge-danger:hover {
  animation: none;
  transform: scale(1.1);
}
</style>
