import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  UserCheck,
  ChevronDown,
  BookOpen,
  LayoutGrid,
  CheckCircle2,
  School
} from 'lucide-react'

export default function DashboardPage() {
  const { profile: userProfile, firebaseUser } = useUserProfile()
  const { data: gradesData = [] } = useGrades()
  const { data: subjectsData = [] } = useSubjects()
  
  const [stats, setStats] = useState({ students: 0, teachers: 0, attendance: 0, grades: 0, subjects: 0 })
  const [assignments, setAssignments] = useState<any[]>([])
  const [todos, setTodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Accordion states
  const [openGrades, setOpenGrades] = useState(true)
  const [openSubjects, setOpenSubjects] = useState(false)
  const [openTasks, setOpenTasks] = useState(true)

  useEffect(() => {
    if (!userProfile || !firebaseUser) return

    async function getInitialData() {
      try {
        const user = firebaseUser!
        const role = userProfile!.role
        const today = new Date().toISOString().split('T')[0]

        // 2. Fetch Stats based on Role
        let studentCount = 0;
        let teacherCount = 0;
        let presentCount = 0;

        if (role === 'admin' || role === 'coordinator') {
          // Global Stats
          const [sSnap, tSnap, pSnap] = await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(query(collection(db, "profiles"), where("role", "==", "teacher"))),
            getDocs(query(collection(db, "attendance_records"), where("date", "==", today), where("status", "==", "present")))
          ]);
          studentCount = sSnap.size;
          teacherCount = tSnap.size;
          presentCount = pSnap.size;
        } else {
          // Teacher Stats
          const assSnap = await getDocs(query(collection(db, "assignments"), where("teacher_id", "==", user.uid), where("state", "==", true)));
          const assignmentsData = assSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const gradeIds = Array.from(new Set(assignmentsData.map((a: any) => a.grade_id)));
          const subjectIds = Array.from(new Set(assignmentsData.map((a: any) => a.subject_id)));
          
          setStats(prev => ({ ...prev, grades: gradeIds.length, subjects: subjectIds.length }));
          
          // No necesitamos cargar names desde db porque usamos la cache de react-query
          const todosSnap = await getDocs(query(collection(db, "todos"), where("user_id", "==", user.uid), where("completed", "==", false)));
          const todosData = todosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          setAssignments(assignmentsData);
          setTodos(todosData);


          if (gradeIds.length > 0) {
            // Firestore doesn't support easy "IN" for large arrays or complex joins
            // We fetch and filter in memory if needed, but for small sets getDocs is fine
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

        setStats(prev => ({ 
          ...prev, 
          students: studentCount, 
          teachers: teacherCount, 
          attendance: presentCount 
        }))
        
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialData()
  }, [userProfile, firebaseUser])

  // Sync Global counts when Cache Loads (only for Admin)
  useEffect(() => {
    if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'coordinator')) {
      setStats(prev => ({
        ...prev,
        grades: gradesData.length,
        subjects: subjectsData.length
      }))
    }
  }, [gradesData.length, subjectsData.length, userProfile]);

  const gradeMap = useMemo(() => new Map(gradesData.map(d => [d.id, d.name])), [gradesData]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full pt-20 text-slate-400 font-semibold uppercase tracking-widest text-xs">Cargando dashboard...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen overflow-y-auto">
      {/* Header local - Solo visible en desktop */}
      <header className="hidden lg:flex h-16 bg-white dark:bg-[#1a182e] border-b border-slate-200 dark:border-slate-800 items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white uppercase tracking-tight">Panel Principal</h2>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">{userProfile?.full_name}</p>
              <p className="text-[10px] font-medium text-primary uppercase tracking-tighter">{userProfile?.role}</p>
           </div>
           <Link to="/dashboard/profile" className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden transition-all hover:ring-2 hover:ring-primary/20 group">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-black text-xs group-hover:scale-110 transition-transform">{userProfile ? getInitials(userProfile.full_name) : 'JB'}</span>
              )}
           </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* Card 1: Total Students */}
          <div className="bg-primary text-white rounded-2xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium mb-1 opacity-80 uppercase tracking-wider">
                  {userProfile?.role === 'admin' ? 'Total Estudiantes' : 'Mis Estudiantes'}
                </p>
                <h3 className="text-4xl font-semibold tracking-tight">{stats.students}</h3>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Users className="text-white w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 2: Attendance Rate */}
          <div className="bg-white dark:bg-[#1e1c30] rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Asistencia Hoy</p>
                <h3 className="text-4xl font-semibold text-slate-800 dark:text-white">{stats.attendance}%</h3>
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

          {/* Card 3: Docentes (Admin only) */}
          {(userProfile?.role === 'admin' || userProfile?.role === 'coordinator') && (
            <div className="bg-white dark:bg-[#1e1c30] rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Docentes</p>
                  <h3 className="text-4xl font-semibold text-slate-800 dark:text-white">{stats.teachers}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <UserCheck className="text-primary dark:text-blue-400 w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Total Grades */}
          <div className="bg-white dark:bg-[#1e1c30] rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Grados/Grupos</p>
                <h3 className="text-4xl font-semibold text-slate-800 dark:text-white">{stats.grades}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                <School className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 5: Total Subjects */}
          <div className="bg-white dark:bg-[#1e1c30] rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Asignaturas</p>
                <h3 className="text-4xl font-semibold text-slate-800 dark:text-white">{stats.subjects}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Global Accordion Section: General for all but specially for teacher grouping */}
        <div className="space-y-4">
          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Resumen de Actividad</h4>
          
          {/* Accordion List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Tareas (All roles) */}
            <div className="bg-white dark:bg-[#1e1c30] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <button 
                onClick={() => setOpenTasks(!openTasks)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-400 uppercase leading-none mb-1">Mis Tareas</p>
                    <h5 className="font-black text-slate-800 dark:text-white text-lg">
                      {todos.length} Tareas
                    </h5>
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", openTasks && "rotate-180")} />
              </button>
              
              {openTasks && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider pb-4">
                    <div className="flex flex-col items-center gap-1 flex-1 text-center">
                      <span className="text-slate-400">Pends</span>
                      <span className="text-lg text-slate-600 dark:text-slate-300">{todos.filter(t => t.status === 'pendiente').length}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-800/50" />
                    <div className="flex flex-col items-center gap-1 flex-1 text-center">
                      <span className="text-blue-500">Activas</span>
                      <span className="text-lg text-blue-600 dark:text-blue-400">{todos.filter(t => t.status === 'activa').length}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-800/50" />
                    <div className="flex flex-col items-center gap-1 flex-1 text-center">
                      <span className="text-green-500">Hechas</span>
                      <span className="text-lg text-green-600 dark:text-green-400">{todos.filter(t => t.status === 'cumplida').length}</span>
                    </div>
                  </div>
                  <Link 
                    to="/dashboard/todos" 
                    className="flex items-center justify-center w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Ver todas las tareas
                  </Link>
                </div>
              )}
            </div>

            {/* Teacher Specific Accordions */}
            {userProfile?.role === 'teacher' && (
              <>
                {/* Grupos */}
                <div className="bg-white dark:bg-[#1e1c30] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <button 
                    onClick={() => setOpenGrades(!openGrades)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-400 uppercase leading-none mb-1">Carga Salones</p>
                        <h5 className="font-black text-slate-800 dark:text-white text-lg">
                          {Array.from(new Set(assignments.map(a => a.grade_id))).length} Grupos
                        </h5>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", openGrades && "rotate-180")} />
                  </button>
                  
                  {openGrades && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="pt-2 border-t border-slate-50 dark:border-slate-800/50 grid grid-cols-2 gap-2">
                        {Array.from(new Set(assignments.map(a => a.grade_id)))
                          .filter(Boolean)
                          .sort((a, b) => (gradeMap.get(a) || '').localeCompare(gradeMap.get(b) || ''))
                          .map((gradeId, idx) => (
                            <div key={idx} className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {gradeMap.get(gradeId) || 'N/A'}
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Asignaturas */}
                <div className="bg-white dark:bg-[#1e1c30] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <button 
                    onClick={() => setOpenSubjects(!openSubjects)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-400 uppercase leading-none mb-1">Asignaturas</p>
                        <h5 className="font-black text-slate-800 dark:text-white text-lg">
                          {Array.from(new Set(assignments.map(a => a.subject_id))).length} Asignaturas
                        </h5>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", openSubjects && "rotate-180")} />
                  </button>
                  
                  {openSubjects && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="pt-2 border-t border-slate-50 dark:border-slate-800/50 space-y-1">
                        {Array.from(new Set(assignments.map(a => a.subjects?.name)))
                          .filter(Boolean)
                          .sort()
                          .map((subjectName, idx) => (
                            <div key={idx} className="px-3 py-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg text-[9px] font-semibold text-orange-700 dark:text-orange-400 flex items-center justify-between">
                              <span>{subjectName}</span>
                              <span className="text-[8px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-orange-100 dark:border-orange-800/50">
                                {assignments.filter(a => a.subjects?.name === subjectName).length} Grupos
                              </span>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          {userProfile?.role === 'teacher' && assignments.length === 0 && (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-medium">
              No tienes asignaciones registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
