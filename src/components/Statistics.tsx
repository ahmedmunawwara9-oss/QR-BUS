/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Bus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  TrendingUp, 
  History, 
  Calendar,
  Building,
  Navigation
} from 'lucide-react';
import { Bus as BusType, Movement } from '../types';

interface StatisticsProps {
  buses: BusType[];
  movements: Movement[];
  logoSvg: string;
}

export const Statistics: React.FC<StatisticsProps> = ({ buses, movements }) => {
  // 1. Calculate General Metrics
  const totalBuses = buses.length;
  const totalMovements = movements.length;

  const entriesCount = movements.filter((m) => m.type === 'IN').length;
  const exitsCount = movements.filter((m) => m.type === 'OUT').length;

  // 2. Track where each bus is based on its latest movement
  const busStatusMap: { [busId: string]: 'IN' | 'OUT' | 'NOT_RECORDED' } = {};
  
  // Sort movements ascending by timestamp so that the latest movement overwrites previous ones
  const sortedMovementsAsc = [...movements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sortedMovementsAsc.forEach((move) => {
    busStatusMap[move.busId] = move.type;
  });

  // Calculate current counts
  let busesInside = 0;
  let busesOutside = 0;

  buses.forEach((bus) => {
    const status = busStatusMap[bus.id] || 'NOT_RECORDED';
    if (status === 'IN') {
      busesInside++;
    } else if (status === 'OUT') {
      busesOutside++;
    } else {
      // Default: if never moved, we can assume it's parked/inside basic pool
      busesInside++;
    }
  });

  // Shifts / Period data
  const shiftAMCount = movements.filter(m => m.period === 'AM').length;
  const shiftPMCount = movements.filter(m => m.period === 'PM').length;

  // Recent Movements (Limit to 5)
  const recentLogs = movements.slice(0, 5);

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EFF6FF] p-6 rounded-2xl border border-[#BFDBFE] shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">الاحصائيات والتقاير العامة</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            متابعة حية وفورية لحركات دخول وخروج حافلات "درة المنورة" بمكة المكرمة
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 text-slate-600 font-bold text-xs">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>تاريخ اليوم: {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Bento Grid Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Buses */}
        <div className="bg-[#EFF6FF] p-6 rounded-2xl border border-[#BFDBFE] shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div>
            <span className="text-xs font-bold text-slate-400">إجمالي الأسطول المسجل</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tracking-wider">{totalBuses}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">حافلة معتمدة بالنظام</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
            <Bus className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Buses Inside Yard */}
        <div className="bg-[#EFF6FF] p-6 rounded-2xl border border-[#BFDBFE] shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div>
            <span className="text-xs font-bold text-slate-400">حافلات بالداخل (بالمقر)</span>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono tracking-wider">{busesInside}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">حافلة مرابطة بالشركة</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
            <Building className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Buses Active Outside */}
        <div className="bg-[#EFF6FF] p-6 rounded-2xl border border-[#BFDBFE] shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div>
            <span className="text-xs font-bold text-slate-400">حافلات بالخارج (في مهمة)</span>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1 font-mono tracking-wider">{busesOutside}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">حافلة قيد العمل الفعلي</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
            <Navigation className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Traffic Movements */}
        <div className="bg-[#EFF6FF] p-6 rounded-2xl border border-[#BFDBFE] shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div>
            <span className="text-xs font-bold text-slate-400">إجمالي الحركات المسجلة</span>
            <h3 className="text-3xl font-extrabold text-sky-700 mt-1 font-mono tracking-wider">{totalMovements}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">عملية دخول وحركة خروج</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Graphic Visuals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            📊 توزيع نسب الحركة والأنشطة
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            
            {/* IN / OUT Distribution with custom styled double road lanes representing the gate */}
            <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 space-y-4">
              <span className="text-xs font-bold text-slate-600 block">بوابة المقر الرئيسية (حركة المرور الفورية)</span>
              
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes roadExiting {
                  0% { transform: translate3d(295px, -50%, 0); opacity: 0; }
                  12% { opacity: 1; }
                  88% { opacity: 1; }
                  100% { transform: translate3d(-75px, -50%, 0); opacity: 0; }
                }
                @keyframes roadEntering {
                  0% { transform: translate3d(-75px, -50%, 0); opacity: 0; }
                  12% { opacity: 1; }
                  88% { opacity: 1; }
                  100% { transform: translate3d(295px, -50%, 0); opacity: 0; }
                }
                .animate-road-out {
                  animation: roadExiting 4.5s infinite linear;
                }
                .animate-road-in {
                  animation: roadEntering 4.5s infinite linear;
                }
              `}} />

              {/* Graphical representation of two roads separated by a dashed yellow line */}
              <div className="relative w-full bg-slate-900 rounded-2xl border border-slate-800 p-4 overflow-hidden shadow-inner flex flex-col justify-center space-y-3 font-sans text-white h-32 select-none">
                
                {/* Gate Barrier Line */}
                <div className="absolute top-0 bottom-0 right-[40%] w-1 bg-sky-500/60 shadow-[0_0_8px_#38bdf8] flex flex-col justify-between py-1 z-10">
                  <span className="w-1 h-1 rounded-full bg-sky-400" />
                  <span className="text-[7.5px] font-black text-sky-300 -mr-11 -rotate-90 origin-right whitespace-nowrap tracking-wider">البوابة الرئيسية</span>
                  <span className="w-1 h-1 rounded-full bg-sky-400" />
                </div>

                {/* Upper Lane: Exit (خروج) - Going left (out) */}
                <div className="relative z-0 flex items-center justify-between h-9">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span className="text-xs font-black text-sky-200">مسار خروج ↗</span>
                  </div>
                  
                  {/* Road arrow animation marker */}
                  <div className="flex-1 max-w-[285px] h-7 bg-slate-950/60 border border-slate-800/80 rounded-lg relative mx-3 overflow-hidden">
                    <div className="absolute top-1/2 text-sky-400 animate-road-out">
                      {/* Detailed Bus Exiting (Facing/driving Left) */}
                      <svg width="70" height="20" viewBox="0 0 70 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="2" width="70" height="15" rx="3.5" fill="#0066A2" />
                        <rect x="0" y="11" width="70" height="6" rx="1.5" fill="#004D7A" />
                        <path d="M0 2H10V14H2.5C1 14 0 12.5 0 11L0 2Z" fill="#1e293b" />
                        <rect x="13" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="23" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="33" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="43" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="53" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <circle cx="15" cy="17" r="3" fill="#0f172a" />
                        <circle cx="15" cy="17" r="1.2" fill="#94a3b8" />
                        <circle cx="50" cy="17" r="3" fill="#0f172a" />
                        <circle cx="50" cy="17" r="1.2" fill="#94a3b8" />
                        <circle cx="58" cy="17" r="3" fill="#0f172a" />
                        <circle cx="58" cy="17" r="1.2" fill="#94a3b8" />
                        <text x="39" y="14" fill="#ffffff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="4.5" fontWeight="900" textAnchor="middle" direction="rtl">شركة درة المنورة</text>
                        <circle cx="2" cy="13" r="1" fill="#fef08a" />
                      </svg>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-black text-sky-300 bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-900/60">
                    {exitsCount} خروج
                  </span>
                </div>

                {/* Road center dashed line separator */}
                <div className="relative h-1.5 w-full bg-slate-950 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-amber-400/70" />
                </div>

                {/* Lower Lane: Entry (دخول) - Going right (in) */}
                <div className="relative z-0 flex items-center justify-between h-9">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-200">مسار دخول ↙</span>
                  </div>
                  
                  {/* Road arrow animation marker */}
                  <div className="flex-1 max-w-[285px] h-7 bg-slate-950/60 border border-slate-800/80 rounded-lg relative mx-3 overflow-hidden">
                    <div className="absolute top-1/2 text-emerald-400 animate-road-in">
                      {/* Detailed Bus Entering (Facing/driving Right) */}
                      <svg width="70" height="20" viewBox="0 0 70 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="2" width="70" height="15" rx="3.5" fill="#10b981" />
                        <rect x="0" y="11" width="70" height="6" rx="1.5" fill="#047857" />
                        <path d="M70 2H60V14H67.5C69 14 70 12.5 70 11L70 2Z" fill="#1e293b" />
                        <rect x="49" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="39" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="29" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="19" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <rect x="9" y="4" width="8" height="6" rx="1" fill="#1e293b" />
                        <circle cx="55" cy="17" r="3" fill="#0f172a" />
                        <circle cx="55" cy="17" r="1.2" fill="#94a3b8" />
                        <circle cx="20" cy="17" r="3" fill="#0f172a" />
                        <circle cx="20" cy="17" r="1.2" fill="#94a3b8" />
                        <circle cx="12" cy="17" r="3" fill="#0f172a" />
                        <circle cx="12" cy="17" r="1.2" fill="#94a3b8" />
                        <text x="31" y="14" fill="#ffffff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="4.5" fontWeight="900" textAnchor="middle" direction="rtl">شركة درة المنورة</text>
                        <circle cx="68" cy="13" r="1" fill="#fef08a" />
                      </svg>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-900/60">
                    {entriesCount} دخول
                  </span>
                </div>

              </div>
              
              <div className="flex justify-between text-[10px] text-slate-400 font-extrabold">
                <span>مسار الخروج يمثل مغادرة الحافلات بوابات الشركة</span>
                <span>مسار الدخول يمثل الإياب والاصطفاف بالساحة الداخلية</span>
              </div>
            </div>

          </div>

          <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-sky-800">تحديث مؤشرات المرور مباشر</h4>
              <p className="text-[11px] text-sky-700 leading-normal">
                يتم مزامنة هذه الإحصائيات مباشرة وبشكل تلقائي بمجرد قيام الحارس بتسجيل الحركة وبكبسة زر واحدة دون الحاجة لتحديث الصفحة.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Recent entries feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" />
            أحدث الحركات اليوم
          </h2>

          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3 border border-slate-100 hover:border-slate-205 rounded-xl bg-slate-50/40 flex items-center justify-between text-xs transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800">{log.operatorNumber}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.2 rounded font-mono">{log.plateNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold space-x-1.5 space-x-reverse">
                      <span>الحارس: {log.guardName}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] text-center border ${
                    log.type === 'IN' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {log.type === 'IN' ? 'دخول المقر' : 'خروج'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                لا توجد حركات مسجلة حالياً اليوم.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
