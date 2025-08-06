// MistNote前端API服务
import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 自动添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和token过期
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，清除本地存储并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// 认证相关API
export const authAPI = {
  // 用户注册
  register: (userData) => api.post('/auth/register', userData),
  
  // 用户登录
  login: (credentials) => api.post('/auth/login', credentials),
  
  // 获取当前用户信息
  getCurrentUser: () => api.get('/auth/me'),
  
  // 用户登出
  logout: () => api.post('/auth/logout'),
  
  // 刷新token
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken })
};

// 用户相关API
export const userAPI = {
  // 获取用户资料
  getProfile: () => api.get('/users/profile'),
  
  // 更新用户资料
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  
  // 更新用户状态
  updateStatus: (status, statusText) => api.put('/users/status', { status, statusText }),
  
  // 搜索用户
  searchUsers: (query, type = 'username') => api.get('/users/search', { params: { q: query, type } }),
  
  // 获取用户详情
  getUserDetails: (userId) => api.get(`/users/${userId}`),
  
  // 给用户点赞
  likeUser: (userId) => api.post(`/users/${userId}/like`)
};

// 联系人相关API
export const contactAPI = {
  // 获取联系人列表
  getContacts: () => api.get('/contacts'),
  
  // 添加联系人
  addContact: (userId, nickname) => api.post('/contacts', { userId, nickname }),
  
  // 更新联系人备注
  updateContactNickname: (contactId, nickname) => api.put(`/contacts/${contactId}`, { nickname }),
  
  // 删除联系人
  deleteContact: (contactId) => api.delete(`/contacts/${contactId}`),
  
  // 屏蔽/取消屏蔽联系人
  blockContact: (contactId, isBlocked) => api.put(`/contacts/${contactId}/block`, { isBlocked })
};

// 聊天相关API
export const chatAPI = {
  // 获取聊天列表
  getChatList: () => api.get('/chats'),
  
  // 获取与指定用户的聊天记录
  getChatHistory: (userId, page = 1, limit = 50) => api.get(`/chats/${userId}`, { params: { page, limit } }),
  
  // 发送消息
  sendMessage: (messageData) => api.post('/chats', messageData),
  
  // 撤回消息
  recallMessage: (messageId) => api.put(`/chats/${messageId}/recall`),
  
  // 删除消息
  deleteMessage: (messageId) => api.delete(`/chats/${messageId}`)
};

// 文件上传相关API
export const uploadAPI = {
  // 上传头像
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 上传文件
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 上传图片
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// 健康检查
export const healthAPI = {
  check: () => axios.get('http://localhost:5000/health')
};

export default api;
