import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X, Loader2 } from 'lucide-react'
import { db, auth } from '@/lib/firebase/config'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'

type TodoPriority = 'P1' | 'P2' | 'P3' | 'P4'

export default function NewTodoFormPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

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
      const user = auth.currentUser
      if (!user) throw new Error('No hay sesión activa')
      await addDoc(collection(db, 'todos'), {
        title, description, priority, start_date,
        user_id: user.uid,
        status: 'pendiente',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      toast.success('Tarea creada correctamente')
      setExiting(true)
      setTimeout(() => navigate('/dashboard/todos', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al crear tarea', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Organiza tus actividades y compromisos pendientes.
        </p>
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Título</Label>
          <Input name="title" required placeholder="Ej: Revisar exámenes de 5-A"
            className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-none font-semibold" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Descripción</Label>
          <Input name="description" placeholder="Añade más detalles..."
            className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Prioridad</Label>
            <select name="priority" defaultValue="P3"
              className="w-full h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] px-4 text-xs font-semibold outline-none border-none dark:text-white">
              <option value="P1">Urgente</option>
              <option value="P2">Importante</option>
              <option value="P3">Normal</option>
              <option value="P4">Baja</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Fecha</Label>
            <Input name="start_date" type="date" defaultValue={today} required
              className="h-12 rounded-lg bg-slate-100 dark:bg-[#1e2536] border-none text-xs font-semibold" />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-[5px] h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creando...' : 'Crear tarea'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
