import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function NewSubjectFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre de la asignatura es obligatorio'); return }
    setSaving(true)
    try {
      const docRef = await addDoc(collection(db, 'subjects'), {
        name: name.trim(),
        state: true,
        created_at: serverTimestamp(),
      })
      
      // Update local cache directly 
      queryClient.setQueryData(['subjects'], (old: any) => {
        const newSubject = { id: docRef.id, name: name.trim(), state: true }
        const newList = old ? [...old, newSubject] : [newSubject]
        return newList.sort((a, b) => a.name.localeCompare(b.name, "es"))
      })

      toast.success('Asignatura creada')
      navigate('/dashboard/subjects', { replace: true })
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
          Registra una nueva materia en el currículo institucional.
        </p>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la asignatura</Label>
          <EduInput
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Matemáticas, Lenguaje..."
            required
          />
        </div>
        <div className="pt-2">
          <EduButton type="submit" disabled={saving} fullWidth icon={Save}>
            {saving ? 'CREANDO...' : 'CREAR ASIGNATURA'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
