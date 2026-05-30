/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Filter 
} from 'lucide-react';
import { Movement } from '../types';

interface MovementsProps {
  movements: Movement[];
}

export const Movements: React.FC<MovementsProps> = ({ movements }) => {
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'AM' | 'PM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtering Logic
  const filteredMovements = movements.filter((move) => {
    // 1. Text Search matching
    const searchLower = search.toLowerCase();
    const matchesText = 
      move.operatorNumber.includes(searchLower) || 
      move.plateNumber.includes(searchLower) || 
      move.guardName.toLowerCase().includes(searchLower);

    // 2. Period validation
    const matchesPeriod = filterPeriod === 'ALL' || move.period === filterPeriod;

    // 3. Date range match
    let matchesDate = true;
    if (startDate || endDate) {
      const moveDate = new Date(move.timestamp);
      moveDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (moveDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (moveDate > end) matchesDate = false;
      }
    }

    return matchesText && matchesPeriod && matchesDate;
  });

  // Export to localized Arabic CSV format (Excel friendly)
  const handleExportCSV = () => {
    // UTF-8 BOM so Excel opens in Arabic on any OS without breaking fonts
    const rowHeader = 'معرف الحركة,رقم التشغيل للحافلة,رقم اللوحة,نوع الحركة,الفترة,تاريخ الحركة,اسم الحارس\n';
    
    const rows = filteredMovements.map((m) => {
      const typeAr = m.type === 'IN' ? 'دخول المقر' : 'خروج من المقر';
      const periodAr = m.period === 'AM' ? 'صباحي (AM)' : 'مسائي (PM)';
      const dateFormatted = new Date(m.timestamp).toLocaleString('ar-SA').replace(/,/g, ' ');
      
      return `"${m.id}","${m.operatorNumber}","${m.plateNumber}","${typeAr}","${periodAr}","${dateFormatted}","${m.guardName}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + rowHeader + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gate_movements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterPeriod('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">سجل حركة الحافلات بمكة المكرمة</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            مستندات حركات الدخول والخروج التي يسجلها الحرس لحظة بلحظة مع خيارات تصفية الفترة والتصدير
          </p>
        </div>
        
        {/* Export Button */}
        <button
          onClick={handleExportCSV}
          disabled={filteredMovements.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-500/10 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>تصدير الحركات إلى Excel</span>
        </button>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 leading-none">
          <Filter className="w-4.5 h-4.5 text-sky-600" />
          تصفية وبحث متقدم
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Query search */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">رقم اللوحة، التشغيل أو الحارس</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث هنا..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.8 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
              />
            </div>
          </div>

          {/* Period Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">اختيار الفترة</span>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="w-full px-3 py-1.8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="ALL">كل الفترات الحركية</option>
              <option value="AM">الفترة الصباحية (AM)</option>
              <option value="PM">الفترة المسائية (PM)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">من تاريخ</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:bg-white"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">إلى تاريخ</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Reset Filters button */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer text-center"
            >
              مسح خيارات التصفية
            </button>
          </div>

        </div>
      </div>

      {/* movements Logs Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">حركات سجل البوابة المطابقة ({filteredMovements.length})</span>
          <span className="text-[11px] text-slate-400 font-semibold font-mono">آخر تحديث فوري</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-right">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-5 py-3 text-xs font-bold text-slate-500">الحافلة</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500">منفذ الحركة</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500">الفترة الورادية</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500">التاريخ والوقت</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500">حارس البوابة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMovements.length > 0 ? (
                filteredMovements.map((move) => (
                  <tr key={move.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-slate-950 font-mono tracking-wider">{move.operatorNumber}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-100">{move.plateNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 ${
                        move.type === 'IN' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                          : 'bg-rose-50 text-rose-800 border-rose-100'
                      }`}>
                        {move.type === 'IN' ? (
                          <>
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-550" />
                            <span>دخول إلى المقر</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-550" />
                            <span>خروج من المقر</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 border ${
                        move.period === 'AM' 
                          ? 'bg-amber-50 text-amber-800 border-amber-100' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {move.period === 'AM' ? 'دورة صباحية (AM)' : 'دورة مسائية (PM)'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-medium font-mono leading-relaxed">
                      {new Date(move.timestamp).toLocaleDateString('ar-SA')} - {new Date(move.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700">
                      {move.guardName}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400 font-semibold font-medium">
                    لا حركات مسجلة حالياً تطابق شروط التصفية في الأرشيف المالي.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
