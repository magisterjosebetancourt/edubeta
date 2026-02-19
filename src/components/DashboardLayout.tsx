import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Outlet, useLocation } from 'react-router-dom'

import { School as SchoolIcon, Menu } from "lucide-react"
import { Link } from 'react-router-dom'
export default function DashboardLayout() {
  
  // Get title based on current path for the mobile header
  
  // Get title based on current path for the mobile header
  const location = useLocation()
  const getMobileTitle = () => {
    const path = location.pathname.split('/')[2]
    if (!path || path === 'dashboard') return 'Inicio'
    
    const titles: Record<string, string> = {
      'students': 'Estudiantes',
      'teachers': 'Docentes',
      'grades': 'Grados',
      'subjects': 'Asignaturas',
      'attendance': 'Asistencia',
      'settings': 'Configuración'
    }
    
    return titles[path] || path.charAt(0).toUpperCase() + path.slice(1)
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Mobile Header - Native Feel */}
          {/* Mobile Header - Native Feel */}
          <header className="lg:hidden h-16 bg-white dark:bg-[#121022] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40">
             <div className="flex items-center gap-3">
               <Link to="/dashboard/menu" className="lg:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-md">
                  <Menu className="w-5 h-5" />
               </Link>
               <span className="text-lg font-bold text-slate-800 dark:text-white">{getMobileTitle()}</span>
             </div>
             
             {/* Mobile Logo/Brand Right */}
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <SchoolIcon className="w-5 h-5 text-primary" />
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
