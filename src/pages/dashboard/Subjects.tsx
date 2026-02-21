import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Trash2, Plus, BookOpen, Pencil, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Subject = {
  id: number;
  name: string;
  state?: boolean;
  created_at?: string;
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const supabase = createClient();

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
    e.preventDefault();
    setIsCreating(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;

    if (!name) {
      toast.error("El nombre de la asignatura es requerido");
      setIsCreating(false);
      return;
    }

    try {
      const { error } = await supabase.from("subjects").insert([{ name }] as any);

      if (error) throw error;

      toast.success("Asignatura creada correctamente");
      form.reset();
      setIsDialogOpen(false);
      fetchSubjects();
    } catch (error: any) {
      toast.error("Error al crear asignatura", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleState = async (subject: Subject) => {
    try {
      const newState = !subject.state;
      const { error } = await (supabase.from("subjects") as any)
        .update({ state: newState })
        .eq("id", subject.id);

      if (error) throw error;

      toast.success(newState ? "Asignatura activada" : "Asignatura desactivada");
      setSubjects((prev) =>
        prev.map((s) => (s.id === subject.id ? { ...s, state: newState } : s)),
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

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
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20">
      <div className="px-4 py-4 pt-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Administra las materias del currículo escolar.
        </p>
      </div>

      <main className="p-4 space-y-4">
        {subjects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/30">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              No hay asignaturas registradas.
            </p>
          </div>
        ) : (
          subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white dark:bg-[#151b2d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {subject.name}
                  </h3>
                  <div
                    onClick={() => handleToggleState(subject)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                      subject.state !== false
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {subject.state !== false ? "Activa" : "Inactiva"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10"
                  onClick={() => setEditingSubject(subject)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  onClick={() => handleDelete(subject.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </main>

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
