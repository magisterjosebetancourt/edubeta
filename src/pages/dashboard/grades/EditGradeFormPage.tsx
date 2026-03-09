import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, X, User } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useTeachers } from '@/lib/hooks/useFirebaseData'

export default function EditGradeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [directorId, setDirectorId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)

  const { data: teachers = [] } = useTeachers()

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
        const data = snap.data()
        setName(data.name || '')
        setDirectorId(data.director_id || '')
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
      await updateDoc(doc(db, 'grades', id!), { 
        name: name.trim(),
        director_id: directorId || null
      })
      
      // Update local cache
      queryClient.setQueryData(['grades'], (old: any) => {
        if (!old) return old
        const newList = old.map((g: any) => g.id === id ? { ...g, name: name.trim(), director_id: directorId || null } : g)
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

  if (loading) return <LoadingSpinner message="Cargando datos del grupo..." />;

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
            className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Director de Grupo */}
        <div className="space-y-2">
          <Label>Director de Grupo</Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={directorId}
              onChange={e => setDirectorId(e.target.value)}
              className="pl-9 h-10 w-full sm:w-auto min-w-[150px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all"
            >
              <option value="">Sin asignar por defecto</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <p className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-6">Solo aparecen docentes y coordinadores registrados.</p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormView>
  )
}
