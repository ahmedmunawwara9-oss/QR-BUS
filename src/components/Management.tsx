/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  Settings, 
  Check, 
  X, 
  ShieldAlert,
  AlertCircle,
  Save,
  Upload
} from 'lucide-react';
import { Guard, Monitor, AppSettings } from '../types';
import { LogoRenderer } from './LogoRenderer';

interface ManagementProps {
  guards: Guard[];
  onSaveGuard: (guard: Guard) => Promise<void>;
  onDeleteGuard: (username: string) => Promise<void>;
  monitors: Monitor[];
  onUpdateMonitorStatus: (uid: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => Promise<void>;
  appSettings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const Management: React.FC<ManagementProps> = ({
  guards,
  onSaveGuard,
  onDeleteGuard,
  monitors,
  onUpdateMonitorStatus,
  appSettings,
  onUpdateSettings
}) => {
  // Guard Form States
  const [guardName, setGuardName] = useState('');
  const [guardUser, setGuardUser] = useState('');
  const [guardPass, setGuardPass] = useState('');
  
  // App Settings States
  const [companyName, setCompanyName] = useState(appSettings.companyName);
  const [appTitle, setAppTitle] = useState(appSettings.appTitle);
  const [logoSvgCode, setLogoSvgCode] = useState(appSettings.companyLogo);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 3 ميغابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoSvgCode(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingGuard, setIsSavingGuard] = useState(false);

  // Handle guard creation
  const handleAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSavingGuard(true);

    const userClean = guardUser.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!guardName.trim() || !userClean || !guardPass.trim()) {
      setMessage({ text: 'يرجى كتابة الاسم الكامل، اسم المستخدم (حروف وأرقام فقط) وكلمة المرور بشكل صحيح.', type: 'error' });
      setIsSavingGuard(false);
      return;
    }

    // Check if guard already exists
    if (guards.some((g) => g.username === userClean)) {
      setMessage({ text: 'عذراً، اسم المستخدم هذا مستخدم مسبقاً لحارس آخر بالبوابة.', type: 'error' });
      setIsSavingGuard(false);
      return;
    }

    try {
      await onSaveGuard({
        name: guardName.trim(),
        username: userClean,
        password: guardPass.trim(),
        createdAt: new Date().toISOString()
      });
      setMessage({ text: `تم إنشاء حساب الحارس الجديد (${guardName.trim()}) بنجاح.`, type: 'success' });
      setGuardName('');
      setGuardUser('');
      setGuardPass('');
    } catch (err) {
      console.error(err);
      setMessage({ text: 'فشل في حفظ حساب الحارس، يرجى مراجعة الخادم.', type: 'error' });
    } finally {
      setIsSavingGuard(false);
    }
  };

