# QQ NT 风格组件库

这是一个为 MistNote 项目定制的 QQ NT 风格 Vue 3 组件库，旨在提供统一的UI风格和更好的组件复用性。

## 组件列表

### 已实现组件

#### 1. QAvatar - 头像组件
支持图片、文字回退、在线状态、徽章等功能。

```vue
<q-avatar 
  src="/avatar.jpg"
  text="用户名"
  status="online"
  :badge="5"
  size="medium"
/>
```

**Props:**
- `src`: 头像图片URL
- `text`: 文字回退（当图片加载失败时显示）
- `status`: 状态标识 (online/offline/busy/away)
- `badge`: 徽章内容
- `size`: 尺寸 (small/medium/large)
- `shape`: 形状 (circle/square)

#### 2. QSearchBox - 搜索框组件
带防抖、清除按钮的搜索输入框。

```vue
<q-search-box 
  v-model="searchQuery"
  placeholder="搜索..."
  @search="handleSearch"
/>
```

**Props:**
- `modelValue`: 绑定值
- `placeholder`: 占位文本
- `clearable`: 是否显示清除按钮
- `debounce`: 防抖延迟（毫秒）
- `disabled`: 是否禁用

#### 3. QListItem - 列表项组件
用于聊天列表、联系人列表等场景。

```vue
<q-list-item
  title="张三"
  description="最后一条消息"
  :time="new Date()"
  avatar="/avatar.jpg"
  :badge="3"
  :active="true"
  @click="handleClick"
/>
```

**Props:**
- `title`: 标题
- `description`: 描述文本
- `time`: 时间戳
- `avatar`: 头像URL
- `badge`: 未读数徽章
- `active`: 是否激活
- `selected`: 是否选中
- `muted`: 是否静音
- `draggable`: 是否可拖拽

#### 4. QBadge - 徽章组件
用于显示未读数、状态等。

```vue
<q-badge 
  :content="99"
  type="danger"
  :max="99"
/>
```

**Props:**
- `content`: 徽章内容
- `type`: 类型 (primary/success/warning/danger/info/default)
- `size`: 尺寸 (small/medium/large)
- `dot`: 是否为点状徽章
- `max`: 最大显示数值

#### 5. QButton - 按钮组件
QQ NT风格的按钮，支持多种样式。

```vue
<q-button 
  type="primary"
  @click="handleClick"
>
  确定
</q-button>
```

**Props:**
- `type`: 类型 (primary/success/warning/danger/info/default)
- `size`: 尺寸 (small/medium/large)
- `round`: 圆角按钮
- `circle`: 圆形按钮
- `text`: 文字按钮
- `plain`: 朴素按钮
- `disabled`: 禁用状态
- `loading`: 加载状态
- `block`: 块级按钮

#### 6. QModal - 模态框组件
用于弹窗、对话框等场景。

```vue
<q-modal
  v-model="showModal"
  title="添加好友"
  size="medium"
>
  <div>模态框内容</div>
  <template #footer>
    <q-button @click="cancel">取消</q-button>
    <q-button type="primary" @click="confirm">确定</q-button>
  </template>
</q-modal>
```

**Props:**
- `modelValue`: 显示状态
- `title`: 标题
- `size`: 尺寸 (small/medium/large/full)
- `closable`: 是否显示关闭按钮
- `maskClosable`: 点击遮罩是否关闭
- `escClosable`: ESC键是否关闭
- `showFooter`: 是否显示底部
- `loading`: 加载状态

## 使用示例

### 1. 在组件中引入

```vue
<template>
  <div class="chat-list">
    <q-search-box v-model="searchQuery" />
    
    <q-list-item
      v-for="chat in chats"
      :key="chat.id"
      :title="chat.name"
      :description="chat.lastMessage"
      :avatar="chat.avatar"
      :badge="chat.unreadCount"
      @click="selectChat(chat)"
    />
  </div>
</template>

<script setup>
import { QSearchBox, QListItem } from '@/components/qqnt'
import { ref } from 'vue'

const searchQuery = ref('')
const chats = ref([...])

const selectChat = (chat) => {
  // 处理选择聊天
}
</script>
```

### 2. 全局注册（可选）

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import * as QComponents from '@/components/qqnt'

const app = createApp(App)

// 注册所有组件
Object.keys(QComponents).forEach(name => {
  app.component(name, QComponents[name])
})

app.mount('#app')
```

## 设计原则

1. **统一性**: 所有组件遵循QQ NT的设计语言
2. **可复用性**: 组件高度解耦，易于在不同场景使用
3. **可定制性**: 提供丰富的props和slots支持自定义
4. **性能优化**: 使用Vue 3的Composition API和优化技术
5. **响应式**: 支持不同尺寸和交互状态

## 颜色规范

- 主色: `#0088ff` (QQ蓝)
- 成功: `#52c41a`
- 警告: `#faad14`
- 危险: `#ff4d4f`
- 信息: `#909399`
- 背景: `#f5f5f5`
- 边框: `#e8e8e8`

## 待实现组件

- [ ] QInput - 输入框
- [ ] QTextarea - 文本域
- [ ] QTabs - 标签页
- [ ] QCard - 卡片
- [ ] QDivider - 分割线
- [ ] QEmpty - 空状态
- [ ] QContextMenu - 右键菜单
- [ ] QTooltip - 工具提示
- [ ] QDropdown - 下拉菜单
- [ ] QSwitch - 开关
- [ ] QCheckbox - 复选框
- [ ] QRadio - 单选框

## 贡献指南

创建新组件时，请遵循以下规范：

1. 使用 `<script setup>` 语法
2. 使用 `scoped` 样式
3. 组件名以 `Q` 开头
4. 提供完整的 props 定义和默认值
5. 添加必要的事件和插槽
6. 编写清晰的注释和文档

## 更新日志

### v0.1.0 (2024-01)
- 初始版本
- 实现基础组件：QAvatar, QSearchBox, QListItem, QBadge, QButton, QModal
- 创建示例页面 ChatListRefactored.vue
