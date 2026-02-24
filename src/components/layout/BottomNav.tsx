import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Users, 
  PieChart, 
  Settings,
  Menu
} from 'lucide-react'


export function BottomNav() {
  const location = useLocation()
  const pathname = location.pathname

  const navItems = [
    { title: 'Inicio', href: '/dashboard', icon: Home, exact: true },
    { title: 'Estudiantes', href: '/dashboard/students', icon: Users },
    { title: 'Asistencia', href: '/dashboard/attendance', icon: PieChart },
    { title: 'Ajustes', href: '/dashboard/settings', icon: Settings },
    { title: 'Menú', href: '/dashboard/menu', icon: Menu },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#121022]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-current/20")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
