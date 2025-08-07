import { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ClientUserDataManager from '../src/utils/clientUserDataManager.js'
import DatabaseManager from './databaseManager.js'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main.js    > Electron main
// │ │ └─┬ preload.js    > Preload scripts
// │ ├─┬ dist
// │ │ └── index.html    > Electron renderer
//
process.env.ROOT = path.join(__dirname, '../..')
process.env.DIST = path.join(process.env.ROOT, 'dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.ROOT, 'public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (process.platform === 'win32') app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// if (!app.requestSingleInstanceLock()) {
//   app.quit()
//   process.exit(0)
// }

let loginWin = null
let mainWin = null
let tray = null // 系统托盘
// 在开发模式下，预加载脚本在源码目录；在生产模式下，在构建目录
const preload = process.env.VITE_DEV_SERVER_URL
  ? path.join(__dirname, 'preload.js')
  : path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

// 初始化客户端用户数据管理器和数据库管理器
let clientUserDataManager = null
let databaseManager = null

// 创建登录窗口
async function createLoginWindow() {
  // 根据环境选择正确的图标路径
  const iconPath = process.env.VITE_DEV_SERVER_URL 
    ? path.join(__dirname, '../public/logo.png')
    : path.join(process.env.DIST, 'logo.png')
  
  loginWin = new BrowserWindow({
    title: 'MistNote - 登录',
    icon: iconPath,
    width: 400,
    height: 600,
    resizable: false,
    frame: false, // 无边框窗口
    titleBarStyle: 'hidden',
    center: true,
    show: false, // 先不显示，等加载完成后再显示
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  if (url) {
    loginWin.loadURL(`${url}?page=login`)
    loginWin.webContents.openDevTools()
  } else {
    loginWin.loadFile(indexHtml, { search: '?page=login' })
  }

  // 窗口加载完成后显示
  loginWin.webContents.on('did-finish-load', () => {
    loginWin.show()
  })

  // Auto-hide menu bar
  loginWin.setMenuBarVisibility(false)

  // 监听登录成功事件
  loginWin.webContents.on('ipc-message', (event, channel) => {
    if (channel === 'login-success') {
      createMainWindow()
      // 创建系统托盘
      if (!tray) {
        createTray()
      }
      loginWin.close()
    }
  })

  loginWin.on('closed', () => {
    loginWin = null
  })
}

// 创建主应用窗口
async function createMainWindow() {
  // 根据环境选择正确的图标路径
  const iconPath = process.env.VITE_DEV_SERVER_URL 
    ? path.join(__dirname, '../../public/logo.png')
    : path.join(process.env.DIST, 'logo.png')
  
  mainWin = new BrowserWindow({
    title: 'MistNote',
    icon: iconPath,
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // 无边框窗口，仿QQ NT风格
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  if (url) {
    mainWin.loadURL(`${url}?page=chat`)
    mainWin.webContents.openDevTools()
  } else {
    mainWin.loadFile(indexHtml, { search: '?page=chat' })
  }

  // 窗口加载完成后显示
  mainWin.webContents.on('did-finish-load', () => {
    mainWin.show()
  })

  // Make all links open with the browser, not with the application
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto-hide menu bar
  mainWin.setMenuBarVisibility(false)

  // 监听窗口状态变化
  mainWin.on('maximize', () => {
    mainWin.webContents.send('window-maximized')
  })

  mainWin.on('unmaximize', () => {
    mainWin.webContents.send('window-unmaximized')
  })

  // 关闭窗口时隐藏到托盘而不是退出
  mainWin.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWin.hide()
    }
  })

  mainWin.on('closed', () => {
    mainWin = null
  })
}

// 创建系统托盘
function createTray() {
  // 根据环境选择正确的图标路径
  const iconPath = process.env.VITE_DEV_SERVER_URL 
    ? path.join(__dirname, '../public/logo.png')
    : path.join(process.env.DIST, 'logo.png')
  const trayIcon = nativeImage.createFromPath(iconPath)
  
  // 在 Windows 上调整图标大小
  if (process.platform === 'win32') {
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  } else {
    tray = new Tray(trayIcon)
  }
  
  // 设置托盘提示文字
  tray.setToolTip('MistNote - 安全加密的即时通讯')
  
  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '我在线上',
      type: 'radio',
      checked: true,
      click: () => {
        // 设置在线状态
        if (mainWin) {
          mainWin.webContents.send('set-status', 'online')
        }
      }
    },
    {
      label: '忙碌',
      type: 'radio',
      click: () => {
        // 设置忙碌状态
        if (mainWin) {
          mainWin.webContents.send('set-status', 'busy')
        }
      }
    },
    {
      label: '离开',
      type: 'radio',
      click: () => {
        // 设置离开状态
        if (mainWin) {
          mainWin.webContents.send('set-status', 'away')
        }
      }
    },
    {
      label: '隐身',
      type: 'radio',
      click: () => {
        // 设置隐身状态
        if (mainWin) {
          mainWin.webContents.send('set-status', 'invisible')
        }
      }
    },
    {
      label: '请勿打扰',
      type: 'radio',
      click: () => {
        // 设置请勿打扰状态
        if (mainWin) {
          mainWin.webContents.send('set-status', 'dnd')
        }
      }
    },
    { type: 'separator' },
    {
      label: '打开所有声音',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        // 切换声音开关
        if (mainWin) {
          mainWin.webContents.send('toggle-sound', menuItem.checked)
        }
      }
    },
    {
      label: '关闭头像闪动',
      type: 'checkbox',
      click: (menuItem) => {
        // 切换头像闪动
        if (mainWin) {
          mainWin.webContents.send('toggle-avatar-flash', !menuItem.checked)
        }
      }
    },
    { type: 'separator' },
    {
      label: '打开主面板',
      click: () => {
        if (mainWin) {
          mainWin.show()
          mainWin.focus()
        } else {
          createMainWindow()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])
  
  // 设置托盘菜单
  tray.setContextMenu(contextMenu)
  
  // 单击托盘图标时显示/隐藏窗口
  tray.on('click', () => {
    if (mainWin) {
      if (mainWin.isVisible()) {
        mainWin.hide()
      } else {
        mainWin.show()
        mainWin.focus()
      }
    } else {
      createMainWindow()
    }
  })
  
  // 双击托盘图标时显示窗口
  tray.on('double-click', () => {
    if (mainWin) {
      mainWin.show()
      mainWin.focus()
    } else {
      createMainWindow()
    }
  })
}

app.whenReady().then(() => {
  // 初始化客户端用户数据管理器和数据库管理器
  clientUserDataManager = new ClientUserDataManager()
  databaseManager = new DatabaseManager()
  
  createLoginWindow()
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow()
  })
})

