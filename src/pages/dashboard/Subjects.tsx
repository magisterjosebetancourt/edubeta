import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trash2, Plus, BookOpen, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Subject = {
  id: number
  name: string
  created_at?: string
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  
  const supabase = createClient()

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSubjects(data || [])
    } catch (error: any) {
      toast.error('Error al cargar asignaturas', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string

    if (!name) {
      toast.error('El nombre de la asignatura es requerido')
      setIsCreating(false)
      return
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .insert([{ name }] as any)
      
      if (error) throw error

      toast.success('Asignatura creada correctamente')
      form.reset()
      fetchSubjects()
    } catch (error: any) {
      toast.error('Error al crear asignatura', { description: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingSubject) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string

    if (!name) {
        toast.error('El nombre es requerido')
        setIsUpdating(false)
        return
    }

    try {
        const { error } = await (supabase
            .from('subjects') as any)
            .update({ name })
            .eq('id', editingSubject.id)

        if (error) throw error

        toast.success('Asignatura actualizada')
        setEditingSubject(null)
        fetchSubjects()
    } catch (error: any) {
        toast.error('Error al actualizar', { description: error.message })
    } finally {
        setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
     if(!confirm('¿Estás seguro? Se eliminarán todas las asignaciones asociadas.')) return;
     
     try {
       const { error } = await supabase
         .from('subjects')
         .delete()
         .eq('id', id)
       
       if (error) throw error
       
       toast.success('Asignatura eliminada')
       setSubjects(prev => prev.filter(s => s.id !== id))
     } catch (error: any) {
       toast.error('Error al eliminar', { description: error.message })
     }
  }

  if (loading) return <div className="p-8 text-center">Cargando asignaturas...</div>

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="hidden lg:block text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Asignaturas</h1>
           <p className="hidden lg:block text-gray-500">Administra las materias del currículo escolar.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Asignatura</CardTitle>
            <CardDescription>Agregar materia al plan de estudios</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-4">
              <Input name="name" placeholder="Nombre (Ej. Historia)" required />
              <Button type="submit" disabled={isCreating}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle>Lista de Asignaturas</CardTitle>
             <CardDescription>Total: {subjects.length}</CardDescription>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
               <p className="text-gray-500 text-sm">No hay asignaturas registradas.</p>
            ) : (
               <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                 {subjects.map((subject) => (
                   <li key={subject.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800">{subject.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-primary hover:bg-primary/10"
                            onClick={() => setEditingSubject(subject)}
                          >
                             <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(subject.id)}
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                      </div>
                   </li>
                 ))}
               </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Asignatura</DialogTitle>
            <DialogDescription>
              Modifica el nombre de la asignatura existente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre de la asignatura</Label>
                <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={editingSubject?.name} 
                    required 
                />
             </div>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSubject(null)}>Cancelar</Button>
                <Button type="submit" disabled={isUpdating}>Guardar Cambios</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
