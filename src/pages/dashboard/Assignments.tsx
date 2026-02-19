
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { toast } from 'sonner'
import { Trash2, Plus, BookOpen, GraduationCap, ArrowRight } from 'lucide-react'
import { Label } from '@/components/ui/label'

type Teacher = { id: string; full_name: string }
type Grade = { id: number; name: string }
type Subject = { id: number; name: string }
type Assignment = {
    id: number
    teacher_id: string
    grade_id: number
    subject_id: number
    teacher: { full_name: string }
    grade: { name: string }
    subject: { name: string }
}

// Estructura Ley 115 de 1994 (Colombia) - Same as Grades.tsx
const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
]

const GRADE_MAP: Record<string, string> = {
    'Primero': '1', 'Segundo': '2', 'Tercero': '3', 'Cuarto': '4', 'Quinto': '5',
    'Sexto': '6', 'Séptimo': '7', 'Octavo': '8', 'Noveno': '9',
    'Décimo': '10', 'Once': '11'
}

export default function AssignmentsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [assignments, setAssignments] = useState<Assignment[]>([])
    
    // Catalog Data
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [grades, setGrades] = useState<Grade[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])

    // Form State
    const [selectedTeacher, setSelectedTeacher] = useState<string>('')
    
    // New Hierarchy State
    const [selectedLevelId, setSelectedLevelId] = useState<string>('') // e.g. 'secundaria'
    const [selectedGradeName, setSelectedGradeName] = useState<string>('') // e.g. 'Sexto'
    const [selectedGradeId, setSelectedGradeId] = useState<string>('') // Actual DB ID e.g. '15' (for 601)
    
    const [selectedSubject, setSelectedSubject] = useState<string>('')
    const [isCreating, setIsCreating] = useState(false)

    // Filter grades based on Level -> GradeName selection
    const filteredGrades = grades.filter(g => {
        if (!selectedGradeName) return false
        
        if (selectedGradeName === 'Transición') {
            return g.name.includes('Transición')
        }

        const prefix = GRADE_MAP[selectedGradeName]
        if (!prefix) return false

        // Special handling for '1' (Primero) vs '11' (Once)
        // If prefix is '1', we want '101' but not '1101'
        if (prefix === '1') {
             return g.name.startsWith('1') && !g.name.startsWith('11')
        }
        
        return g.name.startsWith(prefix)
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [assRes, teachRes, gradRes, subRes] = await Promise.all([
                supabase.from('assignments')
                    .select(`
                        id, teacher_id, grade_id, subject_id,
                        teacher:profiles!teacher_id(full_name),
                        grade:grades!grade_id(name),
                        subject:subjects!subject_id(name)
                    `)
                    .order('created_at', { ascending: false }),
                supabase.from('profiles').select('id, full_name').eq('role', 'teacher'),
                supabase.from('grades').select('id, name').order('name'),
                supabase.from('subjects').select('id, name').order('name')
            ])

            if (assRes.error) throw assRes.error
            if (teachRes.error) throw teachRes.error
            if (gradRes.error) throw gradRes.error
            if (subRes.error) throw subRes.error

            // Helper to clean up joined data which might be arrays or objects
            const cleanAssignments = (assRes.data || []).map((a: any) => ({
                id: a.id,
                teacher_id: a.teacher_id,
                grade_id: a.grade_id,
                subject_id: a.subject_id,
                teacher: Array.isArray(a.teacher) ? a.teacher[0] : a.teacher,
                grade: Array.isArray(a.grade) ? a.grade[0] : a.grade,
                subject: Array.isArray(a.subject) ? a.subject[0] : a.subject
            }))

            setAssignments(cleanAssignments)
            setTeachers(teachRes.data || [])
            setGrades(gradRes.data || [])
            setSubjects(subRes.data || [])

        } catch (error: any) {
            toast.error('Error al cargar datos', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTeacher || !selectedGradeId || !selectedSubject) {
            toast.error('Selecciona Docente, Grupo y Asignatura')
            return
        }
        
        setIsCreating(true)

        try {
            // Check for duplicates locally first (fast check)
            const exists = assignments.find(a => 
                a.grade_id === Number(selectedGradeId) && 
                a.subject_id === Number(selectedSubject) &&
                a.teacher_id === selectedTeacher
            )
            
            if (exists) {
                toast.error('Esta asignación ya existe')
                setIsCreating(false)
                return
            }

            const { error } = await supabase.from('assignments').insert({
                teacher_id: selectedTeacher,
                grade_id: Number(selectedGradeId),
                subject_id: Number(selectedSubject)
            } as any)

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error('Ya existe una asignación idéntica')
                } else {
                    throw error
                }
            } else {
                toast.success('Carga académica asignada')
                fetchData() // Refresh list
                // Opcional: Limpiar selects
            }
        } catch (error: any) {
            toast.error('Error al asignar carga', { description: error.message })
        } finally {
            setIsCreating(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta asignación académica?')) return

        try {
            const { error } = await supabase.from('assignments').delete().eq('id', id)
            if (error) throw error
            toast.success('Asignación eliminada')
            setAssignments(prev => prev.filter(a => a.id !== id))
        } catch (error: any) {
             toast.error('Error al eliminar', { description: error.message })
        }
    }

    if (loading) return <div className="p-8 text-center">Cargando carga académica...</div>

    return (
        <div className="space-y-6 p-6 h-full overflow-y-auto bg-slate-50 dark:bg-[#0f1117] min-h-screen">
             <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Asignación Académica</h1>
                <p className="text-gray-500">Asigna qué materias dictan los docentes en cada curso (Institucional).</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Formulario (Izquierda) */}
                <div className="lg:col-span-4 h-fit sticky top-6">
                    <Card className="border-l-4 border-l-orange-500 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" />
                                Nueva Asignación
                            </CardTitle>
                            <CardDescription>Vincular Docente - Grado - Materia</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>1. Docente</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                            onChange={(e) => setSelectedTeacher(e.target.value)} 
                                            value={selectedTeacher}
                                        >
                                            <option value="">Seleccionar Docente</option>
                                            {teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.full_name || 'Sin Nombre'}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>2. Nivel Educativo</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                            onChange={(e) => {
                                                setSelectedLevelId(e.target.value)
                                                setSelectedGradeName('')
                                                setSelectedGradeId('')
                                            }} 
                                            value={selectedLevelId}
                                        >
                                            <option value="">Seleccionar Nivel</option>
                                            {LEVELS.map(level => (
                                                <option key={level.id} value={level.id}>{level.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>3. Grado (Ley 115)</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                            onChange={(e) => {
                                                setSelectedGradeName(e.target.value)
                                                setSelectedGradeId('')
                                            }} 
                                            value={selectedGradeName}
                                            disabled={!selectedLevelId}
                                        >
                                            <option value="">Seleccionar Grado</option>
                                            {selectedLevelId && LEVELS.find(l => l.id === selectedLevelId)?.grades.map(gName => (
                                                <option key={gName} value={gName}>{gName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>4. Grupo / Curso</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                            onChange={(e) => setSelectedGradeId(e.target.value)} 
                                            value={selectedGradeId}
                                            disabled={!selectedGradeName}
                                        >
                                            <option value="">{filteredGrades.length > 0 ? "Seleccionar Grupo" : "No hay grupos"}</option>
                                            {filteredGrades.map(g => (
                                                <option key={g.id} value={String(g.id)}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>5. Asignatura</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                            onChange={(e) => setSelectedSubject(e.target.value)} 
                                            value={selectedSubject}
                                        >
                                            <option value="">Seleccionar Materia</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={isCreating}>
                                    {isCreating ? 'Asignando...' : 'Asignar Carga'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista (Derecha) */}
                <div className="lg:col-span-8">
                    <Card className="border-none shadow-none bg-transparent">
                         <CardHeader className="px-0 pt-0">
                            <CardTitle>Asignaciones Activas</CardTitle>
                            <CardDescription>Total: {assignments.length} registros</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                             {assignments.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No hay carga académica asignada.</p>
                                    <p className="text-sm text-slate-400">Utiliza el formulario para crear la primera asignación.</p>
                                </div>
                             ) : (
                                <div className="grid gap-3">
                                    {assignments.map((assign) => (
                                        <div key={assign.id} className="group flex items-center justify-between p-4 bg-white dark:bg-[#1e1c30] border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-orange-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-full flex items-center justify-center font-bold">
                                                    {assign.teacher?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                                        {assign.teacher?.full_name || 'Desconocido'}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">
                                                            <GraduationCap className="w-3 h-3" />
                                                            {assign.grade?.name}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3 text-slate-300" />
                                                        <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium">
                                                            <BookOpen className="w-3 h-3" />
                                                            {assign.subject?.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDelete(assign.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
