import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function NewSubjectFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre es requerido'); return }
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
      setExiting(true)
      setTimeout(() => navigate('/dashboard/subjects', { replace: true }), 220)
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
          Registra una nueva materia en el currículo institucional.
        </p>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la asignatura</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Matemáticas, Lenguaje..."
            required
            className="h-12 text-sm bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20 font-semibold text-sm transition-all active:scale-[0.98]">
            <Save className="w-4 h-4" />{saving ? 'Creando...' : 'Crear asignatura'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
