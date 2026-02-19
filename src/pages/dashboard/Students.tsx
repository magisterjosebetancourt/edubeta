import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CsvUploader } from '@/components/students/CsvUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Trash2, 
  UserPlus, 
  Search, 
  ChevronDown, 
  Edit,
  Upload
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"


type Grade = {
  id: string
  name: string
  level?: string
}

type Student = {
  id: string
  first_name: string
  last_name: string
  grade_id?: string
  grades?: {
    name: string
  }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const supabase = createClient()

  const fetchData = async () => {
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        supabase
          .from('students')
          .select(`*, grades (name)`)
          .order('last_name', { ascending: true }),
        supabase
          .from('grades')
          .select('*')
          .order('name', { ascending: true })
      ])

      if (studentsRes.error) throw studentsRes.error
      if (gradesRes.error) throw gradesRes.error

      setStudents(studentsRes.data || [])
      setGrades(gradesRes.data || [])
    } catch (error: any) {
      toast.error('Error al cargar datos', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    const formData = new FormData(e.currentTarget)
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const gradeId = formData.get('gradeId') as string

    if (!firstName || !lastName || !gradeId) {
      toast.error('Todos los campos son requeridos')
      setIsCreating(false)
      return
    }

    try {
      const { error } = await supabase
        .from('students')
        .insert([{ 
          first_name: firstName, 
          last_name: lastName,
          grade_id: Number(gradeId)
        }] as any)

      if (error) throw error

      toast.success('Estudiante matriculado')
      setIsDialogOpen(false)
      fetchData() // Recargar lista
    } catch (error: any) {
      toast.error('Error al matricular', { description: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingStudent) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const gradeId = formData.get('gradeId') as string

    if (!firstName || !lastName || !gradeId) {
        toast.error('Todos los campos son requeridos')
        setIsUpdating(false)
        return
    }

    try {
        const { error } = await (supabase
            .from('students') as any)
            .update({ 
                first_name: firstName, 
                last_name: lastName,
                grade_id: Number(gradeId)
            })
            .eq('id', editingStudent.id)

        if (error) throw error

        toast.success('Estudiante actualizado')
        setEditingStudent(null)
        fetchData()
    } catch (error: any) {
        toast.error('Error al actualizar', { description: error.message })
    } finally {
        setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
     if(!confirm('¿Estás seguro de eliminar este estudiante?')) return;

     try {
       const { error } = await supabase
         .from('students')
         .delete()
         .eq('id', id)
       
       if (error) throw error

       toast.success('Estudiante eliminado')
       setStudents(prev => prev.filter(s => s.id !== id))
     } catch (error: any) {
       toast.error('Error al eliminar', { description: error.message })
     }
  }

  // Filter students
  const filteredStudents = students.filter(student => 
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="p-8 text-center">Cargando estudiantes...</div>

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#151b2d]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <h1 className="hidden lg:block text-xl font-bold text-slate-900 dark:text-white">Estudiantes</h1>
           </div>
          
           <div className="flex gap-2">
             <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                    <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-full shadow-sm transition-transform active:scale-95 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                    </button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Importación Masiva</DialogTitle>
                        <DialogDescription>
                            Sube un archivo CSV (nombre, apellido, grado) para registrar múltiples estudiantes.
                        </DialogDescription>
                    </DialogHeader>
                    <CsvUploader onSuccess={() => {
                        setIsImportOpen(false)
                        fetchData()
                    }} />
                </DialogContent>
             </Dialog>
          
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <button className="bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 flex items-center justify-center">
                        <UserPlus className="w-5 h-5" />
                    </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>Matricular Estudiante</DialogTitle>
                    <DialogDescription>
                        Ingresa los datos del nuevo estudiante para añadirlo al sistema.
                    </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Nombre</Label>
                                <Input id="firstName" name="firstName" placeholder="Ej. Juan" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Apellido</Label>
                                <Input id="lastName" name="lastName" placeholder="Ej. Pérez" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gradeId">Grado/Curso</Label>
                            <div className="relative">
                                <select 
                                    name="gradeId" 
                                    required
                                    className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                >
                                    <option value="">Seleccione un grado</option>
                                    {grades.map((grade) => (
                                        <option key={grade.id} value={String(grade.id)}>
                                            {grade.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isCreating}>
                            {isCreating ? 'Guardando...' : 'Matricular'}
                        </Button>
                    </form>
                </DialogContent>
             </Dialog>
           </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1e2536] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 transition-shadow outline-none" 
                placeholder="Buscar por nombre..." 
                type="text"
            />
          </div>
          <div className="relative min-w-[100px]">
             <select className="w-full appearance-none bg-slate-100 dark:bg-[#1e2536] border-none rounded-xl py-2.5 pl-4 pr-8 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 cursor-pointer outline-none">
                <option>Todos</option>
                {/* Falta implementar filtro real por grado, visual only por ahora */}
                <option>Grado 9</option>
                <option>Grado 10</option>
                <option>Grado 11</option>
             </select>
             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Content List */}
      <main className="px-4 py-4 space-y-3">
        {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
                <p>No se encontraron estudiantes.</p>
            </div>
        ) : (
            filteredStudents.map((student) => (
                <div key={student.id} className="group relative bg-white dark:bg-[#151b2d] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white leading-tight">
                                    {student.first_name} {student.last_name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Acudiente: No registrado</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wide">
                            {student.grades?.name || 'Sin Asignar'}
                        </span>
                    </div>
                    {/* Quick Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-2">
                        <button 
                            onClick={() => setEditingStudent(student)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Editar
                        </button>
                        <button 
                            onClick={() => handleDelete(student.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    </div>
                </div>
            ))
        )}
      </main>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
             <DialogDescription>
               Modifica los datos personales y académicos del estudiante.
             </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-firstName">Nombre</Label>
                    <Input 
                        id="edit-firstName" 
                        name="firstName" 
                        defaultValue={editingStudent?.first_name} 
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Apellido</Label>
                    <Input 
                        id="edit-lastName" 
                        name="lastName" 
                        defaultValue={editingStudent?.last_name} 
                        required 
                    />
                </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="edit-gradeId">Grado/Curso</Label>
                <div className="relative">
                    <select 
                        name="gradeId" 
                        defaultValue={String(editingStudent?.grade_id || '')} 
                        required
                        className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                    >
                        <option value="">Seleccione un grado</option>
                        {grades.map((grade) => (
                            <option key={grade.id} value={String(grade.id)}>
                                {grade.name}
                            </option>
                        ))}
                    </select>
                </div>
             </div>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>Cancelar</Button>
                <Button type="submit" disabled={isUpdating}>Guardar Cambios</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
