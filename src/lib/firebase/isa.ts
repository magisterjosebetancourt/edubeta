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
 * También permite eliminar registros específicos si se pasan sus IDs
 */
export async function saveISARecords(records: CreateISARecordParams[], idsToDelete: string[] = []) {
  const batch = writeBatch(db);
  
  // Procesar guardados/actualizaciones
  for (const record of records) {
    // Generar un ID único basado en la combinación de claves
    const docId = `${record.student_id}_${record.subject_id}_${record.period_id}`;
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    batch.set(docRef, {
      ...record,
      updated_at: serverTimestamp(),
      created_at: serverTimestamp() 
    }, { merge: true });
  }

  // Procesar eliminaciones
  for (const id of idsToDelete) {
    const docRef = doc(db, COLLECTION_NAME, id);
    batch.delete(docRef);
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
  let q = query(collection(db, COLLECTION_NAME));
  
  if (filters?.period_id) q = query(q, where('period_id', '==', filters.period_id));
  if (filters?.grade_id) q = query(q, where('grade_id', '==', filters.grade_id));
  
  // Solo aplicamos orderBy en la consulta si NO hay filtros complejos
  // para evitar requerir índices compuestos manuales en Firestore
  if (!filters?.period_id && !filters?.grade_id) {
    q = query(q, orderBy('created_at', 'desc'));
  }
  
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Si hay filtros, ordenamos en memoria
  if (filters?.period_id || filters?.grade_id) {
    results.sort((a: any, b: any) => {
      const timeA = a.created_at?.seconds || 0;
      const timeB = b.created_at?.seconds || 0;
      return timeB - timeA;
    });
  }
  
  return results;
}

