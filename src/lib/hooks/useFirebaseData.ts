import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
// Tipos dinámicos en esta fase iterativa
type Grade = any;
type Subject = any;
type Student = any;

export function useGrades() {
  return useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const gSnap = await getDocs(collection(db, 'grades'));
      // Dependiendo de tu tipo Grade, esto mapea los docs:
      return gSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'subjects'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
    },
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'students'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    },
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'schedules'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    },
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'assignments'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    },
  });
}
