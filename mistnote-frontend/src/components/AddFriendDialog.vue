<template>
  <n-modal :show="showModal" @update:show="showModal = $event" preset="dialog" title="添加好友">
    <template #header>
      <div class="dialog-header">
        <n-icon size="20" color="#1890ff">
          <PersonAddIcon />
        </n-icon>
        <span>添加好友</span>
      </div>
    </template>
    
    <div class="add-friend-form">
      <div class="form-item">
        <label>用户ID</label>
        <n-input 
          :value="formData.targetUserId" 
          @update:value="formData.targetUserId = $event"
          placeholder="请输入5位数字用户ID"
          maxlength="5"
          :allow-input="onlyAllowNumber"
          @input="validateUserId"
        />
        <div v-if="userIdError" class="error-text">{{ userIdError }}</div>
      </div>
      
      <div class="form-item">
        <label>验证消息</label>
        <n-input
          :value="formData.message"
          @update:value="formData.message = $event"
          type="textarea"
          placeholder="请输入验证消息（可选）"
          :rows="3"
          maxlength="200"
          show-count
        />
      </div>
      
      <div v-if="searchResult" class="user-preview">
        <div class="user-info">
          <img :src="searchResult.avatar || '/default-avatar.png'" alt="avatar" class="avatar" />
          <div class="info">
            <div class="name">{{ searchResult.displayName || searchResult.username }}</div>
            <div class="user-id">ID: {{ searchResult.userId }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #action>
      <div class="dialog-actions">
        <n-button @click="closeDialog">取消</n-button>
        <n-button 
          type="primary" 
          :loading="loading"
          :disabled="!canSubmit"
          @click="sendFriendRequest"
        >
          发送请求
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch, defineEmits, defineProps } from 'vue';
import { NModal, NInput, NButton, NIcon, useMessage } from 'naive-ui';
import { PersonAdd as PersonAddIcon } from '@vicons/ionicons5';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:show', 'friend-request-sent']);

const message = useMessage();
const userStore = useUserStore();

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
});

const formData = ref({
  targetUserId: '',
  message: ''
});

const userIdError = ref('');
const searchResult = ref(null);
const loading = ref(false);

// 只允许输入数字
const onlyAllowNumber = (value) => !value || /^\d+$/.test(value);

// 验证用户ID
const validateUserId = () => {
  const userId = formData.value.targetUserId;
  userIdError.value = '';
  searchResult.value = null;
  
  if (!userId) return;
  
  if (userId.length !== 5) {
    userIdError.value = '用户ID必须是5位数字';
    return;
  }
  
  if (userId === userStore.user?.userId) {
    userIdError.value = '不能添加自己为好友';
    return;
  }
  
  // 搜索用户信息（这里可以添加实际的搜索API调用）
  searchUserInfo(userId);
};

// 搜索用户信息
const searchUserInfo = async (userId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/user/search/${userId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        searchResult.value = data.data;
      }
    }
  } catch (error) {
    console.error('搜索用户失败:', error);
  }
};

// 是否可以提交
const canSubmit = computed(() => {
  return formData.value.targetUserId.length === 5 && 
         !userIdError.value && 
         searchResult.value;
});

// 发送好友请求
const sendFriendRequest = async () => {
  if (!canSubmit.value) return;
  
  try {
    loading.value = true;
    
    const response = await fetch('http://localhost:5000/api/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        targetUserId: formData.value.targetUserId,
        message: formData.value.message
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 只在这里显示一次成功消息
      message.success('好友请求已发送');
      emit('friend-request-sent', {
        targetUser: searchResult.value,
        message: formData.value.message
      });
      closeDialog();
    } else {
      message.error(data.message || '发送好友请求失败');
    }
  } catch (error) {
    console.error('发送好友请求失败:', error);
    message.error('发送好友请求失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 关闭对话框
const closeDialog = () => {
  formData.value = {
    targetUserId: '',
    message: ''
  };
  userIdError.value = '';
  searchResult.value = null;
  showModal.value = false;
};

// 监听对话框显示状态
watch(() => props.show, (newValue) => {
  if (!newValue) {
    // 对话框关闭时重置表单
    formData.value = {
      targetUserId: '',
      message: ''
    };
    userIdError.value = '';
    searchResult.value = null;
  }
});
</script>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.add-friend-form {
  padding: 16px 0;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.error-text {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}

.user-preview {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.info .name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.info .user-id {
  font-size: 12px;
  color: #666;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
