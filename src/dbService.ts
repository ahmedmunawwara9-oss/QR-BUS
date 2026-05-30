/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, IS_FIREBASE_ACTIVE, handleFirestoreError, OperationType } from './firebase';
import { Bus, Movement, Guard, Monitor, AppSettings } from './types';

// Default logo (SVG format)
const DEFAULT_LOGO_SVG = `
<svg width="240" height="100" viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Bus shadow -->
  <ellipse cx="120" cy="85" rx="100" ry="6" fill="#cbd5e1" opacity="0.6"/>
  
  <!-- Bus Hauptkörper (Main Chassis Body) -->
  <!-- Modern aerodynamic coach shape with sloped front glass -->
  <path d="M20 74H215C216.5 74 218 73.5 219 72.5L226 65C228 63 229 60 229 57.5V36C229 27.5 221.5 21 213 21H31C24.5 21 21.5 25 18 30L12 39.5C11 41 11 43 11 45.5L11 59.5C11 63 11.5 66 12 68L14.5 72.5C15.5 73.5 17.5 74 20 74Z" fill="#0066A2"/>
  
  <!-- Lower body protective accent panels -->
  <path d="M12 59.5H229V71.5C229 72 227.5 74 215 74H20C17.5 74 15.5 73.5 14.5 72.5L12 59.5Z" fill="#004D7A"/>
  
  <!-- Wheels wells and tires -->
  <!-- Wheel Row Back -->
  <circle cx="50" cy="76" r="14" fill="#1e293b"/>
  <circle cx="50" cy="76" r="9" fill="#94a3b8"/>
  <circle cx="50" cy="76" r="4" fill="#f1f5f9"/>
  <!-- Wheel Row Back 2 (Tandem axle) -->
  <circle cx="78" cy="76" r="14" fill="#1e293b"/>
  <circle cx="78" cy="76" r="9" fill="#94a3b8"/>
  <circle cx="78" cy="76" r="4" fill="#f1f5f9"/>
  <!-- Wheel Row Front -->
  <circle cx="185" cy="76" r="14" fill="#1e293b"/>
  <circle cx="185" cy="76" r="9" fill="#94a3b8"/>
  <circle cx="185" cy="76" r="4" fill="#f1f5f9"/>
  
  <!-- Decorative dynamic stripe representing speed/luxury -->
  <path d="M11 50Q60 48 100 58T210 52" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <path d="M11 54Q60 52 100 62T210 56" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
  
  <!-- Windows -->
  <!-- Front windshield -->
  <path d="M228 36V48C228 50 220 50 216 50L198 50C194 50 192 48 192 44V26.5C192 23 204.5 24 213 25C221 26 228 31 228 36Z" fill="#0f172a"/>
  <!-- Windshield Reflection -->
  <path d="M220 28.5L196 46H203L225 32C223 30 221.5 29.5 220 28.5Z" fill="#38bdf8" opacity="0.4"/>
  
  <!-- Passenger Side Windows -->
  <!-- Window 1 (Front side) -->
  <path d="M187 26H160V44H187V26Z" fill="#1e293b" rx="2"/>
  <path d="M185 28L162 42V44H165L187 31V28H185Z" fill="#38bdf8" opacity="0.3"/>
  <!-- Window 2 -->
  <path d="M155 26H130V44H155V26Z" fill="#1e293b" rx="2"/>
  <path d="M153 28L132 42V44H135L155 31V28H153Z" fill="#38bdf8" opacity="0.3"/>
  <!-- Window 3 -->
  <path d="M125 26H100V44H125V26Z" fill="#1e293b" rx="2"/>
  <path d="M123 28L102 42V44H105L125 31V28H123Z" fill="#38bdf8" opacity="0.3"/>
  <!-- Window 4 -->
  <path d="M95 26H70V44H95V26Z" fill="#1e293b" rx="2"/>
  <path d="M93 28L72 42V44H75L95 31V28H93Z" fill="#38bdf8" opacity="0.3"/>
  <!-- Window 5 (Back side) -->
  <path d="M65 26C65 26 50 26 42 26.5C36.5 27 34 30 34 35V44H65V26Z" fill="#1e293b" rx="2"/>
  <path d="M63 28L36 43.5V44H41L65 30V28H63Z" fill="#38bdf8" opacity="0.3"/>
  
  <!-- Mirrors -->
  <path d="M226 25C227.5 25 228.5 26.5 228.5 28.5V32" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="227" y="29" width="3" height="7" rx="1.5" fill="#1e293b"/>
  
  <!-- Front Headlight and Rear Tail-light -->
  <path d="M228 58L229.5 59.5V64.5L227.5 65.5C225.5 65.5 224 64 224 62V60C224 59 225.5 58 228 58Z" fill="#fef08a"/>
  <path d="M11 60H13V68H11V60Z" fill="#ef4444"/>
  
  <!-- Co-branding Typography on the Bus Body clearly readable in Arabic -->
  <rect x="94" y="47.5" width="86" height="12" rx="4" fill="#004D7A" opacity="0.9"/>
  <text x="137" y="56" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" text-anchor="middle" direction="rtl">شركة درة المنورة</text>
  
  <!-- Top Roof AC Unit -->
  <path d="M90 21H145L140 18H95L90 21Z" fill="#cbd5e1"/>
  <path d="M95 18H140V21H95V18Z" fill="#e2e8f0"/>
</svg>
`;

