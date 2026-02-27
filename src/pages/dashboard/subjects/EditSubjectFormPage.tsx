import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export default function EditSubjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)

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

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'subjects', id!), { name: name.trim() })
      toast.success('Asignatura actualizada')
      setExiting(true)
      setTimeout(() => navigate('/dashboard/subjects', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Cargando asignatura...</div>

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la asignatura</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
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
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
