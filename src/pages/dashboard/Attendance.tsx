import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  CheckCircle,
  Loader2,
  Search,
  FileText,
  CalendarDays,
  BookOpen,
  Plus,
  ArrowRight,
  ArrowLeft,
  User,
  History,
  TrendingUp,
  Users,
  XCircle,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

// Types
type Student = {
  id: number;
  first_name: string;
  last_name: string;
  grade_id: number;
  state?: boolean;
};



type StudentWithStatus = Student & {
  status?: 'present' | 'late' | 'absent' | 'excused';
  justified?: boolean;
  subject_id?: number;
  avatarColor?: string;
}

type UserRole = 'admin' | 'teacher' | 'coordinator' | null;

// (Profile interface removed as it was unused)

interface AttendanceSession {
  date: string;
  grade_id: number;
  subject_id: number;
  teacher_id: string;
  grade_name: string;
  subject_name: string;
  teacher_name: string;
  present_count: number;
  absent_count: number;
  late_count: number;
  total_students: number;
  processed_count: number;
  all_processed: boolean;
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-blue-100 text-blue-600',
  'bg-pink-100 text-pink-600',
  'bg-orange-100 text-orange-600',
  'bg-green-100 text-green-600',
]

export default function AttendancePage() {
  const [view, setView] = useState<'dashboard' | 'taking'>('dashboard')
  const [students, setStudents] = useState<StudentWithStatus[]>([])
  const [grades, setGrades] = useState<{id: number, name: string}[]>([])
  const [subjects, setSubjects] = useState<{id: number, name: string}[]>([])
  const [teachers, setTeachers] = useState<{id: string, full_name: string}[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [appRole, setAppRole] = useState<UserRole>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // View: Taking State
  const [sessionForm, setSessionForm] = useState({
    gradeId: "",
    subjectId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    teacherId: ""
  })

  const supabase = createClient()

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      const role = (profile as any)?.role as UserRole;
      setAppRole(role);

      if (role !== 'teacher') {
        const { data: teachersData } = await supabase.from('profiles').select('id, full_name').in('role', ['teacher', 'coordinator', 'admin']);
        setTeachers(teachersData || []);
      }

      // Load all grades and subjects
      let gradesQuery = supabase.from("grades").select("id, name").eq("state", true).order("name");
      let subjectsQuery = supabase.from("subjects").select("id, name").order("name");

      if (role === 'teacher') {
        const { data: assignments } = await supabase
          .from('assignments')
          .select('grade_id, subject_id')
          .eq('teacher_id', user.id)
          .eq('state', true);

        const assignmentList = assignments as any[];
        const gradeIds = assignmentList?.map(a => a.grade_id) || [];
        const subjectIds = assignmentList?.map(a => a.subject_id) || [];

        gradesQuery = gradesQuery.in('id', gradeIds);
        subjectsQuery = subjectsQuery.in('id', subjectIds);
      }

      const [gRes, sRes] = await Promise.all([gradesQuery, subjectsQuery]);
      setGrades(gRes.data || []);
      setSubjects(sRes.data || []);

      await fetchSessions(role, user.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async (role: UserRole, userId: string) => {
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          date,
          status,
          subject_id,
          teacher_id,
          processed,
          students!inner(grade_id, grades!inner(name)),
          subjects!inner(name),
          profiles!inner(full_name)
        `)
        .eq('date', filterDate);

      if (role === 'teacher') {
        query = query.eq('teacher_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group records into logical sessions
      const groups: { [key: string]: AttendanceSession } = {};

      (data || []).forEach((row: any) => {
        const key = `${row.date}-${row.students.grade_id}-${row.subject_id}-${row.teacher_id}`;
        if (!groups[key]) {
          groups[key] = {
            date: row.date,
            grade_id: row.students.grade_id,
            subject_id: row.subject_id,
            teacher_id: row.teacher_id,
            grade_name: row.students.grades.name,
            subject_name: row.subjects.name,
            teacher_name: row.profiles.full_name,
            present_count: 0,
            absent_count: 0,
            late_count: 0,
            total_students: 0,
            processed_count: 0,
            all_processed: false
          };
        }

        groups[key].total_students++;
        if (row.status === 'present') groups[key].present_count++;
        else if (row.status === 'absent') {
          groups[key].absent_count++;
          if (row.processed) groups[key].processed_count++;
        }
        else if (row.status === 'late') {
          groups[key].late_count++;
          if (row.processed) groups[key].processed_count++;
        }
      });

      const sessionList = Object.values(groups).map(s => ({
        ...s,
        all_processed: s.absent_count + s.late_count > 0 && s.processed_count === (s.absent_count + s.late_count)
      }));

      setSessions(sessionList);
    } catch (err: any) {
      toast.error('Error al cargar sesiones', { description: err.message });
    }
  }

  const markSessionAsProcessed = async (session: AttendanceSession) => {
    try {
      const { error } = await (supabase as any)
        .from('attendance_records')
        .update({ processed: true })
        .eq('date', session.date)
        .eq('subject_id', session.subject_id)
        .eq('teacher_id', session.teacher_id)
        .in('status', ['absent', 'late']);

      if (error) throw error;
      toast.success('Sesión marcada como procesada');
      fetchSessions(appRole, currentUserId as string);
    } catch (err: any) {
      toast.error('Error al actualizar', { description: err.message });
    }
  }

  const startTakingAttendance = async (config: typeof sessionForm) => {
    if (!config.gradeId || !config.subjectId) {
      toast.error('Selecciona Grado y Asignatura');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Students of the grade
      const { data: studentsData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('grade_id', parseInt(config.gradeId))
        .eq('state', true)
        .order('first_name', { ascending: true });

      if (sErr) throw sErr;

      // 2. Fetch existing records for this session
      const { data: attData } = await supabase
        .from('attendance_records')
        .select('student_id, status, justified')
        .eq('date', config.date)
        .eq('subject_id', parseInt(config.subjectId))
        .eq('teacher_id', config.teacherId || (currentUserId as string));

      const merged = (studentsData || []).map((s: any, index: number) => {
        const record = (attData as any[])?.find(a => a.student_id === s.id);
        return {
          ...s,
          status: record?.status,
          justified: record?.justified || false,
          avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length]
        }
      });

      setStudents(merged);
      setSessionForm({
        gradeId: "",
        subjectId: "",
        date: config.date,
        teacherId: ""
      });
      setView('taking');
    } catch (err: any) {
      toast.error('Error al iniciar clase', { description: err.message });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (view === 'dashboard' && appRole && currentUserId) {
      fetchSessions(appRole, currentUserId as string);
    }
  }, [filterDate, view, appRole, currentUserId])

  const handleStatusChange = async (studentId: number, status: 'present' | 'late' | 'absent' | 'excused') => {
    try {
      const { error } = await (supabase.from('attendance_records') as any)
        .upsert({
          student_id: studentId,
          date: sessionForm.date,
          subject_id: parseInt(sessionForm.subjectId),
          teacher_id: sessionForm.teacherId || currentUserId,
          status
        }, { onConflict: 'student_id, date, subject_id' })

      if (error) throw error
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    }
  }

  const handleSaveAndFinish = async () => {
    const unmarked = students.filter(s => !s.status);
    if (unmarked.length > 0) {
      // Optional: Auto-mark as present if desired, or just warn
      // For now, let's just finish if at least some were marked
    }
    setView('dashboard');
    toast.success('Clase completada y guardada');
  }

  const handleMarkRemaining = async () => {
    const unmarked = students.filter(s => !s.status);
    if (unmarked.length === 0) return;

    try {
      const updates = unmarked.map(s => ({
        student_id: s.id,
        date: sessionForm.date,
        subject_id: parseInt(sessionForm.subjectId),
        teacher_id: sessionForm.teacherId || currentUserId,
        status: 'present'
      }));

      const { error } = await (supabase.from('attendance_records') as any).upsert(updates, { onConflict: 'student_id, date, subject_id' });
      if (error) throw error;

      setStudents(prev => prev.map(s => !s.status ? { ...s, status: 'present' } : s));
      toast.success('Resto marcados como presentes');
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    }
  }

  const generateReport = async (session: AttendanceSession) => {
    toast.loading('Generando informe...');
    try {
      const { data: rawSettings } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();
      
      const schoolSettings = rawSettings as any;
      
      const branding = {
        name: schoolSettings?.school_name || 'EDUBETA',
        year: schoolSettings?.academic_year || new Date().getFullYear().toString(),
        logo: schoolSettings?.logo_url || ''
      };

      // 1. Fetch detailed attendance for this session
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          status,
          justified,
          students!inner(first_name, last_name)
        `)
        .eq('date', session.date)
        .eq('subject_id', session.subject_id)
        .eq('teacher_id', session.teacher_id)
        .eq('students.grade_id', session.grade_id);
      
      if (error) throw error;

      // Ordenar por apellido alfabéticamente
      const sortedData = (data || []).sort((a: any, b: any) => 
        (a.students.first_name || '').localeCompare(b.students.first_name || '')
      );

      // 2. Filter only absences (and late?)
      const absences = sortedData.filter((r: any) => r.status === 'absent' || r.status === 'late');

      // 3. Create HTML for printing
      const dateFormatted = format(new Date(session.date + 'T00:00:00'), 'PPP', { locale: es });
      const generationDate = format(new Date(), 'Pp', { locale: es });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Informe de Inasistencia - ${session.subject_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              color: #0f172a; 
              line-height: 1.5; 
              padding: 40px;
              max-width: 850px;
              margin: 0 auto;
            }
            .header-layout { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 2px solid #f1f5f9; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .header-side { width: 180px; }
            .header-center { flex: 1; text-align: center; }
            
            .school-logo { max-height: 60px; max-width: 150px; object-fit: contain; }
            .edubeta-branding { text-align: right; }
            .edubeta-logo { font-size: 18px; font-weight: 900; color: #4f46e5; letter-spacing: -0.05em; }
            .edubeta-tag { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
            
            h1 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.025em; color: #1e293b; text-transform: uppercase; }
            .school-year { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 2px; }
            .report-title-bar { 
              background: #f8fafc; 
              text-align: center; 
              padding: 8px; 
              border-radius: 8px; 
              font-size: 12px; 
              font-weight: 800; 
              color: #4f46e5; 
              text-transform: uppercase; 
              letter-spacing: 0.1em; 
              margin-bottom: 25px;
              border: 1px solid #f1f5f9;
            }
            
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .meta-item { background: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; }
            .meta-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .meta-value { font-size: 13px; font-weight: 700; color: #1e293b; }
            
            .stats-container { display: flex; gap: 10px; margin-bottom: 25px; }
            .stat-badge { padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; flex: 1; text-align: center; }
            .stat-present { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
            .stat-absent { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
            .stat-late { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; }
            th { text-align: left; background: #f8fafc; color: #64748b; padding: 12px 15px; font-size: 10px; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #f1f5f9; }
            td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
            .student-name { font-weight: 700; color: #1e293b; }
            
            .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-layout">
            <div class="header-side">
              ${branding.logo ? `<img src="${branding.logo}" class="school-logo" alt="Logo">` : ''}
            </div>
            <div class="header-center">
              <h1>${branding.name}</h1>
              <div class="school-year">AÑO ESCOLAR: ${branding.year}</div>
            </div>
            <div class="header-side edubeta-branding">
              <div class="edubeta-logo">EDUBETA</div>
              <div class="edubeta-tag">Gestión Escolar</div>
            </div>
          </div>

          <div class="report-title-bar">Informe de Inasistencia</div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Fecha de Clase</div>
              <div class="meta-value">${dateFormatted}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Generado el</div>
              <div class="meta-value">${generationDate}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Sesión Académica</div>
              <div class="meta-value">${session.subject_name} — ${session.grade_name}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Docente: ${session.teacher_name}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Resumen de Asistencia</div>
              <div class="stats-row">
                <span class="stat-badge stat-present">${session.present_count} P</span>
                <span class="stat-badge stat-absent">${session.absent_count} A</span>
                <span class="stat-badge stat-late">${session.late_count} T</span>
              </div>
            </div>
          </div>

          <h2 style="font-size: 14px; font-weight: 900; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">Listado de Inasistencias</h2>
          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th style="width: 120px; text-align: center;">Estado</th>
                <th style="width: 120px; text-align: center;">Justificado</th>
              </tr>
            </thead>
            <tbody>
              ${absences.length > 0 ? absences.map((r: any) => `
                <tr>
                  <td style="font-weight: 700;">${r.students.first_name.toUpperCase()}, ${r.students.last_name}</td>
                  <td style="text-align: center; color: ${r.status === 'absent' ? '#dc2626' : '#ea580c'}; font-weight: 800; font-size: 10px;">${r.status === 'absent' ? 'AUSENTE' : 'TARDE'}</td>
                  <td style="text-align: center; font-weight: 700;">${r.justified ? 'SÍ' : 'NO'}</td>
                </tr>
              `).join('') : `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 40px;">No se registraron inasistencias en esta sesión.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            Este documento es un reporte oficial de la plataforma EduBeta.
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 100);
            };
          </script>
        </body>
        </html>
      `;

      // 4. Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        throw new Error('No se pudo abrir la ventana de impresión (bloqueador de popups)');
      }
      
      toast.dismiss();
    } catch (err: any) {
      toast.dismiss();
      console.error(err);
      toast.error('Error al generar informe', { description: err.message });
    }
  };

  const handleJustify = async (studentId: number, justified: boolean) => {
    try {
      const { error } = await (supabase.from('attendance_records') as any)
        .update({ justified })
        .eq('student_id', studentId)
        .eq('date', sessionForm.date)
        .eq('subject_id', parseInt(sessionForm.subjectId));

      if (error) throw error;

      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, justified } : s));
      toast.success(justified ? 'Justificación recibida' : 'Justificación removida');
    } catch (error: any) {
      toast.error('Error al justificar', { description: error.message });
    }
  };

  if (loading && view === 'dashboard') return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark pb-20 lg:pb-0">
      {view === 'dashboard' ? (
        <>
          {/* Dashboard Header */}
          <header className="px-5 pt-8 pb-6 bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Control de Asistencia</h1>
                <p className="text-xs text-slate-500 font-medium tracking-tight">Optimiza el registro y seguimiento diario</p>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center justify-center gap-2 w-full sm:w-max px-8 py-3.5 bg-primary text-white rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 group">
                    <Plus className="w-5 h-5 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
                    <span className="font-extrabold text-xs uppercase tracking-widest">Nueva Lista de Clase</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tomar inasistencia</DialogTitle>
                    <DialogDescription>
                      Selecciona los detalles de la clase para comenzar a registrar la asistencia de los estudiantes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <input
                        type="date"
                        value={sessionForm.date}
                        onChange={e => setSessionForm({...sessionForm, date: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grado</Label>
                      <select
                        value={sessionForm.gradeId}
                        onChange={e => setSessionForm({...sessionForm, gradeId: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border rounded-xl"
                      >
                        <option value="">Seleccionar Grado</option>
                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Asignatura</Label>
                      <select
                        value={sessionForm.subjectId}
                        onChange={e => setSessionForm({...sessionForm, subjectId: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border rounded-xl"
                      >
                        <option value="">Seleccionar Asignatura</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {(appRole === 'admin' || appRole === 'coordinator') && (
                      <div className="space-y-2">
                        <Label>Docente</Label>
                        <select
                          value={sessionForm.teacherId}
                          onChange={e => setSessionForm({...sessionForm, teacherId: e.target.value})}
                          className="w-full p-2.5 bg-slate-50 border rounded-xl"
                        >
                          <option value="">(Tú mismo)</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => startTakingAttendance(sessionForm)}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs"
                    >
                      INICIAR
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Clases Hoy</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {sessions.length}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Ausentes</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {sessions.reduce((acc, s) => acc + s.absent_count, 0)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Tardanzas</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {sessions.reduce((acc, s) => acc + s.late_count, 0)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Asistencia Promedio</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {sessions.length > 0
                  ? Math.round((sessions.reduce((acc, s) => acc + (s.present_count / s.total_students), 0) / sessions.length) * 100)
                  : 0}%
              </h3>
            </div>
          </div>

          {/* List Section */}
          <div className="px-5 pb-5">
            <div className="flex flex-col gap-3 mb-6 px-1">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Historial de Sesiones
              </h2>
              <div className="relative w-full sm:w-48">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border-2 border-dashed rounded-3xl py-20 px-10 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">Sin sesiones para este día</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Haz clic en Nueva Lista para comenzar a tomar asistencia.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => startTakingAttendance({
                      gradeId: String(s.grade_id),
                      subjectId: String(s.subject_id),
                      date: s.date,
                      teacherId: s.teacher_id
                    })}
                    className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black text-primary uppercase tracking-wider">{s.grade_name}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(s.date + 'T00:00:00'), 'dd MMM', { locale: es })}</span>
                          {s.all_processed && s.absent_count + s.late_count > 0 && (
                            <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-[8px] font-black uppercase tracking-tighter flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Procesado
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{s.subject_name}</h3>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                          <User className="w-3 h-3" /> {s.teacher_name}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                         <div className="flex gap-1.5 justify-end">
                            <div className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-md text-[9px] font-black">{s.present_count}P</div>
                            <div className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md text-[9px] font-black">{s.absent_count}A</div>
                            <div className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-md text-[9px] font-black">{s.late_count}T</div>
                         </div>
                          <div className="flex items-center gap-2">
                            {/* Report Button - Visible for everyone but with a focus on roles */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                generateReport(s);
                              }}
                              className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 hover:text-primary transition-colors"
                              title="Imprimir informe de inasistencias"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Mark as Processed - Only for Admin/Coordinator */}
                            {(appRole === 'admin' || appRole === 'coordinator') && s.absent_count + s.late_count > 0 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!s.all_processed) markSessionAsProcessed(s);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  s.all_processed 
                                    ? "bg-green-50 text-green-500 dark:bg-green-900/20" 
                                    : "bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-green-500"
                                )}
                                title={s.all_processed ? "Reportado a padres" : "Marcar como reportado a padres"}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Taking Attendance View */}
          <header className="px-5 py-4 bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('dashboard')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                  {subjects.find(s => String(s.id) === sessionForm.subjectId)?.name || 'Clase'}
                </h1>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">
                  {grades.find(g => String(g.id) === sessionForm.gradeId)?.name} • {format(new Date(sessionForm.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </header>

          <div className="p-4 space-y-4">
            {/* Quick Filter & Mark Remaining */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en esta lista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none transition-all shadow-sm focus:shadow-md"
                />
              </div>
              <button
                onClick={handleMarkRemaining}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-primary text-primary rounded-2xl hover:bg-primary hover:text-white transition-all text-xs font-black uppercase shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                MARCAR RESTANTES COMO PRESENTES
              </button>
            </div>

            {/* Attendance Stats for this session */}
            <div className="flex gap-4 px-1">
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {students.filter(s => s.status === 'present').length} PRESENTES
              </div>
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {students.filter(s => s.status === 'absent').length} AUSENTES
              </div>
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> {students.filter(s => s.status === 'late').length} TARDES
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-2 pb-20">
              {students
                .filter(s => `${s.first_name}, ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    "flex flex-col p-4 bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 shadow-sm",
                    student.status ? "border-slate-100 dark:border-slate-700" : "border-orange-100 dark:border-orange-900/20 bg-orange-50/10"
                  )}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {/* Avatar */}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner transition-all duration-500",
                      student.status === 'present' ? "bg-green-100 text-green-600 scale-110" :
                      student.status === 'absent' ? "bg-red-100 text-red-600" :
                      student.status === 'late' ? "bg-yellow-100 text-yellow-600" :
                      student.avatarColor
                    )}>
                      {student.first_name[0]}{student.last_name[0]}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">ID# {student.id}</span>
                        {student.justified && student.status === 'absent' && (
                          <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-[8px] font-black uppercase tracking-tighter">Justificada</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight truncate pr-2">
                        {student.first_name}, {student.last_name}
                      </h3>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 font-bold text-[10px] uppercase tracking-wider",
                        student.status === 'present' ? "bg-green-500 text-white shadow-lg shadow-green-200" : "bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800"
                      )}
                    >
                      <CheckCircle className="w-4 h-4" /> Presente
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 font-bold text-[10px] uppercase tracking-wider",
                        student.status === 'absent' ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800"
                      )}
                    >
                      <XCircle className="w-4 h-4" /> Ausente
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'late')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 font-bold text-[10px] uppercase tracking-wider",
                        student.status === 'late' ? "bg-yellow-500 text-white shadow-lg shadow-yellow-200" : "bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800"
                      )}
                    >
                      <Clock className="w-4 h-4" /> Tarde
                    </button>
                  </div>

                  {/* Justification toggle - only if absent */}
                  {student.status === 'absent' && (
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">¿Tiene justificación válida?</p>
                       <button
                        onClick={() => handleJustify(student.id, !student.justified)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border",
                          student.justified
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200"
                        )}
                       >
                         <FileText className="w-3 h-3" />
                         {student.justified ? "Justificada" : "Marcar Justificación"}
                       </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Bar with Finalize Button */}
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex justify-center z-50">
            <button
              onClick={handleSaveAndFinish}
              className="w-full max-w-md py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 active:scale-95 transition-all text-sm"
            >
              FINALIZAR ASISTENCIA
            </button>
          </div>
        </>
      )}
    </div>
  )
}
