import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export default function EditSubjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'subjects', id))
      .then(snap => {
        if (!snap.exists()) { toast.error('Asignatura no encontrada'); navigate('/dashboard/subjects', { replace: true }); return }
        setName(snap.data().name || '')
      })
      .catch(e => toast.error('Error al cargar', { description: e.message }))
      .finally(() => setLoading(false))
  }, [id, navigate])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'subjects', id!), { name: name.trim() })

      // Update local cache 
      queryClient.setQueryData(['subjects'], (old: any) => {
        if (!old) return old
        const newList = old.map((s: any) => s.id === id ? { ...s, name: name.trim() } : s)
        return newList.sort((a: any, b: any) => a.name.localeCompare(b.name, "es"))
      })

      toast.success('Asignatura actualizada')
      navigate('/dashboard/subjects', { replace: true })
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando asignatura..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la asignatura</Label>
          <EduInput
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
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
