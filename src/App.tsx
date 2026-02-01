import { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Eye, EyeOff, Save, Trash2, Palette, Settings, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedColor {
  id: string;
  color: string;
  name: string;
}

interface SavedProfile {
  id: string;
  name: string;
  color: string;
  opacity: number;
  overlaySize: string;
  customWidth: number;
  customHeight: number;
  readingGuideEnabled: boolean;
  readingGuideHeight: number;
  readingGuideStepSize: number;
  readingGuideBorderWidth: number;
  readingGuideBorderColor: string;
  readingGuideBorderStyle: 'double' | 'single';
}

interface OverlayState {
  color: string;
  opacity: number;
  isActive: boolean;
  size: string;
  customWidth: number;
  customHeight: number;
  readingGuideEnabled: boolean;
  readingGuideHeight: number;
  readingGuidePosition: number;
  readingGuideStepSize: number;
  readingGuideBorderWidth: number;
  readingGuideBorderColor: string;
  readingGuideBorderStyle: string;
}

declare global {
  interface Window {
    electron?: {
      updateOverlay: (
        color: string, opacity: number, isActive: boolean, size?: string, customWidth?: number, customHeight?: number,
        readingGuideEnabled?: boolean, readingGuideHeight?: number, readingGuidePosition?: number,
        readingGuideStepSize?: number, readingGuideBorderWidth?: number, readingGuideBorderColor?: string,
        readingGuideBorderStyle?: string
      ) => void;
      getOverlayState: () => Promise<OverlayState>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

const dyslexiaPresets = [
  { name: 'Classic Yellow', color: '#ffeb99', category: 'General' },
  { name: 'Soft Blue', color: '#b3d9ff', category: 'Visual Stress' },
  { name: 'Mint Green', color: '#b3f0cc', category: 'Visual Stress' },
  { name: 'Warm Peach', color: '#ffd4b3', category: 'Contrast' },
  { name: 'Lavender', color: '#e6d9ff', category: 'Visual Stress' },
  { name: 'Light Pink', color: '#ffccf2', category: 'General' },
  { name: 'Light Aqua', color: '#b3f0f0', category: 'Eye Strain' },
  { name: 'Pale Gray', color: '#e6e6e6', category: 'Minimal' }
];

export default function App() {
  const [currentColor, setCurrentColor] = useState('#ffeb99');
  const [opacity, setOpacity] = useState(0.3);
  const [isActive, setIsActive] = useState(false);
  const [savedColors, setSavedColors] = useState<SavedColor[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [colorName, setColorName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [overlaySize, setOverlaySize] = useState<string>('fullscreen');
  const [customWidth, setCustomWidth] = useState<number>(800);
  const [customHeight, setCustomHeight] = useState<number>(600);
  const [readingGuideEnabled, setReadingGuideEnabled] = useState<boolean>(false);
  const [readingGuideHeight, setReadingGuideHeight] = useState<number>(100);
  const [readingGuideStepSize, setReadingGuideStepSize] = useState<number>(0.5);
  const [readingGuideBorderWidth, setReadingGuideBorderWidth] = useState<number>(3);
  const [readingGuideBorderColor, setReadingGuideBorderColor] = useState<string>('rgba(0,0,0,0.9)');
  const [readingGuideBorderStyle, setReadingGuideBorderStyle] = useState<'double' | 'single'>('double');
  const [activeTab, setActiveTab] = useState<'settings' | 'saved'>('settings');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const isInitialLoad = useRef(true);
  const lastClickTime = useRef(0);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const hotkeyDisplay = isMac ? '⌘+Shift+O' : 'Ctrl+Shift+O';
  const arrowKeyDisplay = isMac ? '⌘+↑/↓' : 'Ctrl+↑/↓';

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  useEffect(() => {
    const loadSavedState = async () => {
      if (window.electron?.getOverlayState) {
        try {
          const savedState = await window.electron.getOverlayState();
          setCurrentColor(savedState.color);
          setOpacity(savedState.opacity);
          setIsActive(savedState.isActive);
          setOverlaySize(savedState.size);
          setCustomWidth(savedState.customWidth);
          setCustomHeight(savedState.customHeight);
          setReadingGuideEnabled(savedState.readingGuideEnabled);
          setReadingGuideHeight(savedState.readingGuideHeight);
          setReadingGuideStepSize(savedState.readingGuideStepSize || 0.5);
          setReadingGuideBorderWidth(savedState.readingGuideBorderWidth || 3);
          setReadingGuideBorderColor(savedState.readingGuideBorderColor || 'rgba(0,0,0,0.9)');
          setReadingGuideBorderStyle((savedState.readingGuideBorderStyle as 'double' | 'single') || 'double');
        } catch (error) {
          console.error('Failed to load saved state:', error);
        }
      }
    };

    loadSavedState();
    const saved = localStorage.getItem('dyslexiaOverlayColors');
    if (saved) setSavedColors(JSON.parse(saved));
    const savedProfilesData = localStorage.getItem('dyslexiaOverlayProfiles');
    if (savedProfilesData) setSavedProfiles(JSON.parse(savedProfilesData));
    
    setTimeout(() => { isInitialLoad.current = false; }, 100);

    if (window.electron?.on) {
      const handleToggle = (_event: any, state: boolean) => setIsActive(state);
      window.electron.on('overlay-toggled', handleToggle);
      return () => {
        if (window.electron?.removeListener) {
          window.electron.removeListener('overlay-toggled', handleToggle);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!isInitialLoad.current) localStorage.setItem('dyslexiaOverlayColors', JSON.stringify(savedColors));
  }, [savedColors]);

  useEffect(() => {
    if (!isInitialLoad.current) localStorage.setItem('dyslexiaOverlayProfiles', JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (window.electron) {
      window.electron.updateOverlay(currentColor, opacity, isActive, overlaySize, customWidth, customHeight,
        readingGuideEnabled, readingGuideHeight, 50, readingGuideStepSize, readingGuideBorderWidth,
        readingGuideBorderColor, readingGuideBorderStyle);
    }
  }, [currentColor, opacity, isActive, overlaySize, customWidth, customHeight, readingGuideEnabled,
      readingGuideHeight, readingGuideStepSize, readingGuideBorderWidth, readingGuideBorderColor, readingGuideBorderStyle]);

  const handleSaveColor = () => {
    if (!colorName.trim()) { showToast('Please enter a name for this color', 'error'); return; }
    setSavedColors([...savedColors, { id: Date.now().toString(), color: currentColor, name: colorName.trim() }]);
    showToast(`Colour "${colorName.trim()}" saved successfully!`, 'success');
    setColorName('');
  };

  const handleDeleteColor = (id: string) => setSavedColors(savedColors.filter(c => c.id !== id));
  const handleLoadColor = (color: string) => setCurrentColor(color);

  const handleSaveProfile = () => {
    if (!profileName.trim()) { showToast('Please enter a name for this profile', 'error'); return; }
    setSavedProfiles([...savedProfiles, {
      id: Date.now().toString(), name: profileName.trim(), color: currentColor, opacity, overlaySize,
      customWidth, customHeight, readingGuideEnabled, readingGuideHeight, readingGuideStepSize,
      readingGuideBorderWidth, readingGuideBorderColor, readingGuideBorderStyle
    }]);
    showToast(`Profile "${profileName.trim()}" saved successfully!`, 'success');
    setProfileName('');
  };

  const handleLoadProfile = (profile: SavedProfile) => {
    setCurrentColor(profile.color); setOpacity(profile.opacity); setOverlaySize(profile.overlaySize);
    setCustomWidth(profile.customWidth); setCustomHeight(profile.customHeight);
    setReadingGuideEnabled(profile.readingGuideEnabled); setReadingGuideHeight(profile.readingGuideHeight);
    setReadingGuideStepSize(profile.readingGuideStepSize); setReadingGuideBorderWidth(profile.readingGuideBorderWidth);
    setReadingGuideBorderColor(profile.readingGuideBorderColor); setReadingGuideBorderStyle(profile.readingGuideBorderStyle);
  };

  const handleDeleteProfile = (id: string) => setSavedProfiles(savedProfiles.filter(p => p.id !== id));

  const handleToggleOverlay = () => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) return;
    lastClickTime.current = now;
    const newState = !isActive;
    setIsActive(newState);
    if (window.electron) {
      window.electron.updateOverlay(currentColor, opacity, newState, overlaySize, customWidth, customHeight,
        readingGuideEnabled, readingGuideHeight, 50, readingGuideStepSize, readingGuideBorderWidth,
        readingGuideBorderColor, readingGuideBorderStyle);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-4">
          
          {/* Header */}
          <div className="mb-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Dyslexia Overlay
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg mt-1">
              <span>💡</span>
              <span>Toggle: <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono text-xs">{hotkeyDisplay}</kbd></span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3 border-b border-gray-200">
            <button onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'text-purple-600 border-b-2 border-purple-600 -mb-px' : 'text-gray-500'}`}>
              <Settings size={16} /> Settings
            </button>
            <button onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'saved' ? 'text-purple-600 border-b-2 border-purple-600 -mb-px' : 'text-gray-500'}`}>
              <Bookmark size={16} /> Saved ({savedColors.length + savedProfiles.length})
            </button>
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {/* Presets - 4 columns */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Palette size={16} className="text-purple-600" />
                  <h3 className="text-sm font-semibold">Recommended Presets</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {dyslexiaPresets.map((preset) => (
                    <button key={preset.name} onClick={() => handleLoadColor(preset.color)}
                      className="flex flex-col items-center gap-1 p-1.5 rounded border border-gray-200 hover:border-purple-400 transition-all text-center bg-white">
                      <div className="w-10 h-10 rounded border border-gray-300 flex-shrink-0" style={{ backgroundColor: preset.color }} />
                      <div className="w-full">
                        <p className="text-xs font-semibold text-gray-800 truncate">{preset.name}</p>
                        <span className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700 rounded">{preset.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker & Reading Guide Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Column: Color Picker, Transparency, and Save Buttons */}
                <div className="space-y-2">
                  {/* Color Picker */}
                  <div>
                    <h3 className="text-xs font-semibold mb-1">Custom Colour</h3>
                    <div className="bg-gray-50 rounded p-2 border border-gray-200">
                      <HexColorPicker color={currentColor} onChange={setCurrentColor} style={{ width: '100%', height: '140px' }} />
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="w-10 h-10 rounded border border-gray-300 flex-shrink-0" style={{ backgroundColor: currentColor }} />
                        <input type="text" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono uppercase outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Transparency - Directly Below Color Picker */}
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Transparency: {Math.round(opacity * 100)}%</label>
                    <input type="range" min="0.1" max="0.8" step="0.05" value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded appearance-none cursor-pointer bg-gradient-to-r from-blue-200 to-purple-200" />
                  </div>

                  {/* Save Color Button */}
                  <div className="max-w-[200px]">
                    <h3 className="text-xs font-semibold mb-1">Save Colour</h3>
                    <input type="text" value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Name..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-1 outline-none focus:border-blue-500" />
                    <button onClick={handleSaveColor}
                      className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center justify-center gap-1 shadow transition-all">
                      <Save size={12} /> Save Color
                    </button>
                  </div>

                  {/* Save Profile Button */}
                  <div className="max-w-[200px]">
                    <h3 className="text-xs font-semibold mb-1">Save Profile</h3>
                    <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Name..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-1 outline-none focus:border-purple-500" />
                    <button onClick={handleSaveProfile}
                      className="w-full px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs flex items-center justify-center gap-1 shadow transition-all">
                      <Save size={12} /> Save Profile
                    </button>
                  </div>
                </div>

                {/* Right Column: Reading Guide */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold">Reading Guide</h3>
                    <button onClick={() => setReadingGuideEnabled(!readingGuideEnabled)}
                      className={`px-2 py-0.5 text-xs rounded-full ${readingGuideEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                      {readingGuideEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {readingGuideEnabled && (
                    <div className="bg-green-50 p-2 rounded border border-green-200 space-y-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Height: {readingGuideHeight}px</label>
                        <input type="range" min="50" max="300" step="10" value={readingGuideHeight}
                          onChange={(e) => setReadingGuideHeight(parseInt(e.target.value))}
                          className="w-full h-1 rounded appearance-none cursor-pointer bg-green-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Speed: {readingGuideStepSize.toFixed(1)}%</label>
                        <input type="range" min="0.5" max="5" step="0.5" value={readingGuideStepSize}
                          onChange={(e) => setReadingGuideStepSize(parseFloat(e.target.value))}
                          className="w-full h-1 rounded appearance-none cursor-pointer bg-green-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => setReadingGuideBorderStyle('double')}
                          className={`px-2 py-1 text-xs rounded border ${readingGuideBorderStyle === 'double' ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-white'}`}>
                          Double
                        </button>
                        <button onClick={() => setReadingGuideBorderStyle('single')}
                          className={`px-2 py-1 text-xs rounded border ${readingGuideBorderStyle === 'single' ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-white'}`}>
                          Single
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Thickness: {readingGuideBorderWidth}px</label>
                        <input type="range" min="1" max="8" step="1" value={readingGuideBorderWidth}
                          onChange={(e) => setReadingGuideBorderWidth(parseInt(e.target.value))}
                          className="w-full h-1 rounded appearance-none cursor-pointer bg-green-200" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[{ name: 'Black', value: 'rgba(0,0,0,0.9)' }, { name: 'Gray', value: 'rgba(64,64,64,0.9)' }, { name: 'White', value: 'rgba(255,255,255,0.9)' }].map((b) => (
                          <button key={b.value} onClick={() => setReadingGuideBorderColor(b.value)}
                            className={`px-1.5 py-0.5 text-xs rounded border ${readingGuideBorderColor === b.value ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-white'}`}>
                            {b.name}
                          </button>
                        ))}
                      </div>
                      <div className="bg-white p-1.5 rounded border border-green-300">
                        <div className="relative h-12 rounded overflow-hidden" style={{ backgroundColor: currentColor, opacity }}>
                          <div className="absolute left-0 right-0 bg-white" style={{
                            top: '40%', height: `${(readingGuideHeight / 300) * 100}%`,
                            boxShadow: readingGuideBorderStyle === 'double'
                              ? `0 -${readingGuideBorderWidth}px 0 ${readingGuideBorderColor}, 0 ${readingGuideBorderWidth}px 0 ${readingGuideBorderColor}`
                              : `0 -${readingGuideBorderWidth}px 0 ${readingGuideBorderColor}`
                          }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">Use <kbd className="px-1 bg-gray-200 rounded text-xs">{arrowKeyDisplay}</kbd> to move</p>
                    </div>
                  )}
                  
                  {/* Overlay Size - Directly Below Reading Guide */}
                  <div className="mt-2">
                    <label className="block text-xs font-medium mb-0.5">Overlay Size</label>
                    <select value={overlaySize} onChange={(e) => setOverlaySize(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500 bg-white">
                      <option value="fullscreen">Full Screen</option>
                      <option value="top-half">Top Half</option>
                      <option value="bottom-half">Bottom Half</option>
                      <option value="left-half">Left Half</option>
                      <option value="right-half">Right Half</option>
                      <option value="center">Center (70%)</option>
                      <option value="custom">Custom Size</option>
                    </select>
                  </div>

                  {/* Custom Size Controls - Below Size Dropdown */}
                  {overlaySize === 'custom' && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 space-y-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Width: {customWidth}px</label>
                        <input type="range" min="400" max={window.screen.width} step="50" value={customWidth}
                          onChange={(e) => setCustomWidth(parseInt(e.target.value))}
                          className="w-full h-1 rounded appearance-none cursor-pointer bg-blue-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Height: {customHeight}px</label>
                        <input type="range" min="300" max={window.screen.height} step="50" value={customHeight}
                          onChange={(e) => setCustomHeight(parseInt(e.target.value))}
                          className="w-full h-1 rounded appearance-none cursor-pointer bg-blue-200" />
                      </div>
                      <div className="bg-white p-1.5 rounded border border-blue-300">
                        <div className="relative mx-auto bg-gray-100 rounded border border-gray-300" 
                          style={{ width: '120px', height: '80px' }}>
                          <div className="absolute bg-blue-300 rounded shadow-inner" style={{
                            left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                            width: `${Math.min((customWidth / window.screen.width) * 100, 100)}%`,
                            height: `${Math.min((customHeight / window.screen.height) * 100, 100)}%`
                          }} />
                        </div>
                        <p className="text-xs text-gray-600 text-center mt-1">{customWidth} × {customHeight}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Saved Tab */}
          {activeTab === 'saved' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <h2 className="text-sm font-semibold mb-1.5">Saved Colours ({savedColors.length})</h2>
                {savedColors.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No saved colors</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                    {savedColors.map((saved) => (
                      <div key={saved.id} className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded border border-gray-200">
                        <div className="w-8 h-8 rounded border border-gray-300 cursor-pointer" style={{ backgroundColor: saved.color }}
                          onClick={() => handleLoadColor(saved.color)} />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadColor(saved.color)}>
                          <p className="text-xs font-medium truncate">{saved.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{saved.color}</p>
                        </div>
                        <button onClick={() => handleDeleteColor(saved.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold mb-1.5">Saved Profiles ({savedProfiles.length})</h2>
                {savedProfiles.length === 0 ? (
                  <div className="text-center py-6 bg-purple-50 rounded border border-dashed border-purple-300">
                    <p className="text-xs text-purple-600">No saved profiles</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                    {savedProfiles.map((profile) => (
                      <div key={profile.id} className="flex items-center gap-1.5 p-1.5 bg-purple-50 rounded border border-purple-200">
                        <div className="w-8 h-8 rounded border border-purple-300 cursor-pointer" style={{ backgroundColor: profile.color }}
                          onClick={() => handleLoadProfile(profile)} />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadProfile(profile)}>
                          <p className="text-xs font-semibold truncate">{profile.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-xs px-1 py-0.5 bg-white rounded">{Math.round(profile.opacity * 100)}%</span>
                            {profile.readingGuideEnabled && <span className="text-xs px-1 py-0.5 bg-green-100 rounded">Guide</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteProfile(profile.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button onClick={handleToggleOverlay}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all ${
                isActive ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800'}`}>
              {isActive ? <Eye size={18} /> : <EyeOff size={18} />}
              <span>{isActive ? 'Overlay Active' : 'Activate Overlay'}</span>
            </button>
          </div>
        </motion.div>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 ${
                toast.type === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}