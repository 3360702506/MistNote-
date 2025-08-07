// 消息服务
// 处理消息发送、接收、历史记录加载和本地缓存

import axios from 'axios'
import socketService from './socket'

class MessageService {
  constructor() {
    this.messageCache = new Map() // 消息缓存
    this.conversationCache = new Map() // 会话缓存
    this.requestCache = new Map() // API请求缓存
    this.pendingRequests = new Set() // 正在进行的请求
    this.eventHandlers = new Map() // 事件处理器
    this.setupSocketListeners()
  }

  // 自定义事件系统
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 设置Socket事件监听器
   * @private
   */
  setupSocketListeners() {
    // 监听新消息
    socketService.on('new_message', (data) => {
      console.log('收到新消息:', data)
      this.handleNewMessage(data)
    })

    // 监听消息发送确认
    socketService.on('message_sent', (data) => {
      console.log('消息发送确认:', data)
      this.handleMessageSent(data)
    })

    // 监听消息已读通知
    socketService.on('messages_read', (data) => {
      console.log('消息已读通知:', data)
      this.handleMessagesRead(data)
    })
  }

  /**
   * 处理收到的新消息
   * @private
   */
  handleNewMessage(data) {
    console.log('处理新消息数据:', data)
    
    const message = {
      id: data.messageId,
      senderId: data.senderId,
      senderUserId: data.senderUserId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      receiverId: data.receiverId,
      receiverUserId: data.receiverUserId,
      content: data.content,
      messageType: data.messageType,
      timestamp: new Date(data.timestamp),
      isSent: false,
      status: 'delivered'
    }

    // 获取当前用户ID
    const currentUserId = this.getCurrentUserId()
    if (!currentUserId) {
      console.error('无法获取当前用户ID，无法处理新消息')
      return
    }

    // 正确生成会话ID（使用userId而不是_id）
    const otherUserId = data.senderUserId === currentUserId ? data.receiverUserId : data.senderUserId
    const conversationId = this.generateConversationId(currentUserId, otherUserId)
    
    if (!conversationId) {
      console.error('生成会话ID失败，无法处理新消息')
      return
    }

    // 添加到会话缓存
    if (!this.conversationCache.has(conversationId)) {
      this.conversationCache.set(conversationId, [])
    }
    this.conversationCache.get(conversationId).push(message)

    // 保存到本地数据库
    this.saveMessageToLocal(message, conversationId)

    // 触发事件
    console.log('触发new_message事件:', { conversationId, message })
    this.emit('new_message', { message, conversationId })
  }

  /**
   * 处理消息发送确认
   * @private
   */
  handleMessageSent(data) {
    console.log('处理消息发送确认数据:', data)
    
    // 获取当前用户ID
    const currentUserId = this.getCurrentUserId()
    if (!currentUserId) {
      console.error('无法获取当前用户ID，无法处理消息发送确认')
      return
    }

    // 正确生成会话ID（使用userId而不是_id）
    const otherUserId = data.receiverUserId || data.senderUserId
    const conversationId = this.generateConversationId(currentUserId, otherUserId)
    const messageId = data.messageId
    
    if (!conversationId) {
      console.error('生成会话ID失败，无法处理消息发送确认')
      return
    }

    console.log('消息发送确认 - 会话ID:', { conversationId, messageId, currentUserId, otherUserId })

    // 更新会话缓存中的消息状态
    if (this.conversationCache.has(conversationId)) {
      const messages = this.conversationCache.get(conversationId)
      const message = messages.find(m => m.id === messageId || m.tempId === messageId)
      if (message) {
        message.id = messageId
        message.status = 'sent'
        delete message.tempId
      }
    }

    // 触发事件
    console.log('触发message_sent事件:', { messageId, conversationId })
    this.emit('message_sent', { messageId, conversationId })
  }

