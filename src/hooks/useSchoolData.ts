import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AnnouncementRecord,
  AttendanceRecord,
  AttendanceReportLink,
  FinanceTransactionRecord,
  MadrasahIdentity,
  NotificationRecord,
  PublicProfile,
  RoleInvite,
  SchoolClass,
  StudentMutationRecord,
  StudentRecord,
  TeacherRecord,
  UserProfile,
} from '../types/school';

function sortByCreatedDesc<T extends { createdAt?: { toMillis?: () => number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
}

export function useMadrasahIdentity() {
  const [madrasahIdentity, setMadrasahIdentity] = useState<MadrasahIdentity | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'madrasahProfile', 'main'),
      (snap) => {
        setMadrasahIdentity(snap.exists() ? (snap.data() as MadrasahIdentity) : null);
        setIdentityLoading(false);
      },
      (err) => {
        console.warn('Madrasah identity listener error:', err);
        setIdentityLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { madrasahIdentity, identityLoading };
}

export function usePublicAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), where('isPublished', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .filter((d) => d.id !== 'ann_mi_sat_2026')
          .map((d) => d.data() as AnnouncementRecord);
        const sorted = sortByCreatedDesc(rows);
        sorted.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
        setAnnouncements(sorted);
        setAnnouncementsLoading(false);
      },
      (err) => {
        console.warn('Public announcements listener error:', err);
        setAnnouncementsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { announcements, announcementsLoading };
}

function sortAttendanceLinks(items: AttendanceReportLink[]): AttendanceReportLink[] {
  return [...items].sort((a, b) => {
    const levelDiff = a.classLevel.localeCompare(b.classLevel, 'id-ID');
    if (levelDiff !== 0) return levelDiff;
    return a.rombel.localeCompare(b.rombel, 'id-ID');
  });
}

export function usePublicAttendanceReportLinks() {
  const [attendanceReportLinks, setAttendanceReportLinks] = useState<AttendanceReportLink[]>([]);
  const [attendanceLinksLoading, setAttendanceLinksLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'attendanceReportLinks'), where('isPublic', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as AttendanceReportLink);
        setAttendanceReportLinks(sortAttendanceLinks(rows));
        setAttendanceLinksLoading(false);
      },
      (err) => {
        console.warn('Public attendance report links listener error:', err);
        setAttendanceLinksLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { attendanceReportLinks, attendanceLinksLoading };
}

