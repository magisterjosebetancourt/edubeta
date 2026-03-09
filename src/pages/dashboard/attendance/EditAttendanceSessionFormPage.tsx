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

  const selectClass = "pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium"

  return (
    <FormView exiting={exiting}>
      <div className="space-y-5">
        <p className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-6">
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
            className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0">
            <Save className="w-4 h-4" />Guardar cambios
          </Button>
        </div>
      </div>
    </FormView>
  )
}
