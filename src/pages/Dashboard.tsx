import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/lib/firebase/config'
import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore'
import { useUserProfile } from '@/lib/context/UserProfileContext'
import { useGrades, useSubjects } from '@/lib/hooks/useFirebaseData'
import { cn } from '@/lib/utils'
import { 
  Users,
  PieChart,
  Bell,
  FlaskConical,
  Target,
  BookOpen,
  Calculator,
  Compass,
  GraduationCap
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Icon mapping helper
const getSubjectIcon = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('mat')) return { icon: Calculator, color: 'blue' }
  if (n.includes('fis') || n.includes('cie') || n.includes('bio')) return { icon: FlaskConical, color: 'purple' }
  if (n.includes('geo') || n.includes('art')) return { icon: Compass, color: 'green' }
  if (n.includes('ing') || n.includes('esp')) return { icon: BookOpen, color: 'indigo' }
  return { icon: GraduationCap, color: 'slate' }
}

export default function DashboardPage() {
  const { profile: userProfile, firebaseUser } = useUserProfile()
  const navigate = useNavigate()
  const { data: gradesData = [] } = useGrades()
  const { data: subjectsData = [] } = useSubjects()
  
  const [stats, setStats] = useState({ students: 0, teachers: 0, attendance: 0, grades: 0, subjects: 0 })
  const [assignments, setAssignments] = useState<any[]>([])
  const [todos, setTodos] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const appRole = userProfile?.role as 'admin' | 'teacher' | 'coordinator' | null

  useEffect(() => {
    if (!userProfile || !firebaseUser) return

    async function getInitialData() {
      try {
        const user = firebaseUser!
        const role = userProfile!.role
        const today = new Date().toISOString().split('T')[0]

        let studentCount = 0;
        let teacherCount = 0;
        let presentCount = 0;

        if (role === 'admin' || role === 'coordinator') {
          const [sSnap, tSnap, pSnap] = await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(query(collection(db, "profiles"), where("role", "==", "teacher"))),
            getDocs(query(collection(db, "attendance_records"), where("date", "==", today), where("status", "==", "present")))
          ]);
          studentCount = sSnap.size;
          teacherCount = tSnap.size;
          presentCount = pSnap.size;
        } else {
          const assSnap = await getDocs(query(collection(db, "assignments"), where("teacher_id", "==", user.uid), where("state", "==", true)));
          const assignmentsData = assSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const gradeIds = Array.from(new Set(assignmentsData.map((a: any) => a.grade_id)));
          const subjectIds = Array.from(new Set(assignmentsData.map((a: any) => a.subject_id)));
          
          setStats(prev => ({ ...prev, grades: gradeIds.length, subjects: subjectIds.length }));
          
          const todosSnap = await getDocs(query(collection(db, "todos"), where("user_id", "==", user.uid), where("completed", "==", false)));
          const todosData = todosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          setAssignments(assignmentsData);
          setTodos(todosData);

          const notifSnap = await getDocs(query(collection(db, "notifications"), where("user_id", "==", user.uid), where("read", "==", false)));
          const notifData = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setNotifications(notifData);

          if (gradeIds.length > 0) {
            const stdSnap = await getDocs(collection(db, "students"));
            const filteredStudents = stdSnap.docs.filter(d => gradeIds.includes(d.data().grade_id));
            studentCount = filteredStudents.length;

            const attSnap = await getDocs(query(collection(db, "attendance_records"), where("date", "==", today), where("status", "==", "present")));
            const filteredAtt = attSnap.docs.filter(d => {
              const student = stdSnap.docs.find(s => s.id === d.data().student_id);
              return student && gradeIds.includes(student.data().grade_id);
            });
            presentCount = filteredAtt.length;
          }
        }

        const attendanceRate = studentCount > 0 ? Math.round((presentCount / studentCount) * 100) : 0;

        setStats(prev => ({ 
          ...prev, 
          students: studentCount, 
          teachers: teacherCount, 
          attendance: attendanceRate 
        }))
        
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialData()
  }, [userProfile, firebaseUser])

  useEffect(() => {
    if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'coordinator')) {
      setStats(prev => ({
        ...prev,
        grades: gradesData.length,
        subjects: subjectsData.length
      }))
    }
  }, [gradesData.length, subjectsData.length, userProfile]);

  if (loading) return <LoadingSpinner message="Cargando portal..." />;

  if (loading) return <LoadingSpinner message="Cargando portal..." />;


  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark">
      {/* Original Header Section */}
      <header className="sticky top-0 z-10 flex items-center bg-slate-50/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight truncate max-w-[250px]">
              ¡Hola, {userProfile?.full_name?.split(' ')[0] || 'Docente'}!
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">EduBeta Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard/notifications')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all">
            <Bell className="w-5 h-5" />
            {(notifications.length > 0 || todos.length > 0) && (
              <span className="absolute top-2.5 right-2.5 flex h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-800"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col gap-6 p-4 max-w-2xl mx-auto w-full pb-24">
        
        {/* Notifications Card */}
        <section className="w-full">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/10 bg-white dark:bg-slate-900 p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500">
                <Bell className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">Notificaciones</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">Tienes {notifications.length + todos.length} nuevas alertas hoy</p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard/notifications')} 
              className="w-full sm:w-auto flex items-center justify-center rounded-xl h-10 px-6 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
              Ver todas
            </button>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-4 h-4" />
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">Mis estudiantes</p>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight mt-1">{stats.students}</p>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary w-full opacity-80"></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-orange-500">
              <PieChart className="w-4 h-4" />
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">Asistencia hoy</p>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight mt-1">{stats.attendance}%</p>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${stats.attendance}%` }}></div>
            </div>
          </div>
        </section>

        {/* Mis Grupos (Horizontal Scroll) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold flex items-center gap-2">
              Mis grupos <span className="text-primary font-normal text-sm bg-primary/10 px-2 py-0.5 rounded-full">({stats.grades})</span>
            </h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {gradesData.filter(g => appRole === 'admin' ? true : assignments.some(a => a.grade_id === g.id)).map((grade: any, idx) => (
              <div key={grade.id} 
                onClick={() => navigate(`/dashboard/grades/${grade.id}/students`)}
                className={cn("flex flex-col items-center justify-center min-w-[100px] aspect-square rounded-2xl shadow-sm border transition-all active:scale-95 cursor-pointer",
                idx === 0 ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}>
                <span className="text-2xl font-black">{grade.name}</span>
                <span className={cn("text-[9px] uppercase font-bold mt-1 tracking-tighter", idx === 0 ? "text-white/80" : "text-slate-400")}>
                  Ver Grupo
                </span>
              </div>
            ))}
            {appRole !== 'admin' && stats.grades === 0 && (
              <div className="flex-1 text-center py-6 text-slate-400 text-xs font-medium border-2 border-dashed rounded-2xl">
                Sin grupos asignados
              </div>
            )}
          </div>
        </section>

        {/* Asignaturas Section */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold flex items-center gap-2">
              Asignaturas <span className="text-primary font-normal text-sm bg-primary/10 px-2 py-0.5 rounded-full">({stats.subjects})</span>
            </h3>
          </div>
          <div className="space-y-3">
            {appRole === 'teacher' ? (
              Array.from(new Set(assignments.map(a => a.subject_id))).map((subId, idx) => {
                const subName = subjectsData.find(s => s.id === subId)?.name || 'Cargando...';
                const style = getSubjectIcon(subName)
                const Icon = style.icon
                return (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all group">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-110", 
                      `bg-${style.color}-50 dark:bg-${style.color}-900/20 text-${style.color}-500`)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{subName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">Carga activa en {assignments.filter(a => a.subject_id === subId).length} grupos</p>
                    </div>
                    <Target className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                )
              })
            ) : (
                subjectsData.slice(0, 4).map((sub: any) => {
                  const style = getSubjectIcon(sub.name)
                  const Icon = style.icon
                  return (
                    <div key={sub.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all group">
                       <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-110", 
                        `bg-${style.color}-50 dark:bg-${style.color}-900/20 text-${style.color}-500`)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{sub.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Código: {sub.id.slice(0,4)}</p>
                      </div>
                      <Target className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  )
                })
            )}
          </div>
        </section>

        {/* Tasks Progress Section */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Mis tareas</h3>
            <Link to="/dashboard/todos" className="text-primary text-xs font-bold uppercase tracking-wider">Ver todas</Link>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-7">
            {todos.length > 0 ? (
              todos.slice(0, 3).map((todo: any) => {
                const progress = todo.status === 'completed' ? 100 : (todo.status === 'in-progress' ? 50 : 10)
                const color = todo.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                return (
                  <div key={todo.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="max-w-[80%]">
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">{todo.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Prioridad: {todo.priority}</p>
                      </div>
                      <span className={cn("text-[11px] font-black", color.replace('bg-', 'text-'))}>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin tareas pendientes</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
