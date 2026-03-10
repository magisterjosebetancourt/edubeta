import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { db, auth } from '@/lib/firebase/config'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'

type TodoPriority = 'P1' | 'P2' | 'P3' | 'P4'

export default function NewTodoFormPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')


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
      navigate('/dashboard/todos', { replace: true })
    } catch (error: any) {
      toast.error('Error al crear tarea', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
          Organiza tus actividades y compromisos pendientes.
        </p>
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Título</Label>
          <EduInput name="title" required placeholder="Ej: Revisar exámenes de 5-A" className="font-semibold" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest text-slate-400">Descripción</Label>
          <EduInput name="description" placeholder="Añade más detalles..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Prioridad</Label>
            <EduSelect name="priority" defaultValue="P3">
              <option value="P1">Urgente</option>
              <option value="P2">Importante</option>
              <option value="P3">Normal</option>
              <option value="P4">Baja</option>
            </EduSelect>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-slate-400">Fecha</Label>
            <EduInput name="start_date" type="date" defaultValue={today} required className="font-semibold" />
          </div>
        </div>
        <div className="pt-2">
          <EduButton type="submit" disabled={saving} fullWidth icon={saving ? Loader2 : Save}>
            {saving ? 'Creando...' : 'Crear tarea'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