  /**
   * 处理消息已读通知
   * @private
   */
  handleMessagesRead(data) {
    console.log('处理消息已读数据:', data)
    
    // 获取当前用户ID
    const currentUserId = this.getCurrentUserId()
    if (!currentUserId) {
      console.error('无法获取当前用户ID，无法处理消息已读通知')
      return
    }

    // 正确生成会话ID
    const otherUserId = data.senderUserId || data.receiverUserId
    const conversationId = this.generateConversationId(currentUserId, otherUserId)
    const messageIds = data.messageIds
    
    if (!conversationId) {
      console.error('生成会话ID失败，无法处理消息已读通知')
      return
    }

    console.log('消息已读 - 会话ID:', { conversationId, messageIds, currentUserId, otherUserId })

    // 更新会话缓存中的消息状态
    if (this.conversationCache.has(conversationId)) {
      const messages = this.conversationCache.get(conversationId)
      messages.forEach(message => {
        if (message.isSent && (!messageIds || messageIds.includes(message.id))) {
          message.status = 'read'
        }
      })
    }

    // 触发事件
    this.emit('messages_read', { messageIds, conversationId })
  }

  /**
   * 发送消息
   * @param {string} receiverId - 接收者ID
   * @param {string} content - 消息内容
   * @param {string} messageType - 消息类型
   * @returns {Promise<Object>} 发送结果
   */
  async sendMessage(receiverId, content, messageType = 'text') {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未找到认证令牌')
      }

      const currentUserId = this.getCurrentUserId()
      if (!currentUserId) {
        throw new Error('未找到当前用户ID')
      }

      // 创建临时消息（立即显示在界面上）
      const tempMessage = {
        tempId: `temp_${Date.now()}`,
        senderId: currentUserId,
        receiverId: receiverId,
        content: content,
        messageType: messageType,
        timestamp: new Date(),
        isSent: true,
        status: 'sending'
      }

      // 生成会话ID
      const conversationId = this.generateConversationId(currentUserId, receiverId)

      // 添加到会话缓存
      if (!this.conversationCache.has(conversationId)) {
        this.conversationCache.set(conversationId, [])
      }
      this.conversationCache.get(conversationId).push(tempMessage)

      // 立即触发事件更新UI
      this.emit('message_sending', { message: tempMessage, conversationId })

      // 发送到服务器
      const response = await axios.post('http://localhost:5000/api/messages/send', {
        receiverId,
        content,
        messageType
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.success) {
        // 更新临时消息
        const realMessageId = response.data.data.messageId
        tempMessage.id = realMessageId
        tempMessage.status = 'sent'
        delete tempMessage.tempId

        // 保存到本地数据库
        await this.saveMessageToLocal(tempMessage, conversationId)

        return {
          success: true,
          messageId: realMessageId,
          conversationId: conversationId
        }
      } else {
        // 发送失败，更新状态
        tempMessage.status = 'failed'
        throw new Error(response.data.message || '发送消息失败')
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      
      // 更新临时消息状态为失败
      const conversationId = this.generateConversationId(null, receiverId)
      if (this.conversationCache.has(conversationId)) {
        const messages = this.conversationCache.get(conversationId)
        const tempMessage = messages[messages.length - 1]
        if (tempMessage && tempMessage.status === 'sending') {
          tempMessage.status = 'failed'
        }
      }

      throw error
    }
  }

