import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import {
  collection, getDocs, getDocs as _getDocs, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore'

export default function EditAttendanceSessionFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [exiting, setExiting] = useState(false)
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

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

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
      setExiting(true)
      setTimeout(() => navigate('/dashboard/attendance', { replace: true }), 220)
    } catch (err: any) {
      toast.dismiss()
      toast.error('Error al actualizar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none border border-slate-200 dark:border-slate-800 dark:text-white"

  return (
    <FormView exiting={exiting}>
      <div className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cambia la asignatura o fecha de esta lista de asistencia.
        </p>

        <div className="space-y-2">
          <Label>Asignatura</Label>
          <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} className={selectClass}>
            <option value="">Sin asignatura</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            className={selectClass} />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="flex-1 rounded-lg h-auto py-3.5 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            <Save className="w-4 h-4" />Guardar cambios
          </Button>
        </div>
      </div>
    </FormView>
  )
}
