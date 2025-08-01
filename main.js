const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Opcional
    show: false
  });

  mainWindow.loadFile('src/index.html');

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Abrir DevTools en desarrollo
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Inicializar app
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers para comunicación con renderer
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const sourcePath = result.filePaths[0];
    const fileName = path.basename(sourcePath);
    const destPath = path.join(__dirname, 'src/assets/images', fileName);
    
    // Crear directorio si no existe
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Copiar archivo
    fs.copyFileSync(sourcePath, destPath);
    
    return fileName;
  }
  
  return null;
});

ipcMain.handle('save-pdf', async (event, pdfBuffer, fileName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: fileName,
    filters: [
      { name: 'PDF', extensions: ['pdf'] }
    ]
  });

  if (!result.canceled) {
    fs.writeFileSync(result.filePath, pdfBuffer);
    return result.filePath;
  }
  
  return null;
});