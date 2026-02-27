import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { auth, db } from '@/lib/firebase/config'
import { getUserProfile } from '@/lib/firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { School as SchoolIcon, Menu, ArrowLeft } from "lucide-react"
import { useState, useEffect } from 'react'

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  interface UserProfile {
    full_name: string;
    role: string;
    avatar_url?: string;
  }
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'institutional'))
        if (settingsSnap.exists()) {
          setLogoUrl(settingsSnap.data().logo_url || null)
        }
      } catch (error) {
        console.error("Error fetching logo for global header:", error)
      }
    }
    fetchLogo()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login')
      } else {
        try {
          const profile = await getUserProfile(user.uid)
          
          setUserProfile({
            full_name: profile?.full_name || 'Usuario',
            role: profile?.role || 'user',
            avatar_url: profile?.avatar_url
          })
        } catch (error) {
          console.error("Error fetching profile:", error)
          setUserProfile({
            full_name: user.displayName || 'Usuario',
            role: 'user'
          })
        } finally {
          setLoading(false)
        }
      }
    });

    return () => unsubscribe();
  }, [navigate])

  const getMobileTitle = () => {
    const segments = location.pathname.split('/').filter(Boolean) // ['dashboard', 'grades', 'new']
    const section = segments[1] // 'grades', 'students', etc.
    const sub = segments[2]     // 'new', ':id', etc.
    const action = segments[3]  // 'edit', etc.

    // Formularios full-screen (sub-rutas)
    if (section === 'grades' && sub === 'new') return 'Nuevo grupo'
    if (section === 'grades' && action === 'edit') return 'Editar grupo'
    if (section === 'students' && sub === 'new') return 'Matricular estudiante'
    if (section === 'students' && action === 'edit') return 'Editar estudiante'
    if (section === 'students' && sub === 'import') return 'Carga masiva'
    if (section === 'teachers' && sub === 'new') return 'Nueva invitación'
    if (section === 'teachers' && action === 'edit') return 'Editar docente'
    if (section === 'subjects' && sub === 'new') return 'Nueva asignatura'
    if (section === 'subjects' && action === 'edit') return 'Editar asignatura'
    if (section === 'neighborhoods' && sub === 'new') return 'Nuevo barrio'
    if (section === 'neighborhoods' && action === 'edit') return 'Editar barrio'
    if (section === 'todos' && sub === 'new') return 'Nueva tarea'
    if (section === 'todos' && action === 'edit') return 'Editar tarea'
    if (section === 'assignments' && sub === 'new') return 'Nueva asignación'
    if (section === 'assignments' && action === 'edit') return 'Editar asignación'
    if (section === 'infractions' && sub === 'new') return 'Registrar falta'
    if (section === 'infractions' && action === 'edit') return 'Editar falta'
    if (section === 'attendance' && sub === 'new') return 'Nueva lista de clase'
    if (section === 'attendance' && sub === 'taking') return 'Tomando asistencia'
    if (section === 'attendance' && sub === 'session') return 'Editar sesión'

    if (!section || section === 'dashboard') return 'Inicio'

    const titles: Record<string, string> = {
      'students': 'Estudiantes',
      'teachers': 'Docentes',
      'grades': 'Grados',
      'subjects': 'Asignaturas',
      'attendance': 'Asistencia',
      'history': 'Historial',
      'settings': 'Configuración',
      'assignments': 'Asignación Académica',
      'institution': 'Caracterización',
      'neighborhoods': 'Barrios',
      'profile': 'Perfil',
      'todos': 'Tareas',
      'menu': 'Menú',
      'infractions': 'Faltas'
    }

    return titles[section] || section.charAt(0).toUpperCase() + section.slice(1)
  }

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isMainPage = ['/dashboard', '/dashboard/', '/dashboard/menu'].includes(location.pathname)

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 font-bold text-primary animate-pulse">Cargando...</div>

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Unified Global Header */}
        <header className="h-20 bg-white dark:bg-[#121022] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40 transition-colors duration-300">
           <div className="flex items-center gap-3">
             {!isMainPage ? (
               <button 
                 onClick={handleBack}
                 className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
             ) : (
                <Link 
                  to="/dashboard/menu" 
                  className="lg:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-all active:scale-95 border border-transparent hover:border-slate-200"
                >
                  <Menu className="w-5 h-5" />
                </Link>
             )}
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1">
                 Betasoft
               </span>
               <h1 className="text-xl font-bold text-slate-800 dark:text-white truncate max-w-[180px] leading-tight tracking-tight">
                 {getMobileTitle()}
               </h1>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                 <div className="text-right hidden sm:block">
                   <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none mb-0.5">{userProfile?.full_name.split(' ')[0]}</p>
                   <p className="text-[8px] font-bold text-primary uppercase tracking-widest">{userProfile?.role}</p>
                 </div>
                 
                 {/* Premium Avatar Container */}
                 <Link 
                  to="/dashboard/profile" 
                  className="group relative w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-px flex items-center justify-center hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 overflow-hidden active:scale-95"
                 >
                    <div className="w-full h-full rounded-[7px] bg-white dark:bg-[#121022] flex items-center justify-center overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img 
                          src={userProfile.avatar_url} 
                          alt="Avatar" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <span className="text-primary font-black text-[11px] tracking-tighter">
                          {userProfile ? getInitials(userProfile.full_name) : <SchoolIcon className="w-5 h-5 opacity-40" />}
                        </span>
                      )}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                 </Link>
              </div>

              {logoUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-800 bg-white p-1.5 flex items-center justify-center shadow-sm shrink-0 hover:scale-105 transition-transform duration-300 cursor-pointer">
                  <img src={logoUrl} alt="Institution Logo" className="max-w-full max-h-full object-contain filter drop-shadow-sm" />
                </div>
              )}
           </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth pb-20 lg:pb-0 bg-slate-50/30 dark:bg-[#0c0a1a]">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  )
}
