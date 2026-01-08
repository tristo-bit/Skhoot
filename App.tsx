
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { COLORS, THEME } from './constants';
import { Menu, X } from 'lucide-react';

const SkhootLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} className={className} />
);

const App: React.FC = () => {
  const [key, setKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const resetChat = () => {
    setKey(prev => prev + 1);
    setIsSidebarOpen(false);
  };

  const closeApp = () => {
    console.log("App closing...");
    window.location.reload(); 
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 overflow-hidden" style={{ backgroundColor: THEME.background }}>
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[5%] left-[15%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-40 animate-pulse pointer-events-none" style={{ backgroundColor: COLORS.orchidTint }} />
      <div className="absolute bottom-[5%] right-[15%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-40 animate-pulse pointer-events-none" style={{ backgroundColor: COLORS.almostAqua }} />

      {/* Main App Window Container */}
      <div className="relative z-10 w-full max-w-[480px] h-[720px] flex flex-col rounded-[40px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] overflow-hidden border border-white/80" style={{ backgroundColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)' }}>
        
        {/* Header */}
        <header className="px-6 py-5 flex items-center justify-between border-b border-black/5" style={{ backgroundColor: `${THEME.header}88` }}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-black/5 rounded-lg transition-all text-gray-600"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <SkhootLogo size={18} />
                <span className="text-sm font-black tracking-[0.2em] font-jakarta" style={{ color: '#c0b7c9' }}>SKHOOT</span>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 font-jakarta opacity-80" style={{ color: '#1e1e1e' }}>Your personal sentinel</span>
            </div>
          </div>
          
          <button 
            onClick={closeApp}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-full transition-colors text-gray-500 hover:text-red-500"
          >
            <X size={20} />
          </button>
        </header>

        {/* Sidebar Overlay */}
        <div className={`absolute top-[75px] left-0 bottom-0 z-20 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar onNewChat={resetChat} />
        </div>

        {/* Content Area */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <ChatInterface key={key} />
        </main>
      </div>
    </div>
  );
};

export default App;