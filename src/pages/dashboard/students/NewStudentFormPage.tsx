import { useState, useEffect, useMemo } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useNavigate } from 'react-router-dom'
import { FormView } from '@/components/ui/FormView'
import { useQueryClient } from '@tanstack/react-query'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
import { EduSelect } from '@/components/ui/EduSelect'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'

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


export default function NewStudentFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [grades, setGrades] = useState<Grade[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [selectedGradeName, setSelectedGradeName] = useState('')
  const [selectedGradeId, setSelectedGradeId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesSnap, neighborhoodsSnap] = await Promise.all([
          getDocs(query(collection(db, 'grades'), where('state', '==', true))),
          getDocs(query(collection(db, 'neighborhoods'), where('state', '==', true))),
        ])
        setGrades(gradesSnap.docs.map(d => ({ id: d.id, name: d.data().name })))
        setNeighborhoods(neighborhoodsSnap.docs.map(d => ({ id: d.id, name: d.data().name })))
      } catch (error: any) {
        toast.error('Error al cargar datos', { description: error.message })
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

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
    if (!selectedGradeId) { toast.error('Debes seleccionar el grupo (grado y grupo)'); return }
    
    setSaving(true)
    try {
      const docRef = await addDoc(collection(db, 'students'), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        grade_id: selectedGradeId,
        neighborhood: neighborhood || null,
        state: true,
        created_at: serverTimestamp(),
      })
      
      // Update local cache
      queryClient.setQueryData(['students'], (old: any) => {
        const newStudent = { id: docRef.id, first_name: firstName.trim(), last_name: lastName.trim(), grade_id: selectedGradeId, neighborhood: neighborhood || null, state: true }
        return old ? [...old, newStudent] : [newStudent]
      })

      toast.success('Estudiante matriculado')
      navigate('/dashboard/students', { replace: true })
    } catch (error: any) {
      toast.error('Error al matricular', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) return <LoadingSpinner message="Cargando datos de matrícula..." />;

  return (
    <FormView>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <EduInput
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Apellido"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <EduInput
              id="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Nombre"
              required
            />
          </div>
        </div>

        {/* Barrio */}
        <div className="space-y-2">
          <Label>Barrio / Ubicación</Label>
          <EduSelect value={neighborhood} onChange={e => setNeighborhood(e.target.value)}>
            <option value="">Seleccionar barrio (opcional)</option>
            {neighborhoods.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
          </EduSelect>
        </div>

        {/* Nivel educativo */}
        <div className="space-y-2">
          <Label>Nivel educativo</Label>
          <EduSelect
            value={selectedLevelId}
            onChange={e => { setSelectedLevelId(e.target.value); setSelectedGradeName(''); setSelectedGradeId('') }}
          >
            <option value="">Seleccionar nivel</option>
            {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </EduSelect>
        </div>

        {/* Grado */}
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

        {/* Grupo */}
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

        {/* Acciones */}
        <div className="pt-2">
          <EduButton
            type="submit"
            disabled={saving}
            icon={Save}
            fullWidth
          >
            {saving ? 'Matriculando...' : 'Matricular estudiante'}
          </EduButton>
        </div>
      </form>
    </FormView>
  )
}
