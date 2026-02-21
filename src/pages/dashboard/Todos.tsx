import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Edit2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TodoPriority = 'P1' | 'P2' | 'P3' | 'P4';
type TodoStatus = 'pendiente' | 'activa' | 'cumplida';

interface Todo {
  id: string;
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  start_date: string;
  end_date: string;
}

const PRIORITY_MAP = {
  P1: { label: "Urgente", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-800/50" },
  P2: { label: "Importante", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800/50" },
  P3: { label: "Rutina", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800/50" },
  P4: { label: "Opcional", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/20", border: "border-slate-100 dark:border-slate-800/50" },
};

const STATUS_MAP = {
  pendiente: { label: "Pendiente", icon: Clock, color: "text-slate-500" },
  activa: { label: "Activa", icon: AlertCircle, color: "text-blue-500" },
  cumplida: { label: "Cumplida", icon: CheckCircle2, color: "text-green-500" },
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  
  const supabase = createClient();

  const fetchTodos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('todos')
        .select('*' as any)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false } as any);
      
      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      toast.error("Error al cargar tareas", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as TodoPriority;
    const start_date = formData.get('start_date') as string;
    const end_date_raw = formData.get('end_date') as string;
    const end_date = end_date_raw || null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      if (editingTodo) {
        const { error } = await (supabase as any)
          .from('todos')
          .update({
            title,
            description,
            priority,
            start_date,
            end_date,
          } as any)
          .eq('id', editingTodo.id);
        if (error) throw error;
        toast.success("Tarea actualizada");
      } else {
        const { error } = await (supabase as any)
          .from('todos')
          .insert([{
            user_id: user.id,
            title,
            description,
            priority,
            start_date,
            end_date,
            status: 'pendiente'
          }] as any);
        if (error) throw error;
        toast.success("Tarea creada");
      }
      
      setIsDialogOpen(false);
      setEditingTodo(null);
      fetchTodos();
    } catch (error: any) {
      toast.error("Error al guardar tarea", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    const nextStatus: TodoStatus = 
      todo.status === 'pendiente' ? 'activa' : 
      todo.status === 'activa' ? 'cumplida' : 'pendiente';
    
    try {
      const { error } = await (supabase as any)
        .from('todos')
        .update({ status: nextStatus } as any)
        .eq('id', todo.id);
      
      if (error) throw error;
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: nextStatus } : t));
      toast.success(`Estado: ${STATUS_MAP[nextStatus].label}`);
    } catch (error: any) {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    
    try {
      const { error } = await (supabase as any).from('todos').delete().eq('id', id);
      if (error) throw error;
      setTodos(prev => prev.filter(t => t.id !== id));
      toast.success("Tarea eliminada");
    } catch (error: any) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 uppercase font-black tracking-widest text-xs">Cargando tareas...</div>;

  return (
    <div className="bg-slate-50 dark:bg-[#0f1117] min-h-screen pb-20">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestiona tus pendientes y prioridades diarias.
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingTodo(null);
              setIsDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-bold uppercase text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Nueva Tarea
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {todos.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border-2 border-dashed rounded-3xl py-20 px-10 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">No hay tareas pendientes</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Haz clic en Nueva Tarea para comenzar a organizar tu día.
              </p>
            </div>
          ) : (
            todos.map((todo) => {
              const PConfig = PRIORITY_MAP[todo.priority];
              const SConfig = STATUS_MAP[todo.status];
              const StatusIcon = SConfig.icon;
              
              return (
                <div 
                  key={todo.id}
                  className={cn(
                    "group bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all",
                    todo.status === 'cumplida' && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <button 
                      onClick={() => handleToggleStatus(todo)}
                      className={cn(
                        "mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                        todo.status === 'cumplida' 
                          ? "bg-green-500 border-green-500 text-white" 
                          : todo.status === 'activa'
                          ? "border-blue-500 text-blue-500"
                          : "border-slate-200 dark:border-slate-700 text-transparent"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border",
                          PConfig.bg, PConfig.color, PConfig.border
                        )}>
                          {PConfig.label}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest",
                          SConfig.color
                        )}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {SConfig.label}
                        </span>
                      </div>
                      <h3 className={cn(
                        "font-bold text-slate-800 dark:text-white text-sm leading-tight",
                        todo.status === 'cumplida' && "line-through text-slate-400"
                      )}>
                        {todo.title}
                      </h3>
                      {todo.description && (
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{todo.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(todo.start_date), 'dd MMM', { locale: es })}
                          {todo.end_date && ` - ${format(new Date(todo.end_date), 'dd MMM', { locale: es })}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-500"
                        onClick={() => {
                          setEditingTodo(todo);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500"
                        onClick={() => handleDelete(todo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {editingTodo ? "Editar Tarea" : "Nueva Tarea"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {editingTodo ? "Modifica los detalles de la tarea" : "Define un nuevo pendiente"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Título de la tarea</Label>
              <Input 
                id="title" 
                name="title" 
                defaultValue={editingTodo?.title}
                required 
                className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                placeholder="Ej: Revisar exámenes de 5-A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descripción (Opcional)</Label>
              <Input 
                id="description" 
                name="description" 
                defaultValue={editingTodo?.description}
                className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-xs"
                placeholder="Detalla un poco más la tarea..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prioridad</Label>
                <select 
                  id="priority" 
                  name="priority"
                  defaultValue={editingTodo?.priority || 'P3'}
                  className="w-full flex h-10 items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="P1">P1 - Urgente</option>
                  <option value="P2">P2 - Importante</option>
                  <option value="P3">P3 - Rutina</option>
                  <option value="P4">P4 - Opcional</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha</Label>
                <Input 
                  id="start_date" 
                  name="start_date" 
                  type="date"
                  defaultValue={editingTodo?.start_date || format(new Date(), 'yyyy-MM-dd')}
                  required
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
               <Label htmlFor="end_date" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha de Finalización (Opcional)</Label>
               <Input 
                  id="end_date" 
                  name="end_date" 
                  type="date"
                  defaultValue={editingTodo?.end_date || ""}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-xs font-bold"
                />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="font-bold uppercase text-[10px] tracking-widest rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl px-8 shadow-lg shadow-primary/20"
              >
                {isSubmitting ? "Guardando..." : (editingTodo ? "Actualizar" : "Crear Tarea")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
