import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X, Loader2 } from 'lucide-react'
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
  const [exiting, setExiting] = useState(false)

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

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

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
      setExiting(true)
      setTimeout(() => navigate('/dashboard/todos', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Cargando tarea...</div>

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Título</Label>
          <Input name="title" required defaultValue={todo?.title}
            className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-none font-semibold" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Descripción</Label>
          <Input name="description" defaultValue={todo?.description} placeholder="Añade más detalles..."
            className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Prioridad</Label>
            <select name="priority" defaultValue={todo?.priority || 'P3'}
              className="w-full h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 text-xs font-semibold outline-none border-none dark:text-white">
              <option value="P1">Urgente</option>
              <option value="P2">Importante</option>
              <option value="P3">Normal</option>
              <option value="P4">Baja</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Fecha</Label>
            <Input name="start_date" type="date"
              defaultValue={todo?.start_date || format(new Date(), 'yyyy-MM-dd')} required
              className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-none text-xs font-semibold" />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