const DEFAULT_SETTINGS: AppSettings = {
  companyName: "شركة درة المنورة",
  appTitle: "بوابة حركة الحافلات بمكة المكرمة",
  companyLogo: DEFAULT_LOGO_SVG,
  updatedAt: new Date().toISOString()
};

// Event emitter helper for local mock updates
class LocalEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

const localEmitter = new LocalEmitter();

// Local Storage helpers
const getLocal = (key: string, def: any) => {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : def;
};
const setLocal = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// ==========================================
// 1. Bus Fleet Operations
// ==========================================
export function getBuses(callback: (buses: Bus[]) => void): () => void {
  if (IS_FIREBASE_ACTIVE) {
    const q = query(collection(db, 'buses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const buses: Bus[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        buses.push({
          id: docSnap.id,
          operatorNumber: data.operatorNumber,
          plateNumber: data.plateNumber,
          driverName: data.driverName,
          manufacturingYear: data.manufacturingYear,
          status: data.status || 'ALLOWED',
          createdAt: data.createdAt?.seconds 
            ? new Date(data.createdAt.seconds * 1000).toISOString() 
            : data.createdAt || new Date().toISOString()
        });
      });
      callback(buses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'buses');
    });
  } else {
    // Local fallback
    const trigger = () => {
      const buses = getLocal('db_buses', []);
      callback(buses);
    };
    trigger();
    return localEmitter.on('buses_updated', callback);
  }
}

export async function addBus(bus: Omit<Bus, 'id' | 'createdAt'>): Promise<string> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      const ref = await addDoc(collection(db, 'buses'), {
        ...bus,
        status: bus.status || 'ALLOWED',
        createdAt: new Date().toISOString()
      });
      return ref.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `buses`);
      throw err;
    }
  } else {
    const buses = getLocal('db_buses', []);
    const id = 'BUS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newBus: Bus = {
      ...bus,
      id,
      status: bus.status || 'ALLOWED',
      createdAt: new Date().toISOString()
    };
    buses.unshift(newBus);
    setLocal('db_buses', buses);
    localEmitter.emit('buses_updated', buses);
    return id;
  }
}

