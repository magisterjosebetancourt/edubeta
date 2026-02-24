import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '@/lib/firebase/config'
import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc, 
  doc, 
  query, 
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  School,
  FileText,
  ChevronRight,
  Loader2,
  XCircle,
  RefreshCcw,
  MessageSquare,
  Check,
  BookOpen,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AttendanceRecord = {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  justified: boolean;
  processed: boolean;
  subject_id: string;
  teacher_id: string;
  student: {
    first_name: string;
    last_name: string;
    grade_id: string;
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
  id: string;
  name: string;
}


export default function AttendanceHistoryPage() {
  const navigate = useNavigate();
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
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterProcessed, setFilterProcessed] = useState<string>("all")

  const fetchData = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    else setIsRefreshing(true);

    if (startDate > endDate) {
      toast.error('La fecha inicial no puede ser mayor a la final');
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const role = profileSnap.data()?.role as UserRole;
      setUserRole(role);

      // Filters setup based on role
      let teacherGradeIds: string[] = [];
      let teacherSubjectIds: string[] = [];
      if (role === 'teacher') {
        const assSnap = await getDocs(query(collection(db, "assignments"), where("teacher_id", "==", user.uid), where("state", "==", true)));
        teacherGradeIds = assSnap.docs.map(d => d.data().grade_id);
        teacherSubjectIds = assSnap.docs.map(d => d.data().subject_id);
      }

      // 1. Fetch dependencies
      const [gSnap, sSnap, pSnap, stdSnap] = await Promise.all([
        getDocs(collection(db, "grades")),
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "profiles")),
        getDocs(collection(db, "students"))
      ]);

      const gradeList = gSnap.docs
        .filter(d => role !== 'teacher' || teacherGradeIds.includes(d.id))
        .map(d => ({ id: d.id, name: d.data().name }));
      
      const subjectList = sSnap.docs
        .filter(d => role !== 'teacher' || teacherSubjectIds.includes(d.id))
        .map(d => ({ id: d.id, name: d.data().name }));

      setGrades(gradeList);
      setSubjects(subjectList);

      const gradeMap = new Map(gSnap.docs.map(d => [d.id, d.data()]));
      const subjectMap = new Map(sSnap.docs.map(d => [d.id, d.data()]));
      const profileMap = new Map(pSnap.docs.map(d => [d.id, d.data()]));
      const studentMap = new Map(stdSnap.docs.map(d => [d.id, d.data()]));

      // 2. Fetch Attendance Records (Firestore limited with date range)
      const q = query(
        collection(db, "attendance_records"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc")
      );

      const attSnap = await getDocs(q);
      const attData = attSnap.docs.map(d => {
        const data = d.data();
        const student = studentMap.get(data.student_id);
        const subject = subjectMap.get(data.subject_id);
        const teacher = profileMap.get(data.teacher_id);
        
        // Filter by teacher role if needed
        if (role === 'teacher' && !teacherGradeIds.includes(student?.grade_id)) return null;

        return {
          id: d.id,
          student_id: data.student_id,
          date: data.date,
          status: data.status,
          justified: data.justified,
          processed: data.processed,
          subject_id: data.subject_id,
          teacher_id: data.teacher_id,
          student: {
            first_name: student?.first_name || '',
            last_name: student?.last_name || '',
            grade_id: student?.grade_id || ''
          },
          subject: { name: subject?.name || 'S/A' },
          teacher: { full_name: teacher?.full_name || 'S/D' }
        } as AttendanceRecord;
      }).filter(r => r !== null);

      setRecords(attData as AttendanceRecord[]);

    } catch (error: any) {
      console.error("Attendance History Fetch Error:", error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleJustification = async (recordId: string, currentJustified: boolean) => {
    try {
      await updateDoc(doc(db, "attendance_records", recordId), { justified: !currentJustified });
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, justified: !currentJustified } : r));
      toast.success(!currentJustified ? 'Inasistencia justificada' : 'Justificación removida');
    } catch (error: any) {
      toast.error('Error al actualizar registro', { description: error.message });
    }
  };

  const handleToggleProcessed = async (recordId: string, currentProcessed: boolean) => {
    try {
      await updateDoc(doc(db, "attendance_records", recordId), { processed: !currentProcessed });
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
    if (!record.date || !record.subject_id || !record.teacher_id) {
      toast.error('Datos de sesión incompletos para generar el reporte');
      return;
    }
    toast.loading('Generando informe...');
    try {
      const instSnap = await getDoc(doc(db, "settings", "institutional"));
      const schoolSettings = instSnap.data();
      
      const branding = {
        name: schoolSettings?.school_name || 'EDUBETA',
        year: schoolSettings?.academic_year || new Date().getFullYear().toString(),
        logo: schoolSettings?.logo_url || ''
      };

      // 1. Fetch all records for this specific session
      const q = query(
        collection(db, "attendance_records"),
        where("date", "==", record.date),
        where("subject_id", "==", record.subject_id),
        where("teacher_id", "==", record.teacher_id)
      );

      const recordsSnap = await getDocs(q);
      const studentSnap = await getDocs(collection(db, "students"));
      const studentMap = new Map(studentSnap.docs.map(d => [d.id, d.data()]));

      const sessionStats = recordsSnap.docs.map(d => d.data());
      const sortedAbsences = sessionStats
        .filter(d => d.status === 'absent' || d.status === 'late')
        .map(d => {
          const s = studentMap.get(d.student_id);
          return {
            status: d.status,
            justified: d.justified,
            students: { first_name: s?.first_name || '', last_name: s?.last_name || '' }
          };
        })
        .sort((a, b) => a.students.first_name.localeCompare(b.students.first_name));

      const stats = {
        present: sessionStats.filter(s => s.status === 'present').length,
        absent: sessionStats.filter(s => s.status === 'absent').length,
        late: sessionStats.filter(s => s.status === 'late').length,
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
            .edubeta-tag { font-size: 8px; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; }
            
            h1 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.025em; color: #1e293b; }
            .school-year { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 2px; }
            .report-title-bar { 
              background: #f8fafc; 
              text-align: center; 
              padding: 8px; 
              border-radius: 8px; 
              font-size: 12px; 
              font-weight: 800; 
              color: #4f46e5; 
              letter-spacing: 0.1em; 
              margin-bottom: 25px;
              border: 1px solid #f1f5f9;
            }
            
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .meta-item { background: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; }
            .meta-label { font-size: 9px; font-weight: 900; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 4px; }
            .meta-value { font-size: 13px; font-weight: 700; color: #1e293b; }
            
            .stats-container { display: flex; gap: 10px; margin-bottom: 25px; }
            .stat-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid transparent; flex: 1; text-align: center; }
            .stat-present { background: #f0fdf4; color: #16a34a; border-color: #dcfce7; }
            .stat-absent { background: #fef2f2; color: #dc2626; border-color: #fee2e2; }
            .stat-late { background: #fff7ed; color: #ea580c; border-color: #ffedd5; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
            th { text-align: left; background: #f8fafc; color: #64748b; padding: 12px 15px; font-size: 10px; font-weight: 900; border-bottom: 2px solid #f1f5f9; }
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
              <div className="school-year">Año escolar: ${branding.year}</div>
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

          <h2 style="font-size: 13px; font-weight: 900; margin: 20px 0 10px;">Listado de estudiantes reportados</h2>
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
                  <td style="font-weight: 600;">${r.students.first_name}, ${r.students.last_name}</td>
                  <td style="text-align: center; font-weight: 800; font-size: 10px; color: ${r.status === 'absent' ? '#dc2626' : '#ea580c'}">${r.status === 'absent' ? 'Ausente' : 'Tarde'}</td>
                  <td style="text-align: center; font-weight: 600;">${r.justified ? 'Sí' : 'No'}</td>
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
      case 'present': return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" /> Presente</div>;
      case 'late': return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] font-bold"><Clock className="w-3 h-3" /> Tarde</div>;
      case 'absent': return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold"><XCircle className="w-3 h-3" /> Ausente</div>;
      default: return null;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark pb-24 lg:pb-0">
      {/* Filters Area */}
      <div className="p-4 space-y-4">
        {/* Row 1: Search - Main Placeholder */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre del estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
          />
        </div>

        {/* Row 2: Select Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select 
              value={filterGradeId}
              onChange={(e) => setFilterGradeId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold focus:outline-none appearance-none transition-all"
            >
              <option value="">Grados</option>
              {grades.map(g => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select 
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold focus:outline-none appearance-none transition-all"
            >
              <option value="">Materias</option>
              {subjects.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold focus:outline-none appearance-none transition-all"
            >
              <option value="all">Estados</option>
              <option value="absent">Inasistencias</option>
              <option value="late">Tardanzas</option>
              <option value="present">Presentes</option>
            </select>
          </div>
          {(userRole === 'admin' || userRole === 'coordinator') && (
            <div className="relative">
              <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select 
                value={filterProcessed}
                onChange={(e) => setFilterProcessed(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold focus:outline-none appearance-none transition-all"
              >
                <option value="all">Gestión</option>
                <option value="false">Pendientes</option>
                <option value="true">Procesados</option>
              </select>
            </div>
          )}
        </div>

        {/* Row 3: Date Range & Refresh Button */}
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="flex-1 w-full grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">De</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">A</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none"
              />
            </div>
          </div>
          <button 
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            <span className="text-[11px] font-bold">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Results Title */}
      <div className="px-5 py-2 flex items-center justify-between">
         <span className="text-[10px] font-bold text-slate-400 tracking-widest">
            {filteredRecords.length} Registros encontrados
         </span>
      </div>

      {/* Main Content */}
      <div className="px-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Buscando en los archivos...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-800 border rounded-lg border-dashed">
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
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] group relative overflow-hidden"
              >
                {record.justified && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-green-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-widest shadow-sm">
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
                      <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
                        {format(new Date(record.date + 'T00:00:00'), 'EEEE, d MMM yyyy')}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="text-[10px] font-bold text-primary">
                        {grades.find(g => g.id === record.student.grade_id)?.name}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        {record.subject?.name}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {record.student.first_name}, {record.student.last_name}
                    </h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      Dictado por: {record.teacher?.full_name || 'Desconocido'}
                    </p>

                    {/* Estado arriba de las acciones */}
                    <div className="mt-4 flex justify-start">
                       {getStatusBadge(record.status)}
                    </div>

                    {/* Botones de acción en línea horizontal (compactos con iconos) */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 w-full">
                       {record.status !== 'present' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleNotifyWhatsApp(record); }}
                          className="flex items-center justify-center w-9 h-9 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-sm"
                          title="Notificar por WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                       )}
                       
                       <button 
                         onClick={(e) => { e.stopPropagation(); generateReport(record); }}
                         className="flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-all hover:bg-primary hover:text-white border border-slate-200 dark:border-slate-700"
                         title="Generar Informe"
                       >
                         <FileText className="w-4 h-4" />
                       </button>

                       {record.status === 'absent' && (
                         <button
                           onClick={(e) => { e.stopPropagation(); handleToggleJustification(record.id, record.justified); }}
                           className={cn(
                             "flex items-center gap-1 px-3 h-9 rounded-lg text-[10px] font-bold transition-all border",
                             record.justified 
                               ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                               : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                           )}
                         >
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           {record.justified ? "Justificada" : "Justificar"}
                         </button>
                       )}

                       {(userRole === 'admin' || userRole === 'coordinator') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleProcessed(record.id, record.processed); }}
                          className={cn(
                            "flex items-center gap-1 px-3 h-9 rounded-lg text-[10px] font-bold transition-all border shadow-sm",
                            record.processed
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400"
                              : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-300 animate-pulse"
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
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
