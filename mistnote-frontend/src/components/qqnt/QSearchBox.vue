<template>
  <div class="q-search-box" :class="{ focused: isFocused, disabled: disabled }">
    <div class="q-search-prefix" v-if="$slots.prefix || prefixIcon">
      <slot name="prefix">
        <i :class="prefixIcon" v-if="prefixIcon"></i>
      </slot>
    </div>
    
    <input
      ref="inputRef"
      class="q-search-input"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown.enter="handleEnter"
      @keydown.esc="handleEsc"
    />
    
    <!-- 清除按钮 -->
    <div 
      v-if="clearable && modelValue && !disabled"
      class="q-search-clear"
      @click="handleClear"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.5 9.5L9.5 10.5 7 8l-2.5 2.5L3.5 9.5 6 7 3.5 4.5l1-1L7 6l2.5-2.5 1 1L8 7l2.5 2.5z"/>
      </svg>
    </div>
    
    <div class="q-search-suffix" v-if="$slots.suffix || suffixIcon">
      <slot name="suffix">
        <i :class="suffixIcon" v-if="suffixIcon"></i>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  placeholder: {
    type: String,
    default: '搜索'
  },
  type: {
    type: String,
    default: 'text'
  },
  disabled: Boolean,
  readonly: Boolean,
  clearable: {
    type: Boolean,
    default: true
  },
  maxlength: [String, Number],
  prefixIcon: String,
  suffixIcon: String,
  debounce: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'change', 'focus', 'blur', 'enter', 'clear', 'search'])

const inputRef = ref(null)
const isFocused = ref(false)
let debounceTimer = null

const handleInput = (e) => {
  const value = e.target.value
  emit('update:modelValue', value)
  emit('input', value)
  
  // 防抖搜索
  if (props.debounce > 0) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      emit('search', value)
    }, props.debounce)
  } else {
    emit('search', value)
  }
}

const handleFocus = (e) => {
  isFocused.value = true
  emit('focus', e)
}

const handleBlur = (e) => {
  isFocused.value = false
  emit('blur', e)
}

const handleEnter = (e) => {
  emit('enter', e.target.value)
  emit('search', e.target.value)
}

const handleEsc = () => {
  if (props.clearable && props.modelValue) {
    handleClear()
  }
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  emit('search', '')
  inputRef.value?.focus()
}

// 暴露方法
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  clear: handleClear
})
</script>

<style scoped>
.q-search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  background: #f5f5f5;
  border-radius: 16px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.q-search-box:hover:not(.disabled) {
  background: #ebebeb;
}

.q-search-box.focused {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.q-search-box.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.q-search-input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  padding: 0 4px;
}

.q-search-input::placeholder {
  color: #999;
}

.q-search-input:disabled {
  cursor: not-allowed;
}

.q-search-prefix,
.q-search-suffix {
  display: flex;
  align-items: center;
  color: #999;
  font-size: 16px;
}

.q-search-prefix {
  margin-right: 4px;
}

.q-search-suffix {
  margin-left: 4px;
}

.q-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin: 0 4px;
  color: #999;
  cursor: pointer;
  transition: color 0.2s ease;
}

.q-search-clear:hover {
  color: #666;
}

/* QQ NT 风格搜索图标 */
.q-search-box::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E") no-repeat center;
  background-size: contain;
  pointer-events: none;
}

.q-search-box.focused::before {
  opacity: 0.7;
}

.q-search-input {
  padding-left: 20px;
}
</style>
