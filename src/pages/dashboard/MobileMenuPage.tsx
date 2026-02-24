import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '@/lib/firebase/config'
import { getUserProfile } from '@/lib/firebase/firestore'
import { signOut } from 'firebase/auth'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  Settings, 
  LogOut, 
  PieChart,
  Building,
  MapPin,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function MobileMenuPage() {
    const navigate = useNavigate()
    
    interface UserProfile {
        full_name: string;
        role: string;
    }
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const user = auth.currentUser
        if (user) {
            getUserProfile(user.uid).then(profile => {
                if (profile) {
                    setUserProfile({
                        full_name: profile.full_name,
                        role: profile.role
                    })
                }
                setLoading(false)
            }).catch(error => {
                console.error("Error fetching profile:", error)
                setLoading(false)
            })
        } else {
            setLoading(false)
        }
    }, [])

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (error) {
            toast.error('Error al cerrar sesión')
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
                { title: 'Barrios', href: '/dashboard/neighborhoods', icon: MapPin, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { title: 'Asignación Académica', href: '/dashboard/assignments', icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { title: 'Caracterización', href: '/dashboard/institution', icon: Building, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
            ]
        },
        {
            category: "Herramientas",
            items: [
                { title: 'Tareas', href: '/dashboard/todos', icon: CheckCircle2, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                { title: 'Asistencia', href: '/dashboard/attendance', icon: PieChart, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
                { title: 'Historial', href: '/dashboard/history', icon: PieChart, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
                { title: 'Configuración', href: '/dashboard/settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' },
            ]
        }
    ]

    const filteredMenu = menuItems.map(group => ({
        ...group,
        items: group.items.filter(item => {
            if (userProfile?.role !== 'admin') {
                if (['Caracterización', 'Configuración', 'Docentes', 'Grados', 'Asignación Académica', 'Asignaturas', 'Barrios', 'Estudiantes'].includes(item.title)) {
                    return false
                }
            }
            return true
        })
    })).filter(group => group.items.length > 0)

    if (loading) return <div className="p-10 text-center">Cargando menú...</div>

    return (
        <div className="p-6 space-y-8 pb-32 min-h-screen bg-slate-50 dark:bg-[#0f1117]">
            <div className="flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                    <UserIcon className="text-white w-8 h-8" />
                 </div>
                 <div className="min-w-0">
                     <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">Hola, {userProfile?.full_name.split(' ')[0]}</h1>
                     <p className="text-[10px] font-black tracking-widest text-primary">
                        {userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'coordinator' ? 'Coordinador' : 'Docente'}
                     </p>
                 </div>
            </div>

            {filteredMenu.map((group, idx) => (
                <div key={idx} className="space-y-4">
                    <h2 className="text-xs font-bold tracking-wider text-slate-400 ml-1">{group.category}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {group.items.map((item, i) => {
                            const Icon = item.icon
                            return (
                                <Link key={i} to={item.href}>
                                    <Card className="border-none shadow-sm hover:shadow-md transition-all active:scale-95 duration-200 bg-white dark:bg-slate-800/50 backdrop-blur-sm">
                                        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                                            <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs tracking-tight leading-tight">{item.title}</span>
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
                    className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-bold tracking-widest text-xs"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </Button>
                <div className="flex flex-col items-center gap-2 mt-8">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                            <School className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EduBeta v2.1.5 Beta</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