  /**
   * 获取聊天历史
   * @param {string} userId - 对方用户ID
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise<Object>} 聊天历史
   */
  async getChatHistory(userId, page = 1, limit = 50) {
    try {
      const currentUserId = this.getCurrentUserId()
      if (!currentUserId) {
        throw new Error('未找到当前用户ID')
      }

      const conversationId = this.generateConversationId(currentUserId, userId)
      if (!conversationId) {
        throw new Error('无法生成会话ID')
      }

      // 检查是否正在请求中，防止重复请求
      const requestKey = `history_${userId}_${page}_${limit}`
      if (this.pendingRequests.has(requestKey)) {
        console.log('请求已在进行中，跳过重复请求:', requestKey)
        return { success: false, error: '请求已在进行中' }
      }

      // 先从本地缓存获取
      if (this.conversationCache.has(conversationId)) {
        const cachedMessages = this.conversationCache.get(conversationId)
        if (cachedMessages.length > 0) {
          console.log('从缓存获取聊天历史:', cachedMessages.length)
          return {
            success: true,
            data: {
              messages: cachedMessages,
              total: cachedMessages.length,
              page,
              limit,
              conversationId
            }
          }
        }
      }

      // 标记请求开始
      this.pendingRequests.add(requestKey)
      
      try {
        // 从服务器获取
        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('未找到认证令牌')
        }

        console.log(`从服务器获取聊天历史: ${userId}`)
        const response = await axios.get(`http://localhost:5000/api/messages/history/${userId}`, {
          params: { page, limit },
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10秒超时
        })

      if (response.data.success) {
        const messages = response.data.data.messages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          senderUserId: msg.senderUserId,
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar,
          receiverId: msg.receiverId,
          receiverUserId: msg.receiverUserId,
          receiverName: msg.receiverName,
          receiverAvatar: msg.receiverAvatar,
          content: msg.content,
          messageType: msg.messageType,
          timestamp: new Date(msg.timestamp),
          isSent: msg.isSent,
          status: msg.status
        }))

        // 缓存消息
        this.conversationCache.set(conversationId, messages)

        // 保存到本地数据库
        for (const message of messages) {
          await this.saveMessageToLocal(message, conversationId)
        }

