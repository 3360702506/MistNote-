<template>
  <button
    class="q-button"
    :class="[
      typeClass,
      sizeClass,
      {
        'q-button-round': round,
        'q-button-circle': circle,
        'q-button-text': text,
        'q-button-plain': plain,
        'q-button-disabled': disabled,
        'q-button-loading': loading,
        'q-button-block': block
      }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span class="q-button-loading-icon" v-if="loading">
      <svg class="q-button-spinner" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="3"></circle>
      </svg>
    </span>
    <i :class="icon" v-if="icon && !loading" class="q-button-icon"></i>
    <span class="q-button-content" v-if="$slots.default">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (val) => ['primary', 'success', 'warning', 'danger', 'info', 'default'].includes(val)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['small', 'medium', 'large'].includes(val)
  },
  icon: String,
  round: Boolean,
  circle: Boolean,
  text: Boolean,
  plain: Boolean,
  disabled: Boolean,
  loading: Boolean,
  block: Boolean
})

const emit = defineEmits(['click'])

const typeClass = computed(() => `q-button-${props.type}`)
const sizeClass = computed(() => `q-button-${props.size}`)

const handleClick = (e) => {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<style scoped>
.q-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  outline: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  user-select: none;
  position: relative;
  font-family: inherit;
}

/* 尺寸 */
.q-button-small {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  border-radius: 14px;
}

.q-button-medium {
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: 16px;
}

.q-button-large {
  height: 40px;
  padding: 0 20px;
  font-size: 16px;
  border-radius: 20px;
}

/* 类型 - QQ NT风格 */
.q-button-primary {
  background: linear-gradient(135deg, #00aaff 0%, #0088ff 100%);
  color: #fff;
  border-color: #0088ff;
}

.q-button-primary:hover:not(.q-button-disabled) {
  background: linear-gradient(135deg, #33bbff 0%, #0099ff 100%);
  box-shadow: 0 2px 8px rgba(0, 136, 255, 0.3);
}

.q-button-primary:active:not(.q-button-disabled) {
  background: linear-gradient(135deg, #0099ee 0%, #0077ee 100%);
}

.q-button-success {
  background: #52c41a;
  color: #fff;
  border-color: #52c41a;
}

.q-button-success:hover:not(.q-button-disabled) {
  background: #73d13d;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
}

.q-button-warning {
  background: #faad14;
  color: #fff;
  border-color: #faad14;
}

.q-button-warning:hover:not(.q-button-disabled) {
  background: #ffc53d;
  box-shadow: 0 2px 8px rgba(250, 173, 20, 0.3);
}

.q-button-danger {
  background: #ff4d4f;
  color: #fff;
  border-color: #ff4d4f;
}

.q-button-danger:hover:not(.q-button-disabled) {
  background: #ff7875;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
}

.q-button-info {
  background: #909399;
  color: #fff;
  border-color: #909399;
}

.q-button-info:hover:not(.q-button-disabled) {
  background: #a6a9ad;
  box-shadow: 0 2px 8px rgba(144, 147, 153, 0.3);
}

.q-button-default {
  background: #fff;
  color: #333;
  border-color: #d9d9d9;
}

.q-button-default:hover:not(.q-button-disabled) {
  color: #0088ff;
  border-color: #0088ff;
  background: #f0f7ff;
}

/* 朴素按钮 */
.q-button-plain {
  background: transparent;
}

.q-button-plain.q-button-primary {
  color: #0088ff;
  border-color: #0088ff;
}

.q-button-plain.q-button-primary:hover:not(.q-button-disabled) {
  background: rgba(0, 136, 255, 0.1);
}

/* 文字按钮 */
.q-button-text {
  background: transparent;
  border-color: transparent;
  padding: 0 8px;
}

.q-button-text:hover:not(.q-button-disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.q-button-text.q-button-primary {
  color: #0088ff;
}

.q-button-text.q-button-primary:hover:not(.q-button-disabled) {
  background: rgba(0, 136, 255, 0.1);
}

/* 圆角按钮 */
.q-button-round {
  border-radius: 100px;
}

/* 圆形按钮 */
.q-button-circle {
  border-radius: 50%;
  padding: 0;
  width: 32px;
  height: 32px;
}

.q-button-circle.q-button-small {
  width: 28px;
  height: 28px;
}

.q-button-circle.q-button-large {
  width: 40px;
  height: 40px;
}

/* 块级按钮 */
.q-button-block {
  display: flex;
  width: 100%;
}

/* 禁用状态 */
.q-button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.q-button-loading {
  pointer-events: none;
  opacity: 0.8;
}

.q-button-loading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}

.q-button-spinner {
  animation: spin 1s linear infinite;
}

.q-button-spinner circle {
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

/* 图标 */
.q-button-icon {
  font-size: inherit;
}

/* 内容 */
.q-button-content {
  display: inline-flex;
  align-items: center;
}
</style>
