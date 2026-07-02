export type Role = 'admin' | 'coach' | 'boxer';

export type AttendanceStatus = 'in' | 'out' | 'late' | 'absent';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  photoURL?: string;
}

export interface Boxer {
  id: string; // Firestore doc id === Firebase Auth uid
  name: string;
  regNo: string;
  age: number;
  gender: string;
  weightClass: string;
  phone: string;
  emergencyContact: string;
  joined: string; // ISO date
  coachId: string;
  status: AttendanceStatus;
  checkInTime: string | null; // "HH:MM"
  checkOutTime: string | null;
  streak: number;
  attendancePct: number;
  goal: string;
  medicalNotes: string;
  achievements: string[];
}

export interface AttendanceLog {
  id: string;
  boxerId: string;
  boxerName: string;
  date: string; // ISO date
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  goal: string;
  coachNotes?: string;
  createdAt: number; // epoch ms
}

export type NotificationType = 'General' | 'Training' | 'Tournament' | 'Emergency' | 'Reminder';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  createdAt: number;
  createdBy: string;
}

export interface Tournament {
  id: string;
  name: string;
  venue: string;
  date: string; // ISO date
  time: string;
  weightClasses: string[];
  selectedBoxerIds: string[];
  confirmedBoxerIds: string[];
  notes?: string;
}
