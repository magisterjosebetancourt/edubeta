import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase/config'
import { useUserProfile } from '@/lib/context/UserProfileContext'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  School, 
  Building,
  BookOpen, 
  Settings, 
  LogOut, 
  PieChart,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  ClipboardList,
  FileBarChart2,
  FolderOpen,
  CalendarDays
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const sidebarItems = [
  {
    category: "EduBeta",
    items: [
      { title: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    category: "Gestión Académica",
    items: [
      { title: 'Falta', href: '/dashboard/infractions', icon: ShieldAlert },
      { title: 'Estudiantes', href: '/dashboard/students', icon: Users },
      { title: 'Docentes', href: '/dashboard/teachers', icon: GraduationCap },
      { title: 'Grado', href: '/dashboard/grades', icon: School },
      { title: 'Asignatura', href: '/dashboard/subjects', icon: BookOpen },
      { title: 'Barrios', href: '/dashboard/neighborhoods', icon: MapPin },
      { title: 'Asignación Académica', href: '/dashboard/assignments', icon: BookOpen },
      { title: 'Historial', href: '/dashboard/history', icon: PieChart },
      { title: 'Historial ISA', href: '/dashboard/isa/history', icon: FileBarChart2 },
    ]
  },
  {
    category: "Herramientas",
    items: [
      { title: 'Tareas', href: '/dashboard/todos', icon: CheckCircle2 },
      { title: 'Asistencia', href: '/dashboard/attendance', icon: PieChart },
      { title: 'Observador', href: '/dashboard/observations', icon: ClipboardList },
      { title: 'Horario', href: '/dashboard/schedules', icon: CalendarDays },
      { title: 'ISA', href: '/dashboard/isa', icon: FileBarChart2 },
    ]
  },
  {
    category: "Documentos",
    items: [
      { title: 'Listas', href: '/dashboard/documents/lists', icon: FolderOpen },
      { title: 'Informes', href: '/dashboard/documents/reports', icon: FolderOpen },
    ]
  },
  {
    category: "Aplicación",
    items: [
      { title: 'Configuración', href: '/dashboard/settings', icon: Settings },
    ]
  },
  {
    category: "Cliente",
    items: [
      { title: 'Caracterización', href: '/dashboard/institution', icon: Building },
    ]
  }
]

export function SidebarContent({ className, onLinkClick }: { className?: string, onLinkClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const { profile: userProfile } = useUserProfile()

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login')
    } catch (error) {
      toast.error('Error al cerrar sesión')
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const filteredItems = sidebarItems.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const role = userProfile?.role?.toLowerCase() || ''

      // EduBeta: Todos
      if (group.category === 'EduBeta') return true

      // Gestión Académica: Admin y Coordinadores
      if (group.category === 'Gestión Académica') {
        return ['admin', 'coordinator'].includes(role)
      }

      // Herramientas: Admin, Coordinadores y Docentes
      if (group.category === 'Herramientas') {
        return ['admin', 'coordinator', 'teacher'].includes(role)
      }

      // Aplicación: Todos
      if (group.category === 'Aplicación') return true

      // Cliente: Admin
      if (group.category === 'Cliente') {
        return role === 'admin'
      }

      // Documentos (Mantener lógica previa o ajustar si se desea)
      if (group.category === 'Documentos') {
        if (item.title === 'Informes') return ['admin', 'coordinator'].includes(role)
        if (item.title === 'Listas') return ['admin', 'coordinator', 'teacher'].includes(role)
      }

      return true
    })
  })).filter(group => group.items.length > 0)

  return (
    <div className={cn("flex flex-col h-full bg-[#121022] text-white", className)}>
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Building className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight font-display">EduBeta</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto no-scrollbar">
        {filteredItems.map((group, idx) => (
          <div key={idx}>
            {group.category && (
              <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.category}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                      isActive 
                        ? "bg-primary/20 text-primary" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
          <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-primary overflow-hidden flex items-center justify-center text-white font-semibold text-xs ring-2 ring-primary/20">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              userProfile ? getInitials(userProfile.full_name) : '...'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userProfile?.full_name || 'Cargando...'}</p>
            <p className="text-[10px] text-slate-400 truncate uppercase tracking-widest font-semibold">
              {userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'coordinator' ? 'Coordinador' : 'Docente'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-400 hover:text-red-400 hover:bg-transparent"
            onClick={handleSignOut}
          >
              <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 h-full shrink-0 z-50">
       <SidebarContent className="h-full w-full shadow-xl" />
    </aside>
  )
}
