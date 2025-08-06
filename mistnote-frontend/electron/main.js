import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
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

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let loginWin = null
let mainWin = null
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
  loginWin = new BrowserWindow({
    title: 'MistNote - 登录',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
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
      loginWin.close()
    }
  })

  loginWin.on('closed', () => {
    loginWin = null
  })
}

// 创建主应用窗口
async function createMainWindow() {
  mainWin = new BrowserWindow({
    title: 'MistNote',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
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

  mainWin.on('closed', () => {
    mainWin = null
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
  if (process.platform !== 'darwin') app.quit()
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

// 保存聊天消息
ipcMain.handle('save-chat-message', async (event, userId, messageData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const result = await databaseManager.saveChatMessage(dbPath, messageData)
      return { success: true, result }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('保存聊天消息失败:', error)
    return { success: false, error: error.message }
  }
})

// 获取聊天消息
ipcMain.handle('get-chat-messages', async (event, userId, contactId, limit, offset) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId)
      const messages = await databaseManager.getChatMessages(dbPath, userId, contactId, limit, offset)
      return { success: true, messages }
    }
    return { success: false, error: '用户数据管理器未初始化' }
  } catch (error) {
    console.error('获取聊天消息失败:', error)
    return { success: false, error: error.message }
  }
})

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
