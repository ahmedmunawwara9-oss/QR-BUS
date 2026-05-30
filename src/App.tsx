/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getBuses, 
  addBus, 
  addBuses, 
  deleteBus, 
  updateBusStatus,
  getMovements, 
  addMovement, 
  getGuards, 
  saveGuard, 
  deleteGuard, 
  getMonitors, 
  addMonitorRequest, 
  updateMonitorStatus, 
  getSettings, 
  updateSettings,
  getGuardByUsername
} from './dbService';
import { 
  auth, 
  googleProvider, 
  IS_FIREBASE_ACTIVE,
  db
} from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { Bus, Movement, Guard, Monitor, AppSettings, UserSession } from './types';

// Importing modules
import { LogoRenderer } from './components/LogoRenderer';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Statistics } from './components/Statistics';
import { Fleet } from './components/Fleet';
import { Movements } from './components/Movements';
import { QRCodePrint } from './components/QRCodePrint';
import { Management } from './components/Management';
import { GuardDashboard } from './components/GuardDashboard';

// Lucide icons for simulation portal overlays
import { Eye, Shield, Users, Compass, CheckCircle2, AlertTriangle, LogOut, ShieldAlert, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Session details of the active gatekeeper/manager
  const [session, setSession] = useState<UserSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Model Listings
  const [buses, setBuses] = useState<Bus[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    companyName: 'شركة درة المنورة',
    appTitle: 'بوابة حركة الحافلات بمكة المكرمة',
    companyLogo: '',
    updatedAt: ''
  });

  // UI tabs routers
  const [currentTab, setCurrentTab] = useState<string>('stats');
  
  // Pending Approval screen for newly registered Google users
  const [monitorStatus, setMonitorStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [showSimModal, setShowSimModal] = useState(false);

  // Public Bus Emergency View State
  const [publicBusId, setPublicBusId] = useState<string | null>(null);
  const [publicBus, setPublicBus] = useState<Bus | null>(null);
  const [publicBusMovements, setPublicBusMovements] = useState<Movement[]>([]);
  const [loadingPublicBus, setLoadingPublicBus] = useState(false);

  // Load subscriptions to the database lists selectively based on active session permissions
  useEffect(() => {
    // 1. AppSettings subscription - public
    const unsubSettings = getSettings((data) => setSettings(data));

    let unsubBuses: (() => void) | null = null;
    let unsubMovements: (() => void) | null = null;
    let unsubGuards: (() => void) | null = null;
    let unsubMonitors: (() => void) | null = null;

    if (session) {
      // 2. Buses list subscription
      unsubBuses = getBuses((data) => setBuses(data));

      // 3. Movements logs subscription
      unsubMovements = getMovements((data) => setMovements(data));

      // 4. Director specific resources
      if (session.role === 'DIRECTOR') {
        unsubGuards = getGuards((data) => setGuards(data));
        unsubMonitors = getMonitors((data) => setMonitors(data));
      }
    } else {
      // Clean up local lists when logged out
      setBuses([]);
      setMovements([]);
      setGuards([]);
      setMonitors([]);
    }

    return () => {
      unsubSettings();
      if (unsubBuses) unsubBuses();
      if (unsubMovements) unsubMovements();
      if (unsubGuards) unsubGuards();
      if (unsubMonitors) unsubMonitors();
    };
  }, [session]);

  // Monitor Google Authentication State in Realtime Mode
  useEffect(() => {
    if (IS_FIREBASE_ACTIVE) {
      const unsubscribeAuth = onAuthStateChanged(auth, async (srvUser: any) => {
        if (srvUser) {
          const email = srvUser.email || '';
          
          if (email === 'ahmedmunawwara9@gmail.com' || email === 'admin@dr-manawarra.com') {
            // Super Director account
            setSession({
              role: 'DIRECTOR',
              uid: srvUser.uid,
              name: srvUser.displayName || 'أحمد المنورة (المدير)',
              email: email
            });
            setMonitorStatus('APPROVED');
          } else {
            // Check if there is an approved monitor state
            // If the monitor isn't saved yet, save them as PENDING
            let checkMon: Monitor | null = null;
            try {
              const docSnap = await getDoc(doc(db, 'monitors', srvUser.uid));
              if (docSnap.exists()) {
                const data = docSnap.data();
                checkMon = {
                  uid: docSnap.id,
                  email: data.email,
                  name: data.name,
                  status: data.status,
                  createdAt: data.createdAt
                };
              }
            } catch (err) {
              console.error("Error fetching monitor status:", err);
            }
            
            if (!checkMon) {
              const newReq: Monitor = {
                uid: srvUser.uid,
                email: email,
                name: srvUser.displayName || 'مراقب عام غوغل',
                status: 'PENDING',
                createdAt: new Date().toISOString()
              };
              await addMonitorRequest(newReq);
              setMonitorStatus('PENDING');
              setSession({
                role: 'MONITOR',
                uid: srvUser.uid,
                name: newReq.name,
                email: email,
                status: 'PENDING'
              });
            } else {
              setMonitorStatus(checkMon.status);
              setSession({
                role: 'MONITOR',
                uid: srvUser.uid,
                name: checkMon.name,
                email: email,
                status: checkMon.status
              });
            }
          }
        } else {
          // Explicit null/signout
          setSession(null);
          setMonitorStatus(null);
        }
      });
      return unsubscribeAuth;
    } else {
      // Local demo mode restore state
      const savedUser = localStorage.getItem('demo_user_session');
      if (savedUser) {
        setSession(JSON.parse(savedUser));
      }
    }
  }, []);

  // Public Bus Emergency Scan Loader
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const busParam = params.get('busId');
    if (busParam) {
      setPublicBusId(busParam);
      setLoadingPublicBus(true);
      
      const fetchBusData = async () => {
        try {
          let foundBus: Bus | null = null;
          if (IS_FIREBASE_ACTIVE) {
            const docSnap = await getDoc(doc(db, 'buses', busParam));
            if (docSnap.exists()) {
              const data = docSnap.data();
              foundBus = {
                id: docSnap.id,
                operatorNumber: data.operatorNumber,
                plateNumber: data.plateNumber,
                driverName: data.driverName,
                manufacturingYear: data.manufacturingYear,
                createdAt: data.createdAt?.seconds 
                  ? new Date(data.createdAt.seconds * 1000).toISOString() 
                  : data.createdAt || new Date().toISOString()
              };
            }
          } else {
            const localBuses = localStorage.getItem('buses_db');
            if (localBuses) {
              const parsed = JSON.parse(localBuses);
              foundBus = parsed.find((b: any) => b.id === busParam) || null;
            }
          }
          setPublicBus(foundBus);

          // Get movements for this bus to show in the scan screen
          if (IS_FIREBASE_ACTIVE) {
            const { getDocs, query, collection, where, orderBy, limit } = await import('firebase/firestore');
            const q = query(
              collection(db, 'movements'), 
              where('busId', '==', busParam), 
              orderBy('timestamp', 'desc'),
              limit(5)
            );
            const moveSnap = await getDocs(q);
            const list: Movement[] = [];
            moveSnap.forEach(d => {
              const m = d.data();
              list.push({
                id: d.id,
                busId: m.busId,
                operatorNumber: m.operatorNumber,
                plateNumber: m.plateNumber,
                type: m.type,
                period: m.period,
                timestamp: m.timestamp?.seconds 
                  ? new Date(m.timestamp.seconds * 1000).toISOString() 
                  : m.timestamp || new Date().toISOString(),
                guardId: m.guardId,
                guardName: m.guardName
              });
            });
            setPublicBusMovements(list);
          } else {
            const localMoves = localStorage.getItem('movements_db');
            if (localMoves) {
              const parsed = JSON.parse(localMoves);
              const list = parsed
                .filter((m: any) => m.busId === busParam)
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5);
              setPublicBusMovements(list);
            }
          }
        } catch (e) {
          console.error("Error loading public scan data:", e);
        } finally {
          setLoadingPublicBus(false);
        }
      };

      fetchBusData();
    }
  }, []);

  // Google Login handling
  const handleGoogleLogin = async () => {
    if (IS_FIREBASE_ACTIVE) {
      await signInWithPopup(auth, googleProvider);
    } else {
      // Show elegant simulation modal for demonstration in preview mode
      setShowSimModal(true);
    }
  };

  // Guard / local session direct logins
  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('demo_user_session', JSON.stringify(userSession));
  };

  // Perform Logouts
  const handleLogout = async () => {
    if (IS_FIREBASE_ACTIVE) {
      await signOut(auth);
    }
    setSession(null);
    setMonitorStatus(null);
    localStorage.removeItem('demo_user_session');
    setCurrentTab('stats');
  };

  // Google Sign-In Local Simulator callback
  const handleSimulateGoogleLogin = async (simRole: 'DIRECTOR' | 'MONITOR_PENDING' | 'MONITOR_APPROVED') => {
    setShowSimModal(false);
    
    if (simRole === 'DIRECTOR') {
      const directorSess: UserSession = {
        role: 'DIRECTOR',
        uid: 'DIRECTOR-SIM',
        name: 'أحمد المنورة (المدير)',
        email: 'ahmedmunawwara9@gmail.com'
      };
      handleLoginSuccess(directorSess);
    } else if (simRole === 'MONITOR_APPROVED') {
      const monitorSess: UserSession = {
        role: 'MONITOR',
        uid: 'MONITOR-APPROVED-SIM',
        name: 'عصام العتيبي (المراقب المعتمد)',
        email: 'essam_monitor@gmail.com',
        status: 'APPROVED'
      };
      
      // Seed into internal monitors table first so it renders in tables
      const newReq: Monitor = {
        uid: 'MONITOR-APPROVED-SIM',
        email: 'essam_monitor@gmail.com',
        name: 'عصام العتيبي (المراقب المعتمد)',
        status: 'APPROVED',
        createdAt: new Date().toISOString()
      };
      await addMonitorRequest(newReq);
      handleLoginSuccess(monitorSess);
    } else {
      const monitorSess: UserSession = {
        role: 'MONITOR',
        uid: 'MONITOR-PENDING-SIM',
        name: 'سالم الحربي (طلب معلق)',
        email: 'salim_pending@gmail.com',
        status: 'PENDING'
      };
      const newReq: Monitor = {
        uid: 'MONITOR-PENDING-SIM',
        email: 'salim_pending@gmail.com',
        name: 'سالم الحربي (طلب معلق)',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      await addMonitorRequest(newReq);
      setMonitorStatus('PENDING');
      handleLoginSuccess(monitorSess);
    }
  };

  // Handle monitors list status changes
  const handleUpdateMonitor = async (uid: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    await updateMonitorStatus(uid, status);
  };

  // Add a guard account
  const handleAddGuard = async (guard: Guard) => {
    await saveGuard(guard);
  };

  // Delete a guard account
  const handleDeleteGuard = async (username: string) => {
    await deleteGuard(username);
  };

  // Add a bus
  const handleAddBus = async (busData: Omit<Bus, 'id' | 'createdAt'>) => {
    return await addBus(busData);
  };

  // Import batch buses
  const handleAddBusesBatch = async (busesList: Omit<Bus, 'id' | 'createdAt'>[]) => {
    await addBuses(busesList);
  };

  // Delete a bus
  const handleDeleteBus = async (busId: string) => {
    await deleteBus(busId);
  };

  // Update a bus status (Allowed / Forbidden)
  const handleUpdateBusStatus = async (busId: string, status: 'ALLOWED' | 'FORBIDDEN') => {
    await updateBusStatus(busId, status);
  };

  // Add movement transaction
  const handleAddMovement = async (moveData: Omit<Movement, 'id' | 'timestamp'>) => {
    return await addMovement(moveData);
  };

  // Update App Layout options
  const handleUpdateSettings = async (branding: Partial<AppSettings>) => {
    await updateSettings(branding);
  };

  // ------------------------------------------
  // Outer render flow routing
  // ------------------------------------------

  // Interactive Emergency Bus Scan View (No login required)
  if (publicBusId) {
    return (
      <div 
        className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6" 
        style={{ direction: 'rtl' }}
      >
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          {/* Decorative ambient background lights */}
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Header section with brand */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-18 h-10 bg-slate-800 p-1.5 rounded-xl flex items-center justify-center border border-slate-700">
                <LogoRenderer logo={settings.companyLogo} className="w-14 h-7" fallbackText="درة" />
              </div>
              <div className="flex flex-col text-right">
                <h3 className="text-sm font-extrabold text-slate-100">{settings.companyName}</h3>
                <p className="text-[10px] text-sky-400 font-bold">{settings.appTitle}</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-full text-[10px] font-black">
              استعلام طوارئ نشط
            </div>
          </div>

          {loadingPublicBus ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 animate-pulse">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-bold">جاري جلب تفاصيل السجل الأمني...</span>
            </div>
          ) : !publicBus ? (
            <div className="py-10 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-md font-bold text-slate-100">رقم القيد غير متاح أو تم حذفه</h4>
                <p className="text-xs text-slate-400 font-medium">خطأ في التحقق من صحة ترخيص حافلة درة المنورة.</p>
              </div>
              <button
                onClick={() => {
                  setPublicBusId(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                العودة للتطبيق
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bus big card presentation */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 hover:border-slate-750 transition-colors">
                <div className="w-20 h-12 bg-slate-900 border border-slate-850 p-2 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <LogoRenderer logo={settings.companyLogo} className="w-16 h-8" />
                </div>
                
                <div className="flex-1 text-center sm:text-right space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-lg font-black text-white">حافلة رقم #{publicBus.operatorNumber}</span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-black rounded-md w-fit mx-auto sm:mx-0">
                      مرخصة نظامياً
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">تاريخ التسجيل: {new Date(publicBus.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              {/* Precise fields grids */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-1 text-right">
                  <span className="text-[10px] text-slate-500 font-bold block">رقم لوحة الحافلة</span>
                  <span className="text-sm font-black text-slate-200 tracking-wide font-mono bg-slate-900 px-2 py-0.5 border border-slate-850 rounded block w-fit mr-0">{publicBus.plateNumber}</span>
                </div>
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-1 text-right">
                  <span className="text-[10px] text-slate-500 font-bold block">كابتن الحافلة المعتمد</span>
                  <span className="text-sm font-black text-slate-200 block">{publicBus.driverName}</span>
                </div>
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-1 text-right">
                  <span className="text-[10px] text-slate-500 font-bold block">رقم التشغيل الداخلي</span>
                  <span className="text-sm font-black text-sky-450 font-mono block">{publicBus.operatorNumber}</span>
                </div>
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-1 text-right">
                  <span className="text-[10px] text-slate-500 font-bold block">سنة الصنع / الموديل</span>
                  <span className="text-sm font-black text-slate-200 font-mono block">{publicBus.manufacturingYear}</span>
                </div>
              </div>

              {/* Movement logs track sheet */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-300 tracking-wide flex items-center gap-1.5 justify-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  آخر ٥ عمليات رصد وتحركات بالبوابة
                </h4>

                {publicBusMovements.length === 0 ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-850 text-slate-500 text-xs font-semibold text-center rounded-2xl">
                    لا يوجد أي عمليات دخول أو خروج مسجلة لهذه الحافلة بالبوابات الفورية.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {publicBusMovements.map((move) => (
                      <div 
                        key={move.id}
                        className="bg-slate-950/45 p-3 border border-slate-850 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {move.type === 'IN' ? (
                            <span className="w-5.5 h-5.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px]">د</span>
                          ) : (
                            <span className="w-5.5 h-5.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black text-[10px]">خ</span>
                          )}
                          <div className="flex flex-col text-right">
                            <span className="font-extrabold text-slate-200">
                              {move.type === 'IN' ? 'تم الرصد بدخول الشركة' : 'مغادرة البوابة والإنطلاق'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">بواسطة الحارس: {move.guardName}</span>
                          </div>
                        </div>

                        <div className="flex flex-col text-left font-mono text-[10px] text-slate-400 font-semibold">
                          <span>{new Date(move.timestamp).toLocaleDateString('ar-SA')}</span>
                          <span className="text-right text-slate-500 mt-0.5">{new Date(move.timestamp).toLocaleTimeString('ar-SA')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setPublicBusId(null);
                    window.history.pushState({}, '', window.location.pathname);
                  }}
                  className="w-full py-3 bg-gradient-to-l from-slate-850 to-slate-900 hover:from-slate-800 hover:to-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  العودة لتسجيل الدخول / التطبيق الرئيسي
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-[9px] text-slate-500 font-semibold select-none pt-2">
            تم الرصد بأمان عالي عبر البوابات الفورية لشركة درة المنورة بمكة المكرمة
          </div>
        </div>
      </div>
    );
  }

  // A. Not logged in -> Show Login screens
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        <Login
          onLoginSuccess={handleLoginSuccess}
          onGoogleLogin={handleGoogleLogin}
          guardsList={guards}
          logoSvg={settings.companyLogo}
          companyName={settings.companyName}
          onVerifyGuard={getGuardByUsername}
        />

        {/* B. Simulation Selector Dialog Overlay (Displays ONLY when locally running in frame) */}
        {showSimModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-right" style={{ direction: 'rtl' }}>
            <div className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in-50">
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-1.5">
                  <Compass className="w-5 h-5 text-sky-400" />
                  قناة محاكاة الدخول الذكي للويب
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  نظراً لتواجدك في نافذة محاكاة البيئة المسبقة التي لم يتم تهيئتها بعد في حسابات جوجل المباشرة لـ Firebase، يمكنك محاكاة الأدوار المعتمدة بكامل صلاحياتها لتجربة النظام فورياً:
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleSimulateGoogleLogin('DIRECTOR')}
                  className="w-full p-4.5 bg-gradient-to-l from-slate-900 to-slate-850 hover:from-slate-850 hover:to-slate-800 border border-slate-800 hover:border-sky-500/30 rounded-2xl flex items-center gap-3 transition-colors text-right cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-950 flex items-center justify-center text-sky-400 font-bold">
                    أ
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-250 block">حساب المدير العام الرئيسي Super Director</span>
                    <span className="text-[10px] text-sky-400 font-semibold block mt-0.5">بريد: ahmedmunawwara9@gmail.com</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSimulateGoogleLogin('MONITOR_APPROVED')}
                  className="w-full p-4.5 bg-gradient-to-l from-slate-900 to-slate-850 hover:from-slate-850 hover:to-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded-2xl flex items-center gap-3 transition-colors text-right cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-400 font-bold">
                    م
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-250 block">مراقب عام مالي (تم تفعيله من الإدارة)</span>
                    <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">معتمد بالرصد والتدقيق لمؤشرات الحافلات</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSimulateGoogleLogin('MONITOR_PENDING')}
                  className="w-full p-4.5 bg-gradient-to-l from-slate-900 to-slate-850 hover:from-slate-850 hover:to-slate-800 border border-slate-800 hover:border-amber-500/30 rounded-2xl flex items-center gap-3 transition-colors text-right cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-955/20 flex items-center justify-center text-amber-500 font-bold">
                    ق
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-250 block">مراقب مالي جديد (طلب معلق للمراجعة)</span>
                    <span className="text-[10px] text-amber-550 font-semibold block mt-0.5">يجب الدخول بحساب المدير لتفعيله والموافقة عليه</span>
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-900">
                <button
                  onClick={() => setShowSimModal(false)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer text-center"
                >
                  إغلاق نافذة المحاكاة والعودة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // B. Role: GUARD -> Show Security Guard control gate (Direct, simplistic, easy use)
  if (session.role === 'GUARD') {
    return (
      <GuardDashboard
        buses={buses}
        movements={movements}
        onAddMovement={handleAddMovement}
        user={session}
        onLogout={handleLogout}
        logoSvg={settings.companyLogo}
        companyName={settings.companyName}
        appTitle={settings.appTitle}
      />
    );
  }

  // C. Role: MONITOR but status remains PENDING / REJECTED -> Block access and show holding screen
  const isSessMonitor = session.role === 'MONITOR';
  const checkStatus = isSessMonitor ? (monitors.find(m => m.uid === session.uid)?.status || session.status || 'PENDING') : 'APPROVED';

  if (checkStatus === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center" style={{ direction: 'rtl' }}>
        <div className="bg-white border border-slate-150 p-8 rounded-3xl max-w-md w-full shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-550">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-950">شاشتك قيد المراجعة والموافقة</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              مرحباً بك يا <strong>{session.name}</strong> في بوابة حافلات درة المنورة.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              لقد سجلت الدخول بنجاح كمراقب عام جديد ولكن يتطلب الأمر موافقة الاستاذ عبد الحميد سالمة بالموافقة النشطة على حسابك وتفعيله .. شاكرين صبرك
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-450 font-bold">
            يرجى مراجعة إدارة الشركة في مقر البوابة الرئيسي بمكة - العكيشية لتفعيل الأذونات الفورية.
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>الخروج والعودة مجدداً</span>
          </button>
        </div>

        <div className="mt-6 text-[11px] text-slate-400 font-bold text-center select-none max-w-xs animate-fade-in opacity-80 hover:opacity-100 transition-opacity">
          صنع هذا العمل بحب من قبل فريق تشغيل درة المنورة في مكة المكرمة
        </div>
      </div>
    );
  }

  if (checkStatus === 'REJECTED') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center" style={{ direction: 'rtl' }}>
        <div className="bg-white border border-slate-150 p-8 rounded-3xl max-w-md w-full shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-550">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-950">تم رفض تنشيط حسابك بالشركة</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              مرحباً بك يا <strong>{session.name}</strong>.
            </p>
            <p className="text-xs text-rose-650 leading-relaxed font-semibold">
              عذراً لقد قام مدير التشغيل بتوقيف طلب انضمامك الخاص بالمراقبين لا تملك اي ترخيص للدخول للتطبيق
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </button>
        </div>
      </div>
    );
  }

  // D. Approved Managers & General Monitors Portal Workspace Layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-x-hidden" style={{ direction: 'rtl' }}>
      
      {/* Mobile top navigation header bar */}
      <header className="w-full bg-slate-900 text-white flex md:hidden items-center justify-between px-5 py-4 shadow-md z-20 no-print">
        <div className="flex items-center gap-3">
          <div className="w-16 h-9 bg-slate-800 p-1.5 rounded-lg flex items-center justify-center">
            <LogoRenderer logo={settings.companyLogo} className="w-14 h-7" fallbackText="درة" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-100">{settings.companyName}</span>
            <span className="text-[9px] text-sky-400 font-bold">{settings.appTitle}</span>
          </div>
        </div>
        
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 transition-colors cursor-pointer"
          aria-label="تبديل القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile background backdrop overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-25 md:hidden transition-opacity duration-300 pointer-events-auto"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Right Aligned Sidebar on the right */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setIsSidebarOpen(false); // Safeguard auto-close on mobile selection
        }}
        user={session}
        onLogout={handleLogout}
        companyName={settings.companyName}
        appTitle={settings.appTitle}
        logoSvg={settings.companyLogo}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Tab routing container view */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto space-y-6">
        
        {/* Animated container for tab transitions to add unmatched visual craft */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 12, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-6"
          >
            {currentTab === 'stats' && (
              <Statistics 
                buses={buses} 
                movements={movements} 
                logoSvg={settings.companyLogo}
              />
            )}

            {currentTab === 'fleet' && (
              <Fleet
                buses={buses}
                onAddBus={handleAddBus}
                onAddBusesBatch={handleAddBusesBatch}
                onDeleteBus={handleDeleteBus}
                onUpdateBusStatus={handleUpdateBusStatus}
                userRole={session.role}
              />
            )}

            {currentTab === 'movements' && (
              <Movements 
                movements={movements} 
              />
            )}

            {currentTab === 'print-qr' && (
              <QRCodePrint 
                buses={buses} 
                logoSvg={settings.companyLogo} 
              />
            )}

            {currentTab === 'management' && session.role === 'DIRECTOR' && (
              <Management
                guards={guards}
                onSaveGuard={handleAddGuard}
                onDeleteGuard={handleDeleteGuard}
                monitors={monitors}
                onUpdateMonitorStatus={handleUpdateMonitor}
                appSettings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

    </div>
  );
}
