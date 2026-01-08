import React from 'react';
import { COLORS, THEME } from '../constants';
import { Search, Plus, Star, Settings, HelpCircle } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewChat }) => {
  return (
    <div 
      className="w-64 h-full border-r border-black/5 p-5 flex flex-col shadow-2xl relative overflow-hidden" 
      style={{ backgroundColor: THEME.sidebar }}
    >
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      
      <div className="relative z-10 mb-8">
        <button 
          onClick={onNewChat}
          className="flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all shadow-md active:scale-95 border border-white/50 hover:brightness-105"
          style={{ backgroundColor: '#DDEBF4', color: '#1e1e1e' }}
        >
          <div className="w-8 h-8 bg-white/40 rounded-xl flex items-center justify-center">
            <Plus size={18} />
          </div>
          <span className="text-sm font-black tracking-tight font-jakarta">New Search</span>
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto space-y-2 no-scrollbar">
        <div className="flex items-center justify-between px-2 mb-3">
          <p 
            className="text-[10px] font-black uppercase tracking-[0.1em] font-jakarta"
            style={{ color: '#1e1e1e' }}
          >
            Past search
          </p>
          <Star size={10} style={{ color: '#1e1e1e' }} className="opacity-20" />
        </div>
        
        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 opacity-40">
          <div className="p-3 rounded-full bg-black/5">
            <Search size={24} style={{ color: COLORS.textSecondary }} />
          </div>
          <p className="text-[11px] font-bold font-jakarta" style={{ color: COLORS.textSecondary }}>No recent searches</p>
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-6 border-t border-black/10 space-y-1">
        <SidebarItem icon={<Settings size={15}/>} label="Settings" />
        <SidebarItem icon={<HelpCircle size={15}/>} label="Help Center" />
        
        <div 
          className="mt-6 py-2.5 px-4 rounded-[20px] flex flex-col items-center justify-center shadow-lg border border-white bg-white/90 ring-1 ring-black/5 transform transition-transform hover:scale-[1.02] cursor-default"
          style={{ color: COLORS.fukuBrand }}
        >
          <span className="text-[9px] font-black font-jakarta tracking-[0.3em] leading-tight">SKHOOT ENGINE</span>
          <span className="text-[9px] font-black font-jakarta tracking-[0.3em] leading-tight opacity-70">VERSION 1.0</span>
        </div>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean }> = ({ icon, label, active }) => (
  <div 
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
      active ? 'bg-white shadow-sm font-black' : 'hover:bg-white/50 opacity-60 font-bold'
    }`}
    style={{ color: COLORS.textPrimary }}
  >
    <span style={{ color: active ? COLORS.fukuBrand : 'inherit' }}>{icon}</span>
    <span className="text-xs truncate font-jakarta">{label}</span>
  </div>
);

export default Sidebar;