export async function addBuses(newBuses: Omit<Bus, 'id' | 'createdAt'>[]): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      for (const bus of newBuses) {
        await addDoc(collection(db, 'buses'), {
          ...bus,
          status: bus.status || 'ALLOWED',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'buses/batch');
      throw err;
    }
  } else {
    const buses = getLocal('db_buses', []);
    newBuses.forEach(bus => {
      const id = 'BUS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      buses.unshift({
        ...bus,
        id,
        status: bus.status || 'ALLOWED',
        createdAt: new Date().toISOString()
      });
    });
    setLocal('db_buses', buses);
    localEmitter.emit('buses_updated', buses);
  }
}

export async function deleteBus(busId: string): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      await deleteDoc(doc(db, 'buses', busId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `buses/${busId}`);
      throw err;
    }
  } else {
    let buses = getLocal('db_buses', []);
    buses = buses.filter((b: Bus) => b.id !== busId);
    setLocal('db_buses', buses);
    localEmitter.emit('buses_updated', buses);
  }
}

export async function updateBusStatus(busId: string, status: 'ALLOWED' | 'FORBIDDEN'): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      await updateDoc(doc(db, 'buses', busId), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `buses/${busId}`);
      throw err;
    }
  } else {
    const buses = getLocal('db_buses', []);
    const bus = buses.find((b: Bus) => b.id === busId);
    if (bus) {
      bus.status = status;
      setLocal('db_buses', buses);
      localEmitter.emit('buses_updated', buses);
    }
  }
}

// ==========================================
// 2. Bus Movement Operations
// ==========================================
export function getMovements(callback: (movements: Movement[]) => void): () => void {
  if (IS_FIREBASE_ACTIVE) {
    const q = query(collection(db, 'movements'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const movements: Movement[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        movements.push({
          id: docSnap.id,
          busId: data.busId,
          operatorNumber: data.operatorNumber,
          plateNumber: data.plateNumber,
          type: data.type,
          period: data.period,
          timestamp: data.timestamp,
          guardId: data.guardId,
          guardName: data.guardName
        });
      });
      callback(movements);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'movements');
    });
  } else {
    const trigger = () => {
      const movements = getLocal('db_movements', []);
      callback(movements);
    };
    trigger();
    return localEmitter.on('movements_updated', callback);
  }
}

export async function addMovement(movement: Omit<Movement, 'id' | 'timestamp'>): Promise<string> {
  const timestamp = new Date().toISOString();
  if (IS_FIREBASE_ACTIVE) {
    try {
      const ref = await addDoc(collection(db, 'movements'), {
        ...movement,
        timestamp
      });
      return ref.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'movements');
      throw err;
    }
  } else {
    const movements = getLocal('db_movements', []);
    const id = 'MOV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newMovement: Movement = {
      ...movement,
      id,
      timestamp
    };
    movements.unshift(newMovement);
    setLocal('db_movements', movements);
    localEmitter.emit('movements_updated', movements);
    return id;
  }
}

// ==========================
// 3. Guards Admin Operations
// ==========================
export function getGuards(callback: (guards: Guard[]) => void): () => void {
  if (IS_FIREBASE_ACTIVE) {
    const q = query(collection(db, 'guards'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const guards: Guard[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        guards.push({
          username: docSnap.id,
          name: data.name,
          password: data.password,
          createdAt: data.createdAt
        });
      });
      callback(guards);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guards');
    });
  } else {
    const trigger = () => {
      const guards = getLocal('db_guards', []);
      callback(guards);
    };
    trigger();
    return localEmitter.on('guards_updated', callback);
  }
}

export async function getGuardByUsername(username: string): Promise<Guard | null> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      const docSnap = await getDoc(doc(db, 'guards', username));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          username: docSnap.id,
          name: data.name,
          password: data.password,
          createdAt: data.createdAt
        };
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `guards/${username}`);
      return null;
    }
  } else {
    const guards = getLocal('db_guards', []);
    return guards.find((g: Guard) => g.username.toLowerCase() === username.toLowerCase()) || null;
  }
}

