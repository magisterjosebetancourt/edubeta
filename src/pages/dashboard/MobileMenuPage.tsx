import { Link, useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  Settings, 
  LogOut, 
  PieChart,
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function MobileMenuPage() {
    const navigate = useNavigate()
    const supabase = createClient()

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error('Error al cerrar sesión')
        } else {
            navigate('/login')
        }
    }

    const menuItems = [
        {
            category: "Gestión Académica",
            items: [
                { title: 'Inicio', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { title: 'Estudiantes', href: '/dashboard/students', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                { title: 'Docentes', href: '/dashboard/teachers', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { title: 'Grados', href: '/dashboard/grades', icon: School, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                { title: 'Asignaturas', href: '/dashboard/subjects', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { title: 'Asignación', href: '/dashboard/assignments', icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { title: 'Caracterización', href: '/dashboard/institution', icon: Building, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
            ]
        },
        {
            category: "Herramientas",
            items: [
                { title: 'Asistencia', href: '/dashboard/attendance', icon: PieChart, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
                { title: 'Configuración', href: '/dashboard/settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' },
            ]
        }
    ]

    return (
        <div className="p-6 space-y-8 pb-32 min-h-screen bg-white dark:bg-[#0f1117]">
            <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <School className="text-white w-7 h-7" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Menú Principal</h1>
                     <p className="text-slate-500">EduBeta Dashboard</p>
                 </div>
            </div>

            {menuItems.map((group, idx) => (
                <div key={idx} className="space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">{group.category}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {group.items.map((item, i) => {
                            const Icon = item.icon
                            return (
                                <Link key={i} to={item.href}>
                                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-95 duration-200">
                                        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                                            <div className={`p-3 rounded-full ${item.bg} ${item.color}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{item.title}</span>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            ))}

            <div className="pt-4">
                <Button 
                    variant="outline" 
                    className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-xl"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </Button>
                <p className="text-center text-xs text-slate-300 mt-6">Versión 2.1.0 Beta</p>
            </div>
        </div>
    )
}
