import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Types
type Student = {
  id: number
  first_name: string
  last_name: string
  grade_id: number
}



type StudentWithStatus = Student & {
  status?: 'present' | 'late' | 'absent' | 'excused'
  avatarColor?: string
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-blue-100 text-blue-600',
  'bg-pink-100 text-pink-600',
  'bg-orange-100 text-orange-600',
  'bg-green-100 text-green-600',
]

export default function AttendancePage() {
  const [students, setStudents] = useState<StudentWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate] = useState(new Date())
  
  const supabase = createClient()

  // Fetch students and today's attendance
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const dateStr = format(currentDate, 'yyyy-MM-dd')

        // 1. Get all students (TODO: Filter by selected grade)
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .order('last_name', { ascending: true })
        
        if (studentsError) throw studentsError

        // 2. Get attendance for today
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('date', dateStr)

        if (attendanceError) throw attendanceError

        // 3. Merge data
        const merged = (studentsData || []).map((s: any, index: number) => {
          const records = attendanceData as any[] | null
          const record = records?.find((a: any) => a.student_id === s.id)
          return {
            ...s,
            status: record?.status, // undefined if no record
            avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length]
          }
        })

        setStudents(merged)
      } catch (error: any) {
         toast.error('Error cargando asistencia', { description: error.message })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentDate])

  const handleStatusChange = async (studentId: number, status: 'present' | 'late' | 'absent') => {
    // Optimistic Update
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))

    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      
      const { error } = await supabase
        .from('attendance_records')
        .upsert({
            student_id: studentId,
            date: dateStr,
            status: status
        } as any, { onConflict: 'student_id, date' })

      if (error) throw error
      // toast.success('Asistencia actualizada') // Too spammy for every click
    } catch (error: any) {
      toast.error('Error guardando asistencia', { description: error.message })
      // Revert optimistic update? For now simply show error
    }
  }

  const handleSaveAll = async () => {
      // In this real-time implementation, data is saved on click. 
      // This button could be used to "Finish" or mark remaining as present.
      // For now, let's make it mark all unmarked as 'present'
      const unmarked = students.filter(s => !s.status)
      if (unmarked.length === 0) {
          toast.info('Todos los estudiantes ya tienen registro.')
          return
      }

      if(!confirm(`¿Marcar a los ${unmarked.length} estudiantes restantes como "Presente"?`)) return

      try {
          const dateStr = format(currentDate, 'yyyy-MM-dd')
          const updates = unmarked.map(s => ({
              student_id: s.id,
              date: dateStr,
              status: 'present'
          }))

          const { error } = await supabase.from('attendance_records').upsert(updates as any, { onConflict: 'student_id, date' })
          if (error) throw error
          
          setStudents(prev => prev.map(s => !s.status ? { ...s, status: 'present' } : s))
          toast.success('Asistencia completada')
      } catch (error: any) {
          toast.error('Error masivo', { description: error.message })
      }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="bg-background-light dark:bg-background-dark h-full flex flex-col overflow-y-auto pb-24">
      
      {/* Navigation Header - Hidden on Mobile since Layout handles it */}
      <header className="hidden lg:flex px-5 py-4 items-center justify-between bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Asistencia</h1>
        <button className="p-2 -mr-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-primary transition-colors">
          <Filter className="w-6 h-6" />
        </button>
      </header>

      {/* Class Context Header */}
      <div className="px-6 py-6 bg-white dark:bg-background-dark shadow-sm z-30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">General</span>
            <span className="text-sm text-slate-500 font-medium">Semana Actual</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Lista General</h2>
          <div className="flex items-center text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium capitalize">
            <Calendar className="w-4 h-4 mr-1.5" />
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
            <span className="mx-2">•</span>
            <Clock className="w-4 h-4 mr-1.5" />
            {format(new Date(), "hh:mm a")}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-background-light dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <span className="text-xs text-slate-500 uppercase font-semibold mb-1">Total</span>
            <span className="text-lg font-bold text-slate-800 dark:text-white">{students.length}</span>
          </div>
          <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800/30 flex flex-col items-center">
            <span className="text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1">Presentes</span>
            <span className="text-lg font-bold text-green-700 dark:text-green-300">
               {students.filter(s => s.status === 'present').length}
            </span>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800/30 flex flex-col items-center">
            <span className="text-xs text-red-600 dark:text-red-400 uppercase font-semibold mb-1">Ausentes</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-300">
               {students.filter(s => s.status === 'absent').length}
            </span>
          </div>
        </div>
      </div>

      {/* Student List Content */}
      <div className="px-4 space-y-3 mt-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Estudiantes</span>
          <button className="text-xs font-semibold text-primary hover:text-primary/80">Opciones</button>
        </div>

        {students.length === 0 ? (
            <div className="text-center py-10 opacity-50">No hay estudiantes cargados</div>
        ) : students.map((student) => (
          <div 
            key={student.id} 
            className={cn(
              "bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
              student.status === 'present' ? "border-slate-100 dark:border-slate-700/50 hover:border-primary/20" : "",
              student.status === 'absent' ? "border-red-100 dark:border-red-900/30 hover:border-danger/30" : "",
              student.status === 'late' ? "border-yellow-100 dark:border-yellow-900/30 hover:border-warning/30" : ""
            )}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm", student.avatarColor)}>
                   {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                </div>
                <div className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 border-2 border-white dark:border-slate-800 rounded-full",
                  student.status === 'present' ? "bg-green-500" : "",
                  student.status === 'absent' ? "bg-red-500" : "",
                  student.status === 'late' ? "bg-yellow-500" : "bg-slate-300"
                )}></div>
              </div>
              <div>
                <h3 className={cn("font-semibold text-slate-900 dark:text-white", student.status === 'absent' && "opacity-60")}>
                  {student.first_name} {student.last_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">ID: {student.id}</p>
              </div>
            </div>

            {/* Segmented Control */}
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-lg flex text-xs font-semibold sm:w-auto w-full">
              <button 
                onClick={() => handleStatusChange(student.id, 'present')}
                className={cn(
                    "flex-1 sm:flex-none sm:px-4 py-2 rounded-md transition-all",
                    student.status === 'present' ? "bg-white dark:bg-primary shadow-sm text-primary dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Presente
              </button>
              <button 
                 onClick={() => handleStatusChange(student.id, 'late')}
                 className={cn(
                    "flex-1 sm:flex-none sm:px-4 py-2 rounded-md transition-all",
                    student.status === 'late' ? "bg-warning text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Tarde
              </button>
              <button 
                 onClick={() => handleStatusChange(student.id, 'absent')}
                 className={cn(
                    "flex-1 sm:flex-none sm:px-4 py-2 rounded-md transition-all",
                    student.status === 'absent' ? "bg-danger text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Ausente
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Footer Action */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 bg-white/90 dark:bg-background-dark/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 p-4 z-30">
        <button 
            onClick={handleSaveAll}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-base py-4 px-6 rounded-xl shadow-floating transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group">
             Marcar Restantes como Presente
             <CheckCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
