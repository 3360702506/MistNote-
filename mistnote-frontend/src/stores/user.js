// 用户状态管理
import { defineStore } from 'pinia';
import { authAPI, userAPI } from '@/services/api';
import socketService from '@/services/socket';

export const useUserStore = defineStore('user', {
  state: () => ({
    // 用户信息
    user: null,
    token: localStorage.getItem('token'),
    isLoggedIn: false,
    isLoading: false,
    
    // 连接状态
    isSocketConnected: false,
    
    // 在线用户列表
    onlineUsers: [],
    
    // 错误信息
    error: null
  }),

  getters: {
    // 获取用户头像
    userAvatar: (state) => {
      if (!state.user?.profile?.avatar) return '/default-avatar.png';
      if (state.user.profile.avatar.startsWith('http')) {
        return state.user.profile.avatar;
      }
      return `http://localhost:5000${state.user.profile.avatar}`;
    },

    // 获取用户显示名称
    userDisplayName: (state) => {
      return state.user?.profile?.displayName || '未知用户';
    },

    // 获取用户昵称（为了兼容性保留）
    userNickname: (state) => {
      return state.user?.profile?.displayName || state.user?.username || '未知用户';
    },

    // 获取用户ID（数据ID）
    userId: (state) => {
      return state.user?._id || '';
    },

    // 获取用户登录ID（5位数字ID）
    userLoginId: (state) => {
      return state.user?.userId || '';
    },

    // 获取用户状态文本
    statusText: (state) => {
      const statusMap = {
        online: '在线',
        busy: '忙碌',
        away: '离开',
        invisible: '隐身',
        offline: '离线'
      };
      return state.user?.statusText || statusMap[state.user?.status] || '离线';
    }
  },

  actions: {
    // 用户登录
    async login(credentials) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await authAPI.login(credentials);
        
        if (response.success) {
          this.user = response.data.user;
          this.token = response.data.token;
          this.isLoggedIn = true;
          
          // 保存到本地存储
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          
          // 设置本地用户数据
          await this.setupLocalUserData(this.user.userId);
          
          // 加载本地头像
          await this.loadCurrentAvatar();
          
          // 连接Socket.IO
          this.connectSocket();
          
          return { success: true };
        }
      } catch (error) {
        this.error = error.message || '登录失败';
        return { success: false, message: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    // 用户注册
    async register(userData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await authAPI.register(userData);
        
        if (response.success) {
          this.user = response.data.user;
          this.token = response.data.token;
          this.isLoggedIn = true;
          
          // 保存到本地存储
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          
          // 设置本地用户数据
          await this.setupLocalUserData(this.user.userId);
          
          // 加载本地头像
          await this.loadCurrentAvatar();
          
          // 连接Socket.IO
          this.connectSocket();
          
          return { success: true };
        }
      } catch (error) {
        this.error = error.message || '注册失败';
        return { success: false, message: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    // 用户登出
    async logout() {
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('登出API调用失败:', error);
      }
      
      // 清除本地状态
      this.user = null;
      this.token = null;
      this.isLoggedIn = false;
      this.onlineUsers = [];
      
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 断开Socket连接
      socketService.disconnect();
      this.isSocketConnected = false;
    },

    // 从本地存储恢复用户状态
    async restoreUserFromStorage() {
      console.log('开始恢复用户状态...');
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      console.log('localStorage token:', token ? '存在' : '不存在');
      console.log('localStorage user:', userStr ? '存在' : '不存在');
      
      if (token && userStr) {
        try {
          this.token = token;
          this.user = JSON.parse(userStr);
          this.isLoggedIn = true;
          
          console.log('本地用户状态已恢复:', {
            userId: this.user?.profile?.userId || this.user?.userId,
            displayName: this.user?.profile?.displayName || this.user?.displayName,
            isLoggedIn: this.isLoggedIn
          });
          
          // 尝试验证token是否有效（不阻塞用户状态恢复）
          try {
            const response = await authAPI.getCurrentUser();
            if (response.success) {
              console.log('Token验证成功，更新用户信息');
              this.user = response.data.user;
              localStorage.setItem('user', JSON.stringify(this.user));
            }
          } catch (apiError) {
            console.warn('Token验证失败，但保持本地用户状态:', apiError.message);
          }
          
          // 连接Socket.IO
          this.connectSocket();
          
          // 设置本地用户数据
          if (this.user?.profile?.userId || this.user?.userId) {
            const userId = this.user.profile?.userId || this.user.userId;
            await this.setupLocalUserData(userId);
            await this.loadCurrentAvatar();
          }
          
        } catch (error) {
          console.error('恢复用户状态失败:', error);
          // 不要立即logout，给用户机会重新登录
          this.isLoggedIn = false;
          this.user = null;
          this.token = null;
        }
      } else {
        console.log('没有找到本地用户数据');
      }
    },

    // 更新用户资料
    async updateProfile(profileData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await userAPI.updateProfile(profileData);
        
        if (response.success) {
          this.user = response.data.user;
          localStorage.setItem('user', JSON.stringify(this.user));
          return { success: true };
        }
      } catch (error) {
        this.error = error.message || '更新资料失败';
        return { success: false, message: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    // 更新用户状态
    async updateStatus(status, statusText) {
      try {
        const response = await userAPI.updateStatus(status, statusText);
        
        if (response.success) {
          this.user.status = response.data.status;
          this.user.statusText = response.data.statusText;
          this.user.isOnline = response.data.isOnline;
          
          localStorage.setItem('user', JSON.stringify(this.user));
          
          // 通过Socket.IO通知其他用户
          if (this.isSocketConnected) {
            socketService.updateStatus(status, statusText);
          }
          
          return { success: true };
        }
      } catch (error) {
        console.error('更新状态失败:', error);
        return { success: false, message: error.message };
      }
    },

    // 连接Socket.IO
    connectSocket() {
      console.log('userStore connectSocket 被调用, token:', !!this.token);
      if (!this.token) {
        console.log('token不存在，退出connectSocket');
        return;
      }
      
      console.log('开始连接Socket.IO...');
      socketService.connect(this.token);
      
      // 监听连接状态
      socketService.on('connected', () => {
        this.isSocketConnected = true;
        console.log('Socket.IO连接成功');
      });
      
      socketService.on('disconnected', () => {
        this.isSocketConnected = false;
        console.log('Socket.IO连接断开');
      });
      
      // 监听在线用户列表
      socketService.on('online_users_list', (users) => {
        this.onlineUsers = users;
      });
      
      // 监听用户状态变更
      socketService.on('user_status_changed', (data) => {
        const userIndex = this.onlineUsers.findIndex(u => u._id === data.userId);
        if (userIndex > -1) {
          this.onlineUsers[userIndex].status = data.status;
          this.onlineUsers[userIndex].statusText = data.statusText;
          this.onlineUsers[userIndex].isOnline = data.isOnline;
        }
      });
      
      // 监听好友相关事件
      console.log('准备设置好友事件监听器...');
      this.setupFriendEventListeners();
      console.log('好友事件监听器设置完成');
    },

    // 设置好友事件监听器
    setupFriendEventListeners() {
      console.log('=== 设置全局好友事件监听器 ===');
      console.log('socketService存在:', !!socketService);
      console.log('socketService.on存在:', typeof socketService.on);
      
      // 监听所有Socket事件（调试用）
      if (socketService.socket && socketService.socket.onAny) {
        socketService.socket.onAny((eventName, ...args) => {
          console.log('全局收到Socket事件:', eventName, args);
        });
      }
      
      // 监听好友请求被接受事件
      socketService.on('friendRequestAccepted', (data) => {
        console.log('全局收到friendRequestAccepted事件:', data);
        // 触发自定义事件，通知各个组件
        window.dispatchEvent(new CustomEvent('friendRequestAccepted', { detail: data }));
      });
      
      // 监听新好友添加事件
      socketService.on('friendAdded', (data) => {
        console.log('全局收到friendAdded事件:', data);
        // 触发自定义事件，通知各个组件
        window.dispatchEvent(new CustomEvent('friendAdded', { detail: data }));
      });
      
      // 监听好友请求接收事件
      socketService.on('friendRequestReceived', (data) => {
        console.log('全局收到friendRequestReceived事件:', data);
        // 触发自定义事件，通知各个组件
        window.dispatchEvent(new CustomEvent('friendRequestReceived', { detail: data }));
      });
    },

    // 发送点赞
    sendLike(targetUserId) {
      if (socketService.isConnected) {
        socketService.emit('send_like', { targetUserId });
      }
    },

    // 设置本地用户数据
    async setupLocalUserData(userId) {
      console.log(`开始设置本地用户数据: ${userId}`);
      console.log('window.electronAPI 是否存在:', !!window.electronAPI);
      
      try {
        if (window.electronAPI) {
          console.log('调用 setupUserData API...');
          const result = await window.electronAPI.setupUserData(userId);
          console.log('setupUserData 结果:', result);
          
          if (result.success) {
            console.log(`本地用户数据设置成功: ${userId}`);
            console.log('数据库路径:', result.dbPath);
            
            // 保存用户信息到本地数据库
            if (this.user) {
              console.log('保存用户信息到本地数据库...');
              const userInfo = {
                displayName: this.user.profile.displayName,
                signature: this.user.profile.signature || '',
                avatarPath: this.user.profile.avatar || '',
                location: this.user.profile.location || ''
              };
              console.log('用户信息:', userInfo);
              
              const saveResult = await window.electronAPI.saveUserInfoLocally(userId, userInfo);
              console.log('保存用户信息结果:', saveResult);
            }
          } else {
            console.error('设置本地用户数据失败:', result.error);
          }
        } else {
          console.error('window.electronAPI 不存在，可能不在 Electron 环境中');
        }
      } catch (error) {
        console.error('设置本地用户数据异常:', error);
      }
    },

    // 获取用户数据路径
    async getUserDataPaths(userId) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getUserDataPaths(userId);
          if (result.success) {
            return result.paths;
          }
        }
        return null;
      } catch (error) {
        console.error('获取用户数据路径失败:', error);
        return null;
      }
    },

    // 显示用户数据路径（调试用）
    showUserDataPaths() {
      if (this.user?.profile?.userId) {
        window.electronAPI?.getUserDataPaths(this.user.profile.userId)
          .then(result => {
            if (result.success) {
              console.log('用户数据路径:', result.paths)
            }
          })
          .catch(error => {
            console.error('获取用户数据路径失败:', error)
          })
      }
    },

    // 上传并保存头像
    async uploadAvatar(file) {
      try {
        const userId = this.user?.userId || this.user?.profile?.userId;
        if (!userId) {
          throw new Error('用户未登录')
        }
        
        // 生成唯一文件名
        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop()
        const fileName = `avatar_${timestamp}.${fileExtension}`
        
        // 将文件转换为Buffer
        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = new Uint8Array(arrayBuffer)
        
        // 保存文件到本地头像文件夹
        const saveResult = await window.electronAPI.saveFileToUserFolder(
          userId, 
          'avatars', 
          fileName, 
          fileBuffer
        )
        
        if (saveResult.success) {
          // 保存头像信息到数据库
          const avatarData = {
            filename: fileName,
            path: saveResult.filePath
          }
          
          const dbResult = await window.electronAPI.saveAvatarInfo(userId, avatarData)
          
          if (dbResult.success) {
            // 更新用户头像路径（支持多种用户对象结构）
            if (this.user.profile) {
              this.user.profile.avatar = saveResult.filePath
            } else {
              // 如果没有profile对象，创建一个
              this.user.profile = { avatar: saveResult.filePath }
            }
            
            // 也更新直接的avatar属性
            this.user.avatar = saveResult.filePath
            
            // 更新localStorage
            localStorage.setItem('user', JSON.stringify(this.user))
            
            console.log('头像上传成功:', saveResult.filePath)
            return { success: true, avatarPath: saveResult.filePath }
          } else {
            throw new Error('保存头像信息到数据库失败')
          }
        } else {
          throw new Error('保存头像文件失败')
        }
      } catch (error) {
        console.error('上传头像失败:', error)
        return { success: false, error: error.message }
      }
    },

    // 获取当前头像
    async getCurrentAvatar() {
      try {
        const userId = this.user?.userId || this.user?.profile?.userId;
        if (!userId) {
          return null
        }

        const result = await window.electronAPI.getCurrentAvatar(userId)
        
        if (result.success && result.avatar) {
          return result.avatar
        }
        
        return null
      } catch (error) {
        console.error('获取当前头像失败:', error)
        return null
      }
    },

    // 获取头像历史
    async getAvatarHistory(limit = 10) {
      try {
        const userId = this.user?.userId || this.user?.profile?.userId;
        if (!userId) {
          return []
        }

        const result = await window.electronAPI.getAvatarHistory(userId, limit)
        
        if (result.success) {
          return result.history || []
        }
        
        return []
      } catch (error) {
        console.error('获取头像历史失败:', error)
        return []
      }
    },

    // 加载当前用户的本地头像
    async loadCurrentAvatar() {
      try {
        const userId = this.user?.userId || this.user?.profile?.userId;
        if (!userId) {
          console.log('用户未登录，无法加载头像')
          return
        }

        const avatar = await this.getCurrentAvatar()
        
        if (avatar && avatar.avatar_path) {
          // 更新用户头像路径（支持多种用户对象结构）
          if (this.user.profile) {
            this.user.profile.avatar = avatar.avatar_path
          } else {
            this.user.profile = { avatar: avatar.avatar_path }
          }
          
          // 也更新直接的avatar属性
          this.user.avatar = avatar.avatar_path
          
          // 更新localStorage
          localStorage.setItem('user', JSON.stringify(this.user))
          
          console.log('本地头像加载成功:', avatar.avatar_path)
        } else {
          console.log('未找到本地头像，使用默认头像')
        }
      } catch (error) {
        console.error('加载本地头像失败:', error)
      }
    },

    // 显示当前用户数据路径（调试用）
    async showCurrentUserPaths() {
      if (this.user && this.user.userId) {
        const paths = await this.getUserDataPaths(this.user.userId);
        if (paths) {
          console.log('=== 用户数据存储路径 ===');
          console.log('用户ID:', this.user.userId);
          console.log('用户数据目录:', paths.userData);
          console.log('SQLite数据库:', paths.database);
          console.log('图片目录:', paths.pictures);
          console.log('头像目录:', paths.avatars);
          console.log('文档目录:', paths.documents);
          console.log('缓存目录:', paths.cache);
          console.log('========================');
          return paths;
        }
      }
      return null;
    },

    // 清除用户本地数据
    async clearLocalUserData(userId) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.clearUserData(userId);
          if (result.success) {
            console.log(`用户本地数据清除成功: ${userId}`);
          } else {
            console.error('清除用户本地数据失败:', result.error);
          }
        }
      } catch (error) {
        console.error('清除用户本地数据异常:', error);
      }
    },

    // 清除错误
    clearError() {
      this.error = null;
    }
  }
});
