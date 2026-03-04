import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X, Loader2 } from 'lucide-react'
import { auth, db } from '@/lib/firebase/config'
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'

type InfractionType = 'leve' | 'grave' | 'gravisima'
type InfractionStatus = 'abierto' | 'seguimiento' | 'cerrado'
interface Student { id: string; first_name: string; last_name: string }

export default function InfractionFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('Docente')

  // Controlled values for edit pre-fill
  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState<InfractionType>('leve')
  const [status, setStatus] = useState<InfractionStatus>('abierto')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser
      if (!user) return

      const [profileSnap, studentsSnap] = await Promise.all([
        getDoc(doc(db, 'profiles', user.uid)),
        getDocs(collection(db, 'students')),
      ])
      setCurrentUserName(profileSnap.data()?.full_name || 'Docente')
      const list = studentsSnap.docs
        .map(d => ({ id: d.id, first_name: d.data().first_name, last_name: d.data().last_name } as Student))
        .sort((a, b) => a.last_name.localeCompare(b.last_name, 'es'))
      setStudents(list)

      if (isEdit && id) {
        const snap = await getDoc(doc(db, 'infractions', id))
        if (snap.exists()) {
          const data = snap.data()
          setStudentId(data.student_id || '')
          setType(data.type || 'leve')
          setStatus(data.status || 'abierto')
          setDescription(data.description || '')
          setDate(data.date || format(new Date(), 'yyyy-MM-dd'))
        }
      }
      setLoading(false)
    }
    load().catch(e => { toast.error('Error al cargar', { description: e.message }); setLoading(false) })
  }, [id, isEdit])

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId) { toast.error('Debes seleccionar un estudiante'); return }
    if (!description.trim()) { toast.error('La descripción del hecho es obligatoria'); return }
    setSaving(true)

    const selectedStudent = students.find(s => s.id === studentId)
    const studentName = selectedStudent ? `${selectedStudent.last_name}, ${selectedStudent.first_name}` : 'Desconocido'

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'infractions', id!), {
          student_id: studentId, student_name: studentName,
          type, description, date, status,
          updated_at: serverTimestamp(),
        })
        toast.success('Falta actualizada correctamente')
      } else {
        await addDoc(collection(db, 'infractions'), {
          student_id: studentId, student_name: studentName,
          type, description, date, status,
          reported_by_name: currentUserName,
          created_at: serverTimestamp(),
        })
        toast.success('Falta registrada correctamente')
      }
      setExiting(true)
      setTimeout(() => navigate('/dashboard/infractions', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none border border-slate-200 dark:border-slate-800 dark:text-white"

  if (loading) return <LoadingSpinner message="Cargando datos de la falta..." />;

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isEdit ? 'Modifica los datos del registro de falta.' : 'Documenta una falta disciplinaria de un estudiante.'}
        </p>

        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Estudiante *</Label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)} required className={selectClass}>
            <option value="">Seleccionar estudiante...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Tipo de falta</Label>
            <select value={type} onChange={e => setType(e.target.value as InfractionType)} required className={selectClass}>
              <option value="leve">Tipo I</option>
              <option value="grave">Tipo II</option>
              <option value="gravisima">Tipo III</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Estado</Label>
            <select value={status} onChange={e => setStatus(e.target.value as InfractionStatus)} required className={selectClass}>
              <option value="abierto">Abierto</option>
              <option value="seguimiento">En seguimiento</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Descripción del hecho *</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            required rows={4}
            placeholder="Describe brevemente la situación ocurrida..."
            className="w-full rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 py-3 text-sm outline-none border border-slate-200 dark:border-slate-800 resize-none dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Fecha del hecho</Label>
          <Input
            type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-slate-200 dark:border-slate-800 text-sm"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Registrar falta')}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
