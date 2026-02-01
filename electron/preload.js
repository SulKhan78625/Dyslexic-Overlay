const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  updateOverlay: (
    color, 
    opacity, 
    isActive, 
    size, 
    customWidth, 
    customHeight,
    readingGuideEnabled,
    readingGuideHeight,
    readingGuidePosition,
    readingGuideStepSize,
    readingGuideBorderWidth,
    readingGuideBorderColor,
    readingGuideBorderStyle
  ) => {
    ipcRenderer.send('update-overlay', { 
      color, 
      opacity, 
      isActive, 
      size, 
      customWidth, 
      customHeight,
      readingGuideEnabled,
      readingGuideHeight,
      readingGuidePosition,
      readingGuideStepSize,
      readingGuideBorderWidth,
      readingGuideBorderColor,
      readingGuideBorderStyle
    });
  },
  getOverlayState: () => {
    return ipcRenderer.invoke('get-overlay-state');
  },
  on: (channel, callback) => {
    const validChannels = ['overlay-toggled', 'load-saved-state'];
    if (validChannels.includes(channel)) {
      // Wrap callback to match expected signature
      const subscription = (_event, ...args) => callback(_event, ...args);
      ipcRenderer.on(channel, subscription);
      return subscription;
    }
  },
  removeListener: (channel, callback) => {
    const validChannels = ['overlay-toggled', 'load-saved-state'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  }
});