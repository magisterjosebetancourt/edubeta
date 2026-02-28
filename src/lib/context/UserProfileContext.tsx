import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'

export interface UserProfile {
  uid: string
  full_name: string
  role: 'admin' | 'coordinator' | 'teacher' | 'user'
  email: string
  avatar_url?: string
  state: boolean
}

interface UserProfileContextType {
  profile: UserProfile | null
  firebaseUser: User | null
  loading: boolean
  /** Llama esto después de actualizar el perfil en Firestore para refrescar el contexto */
  refreshProfile: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  firebaseUser: null,
  loading: true,
  refreshProfile: async () => {},
})

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (user: User) => {
    try {
      const snap = await getDoc(doc(db, 'profiles', user.uid))
      if (snap.exists()) {
        setProfile({ uid: user.uid, ...snap.data() } as UserProfile)
      } else {
        // Perfil mínimo si no existe el documento aún
        setProfile({
          uid: user.uid,
          full_name: user.displayName || 'Usuario',
          role: 'user',
          email: user.email || '',
          state: true,
        })
      }
    } catch (error) {
      console.error('[UserProfileContext] Error cargando perfil:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        await fetchProfile(user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (firebaseUser) {
      await fetchProfile(firebaseUser)
    }
  }

  return (
    <UserProfileContext.Provider value={{ profile, firebaseUser, loading, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  )
}

/** Hook para acceder al perfil del usuario en cualquier componente del dashboard */
export function useUserProfile() {
  return useContext(UserProfileContext)
}
