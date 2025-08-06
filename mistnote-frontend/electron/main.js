import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

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

let win = null
// 在开发模式下，预加载脚本在源码目录；在生产模式下，在构建目录
const preload = process.env.VITE_DEV_SERVER_URL
  ? path.join(__dirname, 'preload.js')
  : path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'MistNote',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // 无边框窗口，仿QQ NT风格
    titleBarStyle: 'hidden',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  if (url) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto-hide menu bar
  win.setMenuBarVisibility(false)

  // 监听窗口状态变化
  win.on('maximize', () => {
    win.webContents.send('window-maximized')
  })

  win.on('unmaximize', () => {
    win.webContents.send('window-unmaximized')
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
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
  if (win) {
    win.minimize()
  }
})

ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      console.log('还原窗口')
      win.unmaximize()
    } else {
      console.log('最大化窗口')
      win.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  console.log('关闭窗口请求')
  if (win) {
    win.close()
  }
})
