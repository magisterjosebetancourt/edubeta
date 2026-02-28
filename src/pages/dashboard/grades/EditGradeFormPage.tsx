import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export default function EditGradeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchGrade = async () => {
      try {
        const snap = await getDoc(doc(db, 'grades', id))
        if (!snap.exists()) {
          toast.error('Grupo no encontrado')
          navigate('/dashboard/grades', { replace: true })
          return
        }
        setName(snap.data().name || '')
      } catch (error: any) {
        toast.error('Error al cargar el grupo', { description: error.message })
      } finally {
        setLoading(false)
      }
    }
    fetchGrade()
  }, [id, navigate])

  /** Activa la animación de salida y luego navega atrás (sin reload de página) */
  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => navigate(-1), 220)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre del grupo es requerido')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'grades', id!), { name: name.trim() })
      
      // Update local cache
      queryClient.setQueryData(['grades'], (old: any) => {
        if (!old) return old
        const newList = old.map((g: any) => g.id === id ? { ...g, name: name.trim() } : g)
        return newList.sort((a: any, b: any) => a.name.localeCompare(b.name, "es"))
      })

      toast.success('Grupo actualizado')
      setExiting(true)
      setTimeout(() => navigate('/dashboard/grades', { replace: true }), 220)
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Cargando grupo...
      </div>
    )
  }

  return (
    <FormView exiting={exiting}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="grade-name">Nombre del grupo</Label>
          <Input
            id="grade-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: 601, 1102, Transición A"
            autoComplete="off"
            required
            className="h-12 text-sm bg-slate-100 dark:bg-[#1e2536]
              border dark:border-slate-800 focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="w-full sm:w-auto rounded-lg h-auto py-3.5 px-6
              font-semibold text-sm text-slate-600 dark:text-slate-300
              border border-slate-200 dark:border-slate-700
              hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white
              rounded-lg h-auto py-3.5 gap-2 shadow-xl shadow-primary/20
              font-semibold text-sm transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
