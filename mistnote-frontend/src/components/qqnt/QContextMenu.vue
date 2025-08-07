<template>
  <teleport to="body">
    <transition name="context-menu">
      <div 
        v-if="visible"
        class="q-context-menu"
        :style="menuStyle"
        @click.stop
        @contextmenu.prevent
      >
        <div 
          v-for="(item, index) in items" 
          :key="index"
          class="q-context-menu-item"
          :class="{
            'disabled': item.disabled,
            'danger': item.danger,
            'separator': item.type === 'separator'
          }"
          @click="handleItemClick(item)"
        >
          <template v-if="item.type !== 'separator'">
            <span class="menu-icon" v-if="item.icon">
              <component :is="item.icon" />
            </span>
            <span class="menu-label">{{ item.label }}</span>
            <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
          </template>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'select'])

const menuStyle = computed(() => {
  let x = props.x
  let y = props.y
  
  // 防止菜单超出视窗
  if (typeof window !== 'undefined') {
    const menuWidth = 200 // 预估菜单宽度
    const menuHeight = props.items.length * 32 // 预估菜单高度
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }
  }
  
  return {
    left: `${x}px`,
    top: `${y}px`
  }
})

const handleItemClick = (item) => {
  if (item.disabled || item.type === 'separator') return
  
  if (item.action) {
    item.action()
  }
  
  emit('select', item)
  emit('close')
}

const handleClickOutside = (e) => {
  if (props.visible) {
    emit('close')
  }
}

const handleEscape = (e) => {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.q-context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  min-width: 180px;
  max-width: 280px;
  font-size: 13px;
  user-select: none;
}

.q-context-menu-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 32px;
  cursor: pointer;
  transition: background-color 0.15s;
  color: #333;
}

.q-context-menu-item:hover:not(.disabled):not(.separator) {
  background-color: #f5f5f5;
}

.q-context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.q-context-menu-item.danger {
  color: #ff4d4f;
}

.q-context-menu-item.danger:hover:not(.disabled) {
  background-color: #fff1f0;
}

.q-context-menu-item.separator {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background-color: #e8e8e8;
  cursor: default;
}

.menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  color: #999;
}

.q-context-menu-item.danger .menu-icon {
  color: #ff4d4f;
}

.menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-shortcut {
  margin-left: 24px;
  color: #999;
  font-size: 12px;
}

/* 动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .q-context-menu {
    background: #2b2b2b;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }
  
  .q-context-menu-item {
    color: #e0e0e0;
  }
  
  .q-context-menu-item:hover:not(.disabled):not(.separator) {
    background-color: #3a3a3a;
  }
  
  .q-context-menu-item.danger:hover:not(.disabled) {
    background-color: rgba(255, 77, 79, 0.1);
  }
  
  .q-context-menu-item.separator {
    background-color: #444;
  }
}
</style>
