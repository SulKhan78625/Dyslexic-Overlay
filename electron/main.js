const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron-store with defaults
const store = new Store({
  defaults: {
    overlayState: {
      color: '#ffeb99',
      opacity: 0.3,
      isActive: false,
      size: 'fullscreen',
      customWidth: 800,
      customHeight: 600,
      readingGuideEnabled: false,
      readingGuideHeight: 100,
      readingGuidePosition: 50,
      readingGuideStepSize: 0.5,
      readingGuideBorderWidth: 3,
      readingGuideBorderColor: 'rgba(0,0,0,0.9)',
      readingGuideBorderStyle: 'double'
    }
  }
});

let mainWindow;
let overlayWindow;

// Load saved state or use defaults
let currentOverlayState = store.get('overlayState');

// Platform detection
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// Create the main control window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 950,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // In development, load from Vite dev server
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Send saved state to renderer after window loads
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('load-saved-state', currentOverlayState);
    }
  });
}

// Create the overlay window (transparent, always on top)
function createOverlayWindow() {
  const overlayConfig = {
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreen: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  };

  // Mac-specific options
  if (isMac) {
    overlayConfig.acceptFirstMouse = true;
    overlayConfig.visibleOnAllWorkspaces = true;
  }

  overlayWindow = new BrowserWindow(overlayConfig);

  // Make it click-through
  overlayWindow.setIgnoreMouseEvents(true);
  
  if (isMac) {
    // Mac requires special window level
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true);
  } else {
    // Windows/Linux
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true);
  }

  // Load HTML with reading guide support
  const overlayHTML = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { 
            width: 100vw; 
            height: 100vh; 
            background-color: transparent;
            overflow: hidden;
          }
          #overlay {
            width: 100%;
            height: 100%;
            background-color: #ffeb99;
            transition: background-color 0.3s ease, opacity 0.4s ease-in-out;
            opacity: 0.3;
            position: relative;
          }
          #reading-guide-gap {
            position: absolute;
            left: 0;
            right: 0;
            background-color: transparent;
            pointer-events: none;
            display: none;
            transition: top 0.2s ease, height 0.3s ease, box-shadow 0.3s ease;
          }
          #reading-guide-gap.active {
            display: block;
          }
        </style>
      </head>
      <body>
        <div id="overlay">
          <div id="reading-guide-gap"></div>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          const overlay = document.getElementById('overlay');
          const guide = document.getElementById('reading-guide-gap');
          
          ipcRenderer.on('update-overlay', (event, data) => {
            overlay.style.backgroundColor = data.color;
            overlay.style.opacity = data.isActive ? data.opacity : '0';
            
            // Update reading guide
            if (data.readingGuideEnabled) {
              guide.classList.add('active');
              guide.style.height = data.readingGuideHeight + 'px';
              guide.style.top = data.readingGuidePosition + '%';
              
              // Update border styling with configurable width, color, and style
              const borderWidth = data.readingGuideBorderWidth || 3;
              const borderColor = data.readingGuideBorderColor || 'rgba(0,0,0,0.9)';
              const borderStyle = data.readingGuideBorderStyle || 'double';
              
              if (borderStyle === 'single') {
                guide.style.boxShadow = \`0 -\${borderWidth}px 0 \${borderColor}\`;
              } else {
                guide.style.boxShadow = \`0 -\${borderWidth}px 0 \${borderColor}, 0 \${borderWidth}px 0 \${borderColor}\`;
              }
            } else {
              guide.classList.remove('active');
            }
          });
        </script>
      </body>
    </html>
  `)}`;

  overlayWindow.loadURL(overlayHTML);
  overlayWindow.hide();

  // Apply saved size if overlay was previously active
  if (currentOverlayState.size) {
    applyOverlaySize(
      currentOverlayState.size,
      currentOverlayState.customWidth,
      currentOverlayState.customHeight
    );
  }
}

// Apply overlay size
function applyOverlaySize(size, customWidth, customHeight) {
  if (!overlayWindow) return;
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  switch(size) {
    case 'fullscreen':
      overlayWindow.setFullScreen(true);
      break;
      
    case 'top-half':
      overlayWindow.setFullScreen(false);
      overlayWindow.setBounds({ x: 0, y: 0, width: width, height: Math.floor(height / 2) });
      break;
      
    case 'bottom-half':
      overlayWindow.setFullScreen(false);
      overlayWindow.setBounds({ x: 0, y: Math.floor(height / 2), width: width, height: Math.floor(height / 2) });
      break;
      
    case 'left-half':
      overlayWindow.setFullScreen(false);
      overlayWindow.setBounds({ x: 0, y: 0, width: Math.floor(width / 2), height: height });
      break;
      
    case 'right-half':
      overlayWindow.setFullScreen(false);
      overlayWindow.setBounds({ x: Math.floor(width / 2), y: 0, width: Math.floor(width / 2), height: height });
      break;
      
    case 'center':
      overlayWindow.setFullScreen(false);
      const centerWidth = Math.floor(width * 0.7);
      const centerHeight = Math.floor(height * 0.7);
      overlayWindow.setBounds({ 
        x: Math.floor((width - centerWidth) / 2), 
        y: Math.floor((height - centerHeight) / 2), 
        width: centerWidth, 
        height: centerHeight 
      });
      break;
      
    case 'custom':
      overlayWindow.setFullScreen(false);
      const w = Math.min(customWidth || 800, width);
      const h = Math.min(customHeight || 600, height);
      // Center the custom size
      overlayWindow.setBounds({ 
        x: Math.floor((width - w) / 2), 
        y: Math.floor((height - h) / 2), 
        width: w, 
        height: h 
      });
      break;
  }
}

// Move reading guide up (with configurable step size)
function moveReadingGuideUp() {
  if (currentOverlayState.readingGuideEnabled && currentOverlayState.isActive) {
    const stepSize = currentOverlayState.readingGuideStepSize || 0.5;
    currentOverlayState.readingGuidePosition = Math.max(0, currentOverlayState.readingGuidePosition - stepSize);
    
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('update-overlay', currentOverlayState);
    }
    
    // Save position in real-time
    store.set('overlayState', currentOverlayState);
  }
}

// Move reading guide down (with configurable step size)
function moveReadingGuideDown() {
  if (currentOverlayState.readingGuideEnabled && currentOverlayState.isActive) {
    const stepSize = currentOverlayState.readingGuideStepSize || 0.5;
    currentOverlayState.readingGuidePosition = Math.min(100, currentOverlayState.readingGuidePosition + stepSize);
    
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('update-overlay', currentOverlayState);
    }
    
    // Save position in real-time
    store.set('overlayState', currentOverlayState);
  }
}

// Toggle overlay visibility
function toggleOverlay() {
  if (overlayWindow) {
    const newState = !overlayWindow.isVisible();
    currentOverlayState.isActive = newState;
    
    if (newState) {
      // Make sure we send the current settings before showing
      overlayWindow.webContents.send('update-overlay', currentOverlayState);
      overlayWindow.show();
    } else {
      overlayWindow.hide();
    }
    
    // Save state
    store.set('overlayState', currentOverlayState);
    
    // Notify the main window about the state change
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay-toggled', newState);
    }
  }
}

// Update overlay color, opacity, size, and reading guide
ipcMain.on('update-overlay', (event, data) => {
  // Merge incoming data with current state
  currentOverlayState = { 
    ...currentOverlayState,
    color: data.color !== undefined ? data.color : currentOverlayState.color,
    opacity: data.opacity !== undefined ? data.opacity : currentOverlayState.opacity,
    isActive: data.isActive !== undefined ? data.isActive : currentOverlayState.isActive,
    size: data.size || currentOverlayState.size,
    customWidth: data.customWidth !== undefined ? data.customWidth : currentOverlayState.customWidth,
    customHeight: data.customHeight !== undefined ? data.customHeight : currentOverlayState.customHeight,
    readingGuideEnabled: data.readingGuideEnabled !== undefined ? data.readingGuideEnabled : currentOverlayState.readingGuideEnabled,
    readingGuideHeight: data.readingGuideHeight !== undefined ? data.readingGuideHeight : currentOverlayState.readingGuideHeight,
    readingGuidePosition: data.readingGuidePosition !== undefined ? data.readingGuidePosition : currentOverlayState.readingGuidePosition,
    readingGuideStepSize: data.readingGuideStepSize !== undefined ? data.readingGuideStepSize : currentOverlayState.readingGuideStepSize,
    readingGuideBorderWidth: data.readingGuideBorderWidth !== undefined ? data.readingGuideBorderWidth : currentOverlayState.readingGuideBorderWidth,
    readingGuideBorderColor: data.readingGuideBorderColor !== undefined ? data.readingGuideBorderColor : currentOverlayState.readingGuideBorderColor,
    readingGuideBorderStyle: data.readingGuideBorderStyle !== undefined ? data.readingGuideBorderStyle : currentOverlayState.readingGuideBorderStyle
  };
  
  // Save to persistent storage
  store.set('overlayState', currentOverlayState);
  
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    // Update size if changed
    if (data.size) {
      applyOverlaySize(data.size, data.customWidth, data.customHeight);
    }
    
    // ALWAYS send the update to the overlay window (even if hidden, so it's ready when shown)
    overlayWindow.webContents.send('update-overlay', currentOverlayState);
    
    // Sync window visibility with isActive state
    const currentlyVisible = overlayWindow.isVisible();
    
    if (currentOverlayState.isActive && !currentlyVisible) {
      overlayWindow.show();
    } else if (!currentOverlayState.isActive && currentlyVisible) {
      overlayWindow.hide();
    }
  }
});

// Handle requests for current state
ipcMain.handle('get-overlay-state', () => {
  return currentOverlayState;
});

// App initialization
app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();

  // Register global shortcut for overlay toggle (Cmd on Mac, Ctrl on Windows/Linux)
  const toggleShortcut = isMac ? 'Command+Shift+O' : 'Control+Shift+O';
  globalShortcut.register(toggleShortcut, () => {
    toggleOverlay();
  });

  // Register modifier + arrow keys for reading guide (only when guide is active)
  // Using Cmd/Ctrl + Up/Down to avoid conflicts with other applications
  const upShortcut = isMac ? 'Command+Up' : 'Control+Up';
  const downShortcut = isMac ? 'Command+Down' : 'Control+Down';
  
  globalShortcut.register(upShortcut, () => {
    moveReadingGuideUp();
  });

  globalShortcut.register(downShortcut, () => {
    moveReadingGuideDown();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Cleanup
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});