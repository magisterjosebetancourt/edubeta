import { 
  collection, 
  serverTimestamp, 
  writeBatch, 
  doc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { CreateISARecordParams } from '@/types/isa';

const COLLECTION_NAME = 'isa_records';

/**
 * Guarda o actualiza múltiples registros de ISA en un batch
 * Utiliza un ID determinista (estudiante_materia_periodo) para garantizar unicidad y evitar duplicados
 */
export async function saveISARecords(records: CreateISARecordParams[]) {
  const batch = writeBatch(db);
  
  for (const record of records) {
    // Generar un ID único basado en la combinación de claves
    const docId = `${record.student_id}_${record.subject_id}_${record.period_id}`;
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    // Usamos set con merge para actualizar si existe o crear si no
    batch.set(docRef, {
      ...record,
      updated_at: serverTimestamp(),
      // Solo establecemos created_at si el documento no existe (aunque con este ID determinista, 
      // si ya existía simplemente se sobrescribe con la nueva info)
      created_at: serverTimestamp() 
    }, { merge: true });
  }

  return await batch.commit();
}

/**
 * Obtiene registros de ISA por grupo, materia y periodo
 */
export async function getISARecords(gradeId: string, subjectId: string, periodId: string) {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('grade_id', '==', gradeId),
    where('subject_id', '==', subjectId),
    where('period_id', '==', periodId)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtiene historial de ISA para administradores
 */
export async function getISAHistory(filters?: { period_id?: string; grade_id?: string }) {
  let q = query(collection(db, COLLECTION_NAME), orderBy('created_at', 'desc'));
  
  if (filters?.period_id) q = query(q, where('period_id', '==', filters.period_id));
  if (filters?.grade_id) q = query(q, where('grade_id', '==', filters.grade_id));
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

