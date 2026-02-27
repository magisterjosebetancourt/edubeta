import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function NewNeighborhoodFormPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre del barrio es requerido'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'neighborhoods'), {
        name: name.trim(),
        state: true,
        created_at: serverTimestamp(),
      })
      toast.success('Barrio creado correctamente')
      setExiting(true)
      setTimeout(() => navigate('/dashboard/neighborhoods', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al crear', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Agrega un nuevo sector para la caracterización socioeconómica de los estudiantes.
        </p>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del barrio</Label>
          <input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Centro, El Prado..."
            required
            className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Crear barrio'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
