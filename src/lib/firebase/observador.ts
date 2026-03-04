import { db } from './config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { StudentObservation, CreateObservationParams, UpdateObservationParams } from '../../types/observador';

const COLLECTION_NAME = 'student_observations';

/**
 * Obtiene todas las anotaciones de un estudiante en específico.
 * @param studentId ID del estudiante
 */
export async function getObservationsByStudent(studentId: string): Promise<StudentObservation[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('studentId', '==', studentId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  })) as StudentObservation[];
}

/**
 * Obtiene todas las observaciones del colegio / grado (útil para coordinadores y psicorientación).
 */
export async function getAllObservations(): Promise<StudentObservation[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  })) as StudentObservation[];
}

/**
 * Obtener un detalle de anotación por su ID.
 * Útil para la vista "StudentDefenseForm" y el Detail.
 */
export async function getObservationById(id: string): Promise<StudentObservation | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as StudentObservation;
}

/**
 * Registra una nueva observación.
 * Si es exitoso, podríamos lanzar una Cloud Function o proceso de notificaciones luego.
 */
export async function createObservation(params: CreateObservationParams): Promise<StudentObservation> {
  const newRef = doc(collection(db, COLLECTION_NAME));
  const newDoc: Omit<StudentObservation, 'id'> = {
    ...params,
    notificationsSent: {
      parentsApp: false,
      whatsappAdmins: false,
    },
    createdAt: new Date().toISOString(), // Guardaremos simple ISO para UI/Reportes
    updatedAt: new Date().toISOString()
  };

  await setDoc(newRef, newDoc);

  // NOTA: Acá es donde conectaríamos Twilio o Firebase Extensions para WhatsApp
  // En este punto, solo marcamos localmente el registro en DB.

  return { id: newRef.id, ...newDoc };
}

/**
 * Actualiza una anotación (Solo permitida bajo ciertas reglas de Ley 1581 o para el Status).
 */
export async function updateObservation(id: string, params: UpdateObservationParams): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...params,
    updatedAt: new Date().toISOString()
  });
}

/**
 * (Ley 1098 - Descargo y Firma)
 * Al guardar la respuesta del estudiante, actualizamos directamente.
 */
export async function saveStudentDefense(
  id: string, 
  defense: string, 
  signatureDataUrl: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    studentDefense: defense,
    studentSignatureDataUrl: signatureDataUrl,
    studentDefenseDate: new Date().toISOString(),
    status: 'En proceso', // Podríamos cambiar estado cuando responde el alumno
    updatedAt: new Date().toISOString()
  });
}
