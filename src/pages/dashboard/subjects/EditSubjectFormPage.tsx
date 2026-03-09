import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export default function EditSubjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
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

      // Update local cache 
      queryClient.setQueryData(['subjects'], (old: any) => {
        if (!old) return old
        const newList = old.map((s: any) => s.id === id ? { ...s, name: name.trim() } : s)
        return newList.sort((a: any, b: any) => a.name.localeCompare(b.name, "es"))
      })

      toast.success('Asignatura actualizada')
      setExiting(true)
      setTimeout(() => navigate('/dashboard/subjects', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando asignatura..." />;

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
            className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}
            className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs">
            <X className="w-4 h-4 mr-1.5" />Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
