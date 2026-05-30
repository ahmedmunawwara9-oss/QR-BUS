/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Bus as BusIcon, 
  Route, 
  QrCode, 
  Sliders, 
  LogOut, 
  UserCheck,
  X
} from 'lucide-react';
import { UserSession } from '../types';
import { LogoRenderer } from './LogoRenderer';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserSession;
  onLogout: () => void;
  companyName: string;
  appTitle: string;
  logoSvg: string;
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  companyName,
  appTitle,
  logoSvg,
  isOpen,
  onClose
}) => {
  
  const menuItems = [
    { id: 'stats', label: 'الإحصائيات العامة', icon: LayoutDashboard, roles: ['DIRECTOR', 'MONITOR'] },
    { id: 'fleet', label: 'أسطول الحافلات', icon: BusIcon, roles: ['DIRECTOR', 'MONITOR'] },
    { id: 'movements', label: 'حركة الحافلات', icon: Route, roles: ['DIRECTOR', 'MONITOR'] },
    { id: 'print-qr', label: 'طباعة بطاقات QR', icon: QrCode, roles: ['DIRECTOR', 'MONITOR'] },
    { id: 'management', label: 'صفحة الإدارة', icon: Sliders, roles: ['DIRECTOR'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role || ''));

  return (
    <aside 
      className={`w-80 bg-slate-900 text-white min-h-screen flex flex-col justify-between border-l border-slate-800 shadow-2xl z-30 transition-all duration-300 no-print flex-shrink-0
        fixed md:static inset-y-0 right-0 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}
      style={{ direction: 'rtl' }}
    >
      {/* Upper section */}
      <div>
        {/* Core branding logo & title */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 relative">
          {/* Close button inside sidebar representing mobile size */}
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-20 h-12 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <LogoRenderer logo={logoSvg} className="w-18 h-9" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-slate-100 leading-tight tracking-tight">
                {companyName}
              </span>
              <span className="text-[10px] text-sky-400 font-medium tracking-wide mt-0.5">
                {appTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Tab menu selection list */}
        <nav className="p-4 space-y-1.5 mt-4">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl font-bold text-sm transition-all text-right group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-l from-[#0066A2] to-[#005587] text-white shadow-lg shadow-sky-500/15 font-extrabold border border-sky-500/10'
                    : 'text-slate-400 hover:text-slate-105 hover:bg-slate-850/60'
                }`}
              >
                <Icon 
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-slate-300'
                  }`} 
                />
                <span className="flex-1 text-right">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white block mr-auto" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / session logout */}
      <div className="p-4 border-t border-slate-850 space-y-3">
        {/* Logged user context panel placed above logout button as requested */}
        <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-sky-400 font-bold shadow-inner flex-shrink-0">
              {user.name ? user.name[0] : 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-slate-100 truncate">{user.name}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <UserCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-[9px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded leading-none truncate">
                  {user.role === 'DIRECTOR' ? 'مدير النظام' : 'مراقب عام مالي'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-4.5 py-3 rounded-xl text-sm font-bold border border-slate-800 bg-slate-950/20 text-rose-450 hover:bg-rose-950/30 hover:border-rose-900/45 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <LogOut className="w-5 h-5 text-rose-500 group-hover:translate-x-1 transition-transform" />
            <span>تسجيل الخروج</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">v1.1.2</span>
        </button>
      </div>
    </aside>
  );
};
