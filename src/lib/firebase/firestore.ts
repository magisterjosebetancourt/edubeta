import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'coordinator' | 'teacher' | 'user';
  email: string;
  avatar_url?: string;
  state: boolean;
  updated_at: Timestamp;
}

/**
 * Obtiene el perfil de un usuario desde Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "profiles", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

/**
 * Crea o actualiza el perfil de un usuario
 */
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>) {
  try {
    const docRef = doc(db, "profiles", uid);
    await setDoc(docRef, {
      ...profile,
      updated_at: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
}

/**
 * Obtiene documentos de una colección con filtros opcionales
 */
export async function getCollection<T>(collectionName: string, filters?: { field: string, operator: any, value: any }[]) {
  try {
    let q = query(collection(db, collectionName));
    
    if (filters) {
      filters.forEach(f => {
        q = query(q, where(f.field, f.operator, f.value));
      });
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    throw error;
  }
}