export function useSchoolData() {
  const { firebaseUser, profile, authReady } = useAuth();
  const { madrasahIdentity } = useMadrasahIdentity();
  const { attendanceReportLinks } = usePublicAttendanceReportLinks();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [personalNotifs, setPersonalNotifs] = useState<NotificationRecord[]>([]);
  const [broadcastNotifs, setBroadcastNotifs] = useState<NotificationRecord[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<PublicProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [roleInvites, setRoleInvites] = useState<RoleInvite[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [studentMutations, setStudentMutations] = useState<StudentMutationRecord[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestToast, setLatestToast] = useState<NotificationRecord | null>(null);

  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const initialNotifLoadedRef = useRef(false);
  const cleanedLegacyScheduleRef = useRef(false);

  useEffect(() => {
    if (!authReady || !firebaseUser || !profile || profile.role === 'pending') {
      setClasses([]);
      setStudents([]);
      setAttendance([]);
      setAnnouncements([]);
      setPersonalNotifs([]);
      setBroadcastNotifs([]);
      setPublicProfiles([]);
      setAllUsers([]);
      setRoleInvites([]);
      setTeachers([]);
      setStudentMutations([]);
      setFinanceTransactions([]);
      setLoading(false);
      initialNotifLoadedRef.current = false;
      knownNotifIdsRef.current.clear();
      return;
    }

    setLoading(true);
    const uid = firebaseUser.uid;
    const role = profile.role;
    const unsubs: Array<() => void> = [];

    // 1. Classes
    const classesQuery =
      role === 'admin'
        ? collection(db, 'classes')
        : query(collection(db, 'classes'), where('isActive', '==', true));

    unsubs.push(
      onSnapshot(
        classesQuery,
        (snap) => {
          setClasses(snap.docs.map((d) => d.data() as SchoolClass));
          setLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'classes')
      )
    );

    // 2. Public Profiles
    unsubs.push(
      onSnapshot(
        query(collection(db, 'publicProfiles'), where('isPublic', '==', true)),
        (snap) => {
          setPublicProfiles(snap.docs.map((d) => d.data() as PublicProfile));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'publicProfiles')
      )
    );

    // 3. Students (role-scoped query matching firestore.rules allow list)
    const studentQuery =
      role === 'admin'
        ? collection(db, 'students')
        : role === 'guru'
        ? query(collection(db, 'students'), where('teacherUids', 'array-contains', uid))
        : role === 'siswa'
        ? query(collection(db, 'students'), where('studentUid', '==', uid))
        : query(collection(db, 'students'), where('parentUids', 'array-contains', uid));

    unsubs.push(
      onSnapshot(
        studentQuery,
        (snap) => {
          setStudents(snap.docs.map((d) => d.data() as StudentRecord));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'students')
      )
    );

    // 4. Attendance
    const attQuery =
      role === 'admin'
        ? collection(db, 'attendance')
        : role === 'guru'
        ? query(collection(db, 'attendance'), where('teacherUid', '==', uid))
        : role === 'siswa'
        ? query(collection(db, 'attendance'), where('studentUid', '==', uid))
        : query(collection(db, 'attendance'), where('parentUids', 'array-contains', uid));

    unsubs.push(
      onSnapshot(
        attQuery,
        (snap) => {
          setAttendance(
            [...snap.docs.map((d) => d.data() as AttendanceRecord)].sort((a, b) =>
              b.date.localeCompare(a.date)
            )
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
      )
    );

    // 6. Announcements
    const annQuery =
      role === 'admin'
        ? collection(db, 'announcements')
        : query(collection(db, 'announcements'), where('isPublished', '==', true));

    unsubs.push(
      onSnapshot(
        annQuery,
        (snap) => {
          if (
            role === 'admin' &&
            !cleanedLegacyScheduleRef.current &&
            snap.docs.some((d) => d.id === 'ann_mi_sat_2026')
          ) {
            cleanedLegacyScheduleRef.current = true;
            void deleteDoc(doc(db, 'announcements', 'ann_mi_sat_2026')).catch((err) =>
              console.warn('Legacy schedule cleanup failed:', err)
            );
          }
          const rows = sortByCreatedDesc(
            snap.docs
              .filter((d) => d.id !== 'ann_mi_sat_2026')
              .map((d) => d.data() as AnnouncementRecord)
          );
          rows.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
          setAnnouncements(rows);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
      )
    );

    // 7. Personal Notifications
    const personalNotifQuery =
      role === 'admin'
        ? query(collection(db, 'notifications'), where('isBroadcast', '==', false))
        : query(collection(db, 'notifications'), where('recipientUid', '==', uid));

    unsubs.push(
      onSnapshot(
        personalNotifQuery,
        (snap) => {
          const items = snap.docs.map((d) => d.data() as NotificationRecord);
          setPersonalNotifs(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    // 8. Broadcast Notifications
    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('isBroadcast', '==', true)),
        (snap) => {
          setBroadcastNotifs(snap.docs.map((d) => d.data() as NotificationRecord));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    // 9. Admin-only management collections
    if (role === 'admin') {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            setAllUsers(snap.docs.map((d) => d.data() as UserProfile));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'roleInvites'),
          (snap) => {
            setRoleInvites(
              snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoleInvite))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'roleInvites')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'teachers'),
          (snap) => {
            const rows = snap.docs.map((d) => d.data() as TeacherRecord);
            rows.sort((a, b) => {
              const orderDiff = (a.orderNo || 0) - (b.orderNo || 0);
              return orderDiff !== 0 ? orderDiff : a.fullName.localeCompare(b.fullName, 'id-ID');
            });
            setTeachers(rows);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'teachers')
        )
      );
    }

    // 10. Student Mutations (admin sees all, teacher sees mutations they created)
    if (role === 'admin' || role === 'guru') {
      const mutationQuery =
        role === 'admin'
          ? collection(db, 'studentMutations')
          : query(collection(db, 'studentMutations'), where('createdBy', '==', uid));

      unsubs.push(
        onSnapshot(
          mutationQuery,
          (snap) => {
            const items = snap.docs.map((d) => d.data() as StudentMutationRecord);
            items.sort((a, b) => b.mutationDate.localeCompare(a.mutationDate));
            setStudentMutations(items);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'studentMutations')
        )
      );

      // 11. Finance Transactions (Keuangan Madrasah)
      const financeQuery =
        role === 'admin'
          ? collection(db, 'financeTransactions')
          : query(collection(db, 'financeTransactions'), where('createdBy', '==', uid));

      unsubs.push(
        onSnapshot(
          financeQuery,
          (snap) => {
            const items = sortByCreatedDesc(
              snap.docs.map((d) => d.data() as FinanceTransactionRecord)
            );
            items.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
            setFinanceTransactions(items);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'financeTransactions')
        )
      );
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, firebaseUser, profile]);

  const notifications = useMemo(() => {
    const map = new Map<string, NotificationRecord>();
    for (const n of personalNotifs) map.set(n.id, n);
    for (const n of broadcastNotifs) map.set(n.id, n);
    return sortByCreatedDesc(Array.from(map.values()));
  }, [personalNotifs, broadcastNotifs]);

  // Real-time toast trigger when a brand-new notification arrives after initial snapshot
  useEffect(() => {
    if (!firebaseUser) return;
    if (!initialNotifLoadedRef.current) {
      if (notifications.length > 0 || !loading) {
        notifications.forEach((n) => knownNotifIdsRef.current.add(n.id));
        initialNotifLoadedRef.current = true;
      }
      return;
    }

    const newest = notifications.find((n) => !knownNotifIdsRef.current.has(n.id));
    notifications.forEach((n) => knownNotifIdsRef.current.add(n.id));

    if (newest) {
      setLatestToast(newest);
      const timer = window.setTimeout(() => {
        setLatestToast((prev) => (prev?.id === newest.id ? null : prev));
      }, 6000);
      return () => window.clearTimeout(timer);
    }
  }, [notifications, firebaseUser, loading]);

  const unreadCount = useMemo(() => {
    if (!firebaseUser) return 0;
    const uid = firebaseUser.uid;
    return notifications.filter((n) => {
      if (n.isBroadcast) {
        return !(n.readByUids || []).includes(uid);
      }
      return !n.isRead && n.recipientUid === uid;
    }).length;
  }, [notifications, firebaseUser]);

  return {
    madrasahIdentity,
    classes,
    students,
    attendance,
    announcements,
    notifications,
    unreadCount,
    publicProfiles,
    allUsers,
    roleInvites,
    teachers,
    studentMutations,
    financeTransactions,
    attendanceReportLinks,
    loading,
    latestToast,
    dismissToast: () => setLatestToast(null),
  };
}