        return {
          success: true,
          data: {
            messages,
            pagination: response.data.data.pagination,
            conversationId
          }
        }
      } else {
        throw new Error(response.data.message || '获取聊天历史失败')
      }
      } catch (serverError) {
        // 处理429错误，使用本地数据库作为备用
        if (serverError.response?.status === 429) {
          console.warn('API请求频率过高，尝试从本地数据库获取')
          try {
            const localMessages = await this.getLocalChatHistory(userId, limit)
            if (localMessages && localMessages.length > 0) {
              return {
                success: true,
                data: {
                  messages: localMessages,
                  total: localMessages.length,
                  page,
                  limit,
                  conversationId,
                  fromLocal: true
                }
              }
            }
          } catch (localError) {
            console.error('本地数据库获取失败:', localError)
          }
        }
        throw serverError
      } finally {
        // 清理请求状态
        this.pendingRequests.delete(requestKey)
      }
    } catch (error) {
      console.error('获取聊天历史失败:', error)
      throw error
    }
  }

  /**
   * 从本地数据库获取聊天历史
   * @param {string} userId - 用户ID
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>} 消息列表
   */
  async getLocalChatHistory(userId, limit = 50) {
    try {
      const currentUserId = this.getCurrentUserId()
      if (!currentUserId) {
        throw new Error('未找到当前用户ID')
      }

      const result = await window.electronAPI.getChatMessages(currentUserId, userId, limit, 0)
      if (result && Array.isArray(result)) {
        return result.map(msg => ({
          id: msg.server_message_id || msg.id,
          senderId: msg.is_sent ? currentUserId : userId,
          senderUserId: msg.is_sent ? currentUserId : userId,
          senderName: msg.is_sent ? '我' : userId,
          senderAvatar: '/default-avatar.png',
          receiverId: msg.is_sent ? userId : currentUserId,
          receiverUserId: msg.is_sent ? userId : currentUserId,
          content: msg.content,
          messageType: msg.message_type || 'text',
          timestamp: new Date(msg.timestamp),
          isSent: Boolean(msg.is_sent),
          status: msg.is_read ? 'read' : 'delivered'
        }))
      }
      return []
    } catch (error) {
      console.error('从本地数据库获取聊天历史失败:', error)
      return []
    }
  }

  /**
   * 标记消息为已读
   * @param {string} senderId - 发送者ID
   * @param {string[]} messageIds - 消息ID数组（可选）
   */
  async markMessagesAsRead(senderId, messageIds = null) {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未找到认证令牌')
      }

      await axios.post('http://localhost:5000/api/messages/mark-read', {
        senderId,
        messageIds
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log(`消息已标记为已读: ${senderId}`)
    } catch (error) {
      console.error('标记消息已读失败:', error)
    }
  }

  /**
   * 保存消息到本地数据库
   * @private
   */
  async saveMessageToLocal(message, conversationId) {
    try {
      if (!window.electronAPI?.saveChatMessage) {
        return
      }

      const currentUserId = this.getCurrentUserId()
      if (!currentUserId) {
        return
      }

      const messageData = {
        serverMessageId: message.id,
        contactId: message.isSent ? message.receiverId : message.senderId,
        messageType: message.messageType,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        isSent: message.isSent ? 1 : 0,
        isRead: message.status === 'read' ? 1 : 0,
        syncStatus: 'synced',
        localOnly: 0
      }

      await window.electronAPI.saveChatMessage(currentUserId, messageData)
      console.log('消息已保存到本地数据库')
    } catch (error) {
      console.error('保存消息到本地失败:', error)
    }
  }

  /**
   * 生成会话ID
   * @param {string} userId1 - 用户ID1
   * @param {string} userId2 - 用户ID2
   * @returns {string} 会话ID
   * @private
   */
  generateConversationId(userId1, userId2) {
    // 确保使用数字userId而不是ObjectId
    const normalizeUserId = (id) => {
      if (!id) return null
      
      // 将ID转换为字符串
      const idStr = id.toString()
      
      // 如果是数字字符串（5位或更少），直接返回
      if (/^\d{1,5}$/.test(idStr)) {
        return idStr
      }
      
      // 如果是ObjectId格式（24位十六进制），需要特殊处理
      if (/^[a-f0-9]{24}$/i.test(idStr)) {
        console.error('检测到ObjectId格式的用户ID，这会导致会话ID不匹配:', idStr)
        console.error('请确保使用5位数字userId而不是MongoDB的_id')
        // 尝试从localStorage获取正确的userId
        try {
          const userStore = JSON.parse(localStorage.getItem('user') || '{}')
          if (userStore._id === idStr && userStore.userId) {
            console.log('找到对应的5位数字ID:', userStore.userId)
            return userStore.userId.toString()
          }
        } catch (e) {
          console.error('无法从localStorage获取用户信息:', e)
        }
        // 如果无法找到对应的userId，仍返回原值（但会导致问题）
        return idStr
      }
      
      return idStr
    }
    
    const normalizedId1 = normalizeUserId(userId1)
    const normalizedId2 = normalizeUserId(userId2)
    
    if (!normalizedId1 || !normalizedId2) {
      console.error('生成会话ID失败：用户ID无效', { userId1, userId2, normalizedId1, normalizedId2 })
      return null
    }
    
    // 确保会话ID的一致性
    const ids = [normalizedId1, normalizedId2].sort()
    const conversationId = `${ids[0]}_${ids[1]}`
    console.log('生成会话ID:', { userId1, userId2, normalizedId1, normalizedId2, conversationId })
    return conversationId
  }

  /**
   * 获取当前用户ID
   * @private
   */
  getCurrentUserId() {
    // 从用户状态管理中获取当前用户ID
    // 优先返回5位数字ID (userId)，而不是ObjectId (_id)
    try {
      const userStore = JSON.parse(localStorage.getItem('user') || '{}')
      // 优先使用userId（5位数字ID），这是用于聊天会话的标准ID
      return userStore.userId || userStore._id
    } catch {
      return null
    }
  }

  /**
   * 事件监听
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  /**
   * 移除事件监听
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   * @private
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.messageCache.clear()
    this.conversationCache.clear()
    console.log('消息缓存已清除')
  }
}

// 创建单例实例
const messageService = new MessageService()

export default messageService
