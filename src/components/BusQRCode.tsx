/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bus } from '../types';
import { LogoRenderer } from './LogoRenderer';

interface BusQRCodeProps {
  bus: Bus;
  logoSvg: string;
}

export const BusQRCode: React.FC<BusQRCodeProps> = ({ bus, logoSvg }) => {
  const [imgError, setImgError] = useState(false);
  
  // Create QR scan data
  const qrData = `DURRAT-BUS:${bus.id}:${bus.operatorNumber}:${bus.plateNumber}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`;

  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-row relative print-card-border"
      style={{ minHeight: '140px', width: '100%', direction: 'rtl' }}
    >
      {/* Left side: Information (55% width) */}
      <div className="w-[55%] p-4 flex flex-col justify-between border-l border-slate-200">
        <div>
          {/* Header layout with company logo and title */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-18 h-10 flex-shrink-0 flex items-center justify-center">
              <LogoRenderer logo={logoSvg} className="w-16 h-8" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-slate-800 leading-tight">شركة درة المنورة</span>
              <span className="text-[9px] text-slate-400 font-medium">بطاقة تعريف حافلة مكة</span>
            </div>
          </div>
          
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center text-xs justify-between">
              <span className="text-slate-400 font-medium">رقم التشغيل:</span>
              <span className="font-bold text-sky-700 font-mono tracking-wider">{bus.operatorNumber}</span>
            </div>
            <div className="flex items-center text-xs justify-between">
              <span className="text-slate-400 font-medium">رقم اللوحة:</span>
              <span className="font-bold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{bus.plateNumber}</span>
            </div>
            <div className="flex items-center text-xs justify-between">
              <span className="text-slate-400 font-medium">سنة الصنع:</span>
              <span className="font-semibold text-slate-600 font-mono">{bus.manufacturingYear}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-2 pt-1 border-t border-dashed border-slate-200 flex justify-end items-center">
          <span className="text-[8px] text-slate-400 font-medium">مكة المكرمة</span>
        </div>
      </div>

      {/* Right side: QR Code (45% width) */}
      <div className="w-[45%] bg-transparent flex flex-col items-center justify-between py-3 px-2">
        <span className="text-[8px] tracking-wider text-slate-500 font-extrabold uppercase text-center w-full block">رمز الاستجابة السريع QR</span>
        
        <div className="flex-1 flex items-center justify-center my-1.5">
          <a 
            href={`?busId=${bus.id}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="cursor-pointer hover:scale-105 transition-transform duration-200 block active:scale-95 z-10"
            title="انقر لعرض تفاصيل الحافلة الفورية للرمز"
          >
            {!imgError ? (
              <img 
                src={qrUrl} 
                alt="Bus QR Code" 
                className="w-24 h-24 object-contain bg-white p-1 rounded-lg border border-slate-200"
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 bg-white p-2 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full opacity-60">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`rounded-sm ${(i * 7 + 3) % 5 === 0 || i % 3 === 0 ? 'bg-slate-800' : 'bg-transparent'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </a>
        </div>
        
        <span className="text-[9px] font-bold text-slate-600 font-mono tracking-widest text-center w-full block">{bus.operatorNumber}</span>
      </div>
    </div>
  );
};
