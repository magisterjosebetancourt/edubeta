import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { School as SchoolIcon, Menu, ArrowLeft } from "lucide-react"
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  interface UserProfile {
    full_name: string;
    role: string;
    avatar_url?: string;
  }
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function checkUser() {
      // Usamos getSession primero para evitar NavigatorLockAcquireTimeoutError
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user) {
        navigate('/login')
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', user.id)
          .single() as { data: { full_name: string; role: string; avatar_url: string } | null }
        
        setUserProfile({
          full_name: profile?.full_name || 'Usuario',
          role: profile?.role || 'user',
          avatar_url: profile?.avatar_url
        })
        setLoading(false)
      }
    }
    checkUser()
  }, [navigate, supabase])

  const getMobileTitle = () => {
    const path = location.pathname.split('/')[2]
    if (!path || path === 'dashboard') return 'Inicio'
    
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
      'menu': 'Menú'
    }
    
    return titles[path] || path.charAt(0).toUpperCase() + path.slice( path.length > 0 ? 1 : 0)
  }

  const handleBack = () => {
    // Si estamos en una subruta profunda, intentamos volver
    // pero si el historial está vacío o es externo, vamos al dashboard
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

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">Cargando...</div>

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="lg:hidden h-16 bg-white dark:bg-[#121022] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40">
             <div className="flex items-center gap-3">
               {!isMainPage ? (
                 <button 
                   onClick={handleBack}
                   className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                 >
                   <ArrowLeft className="w-5 h-5" />
                 </button>
               ) : (
                 <Link to="/dashboard/menu" className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-md">
                    <Menu className="w-5 h-5" />
                 </Link>
               )}
               <span className="text-lg font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{getMobileTitle()}</span>
             </div>
             
             <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-900 dark:text-white leading-none">{userProfile?.full_name.split(' ')[0]}</p>
                  <p className="text-[8px] font-medium text-primary uppercase tracking-tighter">{userProfile?.role}</p>
                </div>
                <Link to="/dashboard/profile" className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors text-primary font-black text-xs overflow-hidden">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      userProfile ? getInitials(userProfile.full_name) : <SchoolIcon className="w-5 h-5" />
                    )}
                </Link>
             </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto scroll-smooth pb-20 lg:pb-0">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </div>
      </div>
    </>
  )
}
