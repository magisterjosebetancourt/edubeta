import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'

type TodoPriority = 'P1' | 'P2' | 'P3' | 'P4'

interface Todo {
  id: string
  title: string
  description: string
  priority: TodoPriority
  start_date: string
}

export default function EditTodoFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [todo, setTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'todos', id))
      .then(snap => {
        if (!snap.exists()) { toast.error('Tarea no encontrada'); navigate('/dashboard/todos', { replace: true }); return }
        setTodo({ id: snap.id, ...snap.data() } as Todo)
      })
      .catch(e => toast.error('Error al cargar', { description: e.message }))
      .finally(() => setLoading(false))
  }, [id, navigate])


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as TodoPriority
    const start_date = formData.get('start_date') as string

    try {
      await updateDoc(doc(db, 'todos', id!), { title, description, priority, start_date, updated_at: serverTimestamp() })
      toast.success('Tarea actualizada correctamente')
      navigate('/dashboard/todos', { replace: true })
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando tarea..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Título</Label>
          <EduInput name="title" required defaultValue={todo?.title} className="font-semibold" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Descripción</Label>
          <EduInput name="description" defaultValue={todo?.description} placeholder="Añade más detalles..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Prioridad</Label>
            <EduSelect name="priority" defaultValue={todo?.priority || 'P3'}>
              <option value="P1">Urgente</option>
              <option value="P2">Importante</option>
              <option value="P3">Normal</option>
              <option value="P4">Baja</option>
            </EduSelect>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Fecha</Label>
            <EduInput name="start_date" type="date"
              defaultValue={todo?.start_date || format(new Date(), 'yyyy-MM-dd')} required
              className="font-semibold" />
          </div>
        </div>
        <div className="pt-2">
          <EduButton type="submit" disabled={saving} fullWidth icon={saving ? Loader2 : Save}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
