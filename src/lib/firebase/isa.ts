import { 
  collection, 
  serverTimestamp, 
  writeBatch, 
  doc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './config';
import { CreateISARecordParams } from '@/types/isa';

const COLLECTION_NAME = 'isa_records';

/**
 * Guarda múltiples registros de ISA en un batch
 */
export async function saveISARecords(records: CreateISARecordParams[]) {
  const batch = writeBatch(db);
  
  records.forEach(record => {
    const docRef = doc(collection(db, COLLECTION_NAME));
    batch.set(docRef, {
      ...record,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  });

  return await batch.commit();
}

/**
 * Obtiene registros de ISA por grupo y fecha (opcional)
 */
export async function getISARecordsByGroup(gradeId: string, date?: string) {
  let q = query(collection(db, COLLECTION_NAME), where('grade_id', '==', gradeId));
  
  if (date) {
    q = query(q, where('date', '==', date));
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