app.on('window-all-closed', () => {
  loginWin = null
  mainWin = null
  if (process.platform !== 'darwin') {
    // 清理托盘
    if (tray) {
      tray.destroy()
      tray = null
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  // 清理托盘
  if (tray) {
    tray.destroy()
    tray = null
  }
})

// 头像相关IPC处理器
ipcMain.handle('save-avatar-info', async (event, userId, avatarData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const result = await databaseManager.saveAvatarInfo(dbPath, userId, avatarData)
      return { success: true, result }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存头像信息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-current-avatar', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const avatar = await databaseManager.getCurrentAvatar(dbPath, userId)
      return { success: true, avatar }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取当前头像失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-avatar-history', async (event, userId, limit = 10) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const history = await databaseManager.getAvatarHistory(dbPath, userId, limit)
      return { success: true, history }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取头像历史失败:', error)
    return { success: false, error: error.message }
  }
})

// 文件操作相关
ipcMain.handle('save-file-to-user-folder', async (event, userId, folderType, fileName, fileBuffer) => {
  try {
    if (clientUserDataManager) {
      let targetPath
      switch (folderType) {
        case 'avatars':
          targetPath = clientUserDataManager.getUserAvatarsPath(userId)
          break
        case 'pictures':
          targetPath = clientUserDataManager.getUserPicturesPath(userId)
          break
        case 'documents':
          targetPath = clientUserDataManager.getUserDocumentsPath(userId)
          break
        default:
          targetPath = clientUserDataManager.getUserDataPath(userId)
      }
      
      const filePath = path.join(targetPath, fileName)
      await fs.promises.writeFile(filePath, fileBuffer)
      
      return { success: true, filePath }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存文件失败:', error)
    return { success: false, error: error.message }
  }
})

// 用户缓存相关IPC处理器
ipcMain.handle('get-user-cache-info', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId()
      const dbPath = clientUserDataManager.getUserDatabasePath(currentUserId)
      
      // 从用户缓存表获取信息
      const db = await databaseManager.getDatabase(dbPath)
      const sql = `SELECT * FROM user_cache WHERE user_id = ?`
      const result = await db.getAsync(sql, [userId])
      
      return { success: true, data: result }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取用户缓存信息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-user-cache-info', async (event, userId, cacheData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId()
      const dbPath = clientUserDataManager.getUserDatabasePath(currentUserId)
      
      const db = await databaseManager.getDatabase(dbPath)
      const sql = `
        INSERT OR REPLACE INTO user_cache 
        (user_id, display_name, signature, avatar, location, status, last_seen, cache_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      const result = await db.runAsync(sql, [
        userId,
        cacheData.displayName || '',
        cacheData.signature || '',
        cacheData.avatar || '',
        cacheData.location || '',
        cacheData.status || 'offline',
        cacheData.lastSeen || new Date().toISOString(),
        cacheData.cacheTime || new Date().toISOString()
      ])
      
      return { success: true, result }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存用户缓存信息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-user-avatar', async (event, userId) => {
  try {
    if (clientUserDataManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId()
      const avatarsPath = clientUserDataManager.getUserAvatarsPath(currentUserId)
      const avatarPath = path.join(avatarsPath, `${userId}.jpg`)
      
      if (fs.existsSync(avatarPath)) {
        return { success: true, path: avatarPath }
      }
      
      // 尝试其他格式
      const extensions = ['.png', '.jpeg', '.gif', '.webp']
      for (const ext of extensions) {
        const altPath = path.join(avatarsPath, `${userId}${ext}`)
        if (fs.existsSync(altPath)) {
          return { success: true, path: altPath }
        }
      }
      
      return { success: false, error: '本地头像不存在' }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取用户头像失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('cache-user-avatar', async (event, userId, avatarUrl) => {
  try {
    if (clientUserDataManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId()
      const avatarsPath = clientUserDataManager.getUserAvatarsPath(currentUserId)
      
      // 下载头像
      const response = await fetch(avatarUrl)
      if (!response.ok) {
        throw new Error(`下载头像失败: ${response.status}`)
      }
      
      const buffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)
      
      // 确定文件扩展名
      const contentType = response.headers.get('content-type') || ''
      let extension = '.jpg'
      if (contentType.includes('png')) extension = '.png'
      else if (contentType.includes('gif')) extension = '.gif'
      else if (contentType.includes('webp')) extension = '.webp'
      
      const avatarPath = path.join(avatarsPath, `${userId}${extension}`)
      await fs.promises.writeFile(avatarPath, uint8Array)
      
      console.log(`用户头像已缓存: ${userId} -> ${avatarPath}`)
      return { success: true, localPath: avatarPath }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('缓存用户头像失败:', error)
    return { success: false, error: error.message }
  }
})

// 聊天消息相关IPC处理器
// 使用全局变量防止重复注册
if (!global.chatIpcHandlersRegistered) {
  console.log('注册聊天消息IPC处理器...');
  
  // 标记已注册
  global.chatIpcHandlersRegistered = true;
  
  // 注册聊天消息相关的IPC处理器
  ipcMain.handle('save-chat-message', async (event, userId, messageData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const db = await databaseManager.getDatabase(dbPath)
      
      // 确保chat_messages表存在
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_message_id TEXT,
          contact_id TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          is_sent INTEGER DEFAULT 0,
          is_read INTEGER DEFAULT 0,
          sync_status TEXT DEFAULT 'pending',
          local_only INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      await db.execAsync(createTableSQL)
      console.log('chat_messages表创建/验证成功')
      
      const sql = `
        INSERT OR REPLACE INTO chat_messages (
          server_message_id, contact_id, message_type, content, 
          timestamp, is_sent, is_read, sync_status, local_only
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      const result = await db.runAsync(sql, [
        messageData.serverMessageId,
        messageData.contactId,
        messageData.messageType,
        messageData.content,
        messageData.timestamp,
        messageData.isSent,
        messageData.isRead,
        messageData.syncStatus,
        messageData.localOnly
      ])
      
      return { success: true, messageId: result.lastID }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存聊天消息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-chat-messages', async (event, userId, contactId, limit = 50, offset = 0) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const db = await databaseManager.getDatabase(dbPath)
      
      // 确保chat_messages表存在
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_message_id TEXT,
          contact_id TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          is_sent INTEGER DEFAULT 0,
          is_read INTEGER DEFAULT 0,
          sync_status TEXT DEFAULT 'pending',
          local_only INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      await db.execAsync(createTableSQL)
      
      const sql = `
        SELECT * FROM chat_messages 
        WHERE contact_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `
      
      const messages = await db.allAsync(sql, [contactId, limit, offset])
      return messages.reverse() // 返回时间正序
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取聊天消息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('mark-messages-read', async (event, userId, contactId, messageIds = null) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const db = await databaseManager.getDatabase(dbPath)
      
      let sql
      let params
      
      if (messageIds && messageIds.length > 0) {
        const placeholders = messageIds.map(() => '?').join(',')
        sql = `
          UPDATE chat_messages 
          SET is_read = 1 
          WHERE contact_id = ? AND server_message_id IN (${placeholders})
        `
        params = [contactId, ...messageIds]
      } else {
        sql = `
          UPDATE chat_messages 
          SET is_read = 1 
          WHERE contact_id = ? AND is_sent = 0 AND is_read = 0
        `
        params = [contactId]
      }
      
      const result = await db.runAsync(sql, params)
      return { success: true, updatedCount: result.changes }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('标记消息已读失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-unread-count', async (event, userId, contactId = null) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const db = await databaseManager.getDatabase(dbPath)
      
      let sql
      let params
      
      if (contactId) {
        sql = `
          SELECT COUNT(*) as count FROM chat_messages 
          WHERE contact_id = ? AND is_sent = 0 AND is_read = 0
        `
        params = [contactId]
      } else {
        sql = `
          SELECT COUNT(*) as count FROM chat_messages 
          WHERE is_sent = 0 AND is_read = 0
        `
        params = []
      }
      
      const result = await db.getAsync(sql, params)
      return result.count
    }
    return 0
  } catch (error) {
    console.error('获取未读消息数失败:', error)
    return 0
  }
  })
}

app.on('before-quit', () => {
  // 关闭所有数据库连接
  if (databaseManager) {
    databaseManager.closeAllDatabases()
  }
})

app.on('second-instance', () => {
  const activeWin = mainWin || loginWin
  if (activeWin) {
    // Focus on the active window if the user tried to open another
    if (activeWin.isMinimized()) activeWin.restore()
    activeWin.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createLoginWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// Window controls for frameless window
ipcMain.on('window-minimize', () => {
  console.log('最小化窗口请求')
  const activeWin = mainWin || loginWin
  if (activeWin) {
    activeWin.minimize()
  }
})

ipcMain.on('window-maximize', () => {
  const activeWin = mainWin || loginWin
  if (activeWin) {
    if (activeWin.isMaximized()) {
      console.log('还原窗口')
      activeWin.unmaximize()
    } else {
      console.log('最大化窗口')
      activeWin.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  console.log('关闭窗口请求')
  const activeWin = mainWin || loginWin
  if (activeWin) {
    activeWin.close()
  }
})

// 登录成功事件处理
ipcMain.on('login-success', () => {
  console.log('登录成功，切换到主窗口')
  createMainWindow()
  if (loginWin) {
    loginWin.close()
  }
})

// 窗口移动处理
ipcMain.on('window-move', (event, deltaX, deltaY) => {
  const activeWin = mainWin || loginWin
  if (activeWin) {
    const [currentX, currentY] = activeWin.getPosition()
    activeWin.setPosition(currentX + deltaX, currentY + deltaY)
  }
})

// 用户数据管理IPC处理程序
ipcMain.handle('user-data-setup', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      // 设置用户目录和获取数据库信息
      const dbInfo = clientUserDataManager.setCurrentUser(userId)
      
      // 初始化用户数据库
      await databaseManager.initializeUserDatabase(dbInfo.dbPath, dbInfo.initSQL)
      
      console.log(`用户本地数据设置完成: ${userId}`)
      return { success: true, userId, dbPath: dbInfo.dbPath }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('设置用户本地数据失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-current-user', async () => {
  try {
    if (clientUserDataManager) {
      const userId = clientUserDataManager.getCurrentUserId()
      return { success: true, userId }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取当前用户失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-user-info-locally', async (event, userId, userInfo) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      await databaseManager.saveUserInfo(dbPath, userId, userInfo)
      return { success: true }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存用户本地信息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-user-data-paths', async (event, userId) => {
  try {
    if (clientUserDataManager) {
      const paths = {
        userData: clientUserDataManager.getUserDataPath(userId),
        pictures: clientUserDataManager.getUserPicturesPath(userId),
        avatars: clientUserDataManager.getUserAvatarsPath(userId),
        documents: clientUserDataManager.getUserDocumentsPath(userId),
        cache: clientUserDataManager.getUserCachePath(userId),
        database: clientUserDataManager.getUserDatabasePath(userId)
      }
      return { success: true, paths }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取用户数据路径失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clear-user-data', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      await databaseManager.clearUserDatabase(dbPath)
      await clientUserDataManager.clearUserData(userId)
      return { success: true }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('清除用户数据失败:', error)
    return { success: false, error: error.message }
  }
})

// 保存文件到用户文件夹
// 先移除可能存在的旧处理器
ipcMain.removeHandler('save-file-to-user-folder')
ipcMain.handle('save-file-to-user-folder', async (event, userId, folderType, fileName, fileBuffer) => {
  console.log(`开始保存文件: userId=${userId}, folderType=${folderType}, fileName=${fileName}, bufferSize=${fileBuffer?.length}`)
  
  try {
    if (!clientUserDataManager) {
      console.error('用户数据管理器未初始化')
      return { success: false, error: '用户数据管理器未初始化' }
    }
    
    const fs = require('fs').promises
    const path = require('path')
    
    // 获取目标文件夹路径
    let folderPath
    switch (folderType) {
      case 'avatars':
        folderPath = clientUserDataManager.getUserAvatarsPath(userId)
        break
      case 'pictures':
        folderPath = clientUserDataManager.getUserPicturesPath(userId)
        break
      case 'documents':
        folderPath = clientUserDataManager.getUserDocumentsPath(userId)
        break
      case 'cache':
        folderPath = clientUserDataManager.getUserCachePath(userId)
        break
      default:
        folderPath = clientUserDataManager.getUserDataPath(userId)
    }
    
    console.log(`目标文件夹路径: ${folderPath}`)
    
    // 确保文件夹存在
    await fs.mkdir(folderPath, { recursive: true })
    console.log(`文件夹创建成功: ${folderPath}`)
    
    // 构建完整文件路径
    const filePath = path.join(folderPath, fileName)
    console.log(`完整文件路径: ${filePath}`)
    
    // 检查fileBuffer是否有效
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('文件数据为空')
    }
    
    // 写入文件
    await fs.writeFile(filePath, Buffer.from(fileBuffer))
    
    console.log(`文件保存成功: ${filePath}`)
    return { success: true, filePath }
  } catch (error) {
    console.error(`保存文件失败 (${fileName}):`, error)
    return { success: false, error: error.message }
  }
})

// 获取用户信息
ipcMain.handle('get-user-info-locally', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const userInfo = await databaseManager.getUserInfo(dbPath, userId)
      return { success: true, userInfo }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取用户本地信息失败:', error)
    return { success: false, error: error.message }
  }
})

// 此处的save-chat-message处理器已移动到上面的条件注册区域

// 此处的get-chat-messages处理器已移动到上面的条件注册区域

// 保存联系人
ipcMain.handle('save-contact', async (event, userId, contactData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const result = await databaseManager.saveContact(dbPath, contactData)
      return { success: true, result }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存联系人失败:', error)
    return { success: false, error: error.message }
  }
})

// 获取联系人列表
ipcMain.handle('get-contacts', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const contacts = await databaseManager.getContacts(dbPath, userId)
      return { success: true, contacts }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取联系人列表失败:', error)
    return { success: false, error: error.message }
  }
})

// 保存设置
ipcMain.handle('save-setting', async (event, userId, key, value) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const result = await databaseManager.saveSetting(dbPath, userId, key, value)
      return { success: true, result }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存设置失败:', error)
    return { success: false, error: error.message }
  }
})

// 获取设置
ipcMain.handle('get-setting', async (event, userId, key) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const value = await databaseManager.getSetting(dbPath, userId, key)
      return { success: true, value }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取设置失败:', error)
    return { success: false, error: error.message }
  }
})

// 获取所有设置
ipcMain.handle('get-all-settings', async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const settings = await databaseManager.getAllSettings(dbPath, userId)
      return { success: true, settings }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取所有设置失败:', error)
    return { success: false, error: error.message }
  }
})
