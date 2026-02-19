import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  PieChart, 
  TrendingUp, 
  UserCheck, 
  Bell, 
  Plus
} from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()
  const supabase = createClient()
  const [stats, setStats] = useState({ students: 0, teachers: 0, attendance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
      }
    }

    async function fetchStats() {
      try {
        // 1. Students Count
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })

        // 2. Teachers Count
        const { count: teacherCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'teacher')

        // 3. Attendance Rate (Today)
        const today = new Date().toISOString().split('T')[0]
        const { count: presentCount } = await supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .eq('status', 'present')

        const rate = (studentCount && presentCount) 
          ? Math.round((presentCount / studentCount) * 100) 
          : 0

        setStats({ 
          students: studentCount || 0, 
          teachers: teacherCount || 0, 
          attendance: rate 
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
    fetchStats()
  }, [navigate, supabase])

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen overflow-y-auto">
      {/* Header Mobile/Desktop */}
      <header className="h-16 bg-white dark:bg-[#1a182e] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="hidden lg:block text-lg font-bold text-slate-800 dark:text-white">Panel Principal</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full transition-colors relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a182e]"></span>
          </button>
          <Button className="hidden sm:flex bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 rounded-lg gap-2">
            <Plus className="w-5 h-5" />
            Nuevo
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Students */}
          <div className="bg-primary text-white rounded-2xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium mb-1 opacity-80">Total Estudiantes</p>
                <h3 className="text-4xl font-bold tracking-tight">{stats.students}</h3>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Users className="text-white w-6 h-6" />
              </div>
            </div>
            <div className="relative z-10 mt-6 flex items-center gap-1 text-xs text-white/80 font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>Registrados en sistema</span>
            </div>
          </div>

          {/* Card 2: Attendance Rate */}
          <div className="bg-white dark:bg-[#1e1c30] rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Asistencia Hoy</p>
                <h3 className="text-4xl font-bold text-slate-800 dark:text-white">{stats.attendance}%</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <PieChart className="text-green-600 dark:text-green-400 w-6 h-6" />
              </div>
            </div>
            <div className="mt-6 w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.attendance}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Active Teachers */}
          <div className="bg-white dark:bg-[#1e1c30] rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Docentes Activos</p>
                <h3 className="text-4xl font-bold text-slate-800 dark:text-white">{stats.teachers}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <UserCheck className="text-primary dark:text-blue-400 w-6 h-6" />
              </div>
            </div>
            <div className="mt-6 flex -space-x-3 overflow-hidden">
               {/* Avatars placeholder - statically limited for now */}
               {[1,2,3].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white dark:border-[#1e1c30] flex items-center justify-center text-xs font-bold text-slate-500">
                    D{i}
                  </div>
               ))}
               <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] flex items-center justify-center border-2 border-white dark:border-[#1e1c30] text-slate-500 font-bold">...</div>
            </div>
          </div>
        </div>

        {/* Recent Reports Table could be here */}
        
      </div>
    </div>
  )
}
