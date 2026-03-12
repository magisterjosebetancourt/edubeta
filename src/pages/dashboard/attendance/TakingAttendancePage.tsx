import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, Search, FileText, UserCheck } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import {
  collection, getDocs, getDoc, setDoc, updateDoc, doc, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type StudentWithStatus = {
  id: string; first_name: string; last_name: string; grade_id: string;
  status?: 'present' | 'late' | 'absent' | 'excused'
  justified?: boolean; permission?: boolean; is_partial?: boolean; avatarColor?: string
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600', 'bg-blue-100 text-blue-600',
  'bg-pink-100 text-pink-600', 'bg-orange-100 text-orange-600', 'bg-green-100 text-green-600',
]

export default function TakingAttendancePage() {
  const navigate = useNavigate()
  const { gradeId, subjectId, date, teacherId } = useParams<{
    gradeId: string; subjectId: string; date: string; teacherId: string
  }>()

  const [students, setStudents] = useState<StudentWithStatus[]>([])
  const [gradeName, setGradeName] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!gradeId || !subjectId || !date || !teacherId) return
      try {
        const [gSnap, sSnap, tSnap] = await Promise.all([
          getDoc(doc(db, 'grades', gradeId)),
          getDoc(doc(db, 'subjects', subjectId)),
          getDoc(doc(db, 'profiles', teacherId))
        ])
        setGradeName(gSnap.data()?.name || '')
        setSubjectName(sSnap.data()?.name || '')
        setTeacherName(tSnap.data()?.full_name || 'Docente')

        // Fetch students of this grade
        const studentsSnap = await getDocs(query(
          collection(db, 'students'),
          where('grade_id', '==', gradeId),
          where('state', '==', true)
        ))

        // Fetch existing attendance records for this session
        const attSnap = await getDocs(query(
          collection(db, 'attendance_records'),
          where('date', '==', date),
          where('subject_id', '==', subjectId),
          where('teacher_id', '==', teacherId)
        ))
        const attMap = new Map(attSnap.docs.map(d => [d.data().student_id, d.data()]))

        const sorted = [...studentsSnap.docs].sort((a, b) =>
          (a.data().last_name || '').localeCompare(b.data().last_name || '', 'es')
        )

        setStudents(sorted.map((docSnap, idx) => {
          const s = docSnap.data()
          const record: any = attMap.get(docSnap.id)
          return {
            id: docSnap.id, first_name: s.first_name, last_name: s.last_name,
            grade_id: s.grade_id, status: record?.status, justified: record?.justified || false,
            permission: record?.permission || false,
            avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length]
          }
        }))
      } catch (e: any) {
        toast.error('Error al cargar la clase', { description: e.message })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gradeId, subjectId, date, teacherId])

  const handleStatusChange = async (studentId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
    setStudents(prev => prev.map(s => s.id === studentId ? { 
      ...s, 
      status, 
      is_partial: status === 'absent' ? s.is_partial : false 
    } : s))
    
    try {
      const docId = `${studentId}_${date}_${subjectId}`
      await setDoc(doc(db, 'attendance_records', docId), {
        student_id: studentId, date, subject_id: subjectId, teacher_id: teacherId, status,
        updated_at: serverTimestamp()
      }, { merge: true })
    } catch (e: any) {
      toast.error('Error al guardar', { description: e.message })
    }
  }

  const handlePartialToggle = async (studentId: string, is_partial: boolean) => {
    try {
      const docId = `${studentId}_${date}_${subjectId}`
      await updateDoc(doc(db, 'attendance_records', docId), { 
        is_partial,
        justified: false,
        permission: false
      })
      setStudents(prev => prev.map(s => s.id === studentId ? { 
        ...s, 
        is_partial, 
        justified: false, 
        permission: false 
      } : s))
      toast.success(is_partial ? 'Inasistencia parcial marcada' : 'Estado parcial removido')
    } catch (e: any) {
      toast.error('Error al actualizar estado parcial', { description: e.message })
    }
  }

  const handleJustify = async (studentId: string, justified: boolean) => {
    try {
      const docId = `${studentId}_${date}_${subjectId}`
      await updateDoc(doc(db, 'attendance_records', docId), { 
        justified, 
        permission: false,
        is_partial: false
      })
      setStudents(prev => prev.map(s => s.id === studentId ? { 
        ...s, 
        justified, 
        permission: false,
        is_partial: false
      } : s))
      toast.success(justified ? 'Justificación registrada' : 'Justificación removida')
    } catch (e: any) {
      toast.error('Error al justificar', { description: e.message })
    }
  }

  const handlePermission = async (studentId: string, permission: boolean) => {
    try {
      const docId = `${studentId}_${date}_${subjectId}`
      await updateDoc(doc(db, 'attendance_records', docId), { 
        permission, 
        justified: false,
        is_partial: false
      })
      setStudents(prev => prev.map(s => s.id === studentId ? { 
        ...s, 
        permission, 
        justified: false,
        is_partial: false
      } : s))
      toast.success(permission ? 'Permiso docente registrado' : 'Permiso removido')
    } catch (e: any) {
      toast.error('Error al registrar permiso', { description: e.message })
    }
  }

  const handleMarkRemaining = async () => {
    const unmarked = students.filter(s => !s.status)
    if (unmarked.length === 0) return
    try {
      const batch = writeBatch(db)
      unmarked.forEach(s => {
        const docId = `${s.id}_${date}_${subjectId}`
        batch.set(doc(db, 'attendance_records', docId), {
          student_id: s.id, date, subject_id: subjectId, teacher_id: teacherId,
          status: 'present', updated_at: serverTimestamp()
        }, { merge: true })
      })
      await batch.commit()
      setStudents(prev => prev.map(s => !s.status ? { ...s, status: 'present' } : s))
      toast.success('Resto marcados como presentes')
    } catch (e: any) {
      toast.error('Error', { description: e.message })
    }
  }

  const handleFinish = async () => {
    if (loading) return
    const unmarked = students.filter(s => !s.status)
    if (unmarked.length > 0) {
      toast.error('Asistencia incompleta', {
        description: `Faltan ${unmarked.length} estudiante(s) por marcar.`
      })
      return
    }

    const partialAbsences = students.filter(s => s.status === 'absent' && s.is_partial)
    
    if (partialAbsences.length > 0) {
      setLoading(true)
      const proceed = confirm(`Has marcado ${partialAbsences.length} inasistencia(s) parcial(es). Se creará automáticamente un reporte en el Observador (Tipo I) y se notificará a coordinación. ¿Deseas continuar?`)
      if (!proceed) {
        setLoading(false)
        return
      }
    } else {
      setLoading(true)
    }

    const toastId = toast.loading('Guardando registros y notificando...')

    try {
      const batch = writeBatch(db)
      const now = new Date().toISOString()
      
      // Get grade info for notification
      const gradeDoc = await getDoc(doc(db, 'grades', gradeId!))
      const gradeData = gradeDoc.data()
      const directorId = gradeData?.director_id

      for (const s of partialAbsences) {
        // 1. Create Observation (Disciplinaria Tipo I)
        const obsRef = doc(collection(db, 'student_observations'))
        const studentName = `${s.last_name}, ${s.first_name}`
        
        batch.set(obsRef, {
          studentId: s.id,
          studentName,
          createdBy: teacherId,
          creatorName: teacherName,
          date: date,
          type: 'Disciplinaria',
          law1620Category: 'Tipo I',
          description: `Inasistencia parcial detectada en la materia de ${subjectName}. El estudiante se ausentó sin justificación después de haber ingresado a la institución.`,
          actionTaken: 'Registro automático por sistema de asistencia.',
          suggestions: 'Seguimiento por parte de dirección de grupo.',
          commitmentStatus: 'Iniciada',
          agreements: ['El estudiante debe presentar descargos ante el director de grupo.'],
          status: 'Abierto',
          notificationsSent: { parentsApp: false, whatsappAdmins: false },
          createdAt: now,
          updatedAt: now
        })

        // 2. Create Notifications
        const recipients = Array.from(new Set([directorId, 'admin_placeholder'].filter(Boolean)))
        
        recipients.forEach(rid => {
          const notifRef = doc(collection(db, 'notifications'))
          batch.set(notifRef, {
            user_id: rid,
            title: 'Alerta: Inasistencia Parcial',
            message: `El estudiante ${studentName} (${gradeName}) presentó inasistencia parcial en ${subjectName}. Se generó reporte en observador.`,
            type: 'alert',
            read: false,
            link: `/dashboard/observations`,
            createdAt: serverTimestamp()
          })
        })
      }

      await batch.commit()
      toast.dismiss(toastId)
      toast.success('Clase completada, observador actualizado y alertas enviadas')
      navigate('/dashboard/attendance', { replace: true })
    } catch (e: any) {
      toast.dismiss(toastId)
      toast.error('Error al procesar la finalización', { description: e.message })
    } finally {
      setLoading(false)
    }
  }


  const dateLabel = date ? format(new Date(date + 'T00:00:00'), "dd 'de' MMM yyyy", { locale: es }) : ''

  const filtered = students.filter(s =>
    `${s.last_name}, ${s.first_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <LoadingSpinner message="Cargando lista de clase..." />;

  return (
    <FormView>
      {/* Session info banner */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/10 mb-5">
        <h3 className="font-semibold text-slate-900 dark:text-white">{subjectName}</h3>
        <p className="text-[11px] text-primary font-semibold tracking-widest mt-0.5">
          {gradeName} · {dateLabel}
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{students.filter(s => s.status === 'present').length} Presentes
        </span>
        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{students.filter(s => s.status === 'absent').length} Ausentes
        </span>
        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{students.filter(s => s.status === 'late').length} Tardes
        </span>
      </div>

      {/* Search + Mark remaining */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <EduInput
            placeholder="Buscar estudiante..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>
        <button onClick={handleMarkRemaining}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />Marcar restantes como presentes
        </button>
      </div>

      {/* Students list */}
      <div className="space-y-2 mb-6">
        {filtered.map(student => (
          <div key={student.id}
            className={cn("flex flex-col p-4 bg-white dark:bg-slate-800 rounded-lg border transition-all duration-300 shadow-sm",
              student.status ? "border-slate-100 dark:border-slate-700" : "border-orange-100 dark:border-orange-900/20 bg-orange-50/10"
            )}>
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-sm shadow-inner transition-all duration-500",
                student.status === 'present' ? "bg-green-100 text-green-600 scale-110" :
                student.status === 'absent' ? "bg-red-100 text-red-600" :
                student.status === 'late' ? "bg-yellow-100 text-yellow-600" : student.avatarColor)}>
                {student.last_name[0]}{student.first_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-semibold text-slate-400 tracking-widest">ID# {student.id}</span>
                  {student.justified && student.status === 'absent' && (
                    <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 rounded text-[8px] font-semibold">Justificada</span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white leading-tight truncate pr-2">
                  {student.last_name}, {student.first_name}
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([['present', 'Presente', 'green', CheckCircle],
                 ['absent', 'Ausente', 'red', XCircle],
                 ['late', 'Tarde', 'yellow', Clock]] as const).map(([status, label, color, Icon]) => (
                <button key={status} onClick={() => handleStatusChange(student.id, status)}
                  className={cn("flex items-center justify-center gap-2 py-3 rounded-lg transition-all active:scale-95 font-semibold text-[10px] tracking-wider",
                    student.status === status
                      ? `bg-${color}-500 text-white shadow-lg shadow-${color}-200`
                      : "bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800")}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
            {student.status === 'absent' && (
              <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 grid grid-cols-3 gap-2 w-full">
                <button onClick={() => handlePartialToggle(student.id, !student.is_partial)}
                  className={cn("flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all border",
                    student.is_partial
                      ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
                      : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200")}>
                  <Clock className="w-3 h-3" />
                  {student.is_partial ? 'Parcial' : 'Parcial'}
                </button>
                <button onClick={() => handlePermission(student.id, !student.permission)}
                  className={cn("flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all border",
                    student.permission
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                      : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200")}>
                  <UserCheck className="w-3 h-3" />
                  {student.permission ? 'Permiso' : 'Permiso'}
                </button>
                <button onClick={() => handleJustify(student.id, !student.justified)}
                  className={cn("flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all border",
                    student.justified
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200")}>
                  <FileText className="w-3 h-3" />
                  {student.justified ? 'Justificada' : 'Justificar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="pt-2">
        <EduButton
          type="button"
          onClick={handleFinish}
          loading={loading}
          icon={CheckCircle}
          fullWidth
        >
          Finalizar asistencia
        </EduButton>
      </div>
    </FormView>
  )
}
