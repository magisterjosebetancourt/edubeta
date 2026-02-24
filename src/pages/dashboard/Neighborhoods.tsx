import { useState, useEffect } from "react";
import { db } from '@/lib/firebase/config'
import { 
  collection,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Trash2, Plus, MapPin, Pencil } from 'lucide-react'
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
  id: string;
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

  const fetchNeighborhoods = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'neighborhoods'), orderBy('name', 'asc'))
      const querySnapshot = await getDocs(q)
      const neighborhoodsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Neighborhood[]
      
      setNeighborhoods(neighborhoodsData)
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
      await addDoc(collection(db, "neighborhoods"), {
        name,
        state: true,
        created_at: serverTimestamp()
      });

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
      const neighborhoodRef = doc(db, 'neighborhoods', neighborhood.id)
      await updateDoc(neighborhoodRef, { state: newState })

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
        const neighborhoodRef = doc(db, 'neighborhoods', editingNeighborhood.id)
        await updateDoc(neighborhoodRef, { name })

        toast.success('Barrio actualizado')
        setEditingNeighborhood(null)
        fetchNeighborhoods()
    } catch (error: any) {
        toast.error('Error al actualizar', { description: error.message })
    } finally {
        setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
     if(!confirm('¿Estás seguro de eliminar este barrio?')) return;
     
     try {
       await deleteDoc(doc(db, 'neighborhoods', id))
       
       toast.success('Barrio eliminado')
       setNeighborhoods(prev => prev.filter(n => n.id !== id))
     } catch (error: any) {
       toast.error('Error al eliminar', { description: error.message })
     }
  }

  if (loading) return <div className="p-8 text-center">Cargando barrios...</div>

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 text-slate-800 dark:text-slate-100">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Administra los sectores para la caracterización socioeconómica.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-bold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95">
                <Plus className="w-5 h-5 stroke-[3]" />
                Nuevo Barrio
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">Nuevo barrio</DialogTitle>
                <DialogDescription className="text-xs font-bold tracking-widest text-slate-400">
                  Agrega un nuevo sector a la lista.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nombre del Barrio</Label>
                  <input 
                    name="name"
                    placeholder="Ej: Centro"
                    className="w-full h-11 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm"
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-[10px] tracking-widest rounded-lg">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating} className="bg-primary hover:bg-primary/90 text-white font-bold text-[10px] tracking-widest rounded-lg px-8 shadow-lg shadow-primary/20">
                    {isCreating ? 'Guardando...' : 'Crear barrio'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <main className="p-4 space-y-4">
        {neighborhoods.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/30">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              No hay barrios registrados.
            </p>
          </div>
        ) : (
          neighborhoods.map((neighborhood) => (
            <div
              key={neighborhood.id}
              className="bg-white dark:bg-[#151b2d] p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {neighborhood.name}
                  </h3>
                  <div
                    onClick={() => handleToggleState(neighborhood)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
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
