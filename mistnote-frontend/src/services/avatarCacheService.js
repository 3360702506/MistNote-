// 头像缓存服务 - 管理用户头像的本地缓存和服务器同步
import api from './api';

class AvatarCacheService {
  constructor() {
    this.memoryCache = new Map(); // 内存缓存
    this.downloadQueue = new Set(); // 下载队列，防止重复下载
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7天缓存有效期
  }

  /**
   * 获取用户头像（优先本地，其次服务器）
   * @param {string} userId - 用户ID
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<string>} 头像路径
   */
  async getUserAvatar(userId, forceRefresh = false) {
    if (!userId) return '/default-avatar.png';

    // 1. 检查内存缓存
    if (!forceRefresh && this.memoryCache.has(userId)) {
      const cached = this.memoryCache.get(userId);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.avatarPath;
      }
    }

    try {
      // 2. 检查本地数据库缓存
      const localAvatar = await this.getLocalAvatar(userId);
      if (localAvatar && !forceRefresh) {
        // 更新内存缓存
        this.memoryCache.set(userId, {
          avatarPath: localAvatar.path,
          timestamp: Date.now()
        });
        return localAvatar.path;
      }

      // 3. 从服务器获取
      const serverAvatar = await this.fetchServerAvatar(userId);
      if (serverAvatar) {
        // 下载并保存到本地
        const localPath = await this.downloadAndSaveAvatar(userId, serverAvatar);
        
        // 更新内存缓存
        this.memoryCache.set(userId, {
          avatarPath: localPath,
          timestamp: Date.now()
        });
        
        return localPath;
      }

      // 4. 返回默认头像
      return '/default-avatar.png';
    } catch (error) {
      console.error(`获取用户 ${userId} 头像失败:`, error);
      return '/default-avatar.png';
    }
  }

  /**
   * 从本地数据库获取头像
   */
  async getLocalAvatar(userId) {
    try {
      if (!window.electronAPI) return null;
      
      const result = await window.electronAPI.getUserAvatarInfo(userId);
      if (result.success && result.avatar) {
        // 检查文件是否存在
        const exists = await window.electronAPI.checkFileExists(result.avatar.path);
        if (exists) {
          return result.avatar;
        }
      }
      return null;
    } catch (error) {
      console.error('获取本地头像失败:', error);
      return null;
    }
  }

  /**
   * 从服务器获取头像URL
   */
  async fetchServerAvatar(userId) {
    try {
      // 注意: api.js 的响应拦截器已经返回了 response.data
      const response = await api.get(`/users/${userId}/avatar`);
      if (response.success && response.avatarUrl) {
        return response.avatarUrl;
      }
      return null;
    } catch (error) {
      console.error('从服务器获取头像失败:', error);
      return null;
    }
  }

  /**
   * 下载头像并保存到本地
   */
  async downloadAndSaveAvatar(userId, avatarUrl) {
    // 防止重复下载
    const downloadKey = `${userId}-${avatarUrl}`;
    if (this.downloadQueue.has(downloadKey)) {
      // 等待下载完成
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.downloadQueue.has(downloadKey)) {
            clearInterval(checkInterval);
            this.getLocalAvatar(userId).then(local => {
              resolve(local ? local.path : '/default-avatar.png');
            });
          }
        }, 100);
      });
    }

    this.downloadQueue.add(downloadKey);

    try {
      // 构建完整的服务器URL
      const fullUrl = avatarUrl.startsWith('http') 
        ? avatarUrl 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${avatarUrl}`;

      // 下载头像文件
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('下载失败');
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      // 生成文件名
      const timestamp = Date.now();
      const extension = avatarUrl.split('.').pop() || 'jpg';
      const fileName = `avatar_${userId}_${timestamp}.${extension}`;
      
      // 保存到本地
      if (window.electronAPI) {
        const saveResult = await window.electronAPI.saveOtherUserAvatar(
          userId,
          fileName,
          buffer
        );
        
        if (saveResult.success) {
          // 保存到本地数据库
          await window.electronAPI.saveOtherUserAvatarInfo(userId, {
            filename: fileName,
            path: saveResult.filePath,
            serverUrl: avatarUrl,
            downloadTime: new Date().toISOString()
          });
          
          return saveResult.filePath;
        }
      }
      
      // 如果本地保存失败，返回服务器URL
      return fullUrl;
    } catch (error) {
      console.error('下载并保存头像失败:', error);
      return '/default-avatar.png';
    } finally {
      this.downloadQueue.delete(downloadKey);
    }
  }

  /**
   * 批量预加载用户头像
   */
  async preloadAvatars(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    
    // 限制批量加载数量
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(userId => this.getUserAvatar(userId).catch(() => null))
      );
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache() {
    // 清理内存缓存
    const now = Date.now();
    for (const [userId, cache] of this.memoryCache.entries()) {
      if (now - cache.timestamp > this.cacheExpiry) {
        this.memoryCache.delete(userId);
      }
    }
    
    // 清理本地文件缓存（通过Electron API）
    if (window.electronAPI) {
      await window.electronAPI.cleanExpiredAvatars(this.cacheExpiry);
    }
  }

  /**
   * 处理头像更新通知
   */
  handleAvatarUpdate(userId, newAvatarUrl) {
    // 清除该用户的缓存
    this.memoryCache.delete(userId);
    
    // 强制刷新头像
    this.getUserAvatar(userId, true).then(avatarPath => {
      // 触发UI更新事件
      window.dispatchEvent(new CustomEvent('avatar-updated', {
        detail: { userId, avatarPath }
      }));
    });
  }

  /**
   * 初始化服务
   */
  init() {
    // 监听Socket头像更新事件
    if (window.socket) {
      window.socket.on('avatar-updated', (data) => {
        this.handleAvatarUpdate(data.userId, data.avatarUrl);
      });
    }
    
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanExpiredCache();
    }, 24 * 60 * 60 * 1000); // 每天清理一次
    
    // 监听自定义事件
    window.addEventListener('request-avatar-refresh', (event) => {
      const { userId } = event.detail;
      this.getUserAvatar(userId, true);
    });
  }
}

// 导出单例
const avatarCacheService = new AvatarCacheService();
avatarCacheService.init();

export default avatarCacheService;
