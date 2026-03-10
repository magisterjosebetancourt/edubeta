import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export default function EditNeighborhoodFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'neighborhoods', id))
      .then(snap => {
        if (!snap.exists()) { toast.error('Barrio no encontrado'); navigate('/dashboard/neighborhoods', { replace: true }); return }
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
      await updateDoc(doc(db, 'neighborhoods', id!), { name: name.trim() })
      toast.success('Barrio actualizado')
      navigate('/dashboard/neighborhoods', { replace: true })
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando barrio..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del barrio</Label>
          <EduInput
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving}
            icon={saving ? Loader2 : Save}
            fullWidth
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
