/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Printer, CheckSquare, Square, RefreshCw, Layers, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { Bus } from '../types';
import { BusQRCode } from './BusQRCode';

interface QRCodePrintProps {
  buses: Bus[];
  logoSvg: string;
}

export const QRCodePrint: React.FC<QRCodePrintProps> = ({ buses, logoSvg }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'preview' | 'print-sheet'>('preview');
  const [showIframeModal, setShowIframeModal] = useState(false);

  // Check if running inside iframe
  const isInIframe = typeof window !== 'undefined' ? (window.self !== window.top) : false;

  const handlePrintClick = () => {
    if (isInIframe) {
      setShowIframeModal(true);
    } else {
      setPrintMode('print-sheet');
      setTimeout(() => window.print(), 150);
    }
  };

  // Handle individual card selection toggles
  const handleSelectToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === buses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(buses.map(b => b.id));
    }
  };

  const selectedBuses = buses.filter(b => selectedIds.includes(b.id));

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      
      {/* 1. Header (Hidden during printing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">طباعة باركودات QR للحافلات</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            اختر الحافلات لتصدير وطباعة بطاقاتها المزدوجة (يمين QR - يسار تفاصيل الحافلة) بشكل فردي أو مجمع 
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={handlePrintClick}
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-full shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تصدير وحفظ كـ ملف PDF مجمع</span>
            </button>

            <button
              onClick={handlePrintClick}
              className="px-5 py-3.5 bg-[#0066A2] hover:bg-[#005587] text-white font-black text-xs rounded-full shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقة مجمعة (6 بطاقات / A4)</span>
            </button>
            
            {printMode === 'print-sheet' && (
              <button
                onClick={() => setPrintMode('preview')}
                className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs cursor-pointer transition-all text-center"
              >
                <span>العودة للمعاينة</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ⚠️ Iframe Sandbox print warning modal */}
      {showIframeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white border border-slate-150 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-6 text-center transform scale-100 transition-transform">
            <div className="mx-auto w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-950">تصدير الـ PDF والطباعة من المعاينة</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                عذراً، تمنع متصفحات الإنترنت تشغيل واجهة الطباعة أو تصدير ملفات PDF تلقائياً من داخل النوافذ المضمنة (iFrame) مباشرة لأسباب أمنية.
              </p>
              <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl text-right">
                <h4 className="text-[11px] font-bold text-sky-955 mb-1">خطوات بسيطة ومضمونة 100%:</h4>
                <p className="text-[10px] text-sky-800 leading-relaxed font-semibold">
                  1. اضغط على زر <strong>"افتح البوابة في علامة تبويب جديدة"</strong> أدناه.<br />
                  2. اذهب إلى تبويب <strong>"طباعة بطاقات QR"</strong>.<br />
                  3. حدد المركبات واضغط <strong>"تصدير"</strong> وسيتم الحفظ والتحميل كـ PDF فورا وبأعلى جودة!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowIframeModal(false)}
                className="w-full py-3 bg-[#0066A2] hover:bg-[#005587] text-white font-black text-xs rounded-full shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>افتح البوابة في علامة تبويب جديدة ↗</span>
              </a>
              
              <button
                onClick={() => setShowIframeModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-full transition-colors cursor-pointer text-center"
              >
                رجوع وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="no-print bg-sky-50 border border-sky-100/75 p-4 rounded-xl flex items-start gap-3 mt-1">
          <span className="text-lg">💡</span>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-sky-955">كيفية تصدير البطاقات كـ ملف PDF عالي الجودة للطباعة:</h4>
            <p className="text-[11px] text-sky-800 leading-relaxed font-semibold">
              عند النقر على <strong>"تصدير وحفظ كـ ملف PDF مجمع"</strong> أو زر الطباعة، ستفتح لك نافذة الطباعة التلقائية الخاصة بمتصفح الإنترنت. قم بتغيير <strong>"الوجهة" (Destination)</strong> من قائمتك طابعات لتصبح <strong>"حفظ بتنسيق PDF" (Save as PDF)</strong> لحفظ المستند بشكل رقمي على جهازك ومن ثم طباعته لاحقاً في أي وقت.
            </p>
          </div>
        </div>
      )}

      {/* 2. Page selection Area (Hidden during printing) */}
      {printMode === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          
          {/* Left panel: List of all buses to select */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">اختر حافلات للطباعة</h2>
              <button
                onClick={handleSelectAll}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                {selectedIds.length === buses.length ? 'إلغاء تحديد الكل' : 'تحديد كل المركبات'}
              </button>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {buses.length > 0 ? (
                buses.map((bus) => {
                  const isSelected = selectedIds.includes(bus.id);
                  return (
                    <div 
                      key={bus.id}
                      onClick={() => handleSelectToggle(bus.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-sky-500 bg-sky-50/50 shadow-inner' 
                          : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-sky-600" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-slate-350" />
                        )}
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-slate-800 font-mono tracking-wide">
                            {bus.operatorNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block leading-none">
                            {bus.plateNumber}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">{bus.manufacturingYear}</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-100 rounded-2xl">
                  يرجى إضافة حافلات لجدول الأسطول أولاً.
                </div>
              )}
            </div>
          </div>

          {/* Right layout: Realtime preview design workspace */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150 shadow-sm lg:col-span-2 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 flex items-center gap-1 leading-none">
              <Layers className="w-4 h-4 text-sky-500" />
              معاينة البطاقة القياسية (درة المنورة)
            </h2>

            {selectedBuses.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-sky-50/80 p-4 border border-sky-100 rounded-xl">
                  <p className="text-xs text-sky-850 font-medium leading-relaxed">
                    لقد قمت بتحديد <strong>{selectedIds.length} حافلات</strong> للطباعة المجمعة. تظهر البطاقات في الأسفل بالشكل القياسي المزدوج: النصف الأيمن يحوي على <strong>الباركود QR</strong> من الويب، والنصف الأيسر المعلومات الكاملة للمركبة.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedBuses.slice(0, 4).map((bus) => (
                    <BusQRCode key={bus.id} bus={bus} logoSvg={logoSvg} />
                  ))}
                  {selectedBuses.length > 4 && (
                    <div className="p-4 bg-white border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center text-xs text-slate-400 font-bold">
                      +{selectedBuses.length - 4} بطاقات إضافية محققة بالطباعة المجمعة
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col justify-center items-center text-center p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                <Printer className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                <h3 className="text-sm font-bold text-slate-700">لم تقم بتحديد أي حافلة</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  الرجاء تحديد خانة الحافلات المرغوبة للطباعة من اللوحة الجانبية لمشاهدة تفاصيل شكل بطاقاتها.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. Printable Output Document Grid (Visible ONLY during print triggers or sheet modes) */}
      {(printMode === 'print-sheet' || selectedIds.length > 0) && (
        <div 
          className={`${
            printMode === 'print-sheet' 
              ? 'bg-white p-6 rounded-2xl shadow-xl' 
              : 'hidden'
          } print:block print-container`}
          style={{ direction: 'rtl' }}
        >
          {/* Quick instructions (Hidden in print) */}
          <div className="no-print mb-6 p-4 bg-amber-50 border border-amber-250 text-amber-850 text-xs font-bold rounded-xl flex items-center justify-between">
            <span>
              نظام المعاينة التذكيري: هذه الورقة تتوافق مع نظام المقاييس A4 بحيث تظهر البطاقات في 2 أعمدة و 3 صفوف (مجموع 6 بطاقات بالورقة).
            </span>
            <button 
              onClick={() => setPrintMode('preview')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg border-0 cursor-pointer"
            >
              الرجوع ومراجعة الخيارات
            </button>
          </div>

          {/* Core Printable Grid (Grouped in chunks of 6 cards for exact layout control) */}
          {Array.from({ length: Math.ceil(selectedBuses.length / 6) }).map((_, pageIdx) => {
            const pageBuses = selectedBuses.slice(pageIdx * 6, (pageIdx + 1) * 6);
            return (
              <div 
                key={pageIdx} 
                className={`${pageIdx > 0 ? 'print-page-break' : ''} w-full`}
              >
                <div className="printable-grid grid grid-cols-2 gap-6 w-full">
                  {pageBuses.map((bus) => (
                    <BusQRCode key={bus.id} bus={bus} logoSvg={logoSvg} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
