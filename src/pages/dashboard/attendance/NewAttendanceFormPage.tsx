import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Play } from 'lucide-react'
import { auth, db } from '@/lib/firebase/config'
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore'
import { format } from 'date-fns'

type UserRole = 'admin' | 'teacher' | 'coordinator' | null

export default function NewAttendanceFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()


  const [grades, setGrades] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([])
  const [appRole, setAppRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const [gradeId, setGradeId] = useState(searchParams.get('grade_id') || '')
  const [subjectId, setSubjectId] = useState(searchParams.get('subject_id') || '')
  const [teacherId, setTeacherId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser
      if (!user) return

      const profileSnap = await getDoc(doc(db, 'profiles', user.uid))
      const role = profileSnap.data()?.role as UserRole
      setAppRole(role)

      if (role !== 'teacher') {
        const tSnap = await getDocs(query(collection(db, 'profiles'), where('role', 'in', ['teacher', 'coordinator', 'admin'])))
        setTeachers(tSnap.docs.map(d => ({ id: d.id, full_name: d.data().full_name })))
      }

      let gradeIds: string[] = []
      let subjectIds: string[] = []
      if (role === 'teacher') {
        const assSnap = await getDocs(query(collection(db, 'assignments'), where('teacher_id', '==', user.uid), where('state', '==', true)))
        gradeIds = assSnap.docs.map(d => d.data().grade_id)
        subjectIds = assSnap.docs.map(d => d.data().subject_id)
      }

      const [gSnap, sSnap] = await Promise.all([
        getDocs(query(collection(db, 'grades'), where('state', '==', true))),
        getDocs(collection(db, 'subjects')),
      ])

      setGrades(gSnap.docs.filter(d => role !== 'teacher' || gradeIds.includes(d.id)).map(d => ({ id: d.id, name: d.data().name })))
      setSubjects(sSnap.docs.filter(d => role !== 'teacher' || subjectIds.includes(d.id)).map(d => ({ id: d.id, name: d.data().name })))
      setLoading(false)
    }
    load().catch(() => { toast.error('Error al cargar datos'); setLoading(false) })
  }, [])


  const handleStart = async () => {
    if (!gradeId || !subjectId) {
      toast.error('Selecciona Grado y Asignatura')
      return
    }
    setStarting(true)
    const user = auth.currentUser
    const resolvedTeacherId = teacherId || user?.uid || ''

    // Navega a la vista de toma de asistencia pasando los parámetros
    navigate(`/dashboard/attendance/taking/${gradeId}/${subjectId}/${date}/${resolvedTeacherId}`)
  }


  if (loading) return <LoadingSpinner message="Cargando configuración de asistencia..." />;

  return (
    <FormView>
      <div className="space-y-5">
        <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
          Configura los detalles de la clase para comenzar a registrar la asistencia.
        </p>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <EduInput type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Grado *</Label>
          <EduSelect value={gradeId} onChange={e => setGradeId(e.target.value)} required>
            <option value="">Seleccionar grado</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </EduSelect>
        </div>

        <div className="space-y-2">
          <Label>Asignatura *</Label>
          <EduSelect value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
            <option value="">Seleccionar asignatura</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </EduSelect>
        </div>

        {(appRole === 'admin' || appRole === 'coordinator') && (
          <div className="space-y-2">
            <Label>Docente (opcional)</Label>
            <EduSelect value={teacherId} onChange={e => setTeacherId(e.target.value)}>
              <option value="">(Tú mismo)</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </EduSelect>
          </div>
        )}

        <div className="pt-2">
          <EduButton
            type="button"
            onClick={handleStart}
            disabled={starting}
            icon={Play}
            fullWidth
          >
            Iniciar clase
          </EduButton>
        </div>
      </div>
    </FormView>
  )
}
