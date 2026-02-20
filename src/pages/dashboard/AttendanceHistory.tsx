import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Search, 
  School,
  FileText,
  Filter,
  ArrowLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  XCircle,
  RefreshCcw,
  MessageSquare,
  Check,
  BookOpen,
  User,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type AttendanceRecord = {
  id: number;
  student_id: number;
  date: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  justified: boolean;
  processed: boolean;
  subject_id: number;
  teacher_id: string;
  student: {
    first_name: string;
    last_name: string;
    grade_id: number;
  };
  subject: {
    name: string;
  };
  teacher: {
    full_name: string;
  };
}

type UserRole = 'admin' | 'teacher' | 'coordinator' | null;

interface Profile {
  role: UserRole;
}

interface Grade {
  id: number;
  name: string;
}

export default function AttendanceHistory() {
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [subjects, setSubjects] = useState<Grade[]>([])
  const [userRole, setUserRole] = useState<UserRole>(null)
  
  // Filters
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState("")
  const [filterGradeId, setFilterGradeId] = useState<string>("")
  const [filterSubjectId, setFilterSubjectId] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("absent") // Default to see absences
  const [filterProcessed, setFilterProcessed] = useState<string>("all")

  const supabase = createClient()

  const fetchData = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    else setIsRefreshing(true);

    try {
      // 0. Get Current User and Role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = (profile as unknown as Profile)?.role as UserRole;
      setUserRole(role);

      // 1. Get Grades and Subjects based on Role (to populate filters)
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
      
      const [{ data: gradesData }, { data: subjectsData }] = await Promise.all([
        gradesQuery,
        subjectsQuery
      ]);
      
      setGrades((gradesData as unknown as Grade[]) || []);
      setSubjects((subjectsData as unknown as Grade[]) || []);

      // 2. Fetch Attendance Records
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          date,
          status,
          justified,
          processed,
          subject_id,
          teacher_id,
          student:students (
            first_name,
            last_name,
            grade_id
          ),
          subject:subjects (
            name
          ),
          teacher:profiles!attendance_records_teacher_id_fkey (
            full_name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (role === 'teacher') {
        const gradeIds = (gradesData as any[])?.map(g => g.id) || [];
        query = query.in('student.grade_id', gradeIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data as unknown as AttendanceRecord[]);

    } catch (error: any) {
      toast.error('Error al cargar historial', { description: error.message });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleJustification = async (recordId: number, currentJustified: boolean) => {
    try {
      const { error } = await (supabase
        .from('attendance_records') as any)
        .update({ justified: !currentJustified })
        .eq('id', recordId);

      if (error) throw error;

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, justified: !currentJustified } : r));
      toast.success(!currentJustified ? 'Inasistencia justificada' : 'Justificación removida');
    } catch (error: any) {
      toast.error('Error al actualizar registro', { description: error.message });
    }
  };

  const handleToggleProcessed = async (recordId: number, currentProcessed: boolean) => {
    try {
      const { error } = await (supabase
        .from('attendance_records') as any)
        .update({ processed: !currentProcessed })
        .eq('id', recordId);

      if (error) throw error;

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, processed: !currentProcessed } : r));
      toast.success(!currentProcessed ? 'Marcado como procesado' : 'Marcado como pendiente');
    } catch (error: any) {
      toast.error('Error al actualizar estado', { description: error.message });
    }
  };

  const handleNotifyWhatsApp = (record: AttendanceRecord) => {
    const studentName = `${record.student.first_name} ${record.student.last_name}`;
    const dateStr = format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy');
    const statusText = record.status === 'absent' ? 'ausente' : 'tarde';
    const justifiedText = record.justified ? ' (Con justificación)' : ' (Sin justificar)';
    
    const message = `Estimado representante, le informamos que el estudiante *${studentName}* se reportó *${statusText}* en la clase de *${record.subject.name}* el día *${dateStr}*${justifiedText}. Por favor estar al tanto. Saludos de EduBeta.`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateReport = async (record: AttendanceRecord) => {
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

      // 1. Fetch all absences for this specific session (same date, grade, subject, teacher)
      const { data: sessionStats } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('date', record.date)
        .eq('subject_id', record.subject_id)
        .eq('teacher_id', record.teacher_id);

      const { data: rawAbsences, error } = await supabase
        .from('attendance_records')
        .select(`
          status,
          justified,
          student_id,
          students!inner(first_name, last_name)
        `)
        .eq('date', record.date)
        .eq('subject_id', record.subject_id)
        .eq('teacher_id', record.teacher_id)
        .in('status', ['absent', 'late']);

      if (error) throw error;

      // Ordenar por apellido alfabéticamente
      const sortedAbsences = (rawAbsences || []).sort((a: any, b: any) => 
        (a.students.first_name || '').localeCompare(b.students.first_name || '')
      );

      const stats = {
        present: (sessionStats || []).filter((s: any) => s.status === 'present').length,
        absent: (sessionStats || []).filter((s: any) => s.status === 'absent').length,
        late: (sessionStats || []).filter((s: any) => s.status === 'late').length,
      };

      // 2. HTML to Print
      const dateFormatted = format(new Date(record.date + 'T00:00:00'), 'PPP', { locale: es });
      const generationDate = format(new Date(), 'Pp', { locale: es });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Inasistencia - ${record.subject.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              color: #0f172a; 
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
            .stat-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid transparent; flex: 1; text-align: center; }
            .stat-present { background: #f0fdf4; color: #16a34a; border-color: #dcfce7; }
            .stat-absent { background: #fef2f2; color: #dc2626; border-color: #fee2e2; }
            .stat-late { background: #fff7ed; color: #ea580c; border-color: #ffedd5; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
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
              <div class="meta-label">Fecha de la Clase</div>
              <div class="meta-value">${dateFormatted}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Fecha de Generación</div>
              <div class="meta-value">${generationDate}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Detalles de la Materia</div>
              <div class="meta-value">${record.subject.name} — ${grades.find(g => g.id === record.student.grade_id)?.name}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Profesor(a): ${record.teacher.full_name}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Resumen Global de Sesión</div>
              <div class="stats-row">
                <span class="stat-badge stat-present">${stats.present} Presentes</span>
                <span class="stat-badge stat-absent">${stats.absent} Ausentes</span>
                <span class="stat-badge stat-late">${stats.late} Tardes</span>
              </div>
            </div>
          </div>

          <h2 style="font-size: 13px; font-weight: 900; margin: 20px 0 10px; text-transform: uppercase;">Listado de Estudiantes Reportados</h2>
          <table>
            <thead>
              <tr>
                <th style="border-radius: 8px 0 0 0;">Estudiante</th>
                <th style="width: 100px; text-align: center;">Estado</th>
                <th style="width: 100px; text-align: center; border-radius: 0 8px 0 0;">Justificado</th>
              </tr>
            </thead>
            <tbody>
              ${(sortedAbsences || []).map((r: any) => `
                <tr>
                  <td style="font-weight: 600;">${r.students.first_name.toUpperCase()}, ${r.students.last_name}</td>
                  <td style="text-align: center; font-weight: 800; font-size: 10px; color: ${r.status === 'absent' ? '#dc2626' : '#ea580c'}">${r.status === 'absent' ? 'AUSENTE' : 'TARDE'}</td>
                  <td style="text-align: center; font-weight: 600;">${r.justified ? 'SÍ' : 'NO'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Este reporte es generado digitalmente y es prueba oficial de la toma de asistencia.<br>
            EduBeta © ${new Date().getFullYear()} — Gestión Educativa Digital
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
      
      toast.dismiss();
    } catch (err: any) {
      toast.dismiss();
      toast.error('Error al generar informe', { description: err.message });
    }
  };
  const filteredRecords = records.filter(r => {
    const matchesSearch = `${r.student.first_name}, ${r.student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGradeId === "" || String(r.student.grade_id) === filterGradeId;
    const matchesSubject = filterSubjectId === "" || String(r.subject_id) === filterSubjectId;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesProcessed = filterProcessed === "all" || (filterProcessed === "true" ? r.processed : !r.processed);
    return matchesSearch && matchesGrade && matchesSubject && matchesStatus && matchesProcessed;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'present': return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3" /> Presente</div>;
      case 'late': return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] font-bold uppercase"><Clock className="w-3 h-3" /> Tarde</div>;
      case 'absent': return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold uppercase"><XCircle className="w-3 h-3" /> Ausente</div>;
      default: return null;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark pb-20 lg:pb-0">
      {/* Header */}
      <header className="px-5 py-4 bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-1">
          <Link to="/dashboard/attendance" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Historial de Asistencia</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium ml-10">Consulta y gestiona registros escolares</p>
      </header>
      
      {/* Filters Area */}
      <div className="p-4 space-y-4">
        {/* Date Range & Refresh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-1 ml-1">Desde</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-1 ml-1">Hasta</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
             <button 
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 h-[41px] bg-slate-900 dark:bg-primary text-white rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              <span className="text-sm font-semibold">Cargar Historial</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select 
              value={filterGradeId}
              onChange={(e) => setFilterGradeId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
            >
              <option value="">Todos los Grados</option>
              {grades.map(g => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select 
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
            >
              <option value="">Todas las Materias</option>
              {subjects.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
            >
              <option value="all">Todos los Estados</option>
              <option value="absent">Solo Inasistencias</option>
              <option value="late">Solo Llegadas Tarde</option>
              <option value="present">Solo Presente</option>
            </select>
          </div>
        </div>

        {/* Filters Row 2 - Processed (Visible for Admin/Coord) */}
        {(userRole === 'admin' || userRole === 'coordinator') && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
             <div className="relative">
              <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select 
                value={filterProcessed}
                onChange={(e) => setFilterProcessed(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
              >
                <option value="all">Filtro de Gestión (Todo)</option>
                <option value="false">Pendientes por notificar</option>
                <option value="true">Ya procesados</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Title */}
      <div className="px-5 py-2 flex items-center justify-between">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {filteredRecords.length} Registros encontrados
         </span>
      </div>

      {/* Main Content */}
      <div className="px-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Buscando en los archivos...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-800 border rounded-2xl border-dashed">
            <AlertCircle className="w-10 h-10 text-slate-300" />
            <div className="text-center">
              <p className="text-slate-900 dark:text-white font-bold">No se encontraron registros</p>
              <p className="text-xs text-slate-500 mt-1">Intenta ajustando los filtros de búsqueda</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredRecords.map((record) => (
              <div 
                key={record.id}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] group relative overflow-hidden"
              >
                {record.justified && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-green-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
                       Justificada
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Left: Indicator */}
                  <div className={cn(
                    "w-1 h-12 rounded-full",
                    record.status === 'absent' ? "bg-red-500" : 
                    record.status === 'late' ? "bg-yellow-500" : "bg-green-500"
                  )} />

                  {/* Middle: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {format(new Date(record.date + 'T00:00:00'), 'EEEE, d MMM yyyy')}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="text-[10px] font-bold text-primary uppercase">
                        {grades.find(g => g.id === record.student.grade_id)?.name}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        {record.subject?.name}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white truncate uppercase">
                      {record.student.first_name}, {record.student.last_name}
                    </h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      Dictado por: {record.teacher?.full_name || 'Desconocido'}
                    </p>
                  </div>

                  {/* Right: Actions/Badge */}
                  <div className="flex flex-col items-end gap-2 text-right">
                    <div className="flex items-center gap-2">
                       {record.status !== 'present' && (
                        <button 
                          onClick={() => handleNotifyWhatsApp(record)}
                          className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm shadow-green-200 dark:shadow-none"
                          title="Notificar por WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                       )}
                       <button 
                         onClick={() => generateReport(record)}
                         className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg transition-colors hover:text-primary"
                         title="Imprimir informe de inasistencia"
                       >
                         <FileText className="w-4 h-4" />
                       </button>
                       {getStatusBadge(record.status)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {record.status === 'absent' && (
                        <button
                          onClick={() => handleToggleJustification(record.id, record.justified)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border",
                            record.justified 
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 hover:border-slate-300 dark:border-slate-700"
                          )}
                        >
                          <FileText className="w-3 h-3" />
                          {record.justified ? "Justificada" : "Justificar"}
                        </button>
                      )}

                      {(userRole === 'admin' || userRole === 'coordinator') && (
                        <button
                          onClick={() => handleToggleProcessed(record.id, record.processed)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border shadow-sm",
                            record.processed
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400"
                              : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-300 animate-pulse"
                          )}
                        >
                          <Check className="w-3 h-3" />
                          {record.processed ? "Procesado" : "Pendiente"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
