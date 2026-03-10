import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import {
  collection, getDocs, getDocs as _getDocs, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore'

export default function EditAttendanceSessionFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])

  // Read original session values from query params
  const origDate = searchParams.get('date') || ''
  const origSubjectId = searchParams.get('subjectId') || ''
  const origTeacherId = searchParams.get('teacherId') || ''

  const [newSubjectId, setNewSubjectId] = useState(origSubjectId)
  const [newDate, setNewDate] = useState(origDate)

  useEffect(() => {
    getDocs(collection(db, 'subjects')).then(snap => {
      setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })))
    })
  }, [])


  const handleSave = async () => {
    if (!newSubjectId || !newDate) {
      toast.error('Completa todos los campos')
      return
    }
    setSaving(true)
    try {
      toast.loading('Actualizando sesión...')
      const q = query(
        collection(db, 'attendance_records'),
        where('date', '==', origDate),
        where('subject_id', '==', origSubjectId)
      )
      const snap = await getDocs(q)
      const batch = writeBatch(db)
      snap.docs
        .filter(docSnap => docSnap.data().teacher_id === origTeacherId)
        .forEach(docSnap => {
          batch.update(docSnap.ref, {
            date: newDate,
            subject_id: newSubjectId,
            updated_at: serverTimestamp()
          })
        })
      await batch.commit()
      toast.dismiss()
      toast.success('Sesión actualizada')
      navigate('/dashboard/attendance', { replace: true })
    } catch (err: any) {
      toast.dismiss()
      toast.error('Error al actualizar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }


  return (
    <FormView>
      <div className="space-y-5">
        <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
          Cambia la asignatura o fecha de esta lista de asistencia.
        </p>

        <div className="space-y-2">
          <Label>Asignatura</Label>
          <EduSelect value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)}>
            <option value="">Sin asignatura</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </EduSelect>
        </div>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <EduInput type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
        </div>

        <div className="pt-2">
          <EduButton
            type="button"
            onClick={handleSave}
            disabled={saving}
            icon={Save}
            fullWidth
          >
            Guardar cambios
          </EduButton>
        </div>
      </div>
    </FormView>
  )
}
