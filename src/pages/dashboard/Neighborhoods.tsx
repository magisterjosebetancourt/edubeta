import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '@/lib/firebase/config'
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, Plus, MapPin, Pencil } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type Neighborhood = { id: string; name: string; state?: boolean }

export default function NeighborhoodsPage() {
  const navigate = useNavigate()
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchNeighborhoods() }, [])

  const fetchNeighborhoods = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'neighborhoods'), orderBy('name', 'asc'))
      const snap = await getDocs(q)
      setNeighborhoods(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Neighborhood[])
    } catch (error: any) {
      toast.error('Error al cargar barrios', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleState = async (neighborhood: Neighborhood) => {
    const newState = !neighborhood.state
    await updateDoc(doc(db, 'neighborhoods', neighborhood.id), { state: newState })
    toast.success(newState ? 'Barrio activado' : 'Barrio desactivado')
    setNeighborhoods(prev => prev.map(n => n.id === neighborhood.id ? { ...n, state: newState } : n))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este barrio?')) return
    await deleteDoc(doc(db, 'neighborhoods', id))
    toast.success('Barrio eliminado')
    setNeighborhoods(prev => prev.filter(n => n.id !== id))
  }

  if (loading) return <LoadingSpinner message="Cargando barrios..." />;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 text-slate-800 dark:text-slate-100">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <p className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-6">
            Administra los sectores para la caracterización socioeconómica.
          </p>
          <Button
            onClick={() => navigate('/dashboard/neighborhoods/new')}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[3]" />Nuevo Barrio
          </Button>
        </div>
      </div>
      <main className="p-4 space-y-3">
        {neighborhoods.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/30">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay barrios registrados.</p>
          </div>
        ) : (
          neighborhoods.map(neighborhood => (
            <div key={neighborhood.id}
              className="bg-white dark:bg-[#151b2d] p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{neighborhood.name}</h3>
                  <div onClick={() => handleToggleState(neighborhood)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider cursor-pointer transition-colors ${
                      neighborhood.state !== false
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {neighborhood.state !== false ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10"
                  onClick={() => navigate(`/dashboard/neighborhoods/${neighborhood.id}/edit`)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon"
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
    </div>
  )
}
