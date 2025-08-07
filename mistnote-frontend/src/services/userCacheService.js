// 用户数据缓存服务
// 实现本地优先、远程兜底的用户信息加载与缓存策略

import axios from 'axios'

class UserCacheService {
  constructor() {
    this.cache = new Map() // 内存缓存
    this.pendingRequests = new Map() // 防止重复请求
  }

  /**
   * 获取用户信息（本地优先，远程兜底）
   * @param {string} userId - 用户ID
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(userId, forceRefresh = false) {
    try {
      // 1. 检查内存缓存
      if (!forceRefresh && this.cache.has(userId)) {
        console.log(`从内存缓存获取用户信息: ${userId}`)
        return this.cache.get(userId)
      }

      // 2. 防止重复请求
      if (this.pendingRequests.has(userId)) {
        console.log(`等待正在进行的用户信息请求: ${userId}`)
        return await this.pendingRequests.get(userId)
      }

      // 3. 创建请求Promise
      const requestPromise = this._fetchUserInfo(userId, forceRefresh)
      this.pendingRequests.set(userId, requestPromise)

      try {
        const userInfo = await requestPromise
        return userInfo
      } finally {
        this.pendingRequests.delete(userId)
      }
    } catch (error) {
      console.error(`获取用户信息失败: ${userId}`, error)
      throw error
    }
  }

  /**
   * 内部方法：获取用户信息
   * @private
   */
  async _fetchUserInfo(userId, forceRefresh) {
    try {
      let userInfo = null

      // 1. 尝试从本地数据库获取
      if (!forceRefresh) {
        userInfo = await this._getLocalUserInfo(userId)
        if (userInfo && this._isUserInfoValid(userInfo)) {
          console.log(`从本地数据库获取用户信息: ${userId}`)
          // 缓存到内存
          this.cache.set(userId, userInfo)
          return userInfo
        }
      }

      // 2. 从服务器获取
      console.log(`从服务器获取用户信息: ${userId}`)
      userInfo = await this._getRemoteUserInfo(userId)

      if (userInfo) {
        // 3. 保存到本地数据库
        await this._saveLocalUserInfo(userId, userInfo)
        
        // 4. 下载并缓存头像
        if (userInfo.profile?.avatar) {
          userInfo.profile.avatar = await this._cacheUserAvatar(userId, userInfo.profile.avatar)
        }

        // 5. 缓存到内存
        this.cache.set(userId, userInfo)
        
        console.log(`用户信息已缓存: ${userId}`)
        return userInfo
      }

      throw new Error(`无法获取用户信息: ${userId}`)
    } catch (error) {
      console.error(`获取用户信息失败: ${userId}`, error)
      throw error
    }
  }

  /**
   * 从本地数据库获取用户信息
   * @private
   */
  async _getLocalUserInfo(userId) {
    try {
      if (!window.electronAPI?.getUserCacheInfo) {
        return null
      }

      const result = await window.electronAPI.getUserCacheInfo(userId)
      return result.success ? result.data : null
    } catch (error) {
      console.error(`从本地获取用户信息失败: ${userId}`, error)
      return null
    }
  }

  /**
   * 从服务器获取用户信息
   * @private
   */
  async _getRemoteUserInfo(userId) {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未找到认证令牌')
      }

      const response = await axios.get(`http://localhost:5000/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.success) {
        return response.data.data
      }

      throw new Error(response.data.message || '获取用户信息失败')
    } catch (error) {
      console.error(`从服务器获取用户信息失败: ${userId}`, error)
      throw error
    }
  }

  /**
   * 保存用户信息到本地数据库
   * @private
   */
  async _saveLocalUserInfo(userId, userInfo) {
    try {
      if (!window.electronAPI?.saveUserCacheInfo) {
        return
      }

      const cacheData = {
        userId: userId,
        displayName: userInfo.profile?.displayName || userInfo.username || '',
        signature: userInfo.profile?.signature || '',
        avatar: userInfo.profile?.avatar || '',
        location: userInfo.profile?.location || '',
        status: userInfo.status || 'offline',
        lastSeen: userInfo.lastSeen || new Date().toISOString(),
        cacheTime: new Date().toISOString()
      }

      await window.electronAPI.saveUserCacheInfo(userId, cacheData)
      console.log(`用户信息已保存到本地: ${userId}`)
    } catch (error) {
      console.error(`保存用户信息到本地失败: ${userId}`, error)
    }
  }

  /**
   * 缓存用户头像
   * @private
   */
  async _cacheUserAvatar(userId, avatarUrl) {
    try {
      if (!avatarUrl || avatarUrl.startsWith('/default') || avatarUrl.startsWith('data:')) {
        return avatarUrl
      }

      // 检查本地是否已有头像缓存
      if (window.electronAPI?.getUserAvatar) {
        const localAvatar = await window.electronAPI.getUserAvatar(userId)
        if (localAvatar.success && localAvatar.path) {
          console.log(`使用本地缓存头像: ${userId}`)
          return localAvatar.path
        }
      }

      // 下载并缓存头像
      if (window.electronAPI?.cacheUserAvatar) {
        const fullAvatarUrl = avatarUrl.startsWith('http') 
          ? avatarUrl 
          : `http://localhost:5000${avatarUrl}`
        
        const result = await window.electronAPI.cacheUserAvatar(userId, fullAvatarUrl)
        if (result.success) {
          console.log(`头像已缓存: ${userId}`)
          return result.localPath
        }
      }

      return avatarUrl
    } catch (error) {
      console.error(`缓存用户头像失败: ${userId}`, error)
      return avatarUrl
    }
  }

  /**
   * 检查用户信息是否有效（未过期）
   * @private
   */
  _isUserInfoValid(userInfo) {
    if (!userInfo.cacheTime) {
      return false
    }

    const cacheTime = new Date(userInfo.cacheTime)
    const now = new Date()
    const diffHours = (now - cacheTime) / (1000 * 60 * 60)

    // 缓存有效期：24小时
    return diffHours < 24
  }

  /**
   * 批量获取用户信息
   * @param {string[]} userIds - 用户ID数组
   * @returns {Promise<Object>} 用户信息映射
   */
  async getBatchUserInfo(userIds) {
    try {
      const results = {}
      const promises = userIds.map(async (userId) => {
        try {
          const userInfo = await this.getUserInfo(userId)
          results[userId] = userInfo
        } catch (error) {
          console.error(`批量获取用户信息失败: ${userId}`, error)
          results[userId] = null
        }
      })

      await Promise.all(promises)
      return results
    } catch (error) {
      console.error('批量获取用户信息失败', error)
      throw error
    }
  }

  /**
   * 清除用户缓存
   * @param {string} userId - 用户ID，不传则清除所有缓存
   */
  clearCache(userId = null) {
    if (userId) {
      this.cache.delete(userId)
      console.log(`已清除用户缓存: ${userId}`)
    } else {
      this.cache.clear()
      console.log('已清除所有用户缓存')
    }
  }

  /**
   * 预加载用户信息
   * @param {string[]} userIds - 需要预加载的用户ID数组
   */
  async preloadUsers(userIds) {
    console.log('预加载用户信息:', userIds)
    const promises = userIds.map(userId => 
      this.getUserInfo(userId).catch(error => {
        console.error(`预加载用户信息失败: ${userId}`, error)
      })
    )
    await Promise.all(promises)
  }
}

// 创建单例实例
const userCacheService = new UserCacheService()

export default userCacheService
