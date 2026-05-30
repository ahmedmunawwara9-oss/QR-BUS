/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, KeyRound, CheckCircle2, AlertOctagon } from 'lucide-react';
import { UserSession } from '../types';
import { IS_FIREBASE_ACTIVE } from '../firebase';
import { LogoRenderer } from './LogoRenderer';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
  onGoogleLogin: () => Promise<void>;
  guardsList: { username: string; name: string; password: string }[];
  logoSvg: string;
  companyName: string;
  onVerifyGuard?: (username: string) => Promise<any | null>;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onGoogleLogin,
  guardsList,
  logoSvg,
  companyName,
  onVerifyGuard
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'guard'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGuardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('يرجى كتابة اسم المستخدم وكلمة المرور بالكامل.');
      setIsLoading(false);
      return;
    }

    try {
      let matchedGuard: any = null;
      if (onVerifyGuard) {
        matchedGuard = await onVerifyGuard(username.trim());
      } else {
        matchedGuard = guardsList.find(
          (g) => g.username.toLowerCase() === username.trim().toLowerCase()
        );
      }

      if (matchedGuard && matchedGuard.password === password.trim()) {
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess({
            role: 'GUARD',
            username: matchedGuard.username,
            name: matchedGuard.name
          });
        }, 300);
      } else {
        setTimeout(() => {
          setIsLoading(false);
          setError('خطأ: اسم المستخدم أو كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة.');
        }, 300);
      }
    } catch (err) {
      setIsLoading(false);
      setError('خطأ في التحقق من صحة البيانات.');
    }
  };

  const handleGoogleClick = async () => {
    setError('');
    setIsLoading(true);
    try {
      await onGoogleLogin();
    } catch (err: any) {
      console.error(err);
      setError('فشل تسجيل الدخول عبر Google. قد يكون الخادم في مرحلة التهيئة لمشاريع Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" style={{ direction: 'rtl' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Dynamic Logo placement */}
        <div className="mx-auto w-28 h-18 flex items-center justify-center bg-white p-2 rounded-2xl shadow-md border border-slate-100">
          <LogoRenderer logo={logoSvg} className="w-24 h-14" />
        </div>
        
        <h2 className="mt-6 text-2xl font-extrabold text-slate-900 leading-tight">
          {companyName}
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-semibold">
          بوابة العكيشية - مكة المكرمة لتنظيم خروج ودخول الحافلات
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#EFF6FF] py-8 px-4 shadow-xl border border-[#BFDBFE] sm:rounded-2xl sm:px-10">
          
          {/* Tabs for choosing login portal */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6 border border-slate-200">
            <button
              onClick={() => { setActiveTab('admin'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>الإدارة والمراقب العام</span>
            </button>
            <button
              onClick={() => { setActiveTab('guard'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'guard'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>حارس البوابة</span>
            </button>
          </div>

          {/* Database connection active banner */}
          <div className="mb-4 flex items-center justify-between text-[10px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-semibold">
            <span className="text-slate-400">حالة الربط المركزي:</span>
            {IS_FIREBASE_ACTIVE ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> سحابي (Firebase)
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                قيد التزامن المحلي (مفعل في المعاينة)
              </span>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold flex items-start gap-2">
              <AlertOctagon className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'admin' ? (
            <div className="space-y-6">
              <div className="text-center p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  هذا القسم مخصص للجهة الإشرافية ومالكي القرار بالشركة (المدير والمراقب المعتمد). يتم تسجيل الدخول الفوري عن طريق التحقق السحابي لحسابات Google.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none transition-all cursor-pointer"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-5.007 4.604-2.704 0-4.907-2.242-4.907-5.004 0-2.762 2.203-5.004 4.907-5.004 1.54 0 2.57.635 3.158 1.2l3.415-3.29c-2.193-2.043-5.034-3.264-8.573-3.264-6.627 0-12 5.373-12 12s5.373 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.188-1.939H12.24z"
                  />
                </svg>
                <span>تسجيل الدخول عبر Google</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم للحارس
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: amr_guard"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono tracking-wider text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-left font-mono"
                  style={{ direction: 'ltr' }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-3 border border-transparent rounded-full shadow-lg shadow-sky-500/10 bg-[#0066A2] hover:bg-[#005587] text-sm font-black text-white focus:outline-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <span>تسجيل الدخول كحارس بوابي</span>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
