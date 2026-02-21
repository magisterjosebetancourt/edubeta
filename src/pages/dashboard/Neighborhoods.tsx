import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Trash2, Plus, MapPin, Pencil, ArrowLeft } from 'lucide-react'
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

type Neighborhood = {
  id: number;
  name: string;
  state?: boolean;
  created_at?: string;
};

export default function NeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingNeighborhood, setEditingNeighborhood] = useState<Neighborhood | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const navigate = useNavigate();
  const supabase = createClient();

  const fetchNeighborhoods = async () => {
    try {
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setNeighborhoods(data || [])
    } catch (error: any) {
      toast.error('Error al cargar barrios', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNeighborhoods()
  }, [])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;

    if (!name) {
      toast.error("El nombre del barrio es requerido");
      setIsCreating(false);
      return;
    }

    try {
      const { error } = await supabase.from("neighborhoods").insert([{ name }] as any);

      if (error) throw error;

      toast.success("Barrio creado correctamente");
      form.reset();
      setIsDialogOpen(false);
      fetchNeighborhoods();
    } catch (error: any) {
      toast.error("Error al crear barrio", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleState = async (neighborhood: Neighborhood) => {
    try {
      const newState = !neighborhood.state;
      const { error } = await (supabase.from("neighborhoods") as any)
        .update({ state: newState })
        .eq("id", neighborhood.id);

      if (error) throw error;

      toast.success(newState ? "Barrio activado" : "Barrio desactivado");
      setNeighborhoods((prev) =>
        prev.map((n) => (n.id === neighborhood.id ? { ...n, state: newState } : n)),
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingNeighborhood) return

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
            .from('neighborhoods') as any)
            .update({ name })
            .eq('id', editingNeighborhood.id)

        if (error) throw error

        toast.success('Barrio actualizado')
        setEditingNeighborhood(null)
        fetchNeighborhoods()
    } catch (error: any) {
        toast.error('Error al actualizar', { description: error.message })
    } finally {
        setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
     if(!confirm('¿Estás seguro de eliminar este barrio?')) return;
     
     try {
       const { error } = await supabase
         .from('neighborhoods')
         .delete()
         .eq('id', id)
       
       if (error) throw error
       
       toast.success('Barrio eliminado')
       setNeighborhoods(prev => prev.filter(n => n.id !== id))
     } catch (error: any) {
       toast.error('Error al eliminar', { description: error.message })
     }
  }

  if (loading) return <div className="p-8 text-center">Cargando barrios...</div>

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 text-slate-800 dark:text-slate-100">
      <div className="px-4 py-4 pt-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Administra los barrios y sectores para la caracterización socioeconómica.
        </p>
      </div>

      <main className="p-4 space-y-4">
        {neighborhoods.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/30">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              No hay barrios registrados.
            </p>
          </div>
        ) : (
          neighborhoods.map((neighborhood) => (
            <div
              key={neighborhood.id}
              className="bg-white dark:bg-[#151b2d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white uppercase text-sm">
                    {neighborhood.name}
                  </h3>
                  <div
                    onClick={() => handleToggleState(neighborhood)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                      neighborhood.state !== false
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {neighborhood.state !== false ? "Activo" : "Inactivo"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10"
                  onClick={() => setEditingNeighborhood(neighborhood)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  onClick={() => handleDelete(neighborhood.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingNeighborhood} onOpenChange={(open) => !open && setEditingNeighborhood(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Barrio</DialogTitle>
            <DialogDescription>
              Modifica el nombre del barrio o sector.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del Barrio</Label>
                <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={editingNeighborhood?.name} 
                    required 
                />
             </div>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingNeighborhood(null)}>Cancelar</Button>
                <Button type="submit" disabled={isUpdating}>Guardar Cambios</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
