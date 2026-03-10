import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function NewNeighborhoodFormPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)


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
      navigate('/dashboard/neighborhoods', { replace: true })
    } catch (error: any) {
      toast.error('Error al crear', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
          Agrega un nuevo sector para la caracterización socioeconómica de los estudiantes.
        </p>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del barrio</Label>
          <EduInput
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Centro, El Prado..."
            required
          />
        </div>
        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving}
            icon={Save}
            fullWidth
          >
            {saving ? 'Guardando...' : 'Crear barrio'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
