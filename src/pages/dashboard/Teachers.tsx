import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Trash2,
  Copy,
  RefreshCw,
  Mail,
  Plus,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Teacher = {
  id: string;
  full_name: string | null;
  email?: string;
  avatar_url?: string | null;
  state?: boolean;
  role?: string;
};

type Invite = {
  email: string;
  token: string;
  full_name: string;
  created_at: string;
};

export default function TeachersPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastGeneratedToken, setLastGeneratedToken] = useState<string | null>(
    null,
  );

  const [isCoordinator, setIsCoordinator] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingTeacher) {
      setIsCoordinator(editingTeacher.role === 'coordinator');
    }
  }, [editingTeacher]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTeachers(), fetchInvites()]);
    setLoading(false);
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["teacher", "coordinator"])
        .order("full_name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
    }
  };

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("teacher_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // If table doesn't exist yet (404/42P01), ignore silently or log
        if (error.code !== "42P01")
          console.error("Error fetching invites:", error);
      } else {
        setInvites((data as Invite[]) || []);
      }
    } catch (error) {
      // silent fail
    }
  };

  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setLastGeneratedToken(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;

    // Generate 5 digit token
    const token = Math.floor(10000 + Math.random() * 90000).toString();

    try {
      const { error } = await supabase
        .from("teacher_invites")
        .insert([{ full_name: fullName, email, token }] as any);

      if (error) throw error;

      toast.success("Invitación creada correctamente");
      setLastGeneratedToken(token);
      setIsDialogOpen(false);
      fetchInvites();
      form.reset();
    } catch (error: any) {
      toast.error("Error al generar invitación", {
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvite = async (email: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;

    try {
      const { error } = await supabase
        .from("teacher_invites")
        .delete()
        .eq("email", email);

      if (error) throw error;
      toast.success("Invitación eliminada");
      setInvites((prev) => prev.filter((i) => i.email !== email));
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Código copiado");
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("¿Eliminar este docente?")) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      toast.success("Docente eliminado");
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch (error: any) {
      toast.error("Error al eliminar", { description: error.message });
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;

    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    // Use the controlled state instead of formData for the switch

    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({ 
          full_name: fullName,
          role: isCoordinator ? "coordinator" : "teacher"
        })
        .eq("id", editingTeacher.id);

      if (error) throw error;

      toast.success("Docente actualizado");
      setEditingTeacher(null);
      fetchTeachers();
    } catch (error: any) {
      toast.error("Error al actualizar", { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleState = async (teacher: Teacher) => {
    try {
      const newState = !teacher.state;
      const { error } = await (supabase
        .from("profiles") as any)
        .update({ state: newState })
        .eq("id", teacher.id);

      if (error) throw error;

      toast.success(newState ? "Docente activado" : "Docente desactivado");
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, state: newState } : t)),
      );
    } catch (error: any) {
      toast.error("Error al cambiar estado", { description: error.message });
    }
  };

  if (loading && teachers.length === 0 && invites.length === 0)
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando gestión docente...
      </div>
    );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#151b2d]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)}
              className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Docentes
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Generar Invitación</DialogTitle>
                  <DialogDescription>
                    Crea un código de acceso para un nuevo docente.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Apellidos y Nombres</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Ej. GÓMEZ, Roberto"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Institucional</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="profe@edubeta.com"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Generando..." : "Generar"}
                    </Button>
                  </DialogFooter>
                </form>

                {lastGeneratedToken && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <p className="text-sm text-green-800 dark:text-green-300 mb-2 font-medium">
                      ¡Invitación Creada!
                    </p>
                    <div className="text-3xl font-mono font-bold tracking-widest text-slate-900 dark:text-white my-3">
                      {lastGeneratedToken}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-green-200 hover:bg-green-100"
                      onClick={() => copyToClipboard(lastGeneratedToken)}
                    >
                      <Copy className="w-3 h-3 mr-2" /> Copiar
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Gestiona invitaciones y docentes activos.
        </p>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Invitaciones Pendientes */}
        {invites.length > 0 && (
          <div className="bg-white dark:bg-[#151b2d] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Invitaciones Pendientes ({invites.length})
            </h2>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.email}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {invite.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {invite.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                      {invite.token}
                    </div>
                    <button
                      onClick={() => handleDeleteInvite(invite.email)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Docentes Registrados */}
        <div className="bg-white dark:bg-[#151b2d] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Docentes Activos ({teachers.length})
          </h2>
          <div className="space-y-2">
            {teachers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                No hay docentes registrados aún.
              </p>
            ) : (
              teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {teacher.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate uppercase">
                        {teacher.full_name || "Sin Nombre"}
                      </p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        {teacher.email || "Email no disponible"}
                        {teacher.role === 'coordinator' && (
                          <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Coordinador
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      onClick={() => handleToggleState(teacher)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                        teacher.state !== false
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {teacher.state !== false ? "Activo" : "Inactivo"}
                    </div>
                    <button
                      onClick={() => setEditingTeacher(teacher)}
                      className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      {/* Edit Teacher Dialog */}
      <Dialog
        open={!!editingTeacher}
        onOpenChange={(open) => !open && setEditingTeacher(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Docente</DialogTitle>
            <DialogDescription>
              Modifica los datos del perfil del docente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTeacher} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Apellidos y Nombres</Label>
              <Input
                id="edit-fullName"
                name="fullName"
                defaultValue={editingTeacher?.full_name || ""}
                placeholder="Ej. GÓMEZ, Roberto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Correo Institucional</Label>
              <Input value={editingTeacher?.email || ""} disabled />
              <p className="text-[10px] text-slate-500">
                El correo no puede ser modificado.
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
               <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Rol de Coordinador</Label>
                  <p className="text-[10px] text-slate-500">Permite gestionar inasidencias de otros docentes.</p>
               </div>
               <Switch 
                  id="isCoordinator"
                  checked={isCoordinator}
                  onCheckedChange={setIsCoordinator}
               />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTeacher(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
