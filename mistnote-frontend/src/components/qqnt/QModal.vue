<template>
  <teleport to="body">
    <transition name="q-modal">
      <div 
        v-if="modelValue"
        class="q-modal-overlay"
        @click="handleOverlayClick"
      >
        <div 
          class="q-modal"
          :class="[sizeClass, { 'q-modal-center': center }]"
          :style="customStyle"
          @click.stop
        >
          <!-- 标题栏 -->
          <div class="q-modal-header" v-if="title || $slots.header">
            <slot name="header">
              <h3 class="q-modal-title">{{ title }}</h3>
            </slot>
            <button 
              v-if="closable"
              class="q-modal-close"
              @click="handleClose"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M14 1.41L12.59 0 7 5.59 1.41 0 0 1.41 5.59 7 0 12.59 1.41 14 7 8.41 12.59 14 14 12.59 8.41 7z"/>
              </svg>
            </button>
          </div>
          
          <!-- 内容区 -->
          <div class="q-modal-body">
            <slot></slot>
          </div>
          
          <!-- 底部操作栏 -->
          <div class="q-modal-footer" v-if="$slots.footer || showFooter">
            <slot name="footer">
              <q-button 
                v-if="showCancel"
                @click="handleCancel"
                :disabled="loading"
              >
                {{ cancelText }}
              </q-button>
              <q-button 
                v-if="showConfirm"
                type="primary"
                @click="handleConfirm"
                :loading="loading"
              >
                {{ confirmText }}
              </q-button>
            </slot>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import QButton from './QButton.vue'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['small', 'medium', 'large', 'full'].includes(val)
  },
  width: [String, Number],
  closable: {
    type: Boolean,
    default: true
  },
  maskClosable: {
    type: Boolean,
    default: true
  },
  center: Boolean,
  showFooter: Boolean,
  showCancel: {
    type: Boolean,
    default: true
  },
  showConfirm: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  loading: Boolean,
  escClosable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close', 'cancel', 'confirm'])

const sizeClass = computed(() => `q-modal-${props.size}`)

const customStyle = computed(() => {
  const style = {}
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  return style
})

const handleOverlayClick = () => {
  if (props.maskClosable && !props.loading) {
    handleClose()
  }
}

const handleClose = () => {
  if (!props.loading) {
    emit('update:modelValue', false)
    emit('close')
  }
}

const handleCancel = () => {
  if (!props.loading) {
    emit('cancel')
    handleClose()
  }
}

const handleConfirm = () => {
  emit('confirm')
}

const handleEsc = (e) => {
  if (e.key === 'Escape' && props.escClosable && props.modelValue && !props.loading) {
    handleClose()
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* 遮罩层 */
.q-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

/* 模态框主体 */
.q-modal {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  position: relative;
  animation: modalSlideIn 0.3s ease;
}

/* 尺寸 */
.q-modal-small {
  width: 400px;
}

.q-modal-medium {
  width: 520px;
}

.q-modal-large {
  width: 800px;
}

.q-modal-full {
  width: 90vw;
  height: 90vh;
}

/* 居中 */
.q-modal-center {
  text-align: center;
}

/* 头部 */
.q-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.q-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 关闭按钮 */
.q-modal-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  outline: none;
}

.q-modal-close:hover {
  background: #f0f0f0;
  color: #666;
}

/* 内容区 */
.q-modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

/* 底部 */
.q-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

/* 动画 */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.q-modal-enter-active,
.q-modal-leave-active {
  transition: opacity 0.3s ease;
}

.q-modal-enter-from,
.q-modal-leave-to {
  opacity: 0;
}

.q-modal-enter-active .q-modal {
  animation: modalSlideIn 0.3s ease;
}

.q-modal-leave-active .q-modal {
  animation: modalSlideIn 0.3s ease reverse;
}
</style>
