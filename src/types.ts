/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Bus {
  id: string; // Document ID / Unique ID
  operatorNumber: string; // رقم التشغيل
  plateNumber: string; // رقم اللوحة
  driverName: string; // اسم السائق
  manufacturingYear: string; // سنة الصنع
  status?: 'ALLOWED' | 'FORBIDDEN'; // حالة المرور: مسموح / مرفوض
  createdAt: string; // ISO String
}

export interface Movement {
  id: string;
  busId: string;
  operatorNumber: string;
  plateNumber: string;
  type: 'IN' | 'OUT'; // دخول / خروج
  period: 'AM' | 'PM'; // صباحي / مسائي
  timestamp: string; // ISO String
  guardId: string; // اسم المستخدم للحارس
  guardName: string; // اسم الحارس الكامل
}

export interface Guard {
  username: string; // ID - اسم المستخدم للحارس
  name: string; // الاسم الكامل للحرس
  password: string; // كلمة المرور
  createdAt: string; // ISO String
}

export interface Monitor {
  uid: string; // Dynamic Google login uid
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface AppSettings {
  companyName: string;
  appTitle: string;
  companyLogo: string; // Base64 or customized SVG selector
  updatedAt: string;
}

export interface UserSession {
  role: 'DIRECTOR' | 'MONITOR' | 'GUARD' | null;
  uid?: string;
  username?: string; // For guards
  name: string;
  email?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'; // For monitors
}
