/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  FileInput 
} from 'lucide-react';
import { Bus } from '../types';

interface FleetProps {
  buses: Bus[];
  onAddBus: (bus: Omit<Bus, 'id' | 'createdAt'>) => Promise<string>;
  onAddBusesBatch: (buses: Omit<Bus, 'id' | 'createdAt'>[]) => Promise<void>;
  onDeleteBus: (busId: string) => Promise<void>;
  onUpdateBusStatus?: (busId: string, status: 'ALLOWED' | 'FORBIDDEN') => Promise<void>;
  userRole: string;
}

export const Fleet: React.FC<FleetProps> = ({
  buses,
  onAddBus,
  onAddBusesBatch,
  onDeleteBus,
  onUpdateBusStatus,
  userRole
}) => {
  const [search, setSearch] = useState('');
  const [operatorNumber, setOperatorNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [manufacturingYear, setManufacturingYear] = useState('');
  const [status, setStatus] = useState<'ALLOWED' | 'FORBIDDEN'>('ALLOWED');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered buses based on search state
  const filteredBuses = buses.filter(bus => 
    bus.operatorNumber.includes(search) || 
    bus.plateNumber.includes(search) || 
    bus.driverName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    if (!operatorNumber.trim() || !plateNumber.trim() || !driverName.trim() || !manufacturingYear.trim()) {
      setMessage({ text: 'يرجى ملء جميع الحقول المطلوبة قبل الضغط على الحفظ.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      await onAddBus({
        operatorNumber: operatorNumber.trim(),
        plateNumber: plateNumber.trim(),
        driverName: driverName.trim(),
        manufacturingYear: manufacturingYear.trim(),
        status: status
      });
      setMessage({ text: 'تم تسجيل الحافلة بنجاح في أسطول النظام ونظام الباركود QR.', type: 'success' });
      setOperatorNumber('');
      setPlateNumber('');
      setDriverName('');
      setManufacturingYear('');
      setStatus('ALLOWED');
    } catch (err) {
      console.error(err);
      setMessage({ text: 'فشل إدخال بيانات الحافلة، يرجى مراجعة نظام الصلاحيات.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateDownload = () => {
    // Generate actual .xlsx template file using SheetJS (xlsx)
    const ws_data = [
      ["رقم التشغيل", "رقم اللوحة", "اسم السائق", "سنة الصنع"],
      ["1204", "أ ب ج 1122", "عمرو بن الخطاب", "2025"],
      ["1205", "د هـ و 5678", "ياسر المرواني", "2026"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Set column widths to make it super elegant and readable
    ws['!cols'] = [
      { wch: 15 }, // رقم التشغيل
      { wch: 18 }, // رقم اللوحة
      { wch: 25 }, // اسم السائق
      { wch: 15 }  // سنة الصنع
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "شيت الأسطول المعتمد");
    
    // Write and download xlsx file
    XLSX.writeFile(wb, "template_dorra_fleet.xlsx");
    
    setMessage({ 
      text: 'تم تحميل قالب الإكسل (XLSX) المعتمد بنجاح. يرجى ملء البيانات وإعادة رفعه.', 
      type: 'success' 
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        // Read the file as binary using xlsx
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse sheet rows as arrays (header in first row)
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (rows.length < 2) {
          setMessage({ 
            text: 'خطأ: لم يتم العثور على أي صفوف بيانات في ملف الإكسل المرفوع.', 
            type: 'error' 
          });
          return;
        }

        // Extract first row as headers, trim everything to match columns
        const headers = rows[0].map(h => String(h || '').trim());
        
        // Find positions of the required columns
        const opIndex = headers.findIndex(h => h.includes('رقم التشغيل') || h.toLowerCase().includes('operator'));
        const plateIndex = headers.findIndex(h => h.includes('رقم اللوحة') || h.toLowerCase().includes('plate'));
        const driverIndex = headers.findIndex(h => h.includes('اسم السائق') || h.toLowerCase().includes('driver'));
        const yearIndex = headers.findIndex(h => h.includes('سنة الصنع') || h.toLowerCase().includes('year'));

        // Fallback to sequential index positions if header names can't be resolved
        const finalOpIndex = opIndex !== -1 ? opIndex : 0;
        const finalPlateIndex = plateIndex !== -1 ? plateIndex : 1;
        const finalDriverIndex = driverIndex !== -1 ? driverIndex : 2;
        const finalYearIndex = yearIndex !== -1 ? yearIndex : 3;

        const newBuses: Omit<Bus, 'id' | 'createdAt'>[] = [];
        let skippedRowsCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Convert cells to trimmed strings
          const op = row[finalOpIndex] !== undefined ? String(row[finalOpIndex]).trim() : '';
          const plate = row[finalPlateIndex] !== undefined ? String(row[finalPlateIndex]).trim() : '';
          const driver = row[finalDriverIndex] !== undefined ? String(row[finalDriverIndex]).trim() : '';
          const year = row[finalYearIndex] !== undefined ? String(row[finalYearIndex]).trim() : '';

          // Only add rows that have all essential fields filled
          if (op && plate && driver && year) {
            newBuses.push({
              operatorNumber: op,
              plateNumber: plate,
              driverName: driver,
              manufacturingYear: year
            });
          } else {
            // Acknowledge skipped empty or uncompleted rows
            if (row.some(cell => cell !== undefined && String(cell).trim() !== '')) {
              skippedRowsCount++;
            }
          }
        }

        if (newBuses.length > 0) {
          await onAddBusesBatch(newBuses);
          
          let successMsg = `تم استيراد ${newBuses.length} حافلة بنجاح سحابياً من ملف الإكسل ومزامنتها بنجاح مع قاعدة البيانات.`;
          if (skippedRowsCount > 0) {
            successMsg += ` (تم تخطي عدد ${skippedRowsCount} من الصفوف لعدم اكتمال بياناتها)`;
          }
          
          setMessage({ text: successMsg, type: 'success' });
        } else {
          setMessage({ 
            text: 'خطأ: لم يتم اكتشاف أي بيانات حافلات صالحة ومطابقة لتنسيق القالب في الملف.', 
            type: 'error' 
          });
        }
      } catch (err) {
        console.error(err);
        setMessage({ 
          text: 'حدث خطأ أثناء فك وتفسير ملف الإكسل. يرجى التأكد من اختيار ملف إكسل سليم (.xlsx / .xls).', 
          type: 'error' 
        });
      }
    };

    reader.readAsBinaryString(file);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, op: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف الحافلة رقم تشغيل ${op} من الأسطول؟\nسيؤدي هذا إلى إيقاف فعالية الباركود QR الخاص بها.`)) {
      try {
        await onDeleteBus(id);
        setMessage({ text: `تم حذف الحافلة ذات رقم التشغيل (${op}) بنجاح.`, type: 'success' });
      } catch (err) {
        console.error(err);
        setMessage({ text: 'خطأ: لم تتمكن من إجراء الحذف للمخزون بسبب الصلاحيات.', type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">أسطول الحافلات والترميز الرقمي</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          تسجيل، تعديل، وإلحاق حافلات النقل بالشركة، واستيراد الجداول الفورية
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs font-bold leading-normal ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Top zone for DIRECTOR role: compact side-by-side tools to manage fleet */}
      {userRole === 'DIRECTOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Manual Registration Container (Left 2-columns wide) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-4 h-4 text-sky-600" />
                تسجيل وإضافة حافلة جديدة يدوياً
              </h2>
              
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم التشغيل المستهدف</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 1240"
                      value={operatorNumber}
                      onChange={(e) => setOperatorNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم لوحة المرور</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أ ب ج 1234"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم السائق المعتمد</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ياسين المرواني"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">سنة الصنع</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 2023"
                      value={manufacturingYear}
                      onChange={(e) => setManufacturingYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة المرور الترخيصية</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ALLOWED' | 'FORBIDDEN')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-sans font-bold"
                  >
                    <option value="ALLOWED">🟢 مسموح لها بالعبور والمرور بالبوابة</option>
                    <option value="FORBIDDEN">🔴 مرفوضة وممنوعة من العبور (إيقاف المغادرة والمسح)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#0066A2] hover:bg-[#005587] text-xs font-black text-white rounded-full shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>ثبت الحافلة الجديدة بالأسطول</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Excel / Excel CSV Importer panel (Right 1-column) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Upload className="w-4 h-4 text-emerald-600" />
                الاستيراد الجماعي للبيانات
              </h2>
              
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-3">
                تستطيع رفع وتعبئة الأسطول دفعة واحدة باستخدام ملف Excel أو CSV المعتمد. قم بتحميل قالب التوجيه لضمان تطابق مدخلات الأعمدة.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {/* Download template */}
              <button
                onClick={handleTemplateDownload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-500" />
                <span>تحميل قالب Excel المعتمد</span>
              </button>

              {/* Upload Action */}
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 transition-colors cursor-pointer text-center animate-pulse">
                <FileInput className="w-4 h-4 text-emerald-650" />
                <span>اختر ملف Excel أو CSV المستهدف</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>
      )}

      {/* Full width Fleet inventory listing at the bottom */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-900">حافلات الأسطول المسجلة بالشركة ({buses.length})</h2>
            
            {/* Search Input */}
            <div className="relative max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم التشغيل، اللوحة أو السائق..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500">رقم التشغيل</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500">رقم اللوحة</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500">اسم السائق</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500">سنة الصنع</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500">حالة التصريح</th>
                  {userRole === 'DIRECTOR' && (
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 text-center">إجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredBuses.length > 0 ? (
                  filteredBuses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-extrabold text-sky-700 font-mono tracking-wider">
                        {bus.operatorNumber}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800">
                        <span className="bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-[11px]">
                          {bus.plateNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                        {bus.driverName}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                        {bus.manufacturingYear}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {userRole === 'DIRECTOR' ? (
                          <select
                            value={bus.status || 'ALLOWED'}
                            onChange={(e) => onUpdateBusStatus && onUpdateBusStatus(bus.id, e.target.value as 'ALLOWED' | 'FORBIDDEN')}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer focus:outline-none focus:ring-2 ${
                              (bus.status || 'ALLOWED') === 'ALLOWED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500/10'
                                : 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500/10'
                            }`}
                          >
                            <option value="ALLOWED">🟢 مسموح</option>
                            <option value="FORBIDDEN">🔴 مرفوض</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            (bus.status || 'ALLOWED') === 'ALLOWED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                              : 'bg-rose-50 text-rose-700 border border-rose-150'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (bus.status || 'ALLOWED') === 'ALLOWED' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                            {(bus.status || 'ALLOWED') === 'ALLOWED' ? 'مسموح' : 'مرفوض'}
                          </span>
                        )}
                      </td>
                      {userRole === 'DIRECTOR' && (
                        <td className="px-4 py-3.5 text-xs text-center border-r border-slate-50">
                          <button
                            onClick={() => handleDelete(bus.id, bus.operatorNumber)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الحافلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={userRole === 'DIRECTOR' ? 6 : 5} className="px-4 py-8 text-center text-xs text-slate-400 font-medium font-semibold">
                      لا تفاصيل مطابقة لبحثك في أسطول الحافلات.
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
