import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase/config";
import {
  collection, getDocs, updateDoc, deleteDoc, doc, query, where
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Trash2, CheckCircle2, Clock, AlertCircle, Calendar, Edit2, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TodoPriority = 'P1' | 'P2' | 'P3' | 'P4';
type TodoStatus = 'pendiente' | 'activa' | 'cumplida';
type TodoFilter = 'Todas' | TodoPriority;

interface Todo {
  id: string;
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  start_date: string;
  created_at?: any;
}

const PRIORITY_MAP = {
  P1: { label: "Urgente", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-800/50" },
  P2: { label: "Importante", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800/50" },
  P3: { label: "Normal", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/20", border: "border-slate-100 dark:border-slate-800/50" },
  P4: { label: "Baja", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800/50" },
};

const STATUS_MAP = {
  pendiente: { label: "Pendiente", icon: Clock, color: "text-slate-400" },
  activa: { label: "En curso", icon: AlertCircle, color: "text-blue-600" },
  cumplida: { label: "Completada", icon: CheckCircle2, color: "text-green-600" },
};

export default function TodosPage() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TodoFilter>('Todas');
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTodos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, "todos"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Todo[];
      data.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      setTodos(data);
    } catch (error: any) {
      toast.error("Error al cargar tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, []);

  const handleToggleStatus = async (todo: Todo) => {
    const nextStatus: TodoStatus =
      todo.status === 'pendiente' ? 'activa' :
      todo.status === 'activa' ? 'cumplida' : 'pendiente';
    await updateDoc(doc(db, "todos", todo.id), { status: nextStatus });
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: nextStatus } : t));
    toast.success(`Estado: ${STATUS_MAP[nextStatus].label}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea definitivamente?")) return;
    await deleteDoc(doc(db, "todos", id));
    setTodos(prev => prev.filter(t => t.id !== id));
    toast.success("Tarea eliminada");
  };

  const filteredTodos = todos.filter(todo => {
    const matchesPriority = activeFilter === 'Todas' || todo.priority === activeFilter;
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         todo.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  if (loading && todos.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="font-bold text-xs tracking-widest">Cargando tus tareas...</span>
    </div>
  );

  const filterOptions = [
    { id: 'Todas', label: 'Todas' }, { id: 'P1', label: 'Urgente' },
    { id: 'P2', label: 'Importante' }, { id: 'P3', label: 'Normal' }, { id: 'P4', label: 'Baja' },
  ];

  return (
    <div className="bg-[#f8faff] dark:bg-[#0f1117] min-h-screen pb-24 transition-colors duration-300">
      {/* Tabs */}
      <div className="bg-white dark:bg-[#121022] px-4 pt-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-8 px-2 overflow-x-auto no-scrollbar">
          {filterOptions.map(opt => (
            <button key={opt.id} onClick={() => setActiveFilter(opt.id as TodoFilter)}
              className={cn("pb-4 text-sm font-bold transition-all relative whitespace-nowrap",
                activeFilter === opt.id ? "text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}>
              {opt.label}
              {activeFilter === opt.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-lg" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {filteredTodos.length} {filteredTodos.length === 1 ? 'tarea' : 'tareas'}
          </p>
          <Button onClick={() => navigate('/dashboard/todos/new')}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3 px-5 gap-2 shadow-xl shadow-primary/20 font-bold text-xs tracking-wide transition-all active:scale-95">
            <Plus className="w-4 h-4 stroke-[3]" />Nueva tarea
          </Button>
        </div>

        <div className="relative px-1">
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-45" />
          <Input type="text" placeholder="Buscar por título o descripción..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 h-12 bg-white dark:bg-slate-800 border-none rounded-lg shadow-sm font-medium" />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredTodos.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg py-24 px-10 text-center mt-4">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/60 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-slate-300/50" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">No hay tareas</h4>
              <p className="text-xs text-slate-500 mt-2 max-w-[240px] mx-auto leading-relaxed">
                Organiza tu jornada educativa creando una nueva tarea.
              </p>
            </div>
          ) : (
            filteredTodos.map(todo => {
              const PConfig = PRIORITY_MAP[todo.priority] || PRIORITY_MAP.P3;
              const SConfig = STATUS_MAP[todo.status];
              const StatusIcon = SConfig.icon;
              const isToday = format(new Date(), 'yyyy-MM-dd') === todo.start_date;
              const dateLabel = todo.start_date
                ? (isToday ? "Hoy" : format(new Date(todo.start_date + 'T00:00:00'), "d 'de' MMM", { locale: es }))
                : '—';
              return (
                <div key={todo.id}
                  className={cn("group bg-white dark:bg-[#151b2d] border border-slate-100 dark:border-slate-800 p-6 rounded-lg shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden",
                    todo.status === 'cumplida' && "opacity-75")}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className={cn("px-4 py-1 rounded-full text-[10px] font-black tracking-widest", PConfig.bg, PConfig.color)}>
                        {PConfig.label.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={() => navigate(`/dashboard/todos/${todo.id}/edit`)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={() => handleDelete(todo.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className={cn("font-black text-slate-800 dark:text-white text-xl leading-tight",
                        todo.status === 'cumplida' && "line-through text-slate-400")}>
                        {todo.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                        {todo.description || "Sin descripción adicional."}
                      </p>
                    </div>
                    <div className="pt-4 mt-auto border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{dateLabel}</span>
                      </div>
                      <button onClick={() => handleToggleStatus(todo)}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold text-xs active:scale-95",
                          todo.status === 'cumplida' ? "bg-green-50 text-green-600 dark:bg-green-900/20 shadow-inner" :
                          todo.status === 'activa' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" :
                          "bg-slate-50 text-slate-500 dark:bg-slate-800/50")}>
                        <StatusIcon className="w-4 h-4" />
                        {SConfig.label}
                      </button>
                    </div>
                  </div>
                  {todo.status === 'cumplida' && (
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
