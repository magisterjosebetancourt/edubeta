import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { toast } from 'sonner'
import { Trash2, Plus, School, Layers, Pencil } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"

type Grade = {
  id: number
  name: string
  created_at?: string
}

// Estructura Ley 115 de 1994 (Colombia)
const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
]

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Create Form States
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [selectedGradeName, setSelectedGradeName] = useState<string>('')
  const [groupSuffix, setGroupSuffix] = useState<string>('') 

  // Edit State
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  
  const supabase = createClient()

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setGrades(data || [])
    } catch (error: any) {
      toast.error('Error al cargar grados', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrades()
  }, [])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!selectedLevel || !selectedGradeName || !groupSuffix) {
        toast.error('Por favor completa todos los campos (Nivel, Grado, Grupo)')
        return
    }

    setIsCreating(true)

    // Generar nombre (Ej: "601" o "Transición A")
    let finalName = `${selectedGradeName} ${groupSuffix}`
    
    const gradeMap: Record<string, string> = {
        'Primero': '1', 'Segundo': '2', 'Tercero': '3', 'Cuarto': '4', 'Quinto': '5',
        'Sexto': '6', 'Séptimo': '7', 'Octavo': '8', 'Noveno': '9',
        'Décimo': '10', 'Once': '11'
    }

    if (gradeMap[selectedGradeName]) {
        // Formato numérico standard: Grado + Grupo (Ej: 6 + 01 = 601)
        finalName = `${gradeMap[selectedGradeName]}${groupSuffix}`
    } else if (selectedGradeName === 'Transición') {
        finalName = `Transición ${groupSuffix}`
    }

    try {
      const { error } = await supabase
        .from('grades')
        .insert([{ name: finalName }] as any)
      
      if (error) throw error

      toast.success(`Grupo ${finalName} creado correctamente`)
      setGroupSuffix('')
      fetchGrades()
    } catch (error: any) {
      toast.error('Error al crear grupo', { description: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingGrade) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    const newName = formData.get('name') as string

    if (!newName) {
        toast.error('El nombre es requerido')
        setIsUpdating(false)
        return
    }

    try {
        const { error } = await (supabase
            .from('grades') as any)
            .update({ name: newName })
            .eq('id', editingGrade.id)

        if (error) throw error

        toast.success('Grupo actualizado')
        setEditingGrade(null)
        fetchGrades()
    } catch (error: any) {
        toast.error('Error al actualizar', { description: error.message })
    } finally {
        setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
     if(!confirm('¿Estás seguro de eliminar este grupo escolar? Se desconectarán los estudiantes asociados.')) return;

     try {
       const { error } = await supabase
         .from('grades')
         .delete()
         .eq('id', id)
       
       if (error) throw error
       
       toast.success('Grupo eliminado')
       setGrades(prev => prev.filter(g => g.id !== id))
     } catch (error: any) {
       toast.error('Error al eliminar', { description: error.message })
     }
  }
  
  if (loading) return <div className="p-8 text-center">Cargando grupos escolares...</div>

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto bg-background-light dark:bg-background-dark">
      <div className="flex flex-col gap-1">
           <h1 className="hidden lg:block text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Organización Académica</h1>
           <p className="hidden lg:block text-gray-500">Gestión de Grados y Grupos según Ley 115 (Colombia).</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Formulario de Creación (Panel Izquierdo - Sticky Desktop) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 h-fit">
            <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Nuevo Grupo Escolar
                </CardTitle>
                <CardDescription>Crea un grupo asignado a un grado.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                        <Label>1. Nivel Educativo</Label>
                        <div className="relative">
                            <select 
                                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                onChange={(e) => {
                                    setSelectedLevel(e.target.value)
                                    setSelectedGradeName('')
                                }} 
                                value={selectedLevel}
                            >
                                <option value="">Seleccione Nivel</option>
                                {LEVELS.map((level) => (
                                    <option key={level.id} value={level.id}>{level.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>2. Grado (Ley 115)</Label>
                        <div className="relative">
                            <select 
                                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                onChange={(e) => setSelectedGradeName(e.target.value)} 
                                value={selectedGradeName}
                                disabled={!selectedLevel}
                            >
                                <option value="">Seleccione Grado</option>
                                {selectedLevel && LEVELS.find(l => l.id === selectedLevel)?.grades.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>3. Grupo/Curso</Label>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm font-bold text-slate-500 min-w-[30px]">
                                {(() => {
                                    if (!selectedGradeName) return '#';
                                    if (selectedGradeName === 'Transición') return 'TR';
                                    
                                    const gradeMap: Record<string, string> = {
                                        'Primero': '1', 'Segundo': '2', 'Tercero': '3', 'Cuarto': '4', 'Quinto': '5',
                                        'Sexto': '6', 'Séptimo': '7', 'Octavo': '8', 'Noveno': '9',
                                        'Décimo': '10', 'Once': '11'
                                    };
                                    
                                    return gradeMap[selectedGradeName] || '?';
                                })()}
                            </span>
                            <Input 
                                value={groupSuffix}
                                onChange={(e) => setGroupSuffix(e.target.value)}
                                placeholder="Ej: 01, 02, A, B" 
                                required 
                                className="font-mono text-lg tracking-widest uppercase"
                                maxLength={3}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Resultado Final: <strong className="text-primary">{
                                selectedGradeName ? (
                                   selectedGradeName === 'Transición' 
                                     ? `Transición ${groupSuffix}`
                                     : (() => {
                                         const gradeMap: Record<string, string> = {
                                            'Primero': '1', 'Segundo': '2', 'Tercero': '3', 'Cuarto': '4', 'Quinto': '5',
                                            'Sexto': '6', 'Séptimo': '7', 'Octavo': '8', 'Noveno': '9',
                                            'Décimo': '10', 'Once': '11'
                                        };
                                        return `${gradeMap[selectedGradeName] || ''}${groupSuffix}`;
                                     })()
                                ) : '...'
                            }</strong>
                        </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isCreating}>
                        Registrar Grupo
                    </Button>
                </form>
            </CardContent>
            </Card>
        </div>

        {/* Lista de Visualización con Jerarquía */}
        <div className="lg:col-span-8 space-y-6">
           <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle>Grupos Activos por Nivel</CardTitle>
                <CardDescription>Resumen de la organización escolar actual.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                {grades.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                        <School className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-medium">No hay grupos configurados.</p>
                        <p className="text-sm text-slate-400">Utiliza el formulario para crear el primer grupo.</p>
                    </div>
                ) : (
                    LEVELS.map((level) => {
                        const levelGroups = grades.filter(g => {
                            if (level.id === 'preescolar') return g.name.includes('Transición');
                            
                            const firstDigits = parseInt(g.name.substring(0, g.name.length >= 4 ? 2 : 1)); // 1001 vs 601
                            if (isNaN(firstDigits)) return false;

                            if (level.id === 'primaria') return firstDigits >= 1 && firstDigits <= 5;
                            if (level.id === 'secundaria') return firstDigits >= 6 && firstDigits <= 9;
                            if (level.id === 'media') return firstDigits >= 10 && firstDigits <= 11;
                            return false;
                        });

                        if (levelGroups.length === 0) return null;

                        return (
                            <div key={level.id} className="bg-white dark:bg-[#1e1c30] rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-primary" />
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{level.name}</h3>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-full border shadow-sm">
                                        {levelGroups.length} Grupos
                                    </span>
                                </div>
                                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {levelGroups.map((group) => (
                                        <div key={group.id} className="relative group/item flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-lg shadow-sm hover:border-primary/50 transition-colors">
                                           <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 uppercase font-bold">Grado</span>
                                                <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">{group.name}</span>
                                           </div>
                                           <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-opacity">
                                                <Button 
                                                    type="button"
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                                                    onClick={() => setEditingGrade(group)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </Button>
                                                <Button 
                                                    type="button"
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDelete(group.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                           </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
           </Card>
        </div>
      </div>

       {/* Edit Dialog */}
       <Dialog open={!!editingGrade} onOpenChange={(open) => !open && setEditingGrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Modifica el nombre del grupo escolar (Ej. 601, 1102).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del Grupo</Label>
                <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={editingGrade?.name} 
                    required 
                />
             </div>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingGrade(null)}>Cancelar</Button>
                <Button type="submit" disabled={isUpdating}>Guardar Cambios</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
