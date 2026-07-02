import { addDoc, collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceStatus, NotificationPriority, NotificationType } from '@/lib/types';

function nowTime() {
  return new Date().toTimeString().slice(0, 5); // "HH:MM"
}
function today() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

const CHECK_IN_OPEN = '17:00';
const CHECK_IN_CLOSE = '18:00';

export function canCheckIn(): boolean {
  const now = nowTime();
  return now >= CHECK_IN_OPEN && now < CHECK_IN_CLOSE;
}

export function checkInStatus(): { allowed: boolean; message: string } {
  const now = nowTime();
  if (now < CHECK_IN_OPEN) {
    return { allowed: false, message: `Check-in opens at ${CHECK_IN_OPEN}.` };
  }
  if (now >= CHECK_IN_CLOSE) {
    return { allowed: false, message: `Check-in closed at ${CHECK_IN_CLOSE}.` };
  }
  return { allowed: true, message: '' };
}

/** Boxer checks in. Updates their live status AND writes a permanent log row. */
export async function checkIn(boxerId: string, boxerName: string, goal: string) {
  const status = checkInStatus();
  if (!status.allowed) {
    throw new Error(status.message);
  }
  const time = nowTime();
  await updateDoc(doc(db, 'boxers', boxerId), {
    status: 'in',
    checkInTime: time,
    checkOutTime: null,
    goal,
  });
  await addDoc(collection(db, 'attendanceLogs'), {
    boxerId,
    boxerName,
    date: today(),
    checkInTime: time,
    checkOutTime: null,
    status: 'in',
    goal,
    createdAt: Date.now(),
  });
}

/** Boxer checks out. Updates the same day's log with the checkout time. */
export async function checkOut(boxerId: string) {
  const time = nowTime();
  await updateDoc(doc(db, 'boxers', boxerId), {
    status: 'out',
    checkOutTime: time,
  });
  await addDoc(collection(db, 'attendanceLogs'), {
    boxerId,
    date: today(),
    checkOutTime: time,
    status: 'out',
    createdAt: Date.now(),
  });
}

/** Boxer saves today's training goal without checking in. */
export async function saveGoal(boxerId: string, goal: string) {
  await updateDoc(doc(db, 'boxers', boxerId), { goal });
}

/** Coach manually corrects a boxer's status (edit/approve attendance). */
export async function setBoxerStatus(boxerId: string, status: AttendanceStatus, coachNotes?: string) {
  await updateDoc(doc(db, 'boxers', boxerId), {
    status,
    ...(coachNotes ? { coachNotes } : {}),
  });
}

/** Coach sends a broadcast notification to all boxers. */
export async function sendNotification(params: {
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  createdBy: string;
}) {
  await addDoc(collection(db, 'notifications'), {
    ...params,
    createdAt: Date.now(),
  });
}

/** Boxer confirms attendance for an upcoming tournament. */
export async function confirmTournament(tournamentId: string, boxerId: string) {
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    confirmedBoxerIds: arrayUnion(boxerId),
  });
}
