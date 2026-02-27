import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Play, X } from 'lucide-react'
import { auth, db } from '@/lib/firebase/config'
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore'
import { format } from 'date-fns'

type UserRole = 'admin' | 'teacher' | 'coordinator' | null

export default function NewAttendanceFormPage() {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  const [grades, setGrades] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([])
  const [appRole, setAppRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const [gradeId, setGradeId] = useState('')
  const [subjectId, setSubjectId] = useState('')
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

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleStart = async () => {
    if (!gradeId || !subjectId) {
      toast.error('Selecciona Grado y Asignatura')
      return
    }
    setStarting(true)
    const user = auth.currentUser
    const resolvedTeacherId = teacherId || user?.uid || ''

    // Navega a la vista de toma de asistencia pasando los parámetros
    setExiting(true)
    setTimeout(() => {
      navigate(`/dashboard/attendance/taking/${gradeId}/${subjectId}/${date}/${resolvedTeacherId}`)
    }, 220)
  }

  const selectClass = "w-full h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none border border-slate-200 dark:border-slate-800 dark:text-white"

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Cargando datos...</div>

  return (
    <FormView exiting={exiting}>
      <div className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configura los detalles de la clase para comenzar a registrar la asistencia.
        </p>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className={selectClass} />
        </div>

        <div className="space-y-2">
          <Label>Grado *</Label>
          <select value={gradeId} onChange={e => setGradeId(e.target.value)} required className={selectClass}>
            <option value="">Seleccionar grado</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Asignatura *</Label>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className={selectClass}>
            <option value="">Seleccionar asignatura</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {(appRole === 'admin' || appRole === 'coordinator') && (
          <div className="space-y-2">
            <Label>Docente (opcional)</Label>
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className={selectClass}>
              <option value="">(Tú mismo)</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={starting}
            className="flex-1 rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="button" onClick={handleStart} disabled={starting}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            <Play className="w-4 h-4" />Iniciar clase
          </Button>
        </div>
      </div>
    </FormView>
  )
}
