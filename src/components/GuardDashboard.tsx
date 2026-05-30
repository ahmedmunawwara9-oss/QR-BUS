/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  LogOut, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Search, 
  Check, 
  AlertCircle, 
  History,
  QrCode,
  CheckCircle2,
  Camera,
  X,
  Sparkles,
  ChevronDown,
  Monitor as MonitorIcon,
  RotateCw
} from 'lucide-react';
import { Bus, Movement, UserSession } from '../types';
import { LogoRenderer } from './LogoRenderer';

interface GuardDashboardProps {
  buses: Bus[];
  movements: Movement[];
  onAddMovement: (movement: Omit<Movement, 'id' | 'timestamp'>) => Promise<string>;
  user: UserSession;
  onLogout: () => void;
  logoSvg: string;
  companyName: string;
  appTitle: string;
}

export const GuardDashboard: React.FC<GuardDashboardProps> = ({
  buses,
  movements,
  onAddMovement,
  user,
  onLogout,
  logoSvg,
  companyName,
  appTitle
}) => {
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [manualOpNum, setManualOpNum] = useState('');
  const [movementMessage, setMovementMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // States for interactive QR code simulation scanner modal
  const [scanner, setScanner] = useState<{ isOpen: boolean; type: 'IN' | 'OUT'; searchQuery: string }>({
    isOpen: false,
    type: 'IN',
    searchQuery: ''
  });
  const [scanSuccessFeedback, setScanSuccessFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live clock ticks
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatDigit = (num: number) => num.toString().padStart(2, '0');
      setCurrentTime(`${formatDigit(now.getHours())}:${formatDigit(now.getMinutes())}:${formatDigit(now.getSeconds())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync Shift period (AM/PM) based on local time hour
  useEffect(() => {
    const hours = new Date().getHours();
    setPeriod(hours < 12 ? 'AM' : 'PM');
  }, []);

  // We define the actual barcode scanning callbacks here so they are stable
  const playWarningBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context alert buzzer error:", e);
    }
  };

  const handleActualScannedBus = async (bus: Bus) => {
    if (bus.status === 'FORBIDDEN') {
      playWarningBeep();
      setCameraError(`🛑 غير مسموح بالعبور! الحافلة رقم (${bus.operatorNumber}) ممنوعة ومرفوضة حالياً.`);
      setMovementMessage({
        text: `🛑 عذراً! الحافلة ذات رقم التشغيل (${bus.operatorNumber}) غير مسموح لها بالعبور ومرفوضة حالياً من العبور والمغادرة بموجب توجيهات الإدارة.`,
        type: 'error'
      });
      return;
    }
    
    setScanSuccessFeedback(bus.operatorNumber);
    
    // Play a friendly scan beep sound via Web Audio API dynamically
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.12);
      }
    } catch (e) {
      console.warn("Audio Context beep error:", e);
    }

    try {
      await onAddMovement({
        busId: bus.id,
        operatorNumber: bus.operatorNumber,
        plateNumber: bus.plateNumber,
        type: scanner.type,
        period: period,
        guardId: user.username || 'guard_demo',
        guardName: user.name
      });

      setMovementMessage({ 
        text: `تم مسح الرمز QR بنجاح عبر الكاميرا! تم تسجيل حركة (${scanner.type === 'IN' ? 'دخول' : 'خروج'}) للحافلة رقم (${bus.operatorNumber}).`, 
        type: 'success' 
      });

      // Show scanned confirmation state then dismiss automatically
      setTimeout(() => {
        handleCloseScanner();
      }, 1500);
    } catch (err) {
      console.error(err);
      setScanSuccessFeedback(null);
      alert('حدث خطأ أثناء تسجيل حركة الحافلة الممسوحة.');
    }
  };

  const handleActualScannedUnknownBus = async (operatorNum: string) => {
    setScanSuccessFeedback(operatorNum);
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {}

    try {
      await onAddMovement({
        busId: `SCAN-UNKNOWN-${Date.now()}`,
        operatorNumber: operatorNum,
        plateNumber: `لوحة مؤقتة (${operatorNum})`,
        type: scanner.type,
        period: period,
        guardId: user.username || 'guard_demo',
        guardName: user.name
      });

      setMovementMessage({ 
        text: `تم مسح رمز QR بنجاح للحافلة رقم (${operatorNum}). لم تكن مسجلة بالأسطول وتم تسجيل حركتها حارس البوابة مؤقتاً.`, 
        type: 'success' 
      });

      setTimeout(() => {
        handleCloseScanner();
      }, 1500);
    } catch (err) {
      console.error(err);
      setScanSuccessFeedback(null);
      alert('حدث خطأ أثناء تسجيل حركة الحافلة.');
    }
  };

  // Web camera feed activation controller
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    if (scanner.isOpen) {
      const getMedia = async () => {
        try {
          // Attempt accessing the back camera first
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          }).catch(async (err) => {
            console.warn("Could not load rear camera, trying default video source", err);
            return await navigator.mediaDevices.getUserMedia({ video: true });
          });
          
          activeStream = mediaStream;
          setStream(mediaStream);
          setCameraError(null);
        } catch (err: any) {
          console.error("Camera connection error:", err);
          setCameraError("تنبيه الحارس: لم نتمكن من الوصول لكاميرا الجهاز أو لم تمنح إذناً الكاميرا. يمكنك اختيار حافلة يدوياً من القائمة.");
        }
      };
      getMedia();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setCameraError(null);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanner.isOpen]);

  // Video element pipeline connector
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Real-time canvas scanner interval processing loop using jsQR
  useEffect(() => {
    let animationFrameId: number;
    let isScanning = true;

    if (stream && videoRef.current && scanner.isOpen && !scanSuccessFeedback) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scanFrame = () => {
        if (!isScanning) return;

        const video = videoRef.current;
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            try {
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data) {
                console.log("QR scanned successfully:", code.data);
                
                // Decode QR payload
                // Expected format: DURRAT-BUS:${bus.id}:${bus.operatorNumber}:${bus.plateNumber}
                let qrOperatorNumber = '';
                if (code.data.startsWith('DURRAT-BUS:')) {
                  const parts = code.data.split(':');
                  qrOperatorNumber = parts[2]; // Index 2 is operatorNumber
                } else {
                  // Fallback: raw formatted content
                  qrOperatorNumber = code.data.trim();
                }

                if (qrOperatorNumber) {
                  const bus = buses.find(b => b.operatorNumber === qrOperatorNumber);
                  if (bus) {
                    if (bus.status === 'FORBIDDEN') {
                      playWarningBeep();
                      setCameraError(`🛑 غير مسموح بالعبور! الحافلة رقم (${bus.operatorNumber}) ممنوعة ومرفوضة حالياً.`);
                      setMovementMessage({
                        text: `🛑 عذراً! الحافلة ذات رقم التشغيل (${bus.operatorNumber}) غير مسموح لها بالعبور ومرفوضة حالياً من العبور والمغادرة بموجب توجيهات الإدارة.`,
                        type: 'error'
                      });
                    } else {
                      isScanning = false;
                      handleActualScannedBus(bus);
                      return;
                    }
                  } else {
                    isScanning = false;
                    handleActualScannedUnknownBus(qrOperatorNumber);
                    return;
                  }
                }
              }
            } catch (err) {
              console.warn("jsQR frame analytics failed:", err);
            }
          }
        }

        if (isScanning) {
          animationFrameId = requestAnimationFrame(scanFrame);
        }
      };

      // Slight buffer startup of half second to let webcam frames load
      const timeoutId = setTimeout(() => {
        scanFrame();
      }, 600);

      return () => {
        isScanning = false;
        cancelAnimationFrame(animationFrameId);
        clearTimeout(timeoutId);
      };
    }
  }, [stream, scanner.isOpen, scanSuccessFeedback, buses]);

  // Filter buses inside the QR scanner autocomplete list
  const filteredBusesForScanner = buses.filter(bus => 
    bus.operatorNumber.includes(scanner.searchQuery) || 
    bus.plateNumber.includes(scanner.searchQuery)
  );

  // Clear success notification after 5 seconds
  useEffect(() => {
    if (movementMessage) {
      const timer = setTimeout(() => {
        setMovementMessage(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [movementMessage]);

  const handleRegisterManual = async (type: 'IN' | 'OUT') => {
    setMovementMessage(null);
    const opNumClean = manualOpNum.trim();
    if (!opNumClean) {
      setMovementMessage({ text: 'تنبيه: يرجى كتابة رقم التشغيل الفعلي للحافلة أولاً.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    // Auto lookup bus in fleet lists to enrich or fallback nicely
    const matchedBus = buses.find(b => b.operatorNumber === opNumClean);
    
    // Check if the bus is forbidden
    if (matchedBus && matchedBus.status === 'FORBIDDEN') {
      playWarningBeep();
      setMovementMessage({ 
        text: `🛑 عذراً! هذه الحافلة رقم (${opNumClean}) غير مسموح لها بالعبور وموقوفة من قبل الإدارة! لا يمكن تسجيل حركة مغادرة أو دخول لها.`, 
        type: 'error' 
      });
      setIsSubmitting(false);
      return;
    }

    const finalPlate = matchedBus ? matchedBus.plateNumber : `لوحة مؤقتة (${opNumClean})`;
    const finalBusId = matchedBus ? matchedBus.id : `MANUAL-${Date.now()}`;

    try {
      await onAddMovement({
        busId: finalBusId,
        operatorNumber: opNumClean,
        plateNumber: finalPlate,
        type: type,
        period: period,
        guardId: user.username || 'guard_demo',
        guardName: user.name
      });

      setMovementMessage({ 
        text: `تم بنجاح تسجيل حركة (${type === 'IN' ? 'دخول' : 'خروج'}) للحافلة ذات الرقم التشغيلي (${opNumClean}) يدوياً.`, 
        type: 'success' 
      });
      setManualOpNum('');
    } catch (err) {
      console.error(err);
      setMovementMessage({ text: 'فشل تسجيل الحركة. يرجى مراجعة حالة الخادم والمحاولة مجدداً.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenScanner = (type: 'IN' | 'OUT') => {
    setScanner({ isOpen: true, type, searchQuery: '' });
    setScanSuccessFeedback(null);
  };

  const handleCloseScanner = () => {
    setScanner({ isOpen: false, type: 'IN', searchQuery: '' });
    setScanSuccessFeedback(null);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraError(null);
  };

  const handleSimulateScan = async (bus: Bus) => {
    if (bus.status === 'FORBIDDEN') {
      playWarningBeep();
      setCameraError(`🛑 غير مسموح بالعبور! الحافلة رقم (${bus.operatorNumber}) ممنوعة ومرفوضة حالياً.`);
      setMovementMessage({
        text: `🛑 عذراً! الحافلة ذات رقم التشغيل (${bus.operatorNumber}) غير مسموح لها بالعبور ومرفوضة حالياً من العبور والمغادرة بموجب توجيهات الإدارة.`,
        type: 'error'
      });
      return;
    }
    setScanSuccessFeedback(bus.operatorNumber);
    try {
      await onAddMovement({
        busId: bus.id,
        operatorNumber: bus.operatorNumber,
        plateNumber: bus.plateNumber,
        type: scanner.type,
        period: period,
        guardId: user.username || 'guard_demo',
        guardName: user.name
      });

      setMovementMessage({ 
        text: `تم محاكاة مسح QR بنجاح! تم تسجيل حركة (${scanner.type === 'IN' ? 'دخول' : 'خروج'}) للحافلة (${bus.operatorNumber}).`, 
        type: 'success' 
      });

      // Show scanned confirmation state then dismiss automatically
      setTimeout(() => {
        handleCloseScanner();
      }, 1300);
    } catch (err) {
      console.error(err);
      setScanSuccessFeedback(null);
      alert('حدث خطأ أثناء الاتصال بالخادم المركزي لتسجيل الرمز.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans relative overflow-x-hidden pb-10" style={{ direction: 'rtl' }}>
      
      {/* Dynamic Native Keyframe CSS Animations */}
      <style>{`
        @keyframes scannerLaser {
          0% { top: 0%; opacity: 0.2; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.2; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-scanner-laser {
          animation: scannerLaser 2.4s infinite linear;
        }
        .animate-slide-up {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
      
      {/* 1. Header Bar: Deep Blue Accent to precisely match the shared mockup image */}
      <header className="w-full bg-[#0B1E43] text-white py-3.5 px-4 sm:px-6 shadow-md border-b-2 border-amber-500 z-10 select-none">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          
          {/* Left Side: Logout control, Guard Name, and Connected Live status indicator */}
          <div className="flex items-center gap-3">
            {/* Logout styled action button with bright orange block as shown in the mockup */}
            <button
              onClick={onLogout}
              className="w-10 h-10 bg-[#FF6A13] hover:bg-[#E05307] text-white rounded-xl shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5 -scale-x-100" />
            </button>

            {/* Guard identification */}
            <div className="text-right">
              <span className="text-[10px] text-slate-350 block opacity-70 leading-none">الحارس المناوب</span>
              <span className="text-sm font-extrabold text-white mt-0.5 block">{user.name || 'أحمد'}</span>
            </div>

            {/* Connected Badge showing the live dynamic ticking clock */}
            <div className="bg-[#052F28] border border-[#0F5A4D] rounded-xl px-2.5 py-1 text-center min-w-[85px] shadow-inner flex flex-col justify-center">
              <span className="text-[8px] text-emerald-400 font-bold block leading-none flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                متصل
              </span>
              <span className="text-[10px] font-mono font-bold text-white block mt-0.5 tracking-wider">
                {currentTime || '11:51:48'}
              </span>
            </div>
          </div>

          {/* Right Side: Gateway branding metadata and orange logo */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight">
                {companyName || 'شركة درة المنورة للنقل'}
              </h1>
              <span className="text-[9px] sm:text-[10px] text-amber-400 font-extrabold block mt-0.5 leading-none">
                بوابة العكيشية - مكة المكرمة
              </span>
            </div>
            
            {/* Round brand logo frame in high contrast orange with white border highlights */}
            <div className="w-16 h-10 sm:w-20 sm:h-11 bg-[#F97316] rounded-2xl flex items-center justify-center p-1.5 shadow-inner border border-[#FF8F3D] flex-shrink-0 relative">
              {logoSvg ? (
                <LogoRenderer logo={logoSvg} className="w-14 h-7 text-white" />
              ) : (
                <span className="text-[11px] font-black text-white select-none">درة</span>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Repeating Diagonal Watermark background to match official gateway printed layout */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] select-none z-0">
        <div className="absolute inset-0 flex flex-wrap gap-x-28 gap-y-20 justify-around items-center p-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center -rotate-12 translate-y-3 select-none">
              <span className="text-xs font-black tracking-widest text-[#0B1E43]">شركة درة المنورة للنقل</span>
              <span className="text-[9px] font-bold tracking-wider mt-1">بوابة درة المنورة للنقل</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Container tailored for comfortable single-column handheld display layout */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 z-10 flex flex-col gap-4">

        {/* Global Feedback notification area */}
        {movementMessage && (
          <div className={`p-4 rounded-2xl border-2 shadow-sm flex items-start gap-3 text-xs font-bold leading-normal animate-slide-up ${
            movementMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
              : 'bg-rose-50 border-rose-250 text-rose-800'
          }`}>
            {movementMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span>{movementMessage.text}</span>
            </div>
          </div>
        )}

        {/* 2. Top Banner welcoming information card */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE]/70 rounded-3xl p-5 shadow-sm text-center flex flex-col items-center justify-center gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-40 pointer-events-none" />
          
          {/* Neon Flash bolt icon matching design mockup visually */}
          <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200">
            <span className="text-lg font-black select-none">⚡</span>
          </div>
          
          <h2 className="text-sm sm:text-base font-black text-[#0B1E43]">البوابة الأمنية الرقمية</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium max-w-sm leading-relaxed">
            توجيه وضبط الحركات والزيارات اليومية لأسطول درة المنورة
          </p>
        </div>

        {/* 3. Inward Registration QR Button Card */}
        <button
          onClick={() => handleOpenScanner('IN')}
          className="w-full bg-[#EFF6FF] hover:bg-[#E0F2FE] border border-[#BFDBFE] rounded-3xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
        >
          {/* Subtle blue aesthetic circles */}
          <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-blue-100 rounded-full pointer-events-none transition-transform group-hover:scale-150 opacity-40" />
          
          {/* Download styled icon indicator inside thick ring */}
          <div className="w-12 h-12 bg-[#DBEAFE] text-[#1D4ED8] rounded-full flex items-center justify-center border-4 border-white shadow-md ring-4 ring-blue-100 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-6 h-6 stroke-[3]" />
          </div>

          <div className="text-center">
            <h3 className="text-sm font-black text-[#0B1E43]">تسجيل دخول حافلة</h3>
            <span className="text-[10px] text-blue-600 font-extrabold block mt-1 tracking-wide flex items-center justify-center gap-1">
              <Camera className="w-3.5 h-3.5 animate-pulse" />
              افتح الكاميرا لمسح رمز QR
            </span>
          </div>
        </button>

        {/* 4. Outward Registration QR Button Card */}
        <button
          onClick={() => handleOpenScanner('OUT')}
          className="w-full bg-[#EFF6FF] hover:bg-[#E0F2FE] border border-[#BFDBFE] rounded-3xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
        >
          {/* Subtle orange aesthetic circles */}
          <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-orange-100 rounded-full pointer-events-none transition-transform group-hover:scale-150 opacity-40" />
          
          {/* Upload styled icon indicator inside thick orange ring */}
          <div className="w-12 h-12 bg-[#FFEDD5] text-[#EA580C] rounded-full flex items-center justify-center border-4 border-white shadow-md ring-4 ring-orange-100 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-6 h-6 stroke-[3]" />
          </div>

          <div className="text-center">
            <h3 className="text-sm font-black text-[#0B1E43]">تسجيل خروج حافلة</h3>
            <span className="text-[10px] text-orange-600 font-extrabold block mt-1 tracking-wide flex items-center justify-center gap-1">
              <Camera className="w-3.5 h-3.5 animate-pulse" />
              افتح الكاميرا لمسح رمز QR
            </span>
          </div>
        </button>

        {/* 5. Direct Manual Input back-up system panel */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-3xl p-5 shadow-md space-y-4">
          <div className="text-center">
            <span className="text-xs font-black text-slate-700">لوحة الإدخال اليدوي المباشر كبديل</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="... رقم التشغيل للحافلة يدوياً"
              value={manualOpNum}
              onChange={(e) => {
                setManualOpNum(e.target.value);
                setMovementMessage(null);
              }}
              className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 rounded-2xl text-xs font-extrabold text-center tracking-wider outline-none transition-all placeholder:text-slate-400 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Register entry hand-keying button (orange style) */}
            <button
              onClick={() => handleRegisterManual('OUT')}
              disabled={isSubmitting}
              className="py-3 px-4 bg-[#FFEDD5] hover:bg-[#FED7AA] disabled:opacity-50 text-[#C2410C] rounded-2xl text-xs font-black text-center transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1"
            >
              <span>تسجيل خروج يدوياً</span>
            </button>
            
            {/* Register exit hand-keying button (blue style) */}
            <button
              onClick={() => handleRegisterManual('IN')}
              disabled={isSubmitting}
              className="py-3 px-4 bg-[#DBEAFE] hover:bg-[#BFDBFE] disabled:opacity-50 text-[#1E40AF] rounded-2xl text-xs font-black text-center transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1"
            >
              <span>تسجيل دخول يدوياً</span>
            </button>
          </div>
        </div>



      </main>

      {/* Footer centered credits matching the style precisely */}
      <footer className="w-full text-center mt-auto pt-6 px-4 select-none z-10 space-y-1">
        <h4 className="text-xs font-extrabold text-[#0B1E43]">بوابة درة المنورة الرقمية - العكيشية</h4>
        <p className="text-[9px] text-slate-400 font-semibold">تحديث آني تلقائي ومحمي بموجب الأنظمة الأمنية للأساطيل 2026</p>
      </footer>

      {/* 7. Interactive QR Simulation Scanner Overlay Modal */}
      {scanner.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal header details */}
            <div className="bg-[#0B1E43] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs font-black">قارئ الرمز السريع (QR Code)</h3>
                  <span className="text-[10px] text-slate-200 block">
                    نظام المسح الفوري - {scanner.type === 'IN' ? 'تسجيل دخول' : 'تسجيل خروج'}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleCloseScanner}
                className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Animated camera guide view box finder */}
            <div className="p-5 bg-slate-950 font-sans flex flex-col items-center justify-center relative overflow-hidden h-[280px]">
              
              {/* Live HTML5 web camera feed with absolute framing */}
              {stream && !cameraError && (
                <div className="absolute inset-0 w-full h-full object-cover">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Blur backdrop for neon laser line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-400 opacity-80 shadow-[0_0_15px_#38BDF8] animate-scanner-laser z-10" />
              
              {/* Overlay camera tracking frame targets */}
              <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-sky-400 flex flex-col items-center justify-center p-3 relative bg-slate-900/35 z-15">
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />

                {scanSuccessFeedback ? (
                  <div className="text-center space-y-2 animate-bounce z-20">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" strokeWidth={3} />
                    <span className="text-[11px] font-black text-emerald-400 block tracking-wider">تم المسح! {scanSuccessFeedback}</span>
                  </div>
                ) : (
                  <div className="text-center space-y-3 z-20">
                    {cameraError ? (
                      <div className="text-center px-1">
                        <AlertCircle className="w-6 h-6 text-rose-500 mx-auto animate-bounce mb-1" />
                        <span className="text-[10px] font-bold text-rose-300 block leading-tight max-h-[80px] overflow-hidden">
                          {cameraError}
                        </span>
                        <span className="text-[8px] text-slate-350 block mt-1.5 font-medium">يمكنك اختيار الحافلة من الأسفل كبديل سريع</span>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 text-sky-400 mx-auto animate-pulse" />
                        <span className="text-[10px] font-bold text-sky-300 block">وجه الكاميرا لملصق الحافلة</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* Close footer area */}
            <div className="p-3 bg-white border-t border-slate-100 text-center">
              <button
                onClick={handleCloseScanner}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-bold"
              >
                إغلاق الكاميرا
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
