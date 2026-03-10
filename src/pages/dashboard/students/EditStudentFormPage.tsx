import { useState, useEffect, useMemo } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate, useParams } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore'

const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
]

const GRADE_MAP: Record<string, string> = {
  Primero: '1', Segundo: '2', Tercero: '3', Cuarto: '4', Quinto: '5',
  Sexto: '6', Séptimo: '7', Octavo: '8', Noveno: '9',
  Décimo: '10', Once: '11',
}

type Grade = { id: string; name: string }
type Neighborhood = { id: string; name: string }


export default function EditStudentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [grades, setGrades] = useState<Grade[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [currentGradeName, setCurrentGradeName] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [selectedGradeName, setSelectedGradeName] = useState('')
  const [selectedGradeId, setSelectedGradeId] = useState('')

  useEffect(() => {
    if (!id) return
    const fetchAll = async () => {
      try {
        const [studentSnap, gradesSnap, neighborhoodsSnap] = await Promise.all([
          getDoc(doc(db, 'students', id)),
          getDocs(query(collection(db, 'grades'), where('state', '==', true))),
          getDocs(query(collection(db, 'neighborhoods'), where('state', '==', true))),
        ])

        if (!studentSnap.exists()) {
          toast.error('Estudiante no encontrado')
          navigate('/dashboard/students', { replace: true })
          return
        }

        const data = studentSnap.data()
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setNeighborhood(data.neighborhood || '')
        setSelectedGradeId(data.grade_id || '')

        const allGrades = gradesSnap.docs.map(d => ({ id: d.id, name: d.data().name }))
        setGrades(allGrades)
        setNeighborhoods(neighborhoodsSnap.docs.map(d => ({ id: d.id, name: d.data().name })))

        // Muestra el nombre del grupo actual como referencia
        const current = allGrades.find(g => g.id === data.grade_id)
        if (current) setCurrentGradeName(current.name)

      } catch (error: any) {
        toast.error('Error al cargar datos', { description: error.message })
      } finally {
        setLoadingData(false)
      }
    }
    fetchAll()
  }, [id, navigate])

  const filteredGrades = useMemo(() => {
    if (!selectedGradeName) return []
    if (selectedGradeName === 'Transición') return grades.filter(g => g.name.includes('Transición'))
    const prefix = GRADE_MAP[selectedGradeName]
    if (!prefix) return []
    return grades.filter(g =>
      prefix === '1'
        ? g.name.startsWith('1') && !g.name.startsWith('11')
        : g.name.startsWith(prefix)
    )
  }, [grades, selectedGradeName])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lastName.trim()) { toast.error('El apellido es obligatorio'); return }
    if (!firstName.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!selectedGradeId) { toast.error('Debes seleccionar el grupo'); return }
    
    setSaving(true)
    try {
      await updateDoc(doc(db, 'students', id!), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        grade_id: selectedGradeId,
        neighborhood: neighborhood || null,
        updated_at: serverTimestamp(),
      })
      
      // Update local cache
      queryClient.setQueryData(['students'], (old: any) => {
        if (!old) return old
        return old.map((s: any) => 
          s.id === id 
            ? { ...s, first_name: firstName.trim(), last_name: lastName.trim(), grade_id: selectedGradeId, neighborhood: neighborhood || null } 
            : s
        )
      })

      toast.success('Estudiante actualizado')
      navigate('/dashboard/students', { replace: true })
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) return <LoadingSpinner message="Cargando datos del estudiante..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Grupo actual (referencia) */}
        {currentGradeName && (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Grupo actual</p>
            <p className="text-sm font-semibold text-primary">{currentGradeName}</p>
          </div>
        )}

        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <EduInput
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <EduInput
              id="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Barrio */}
        <div className="space-y-2">
          <Label>Barrio / Ubicación</Label>
          <EduSelect value={neighborhood} onChange={e => setNeighborhood(e.target.value)}>
            <option value="">Sin barrio registrado</option>
            {neighborhoods.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
          </EduSelect>
        </div>

        {/* Cambiar grupo — selección en 3 pasos */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Cambiar grupo
          </p>
          <div className="space-y-2">
            <Label>Nivel educativo</Label>
            <EduSelect
              value={selectedLevelId}
              onChange={e => { setSelectedLevelId(e.target.value); setSelectedGradeName(''); setSelectedGradeId(currentGradeName ? selectedGradeId : '') }}
            >
              <option value="">Seleccionar nivel</option>
              {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </EduSelect>
          </div>
          <div className="space-y-2">
            <Label>Grado (Ley 115)</Label>
            <EduSelect
              value={selectedGradeName}
              onChange={e => { setSelectedGradeName(e.target.value); setSelectedGradeId('') }}
              disabled={!selectedLevelId}
            >
              <option value="">Seleccionar grado</option>
              {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g =>
                <option key={g} value={g}>{g}</option>
              )}
            </EduSelect>
          </div>
          <div className="space-y-2">
            <Label>Grupo / Curso</Label>
            <EduSelect
              value={selectedGradeId}
              onChange={e => setSelectedGradeId(e.target.value)}
              disabled={!selectedGradeName}
            >
              <option value="">{filteredGrades.length > 0 ? 'Seleccionar grupo' : 'No hay grupos'}</option>
              {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </EduSelect>
          </div>
        </div>

        {/* Acciones */}
        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving || !selectedGradeId}
            icon={Save}
            fullWidth
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