export async function saveGuard(guard: Guard): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      await setDoc(doc(db, 'guards', guard.username), {
        name: guard.name,
        password: guard.password,
        createdAt: guard.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `guards/${guard.username}`);
      throw err;
    }
  } else {
    const guards = getLocal('db_guards', []);
    const existingIdx = guards.findIndex((g: Guard) => g.username === guard.username);
    if (existingIdx > -1) {
      guards[existingIdx] = guard;
    } else {
      guards.unshift(guard);
    }
    setLocal('db_guards', guards);
    localEmitter.emit('guards_updated', guards);
  }
}

export async function deleteGuard(username: string): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      await deleteDoc(doc(db, 'guards', username));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guards/${username}`);
      throw err;
    }
  } else {
    let guards = getLocal('db_guards', []);
    guards = guards.filter((g: Guard) => g.username !== username);
    setLocal('db_guards', guards);
    localEmitter.emit('guards_updated', guards);
  }
}

// ==========================
// 4. Monitors (General Monitors using Google Auth)
// ==========================
export function getMonitors(callback: (monitors: Monitor[]) => void): () => void {
  if (IS_FIREBASE_ACTIVE) {
    const q = query(collection(db, 'monitors'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const monitors: Monitor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        monitors.push({
          uid: docSnap.id,
          name: data.name,
          email: data.email,
          status: data.status,
          createdAt: data.createdAt
        });
      });
      callback(monitors);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'monitors');
    });
  } else {
    const trigger = () => {
      const monitors = getLocal('db_monitors', []);
      callback(monitors);
    };
    trigger();
    return localEmitter.on('monitors_updated', callback);
  }
}

export async function addMonitorRequest(monitor: Monitor): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      await setDoc(doc(db, 'monitors', monitor.uid), {
        name: monitor.name,
        email: monitor.email,
        status: monitor.status,
        createdAt: monitor.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `monitors/${monitor.uid}`);
      throw err;
    }
  } else {
    const monitors = getLocal('db_monitors', []);
    if (!monitors.some((m: Monitor) => m.uid === monitor.uid)) {
      monitors.unshift(monitor);
      setLocal('db_monitors', monitors);
      localEmitter.emit('monitors_updated', monitors);
    }
  }
}

export async function updateMonitorStatus(uid: string, status: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<void> {
  if (IS_FIREBASE_ACTIVE) {
    try {
      await updateDoc(doc(db, 'monitors', uid), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `monitors/${uid}`);
      throw err;
    }
  } else {
    const monitors = getLocal('db_monitors', []);
    const monitor = monitors.find((m: Monitor) => m.uid === uid);
    if (monitor) {
      monitor.status = status;
      setLocal('db_monitors', monitors);
      localEmitter.emit('monitors_updated', monitors);
    }
  }
}

// ==========================
// 5. App Settings Configuration
// ==========================
export function getSettings(callback: (settings: AppSettings) => void): () => void {
  if (IS_FIREBASE_ACTIVE) {
    return onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          companyName: data.companyName,
          appTitle: data.appTitle,
          companyLogo: data.companyLogo,
          updatedAt: data.updatedAt
        });
      } else {
        // Bootstrap default settings in DB if absent
        setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS).then(() => {
          callback(DEFAULT_SETTINGS);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
  } else {
    const trigger = () => {
      const settings = getLocal('db_settings', DEFAULT_SETTINGS);
      callback(settings);
    };
    trigger();
    return localEmitter.on('settings_updated', callback);
  }
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  const updatedAt = new Date().toISOString();
  if (IS_FIREBASE_ACTIVE) {
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
      throw err;
    }
  } else {
    const current = getLocal('db_settings', DEFAULT_SETTINGS);
    const updated = {
      ...current,
      ...settings,
      updatedAt
    };
    setLocal('db_settings', updated);
    localEmitter.emit('settings_updated', updated);
  }
}
