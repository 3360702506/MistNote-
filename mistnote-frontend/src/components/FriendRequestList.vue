<template>
  <div class="friend-request-list">
    <div class="header">
      <h3>好友通知</h3>
    </div>
    <n-scrollbar style="max-height: calc(100vh - 120px);">
      <div v-if="loading" class="loading-state">
        <n-spin size="large" />
        <p>正在加载...</p>
      </div>
      <div v-else-if="requests.length === 0" class="empty-state">
        <n-icon size="64" color="#ccc"><MailOutlineIcon /></n-icon>
        <p>暂无新的好友通知</p>
      </div>
      <div v-else class="requests-container">
        <div v-for="request in requests" :key="request._id" class="request-item">
          <div class="avatar">
            <img :src="getAvatarSrc(request)" alt="avatar" />
          </div>
          <div class="info">
            <div class="name">{{ request.sender?.profile?.displayName || request.sender?.username || '未知用户' }}</div>
            <div class="message">验证消息：{{ request.message || '无' }}</div>
          </div>
          <div class="actions">
            <n-button type="primary" size="small" @click="handleResponse(request._id, 'accept')">同意</n-button>
            <n-button size="small" @click="handleResponse(request._id, 'reject')">拒绝</n-button>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineEmits } from 'vue';
import { NButton, NScrollbar, NIcon, NSpin, useMessage } from 'naive-ui';
import { MailOutline as MailOutlineIcon } from '@vicons/ionicons5';
import { useUserStore } from '@/stores/user';
import avatarCacheService from '@/services/avatarCacheService';

const requests = ref([]);
const loading = ref(true);
const userStore = useUserStore();
const message = useMessage();
const emit = defineEmits(['show-message', 'friend-added']);
const avatarMap = ref({}); // userId -> local avatar path

// 获取请求项头像
const getAvatarSrc = (request) => {
  const uid = request?.sender?.userId || request?.sender?._id;
  return avatarMap.value[uid] || request?.sender?.profile?.avatar || '/default-avatar.png';
};

// 解析并预加载头像
const resolveAvatars = async (list) => {
  if (!Array.isArray(list)) return;
  const userIds = Array.from(
    new Set(
      list
        .map(r => r?.sender?.userId || r?.sender?._id)
        .filter(Boolean)
    )
  );
  if (userIds.length === 0) return;
  try {
    // 预加载以减少闪烁
    await avatarCacheService.preloadAvatars(userIds);
    // 分别获取本地路径
    await Promise.all(userIds.map(async (uid) => {
      const p = await avatarCacheService.getUserAvatar(uid).catch(() => null);
      if (p) {
        avatarMap.value = { ...avatarMap.value, [uid]: p };
      }
    }));
  } catch (e) {
    console.warn('预加载头像失败', e);
  }
};

// 监听头像更新事件，局部刷新
const onAvatarUpdated = (e) => {
  const { userId, avatarPath } = e.detail || {};
  if (!userId || !avatarPath) return;
  avatarMap.value = { ...avatarMap.value, [userId]: avatarPath };
};

// 获取好友请求列表
const fetchFriendRequests = async () => {
  try {
    loading.value = true;
    const response = await fetch('http://localhost:5000/api/friends/requests', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        requests.value = data.data.received || [];
        // 请求成功后解析头像
        resolveAvatars(requests.value);
      }
    }
  } catch (error) {
    console.error('获取好友请求失败:', error);
    message.error('获取好友请求失败');
  } finally {
    loading.value = false;
  }
};

// 响应好友请求
const handleResponse = async (requestId, action) => {
  try {
    const response = await fetch(`http://localhost:5000/api/friends/requests/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ action })
    });
    
    const data = await response.json();
    
    if (data.success) {
      message.success(action === 'accept' ? '已接受好友请求' : '已拒绝好友请求');
      
      // 从列表中移除已处理的请求
      const processedRequest = requests.value.find(req => req._id === requestId);
      requests.value = requests.value.filter(req => req._id !== requestId);
      
      // 如果接受了好友请求，通知父组件更新好友列表
      if (action === 'accept' && processedRequest) {
        emit('friend-added', processedRequest.sender);
      }
    } else {
      message.error(data.message || '处理好友请求失败');
    }
  } catch (error) {
    console.error('处理好友请求失败:', error);
    message.error('处理好友请求失败');
  }
};

// Socket.IO事件监听
const setupSocketListeners = () => {
  const socket = userStore.socket;
  if (!socket) return;
  
  // 监听收到新的好友请求
  socket.on('friendRequestReceived', (data) => {
    console.log('收到新的好友请求:', data);
    requests.value.unshift({
      _id: data.requestId,
      sender: data.sender,
      message: data.message,
      createdAt: data.createdAt
    });
    message.info(`收到来自 ${data.sender.profile?.displayName || data.sender.userId} 的好友请求`);
    // 新增请求的头像也解析
    resolveAvatars([{ sender: data.sender }]);
  });
  
  // 监听好友请求被接受
  socket.on('friendRequestAccepted', (data) => {
    console.log('好友请求被接受:', data);
    message.success(`${data.friend.profile?.displayName || data.friend.userId} 接受了您的好友请求`);
    
    // 显示欢迎消息
    if (data.welcomeMessage) {
      setTimeout(() => {
        message.info(data.welcomeMessage.content);
      }, 1000);
    }
    
    emit('friend-added', data.friend);
  });
  
  // 监听好友请求被拒绝
  socket.on('friendRequestRejected', (data) => {
    console.log('好友请求被拒绝:', data);
    message.warning(`${data.rejectedBy.profile?.displayName || data.rejectedBy.userId} 拒绝了您的好友请求`);
  });
};

// 清理Socket监听器
const cleanupSocketListeners = () => {
  const socket = userStore.socket;
  if (!socket) return;
  
  socket.off('friendRequestReceived');
  socket.off('friendRequestAccepted');
  socket.off('friendRequestRejected');
};

// 重新获取好友请求（供外部调用）
const refreshRequests = () => {
  fetchFriendRequests();
};

onMounted(() => {
  fetchFriendRequests();
  setupSocketListeners();
  window.addEventListener('avatar-updated', onAvatarUpdated);
});

onUnmounted(() => {
  cleanupSocketListeners();
  window.removeEventListener('avatar-updated', onAvatarUpdated);
});

// 暴露方法供父组件调用
defineExpose({
  refreshRequests
});
</script>

<style scoped>
.friend-request-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
}

.header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 200px);
  color: #999;
}

.requests-container {
  padding: 8px;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.request-item:hover {
  background-color: #f5f5f5;
}

.avatar img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 16px;
}

.info {
  flex-grow: 1;
}

.name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.message {
  font-size: 13px;
  color: #666;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