  const handleDeleteGuard = async (username: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب الحارس (${name})؟ لن يتمكن من تسجيل الدخول للبوابة.`)) {
      try {
        await onDeleteGuard(username);
        setMessage({ text: `تم حذف حساب الحارس (${name}) بنجاح.`, type: 'success' });
      } catch (err) {
        console.error(err);
        setMessage({ text: 'حدث خطأ في عملية الحذف لقاعدة البيانات.', type: 'error' });
      }
    }
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSavingSettings(true);

    if (!companyName.trim() || !appTitle.trim() || !logoSvgCode.trim()) {
      setMessage({ text: 'يرجى تعبئة كامل الحقول للتسميات الرسمية، والرمز الرسومي SVG.', type: 'error' });
      setIsSavingSettings(false);
      return;
    }

    try {
      await onUpdateSettings({
        companyName: companyName.trim(),
        appTitle: appTitle.trim(),
        companyLogo: logoSvgCode.trim()
      });
      setMessage({ text: 'تم تحديث الهوية البصرية الرسمية والشعار بكفاءة في كامل بيئات النظام.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'حدث خطأ في إرسال قيم التحديثات.', type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleApproval = async (uid: string, name: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await onUpdateMonitorStatus(uid, status);
      const actionText = status === 'APPROVED' ? 'الموافقة على دخول' : 'رفض تفعيل';
      setMessage({ text: `تم بنجاح ${actionText} المراقب العام (${name}) في النظام.`, type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'خطأ: لم تتمكن من تحديث حالة المراقب العام.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">صفحة الإدارة والتحكم المركزي</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          إصدار أذونات الحراس، الموافقة على طلبات المراقبين وتعديل ثيم وشعار درة المنورة الموحد
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs font-bold leading-normal ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Guard Account Operations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-600" />
              إنشاء وتعيين حساب حارس بوابة
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              يقوم المدير بإنشاء اسم مستخدم وكلمة مرور يدويين للحراس على البوابة الرئيسية، ليتمكنوا من تسجيل الدخول دون الحاجة لحساب Google.
            </p>
          </div>

          <form onSubmit={handleAddGuard} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="الاسم الكامل للحارس"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
            />
            <input
              type="text"
              required
              placeholder="اسم المستخدم (بالإنجليزي)"
              value={guardUser}
              onChange={(e) => setGuardUser(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono"
            />
            <input
              type="text"
              required
              placeholder="كلمة مرور الدخول"
              value={guardPass}
              onChange={(e) => setGuardPass(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono"
            />
            <button
              type="submit"
              disabled={isSavingGuard}
              className="w-full py-3 bg-[#0066A2] hover:bg-[#005587] text-xs font-black text-white rounded-full shadow-md transition-all col-span-1 sm:col-span-3 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSavingGuard ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'تفويض وإنشاء حساب الحارس'
              )}
            </button>
          </form>

          {/* List of Guards */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700">حراس البوابة المفوضين حالياً ({guards.length})</h3>
            <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100 text-right text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-bold text-slate-500">اسم الحارس</th>
                    <th className="px-3 py-2 font-bold text-slate-500">اسم المستخدم</th>
                    <th className="px-3 py-2 font-bold text-slate-500">كلمة المرور</th>
                    <th className="px-3 py-2 font-bold text-slate-500 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {guards.length > 0 ? (
                    guards.map((g) => (
                      <tr key={g.username} className="hover:bg-slate-50/40">
                        <td className="px-3 py-2.5 font-bold text-slate-700">{g.name}</td>
                        <td className="px-3 py-2.5 font-mono text-sky-700">{g.username}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">{g.password}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleDeleteGuard(g.username, g.name)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-semibold">
                        لا حراس مفوضين في السجل اليوم.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 2. Brand Customizer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-sky-600" />
              تعديل الهوية الرسمية والشعار
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              يمكنك تخصيص الشعار الرسمي والألوان وأسماء التطبيقات من هنا، ليقترن فوراً في كامل بطاقات QR المطبوعة وحركة الحوافلات.
            </p>
          </div>

          <form onSubmit={handleUpdateBranding} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة الرسمي</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان التطبيق الحركي</label>
              <input
                type="text"
                required
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
              />
            </div>

            {/* Live Preview & Upload Segment */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-24 h-16 bg-white rounded-2xl flex items-center justify-center p-2 border border-slate-150 shadow-sm">
                  <LogoRenderer logo={logoSvgCode} className="w-20 h-12" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">معاينة مباشرة للشعار</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">كيف سيظهر الشعار في كامل واجهات النظام</p>
                </div>
              </div>

              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 text-sky-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  <span>اختر صورة للشعار من جهازك</span>
                </button>
              </div>
            </div>





            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full py-3 bg-[#0066A2] hover:bg-[#005587] text-xs font-black text-white rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSavingSettings ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ وإقرار التعديلات الرسمية</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 3. General Monitors Approval Area (Span both columns) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              الموافقة على طلبات تسجيل المراقب المالي العام
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              عندما يسير المراقب المالي بعملية التسجيل لأول مرة عبر Google، فإنه يعلق كطلب "قيد الانتظار" هنا، ويجب على مدير النظام الموافقة عليه لتمكينه من الدخول لمتابعة السجلات.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100 text-right text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500">اسم المتقدم</th>
                  <th className="px-4 py-3 font-bold text-slate-500">بريد Google الإلكتروني</th>
                  <th className="px-4 py-3 font-bold text-slate-500">حالة التفعيل</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-center">إجراءات المراجعة والموافقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {monitors.length > 0 ? (
                  monitors.map((mon) => (
                    <tr key={mon.uid} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-bold text-slate-800">{mon.name}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">{mon.email}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          mon.status === 'APPROVED' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : mon.status === 'REJECTED' 
                            ? 'bg-rose-50 text-rose-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {mon.status === 'APPROVED' ? 'مفعل ومقبول' : mon.status === 'REJECTED' ? 'مرفوض التفعيل' : 'معلق بانتظار المدير'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center flex items-center justify-center gap-1.5 h-full">
                        {mon.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproval(mon.uid, mon.name, 'APPROVED')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-750 px-2.5 py-1 rounded-lg font-bold border border-emerald-150 transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>موافقة وتفعيل</span>
                          </button>
                        )}
                        {mon.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleApproval(mon.uid, mon.name, 'REJECTED')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-750 px-2.5 py-1 rounded-lg font-bold border border-rose-150 transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض وإيقاف</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-450 font-semibold">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <ShieldAlert className="w-5 h-5 text-slate-350" />
                        <span>لا توجد طلبات تسجيل من مراقبين عامين معلقة حالياً اليوم.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
