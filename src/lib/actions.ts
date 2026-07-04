import { addDoc, collection, doc, setDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
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
export const AUTO_CHECKOUT_TIME = '19:30';

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

async function upsertBoxer(docRef: any, data: Record<string, any>) {
  try {
    await updateDoc(docRef, data);
  } catch (e: any) {
    if (e?.code === 'not-found') {
      await setDoc(docRef, data);
    } else {
      throw e;
    }
  }
}

/** Boxer checks in. Updates their live status AND writes a permanent log row. */
export async function checkIn(boxerId: string, boxerName: string, goal: string) {
  const status = checkInStatus();
  if (!status.allowed) {
    throw new Error(status.message);
  }
  const time = nowTime();
  await upsertBoxer(doc(db, 'boxers', boxerId), {
    status: 'in' as const,
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
  await upsertBoxer(doc(db, 'boxers', boxerId), {
    status: 'out' as const,
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

/** Auto-checkout a boxer if they are still checked in past 19:20. */
export async function autoCheckoutIfNeeded(boxerId: string, boxerName: string) {
  const now = nowTime();
  if (now < AUTO_CHECKOUT_TIME) return false;
  await upsertBoxer(doc(db, 'boxers', boxerId), {
    status: 'out' as const,
    checkOutTime: now,
  });
  await addDoc(collection(db, 'attendanceLogs'), {
    boxerId,
    boxerName,
    date: today(),
    checkOutTime: now,
    status: 'out',
    createdAt: Date.now(),
  });
  return true;
}

/**
 * Auto-checkout every boxer who is still checked in (called from attendance page).
 * Runs client-side when a coach/admin has the page open past 19:30.
 */
export async function bulkAutoCheckout(boxers: { id: string; name: string }[]) {
  const time = nowTime();
  const date = today();
  for (const b of boxers) {
    await upsertBoxer(doc(db, 'boxers', b.id), {
      status: 'out' as const,
      checkOutTime: time,
    });
    await addDoc(collection(db, 'attendanceLogs'), {
      boxerId: b.id,
      boxerName: b.name,
      date,
      checkOutTime: time,
      status: 'out',
      createdAt: Date.now(),
    });
  }
}

/** Boxer saves today's training goal without checking in. */
export async function saveGoal(boxerId: string, goal: string) {
  await upsertBoxer(doc(db, 'boxers', boxerId), { goal });
}

/** Coach manually corrects a boxer's status (edit/approve attendance). */
export async function setBoxerStatus(boxerId: string, boxerName: string, status: AttendanceStatus, coachNotes?: string) {
  const time = nowTime();
  const updates: Record<string, any> = { status };
  if (status === 'in' || status === 'late') {
    updates.checkInTime = time;
  }
  if (status === 'out') {
    updates.checkOutTime = time;
  }
  if (coachNotes) {
    updates.coachNotes = coachNotes;
  }
  await upsertBoxer(doc(db, 'boxers', boxerId), updates);
  await addDoc(collection(db, 'attendanceLogs'), {
    boxerId,
    boxerName,
    date: today(),
    checkInTime: status === 'in' || status === 'late' ? time : null,
    checkOutTime: status === 'out' ? time : null,
    status,
    goal: '',
    coachNotes: coachNotes || null,
    createdAt: Date.now(),
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

/** Coach creates a new tournament. */
export async function createTournament(data: {
  name: string;
  venue: string;
  date: string;
  time: string;
  weightClasses: string[];
  notes?: string;
}) {
  await addDoc(collection(db, 'tournaments'), {
    ...data,
    selectedBoxerIds: [],
    confirmedBoxerIds: [],
    createdAt: Date.now(),
  });
}

/** Coach deletes a tournament. */
export async function deleteTournament(tournamentId: string) {
  await deleteDoc(doc(db, 'tournaments', tournamentId));
}

/** Coach deletes a notification. */
export async function deleteNotification(notificationId: string) {
  await deleteDoc(doc(db, 'notifications', notificationId));
}

/** Boxer confirms attendance for an upcoming tournament. */
export async function confirmTournament(tournamentId: string, boxerId: string) {
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    confirmedBoxerIds: arrayUnion(boxerId),
  });
}
