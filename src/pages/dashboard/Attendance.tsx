import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/firebase/config'
import {
  collection, getDocs, getDoc, writeBatch,
  doc, query, where
} from "firebase/firestore"
import { useUserProfile } from '@/lib/context/UserProfileContext'
import { useGrades, useSubjects, useStudents } from '@/lib/hooks/useFirebaseData'
import { cn } from '@/lib/utils'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import {
  Clock, CheckCircle, FileText, CalendarDays, BookOpen, Plus,
  ArrowRight, User, History, TrendingUp, Users, XCircle, Pencil
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Types
type UserRole = 'admin' | 'teacher' | 'coordinator' | null

interface AttendanceSession {
  date: string; grade_id: string; subject_id: string; teacher_id: string;
  grade_name: string; subject_name: string; teacher_name: string;
  present_count: number; absent_count: number; late_count: number;
  total_students: number; processed_count: number; all_processed: boolean;
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const { profile, firebaseUser } = useUserProfile()
  const { data: globalGrades = [], isLoading: loadingGrades } = useGrades()
  const { data: globalSubjects = [], isLoading: loadingSubjects } = useSubjects()
  const { data: globalStudents = [], isLoading: loadingStudents } = useStudents()

  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const appRole = profile?.role as UserRole
  const currentUserId = firebaseUser?.uid ?? null


  useEffect(() => {
    if (appRole && currentUserId) {
      fetchSessions(appRole, currentUserId)
    }
  }, [appRole, currentUserId])

  useEffect(() => {
    if (appRole && currentUserId) {
      fetchSessions(appRole, currentUserId)
    }
  }, [filterDate])

  const fetchSessions = async (role: UserRole, userId: string) => {
    try {
      setLoadingInitial(true)
      const q = query(collection(db, "attendance_records"), where("date", "==", filterDate))
      const recordsSnap = await getDocs(q)
      let records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      if (role === 'teacher') {
        records = records.filter((r: any) => r.teacher_id === userId)
      }

      // 1. Necesitamos teachers (profiles) sí o sí porque no lo guardamos en react-query
      const profilesSnap = await getDocs(collection(db, "profiles"))
      const profileMap = new Map(profilesSnap.docs.map(d => [d.id, d.data()]))

      // 2. Mapas cacheados
      const studentMap = new Map(globalStudents.map(d => [d.id, d]))
      const subjectMap = new Map(globalSubjects.map(d => [d.id, d]))
      const gradeMap = new Map(globalGrades.map(d => [d.id, d]))

      const groups: { [key: string]: AttendanceSession } = {}
      records.forEach((row: any) => {
        const student = studentMap.get(row.student_id) as any
        const gId = student?.grade_id || 'no-grade'
        const sId = row.subject_id || 'no-subject'
        const tId = row.teacher_id || 'no-teacher'
        const key = `${row.date}-${gId}-${sId}-${tId}`
        if (!groups[key]) {
          groups[key] = {
            date: row.date, grade_id: gId, subject_id: sId, teacher_id: tId,
            grade_name: (gradeMap.get(gId) as any)?.name || 'Sin Grado',
            subject_name: (subjectMap.get(sId) as any)?.name || 'Sin Asignatura',
            teacher_name: (profileMap.get(tId) as any)?.full_name || 'Sin Docente',
            present_count: 0, absent_count: 0, late_count: 0,
            total_students: 0, processed_count: 0, all_processed: false
          }
        }
        groups[key].total_students++
        if (row.status === 'present') groups[key].present_count++
        else if (row.status === 'absent') { groups[key].absent_count++; if (row.processed) groups[key].processed_count++ }
        else if (row.status === 'late') { groups[key].late_count++; if (row.processed) groups[key].processed_count++ }
      })

      const sessionList = Object.values(groups).map(s => ({
        ...s,
        all_processed: (s.absent_count + s.late_count) > 0 && s.processed_count === (s.absent_count + s.late_count)
      }))
      setSessions(sessionList.sort((a, b) => a.subject_name.localeCompare(b.subject_name)))
    } catch (err: any) {
      console.error(err)
      toast.error('Error al cargar sesiones')
    } finally {
      setLoadingInitial(false)
    }
  }

  const loading = loadingInitial || loadingGrades || loadingSubjects || loadingStudents;


  const markSessionAsProcessed = async (session: AttendanceSession) => {
    try {
      const q = query(collection(db, "attendance_records"), where("date", "==", session.date), where("subject_id", "==", session.subject_id), where("teacher_id", "==", session.teacher_id))
      const recordsSnap = await getDocs(q)
      const batch = writeBatch(db)
      recordsSnap.docs.forEach(docSnap => {
        const data = docSnap.data()
        if (data.status === 'absent' || data.status === 'late') batch.update(docSnap.ref, { processed: true })
      })
      await batch.commit()
      toast.success('Sesión marcada como procesada')
      fetchSessions(appRole, currentUserId as string)
    } catch (err: any) {
      toast.error('Error', { description: err.message })
    }
  }

  const generateReport = async (session: AttendanceSession) => {
    if (!session.date || !session.subject_id || !session.grade_id) { toast.error('Datos de sesión incompletos'); return }
    toast.loading('Generando informe...')
    try {
      const [instSnap, recordsSnap, studentSnap] = await Promise.all([
        getDoc(doc(db, "settings", "institutional")),
        getDocs(query(collection(db, "attendance_records"), where("date", "==", session.date), where("subject_id", "==", session.subject_id))),
        getDocs(collection(db, "students")),
      ])
      const schoolSettings = instSnap.data()
      const branding = { name: schoolSettings?.school_name || 'EDUBETA', year: schoolSettings?.academic_year || new Date().getFullYear().toString(), logo: schoolSettings?.logo_url || '' }
      const studentMap = new Map(studentSnap.docs.map(d => [d.id, d.data()]))
      const data = recordsSnap.docs.map(docSnap => {
        const d = docSnap.data(); const s = studentMap.get(d.student_id) as any
        if (!s || s.grade_id !== session.grade_id) return null
        return { status: d.status as string, justified: d.justified as boolean, students: { last_name: s.last_name || '', first_name: s.first_name || '' } }
      }).filter((i): i is NonNullable<typeof i> => i !== null)
      data.sort((a, b) => (a.students.last_name || '').localeCompare(b.students.last_name || '', 'es'))
      const absences = data.filter(r => r.status === 'absent' || r.status === 'late')
      const dateFormatted = format(new Date(session.date + 'T00:00:00'), 'PPP', { locale: es })
      const generationDate = format(new Date(), 'Pp', { locale: es })

      const htmlContent = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe - ${session.subject_name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');body{font-family:'Inter',system-ui,sans-serif;color:#0f172a;line-height:1.5;padding:40px;max-width:850px;margin:0 auto}.header-layout{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #f1f5f9;padding-bottom:20px;margin-bottom:30px}.header-center{flex:1;text-align:center}.edubeta-logo{font-size:18px;font-weight:900;color:#4f46e5}.report-title-bar{background:#f8fafc;text-align:center;padding:8px;border-radius:8px;font-size:12px;font-weight:800;color:#4f46e5;letter-spacing:.1em;margin-bottom:25px;border:1px solid #f1f5f9}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px}.meta-item{background:#fff;padding:12px;border-radius:12px;border:1px solid #f1f5f9}.meta-label{font-size:9px;font-weight:900;color:#94a3b8;letter-spacing:.05em;margin-bottom:4px}.meta-value{font-size:13px;font-weight:700;color:#1e293b}.stats-row{display:flex;gap:8px;margin-top:8px}.stat-badge{padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;flex:1;text-align:center}.stat-present{background:#f0fdf4;color:#16a34a;border:1px solid #dcfce7}.stat-absent{background:#fef2f2;color:#dc2626;border:1px solid #fee2e2}.stat-late{background:#fff7ed;color:#ea580c;border:1px solid #ffedd5}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:10px}th{text-align:left;background:#f8fafc;color:#64748b;padding:12px 15px;font-size:10px;font-weight:900;border-bottom:2px solid #f1f5f9}td{padding:12px 15px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155}.footer{margin-top:50px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:20px}@media print{body{padding:20px}.no-print{display:none}}</style></head><body>
        <div class="header-layout"><div style="width:180px">${branding.logo ? `<img src="${branding.logo}" style="max-height:60px;max-width:150px;object-fit:contain" alt="Logo">` : ''}</div><div class="header-center"><h1 style="margin:0;font-size:18px;font-weight:900;color:#1e293b">${branding.name}</h1><div style="font-size:11px;font-weight:700;color:#64748b">AÑO ESCOLAR: ${branding.year}</div></div><div style="width:180px;text-align:right"><div class="edubeta-logo">EDUBETA</div><div style="font-size:8px;font-weight:700;color:#94a3b8;letter-spacing:.1em">Gestión Escolar</div></div></div>
        <div class="report-title-bar">Informe de Inasistencia</div>
        <div class="meta-grid"><div class="meta-item"><div class="meta-label">Fecha de Clase</div><div class="meta-value">${dateFormatted}</div></div><div class="meta-item"><div class="meta-label">Generado el</div><div class="meta-value">${generationDate}</div></div></div>
        <div class="meta-grid"><div class="meta-item"><div class="meta-label">Sesión Académica</div><div class="meta-value">${session.subject_name} — ${session.grade_name}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Docente: ${session.teacher_name}</div></div><div class="meta-item"><div class="meta-label">Resumen de Asistencia</div><div class="stats-row"><span class="stat-badge stat-present">${session.present_count} P</span><span class="stat-badge stat-absent">${session.absent_count} A</span><span class="stat-badge stat-late">${session.late_count} T</span></div></div></div>
        <h2 style="font-size:14px;font-weight:900;margin-bottom:15px;letter-spacing:.05em">Listado de inasistencias</h2>
        <table><thead><tr><th>#</th><th>Estudiante</th><th style="width:120px;text-align:center">Estado</th><th style="width:120px;text-align:center">Justificado</th></tr></thead><tbody>${absences.length > 0 ? absences.map((r, idx) => `<tr><td style="color:#94a3b8;width:40px;font-size:11px">${idx + 1}</td><td style="font-weight:700">${r.students.last_name.toUpperCase()}, ${r.students.first_name}</td><td style="text-align:center;color:${r.status === 'absent' ? '#dc2626' : '#ea580c'};font-weight:800;font-size:10px">${r.status === 'absent' ? 'AUSENTE' : 'TARDE'}</td><td style="text-align:center;font-weight:700">${r.justified ? 'SÍ' : 'NO'}</td></tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:40px">✓ Sin inasistencias registradas.</td></tr>`}</tbody></table>
        <div class="no-print" style="text-align:center;padding:24px 20px 20px;border-top:1px solid #f1f5f9;margin-top:30px"><button onclick="window.print()" style="background:#4f46e5;color:white;border:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimir / Guardar como PDF</button></div>
        <div class="footer">Este documento es un reporte oficial de la plataforma EduBeta.</div>
        <script>const isMobile=/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);if(!isMobile){window.onload=()=>window.print();}<\/script></body></html>`

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = blobUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      toast.dismiss()
    } catch (err: any) {
      toast.dismiss(); toast.error('Error al generar informe', { description: err.message })
    }
  }

  if (loading) return <LoadingSpinner message="Cargando asistencia..." />

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark pb-24 lg:pb-0">
      <div className="flex flex-col gap-4 p-5">
        <EduButton
          onClick={() => navigate('/dashboard/attendance/new')}
          icon={Plus}
          className="h-12 px-6 w-full sm:w-auto"
        >
          Nueva lista de clase
        </EduButton>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
        {[
          { icon: Users, color: 'indigo', label: 'Clases hoy', value: sessions.length },
          { icon: XCircle, color: 'red', label: 'Total ausentes', value: sessions.reduce((acc, s) => acc + s.absent_count, 0) },
          { icon: Clock, color: 'orange', label: 'Total tardanzas', value: sessions.reduce((acc, s) => acc + s.late_count, 0) },
          { icon: TrendingUp, color: 'green', label: 'Asistencia promedio', value: sessions.length > 0 ? `${Math.round((sessions.reduce((acc, s) => acc + (s.present_count / s.total_students), 0) / sessions.length) * 100)}%` : '0%' },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
            <div className={`w-10 h-10 rounded-lg bg-${color}-50 dark:bg-${color}-900/30 flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 text-${color}-500`} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider">{label}</p>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{value}</h3>
          </div>
        ))}
      </div>

      {/* Session List Section */}
      <div className="px-5 pb-5">
        <div className="flex flex-col gap-3 mb-6 px-1">
          <h2 className="text-sm font-semibold text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Historial de Sesiones
          </h2>
          <EduInput 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)}
            className="w-full sm:w-48 h-12"
          />
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border-2 border-dashed rounded-lg py-20 px-10 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Sin sesiones para este día</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Haz clic en Nueva Lista para comenzar a tomar asistencia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, idx) => (
              <div key={idx}
                onClick={() => navigate(`/dashboard/attendance/taking/${s.grade_id}/${s.subject_id}/${s.date}/${s.teacher_id}`)}
                className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold text-primary tracking-wider">{s.grade_name}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-[10px] font-semibold text-slate-400 tracking-widest">{format(new Date(s.date + 'T00:00:00'), 'dd MMM', { locale: es })}</span>
                      {s.all_processed && s.absent_count + s.late_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-[8px] font-semibold">
                          <CheckCircle className="w-2.5 h-2.5 inline" /> Procesado
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{s.subject_name}</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                      <User className="w-3 h-3" /> {s.teacher_name}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex gap-1.5 justify-end">
                      <div className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-md text-[9px] font-semibold">{s.present_count}P</div>
                      <div className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md text-[9px] font-semibold">{s.absent_count}A</div>
                      <div className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-md text-[9px] font-semibold">{s.late_count}T</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!s.all_processed && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/attendance/session/edit?date=${s.date}&subjectId=${s.subject_id}&teacherId=${s.teacher_id}`) }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); generateReport(s) }}
                        className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 hover:text-primary transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                      {(appRole === 'admin' || appRole === 'coordinator') && s.absent_count + s.late_count > 0 && (
                        <button onClick={e => { e.stopPropagation(); if (!s.all_processed) markSessionAsProcessed(s) }}
                          className={cn("p-1.5 rounded-lg transition-all",
                            s.all_processed ? "bg-green-50 text-green-500 dark:bg-green-900/20" : "bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-green-500")}>
                          <CheckCircle className="w-4 h-4" />
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

    </div>
  )
}
