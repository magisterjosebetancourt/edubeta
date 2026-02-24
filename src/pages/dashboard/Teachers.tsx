import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Trash2,
  Mail,
  Plus,
  Pencil,
  Copy,
  CheckCircle2,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastGeneratedToken, setLastGeneratedToken] = useState<string | null>(null);
  const [isCoordinator, setIsCoordinator] = useState(false);
  
  // Auxiliary states for the form to ensure they are available for the mailto trigger
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingTeacher) {
      setIsCoordinator(editingTeacher.role === 'coordinator');
    }
  }, [editingTeacher]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTeachers(), fetchInvites()]);
    } catch (error) {
       console.error("Fetch Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const q = query(
        collection(db, "profiles"),
        where("role", "in", ["teacher", "coordinator"])
      );
      const querySnapshot = await getDocs(q);
      const teachersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Teacher[];
      
      // Sort in memory to avoid needing a Firestore composite index
      teachersData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      
      setTeachers(teachersData);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      toast.error("Error al cargar docentes");
    }
  };

  const fetchInvites = async () => {
    try {
      const q = query(collection(db, "teacher_invites"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);
      const invitesData = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as Invite[];
      setInvites(invitesData);
    } catch (error: any) {
      console.error("Error fetching invites:", error);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setLastGeneratedToken(null);

    // Generate 5 digit token
    const token = Math.floor(10000 + Math.random() * 90000).toString();

    try {
      await addDoc(collection(db, "teacher_invites"), {
        full_name: formFullName,
        email: formEmail,
        token,
        created_at: serverTimestamp()
      });

      toast.success("Invitación guardada en Firebase");
      setLastGeneratedToken(token);
      
      // Reactive local update
      const newInvite: Invite = {
        email: formEmail,
        token: token,
        full_name: formFullName,
        created_at: new Date().toISOString()
      };
      setInvites(prev => [newInvite, ...prev]);
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      toast.error("Error al guardar en Firebase", {
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvite = async (email: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;

    try {
      const q = query(collection(db, "teacher_invites"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      const batchPromise = querySnapshot.docs.map(docSnap => deleteDoc(doc(db, "teacher_invites", docSnap.id)));
      await Promise.all(batchPromise);

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

  const handleSendEmail = () => {
    if (!lastGeneratedToken) return;
    
    const subject = encodeURIComponent("Invitación a EduBeta - Código de Registro");
    const registerUrl = `${window.location.origin}/teacher-register`;
    const body = encodeURIComponent(
      `Hola ${formFullName},\n\n` +
      `Has sido invitado a unirte a EduBeta como docente.\n\n` +
      `Tu código de acceso es: ${lastGeneratedToken}\n\n` +
      `Puedes registrarte en el siguiente enlace:\n${registerUrl}\n\n` +
      `Saludos,\nEquipo EduBeta`
    );
    
    window.location.href = `mailto:${formEmail}?subject=${subject}&body=${body}`;
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("¿Eliminar este docente?")) return;
    try {
      await deleteDoc(doc(db, "profiles", id));
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

    try {
      const profileRef = doc(db, "profiles", editingTeacher.id);
      await updateDoc(profileRef, {
        full_name: fullName,
        role: isCoordinator ? "coordinator" : "teacher",
        updated_at: serverTimestamp()
      });

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
      const profileRef = doc(db, "profiles", teacher.id);
      await updateDoc(profileRef, { state: newState });

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
      <div className="p-8 text-center text-slate-500 font-bold text-xs tracking-widest animate-pulse">
        Cargando gestión docente...
      </div>
    );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24">
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestiona invitaciones y docentes activos de la institución.
            </p>
          </div>
          <Button 
            onClick={() => {
              setLastGeneratedToken(null);
              setFormFullName("");
              setFormEmail("");
              setIsDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-bold text-xs tracking-wide w-full sm:w-auto transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Nueva invitación
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Invitaciones Pendientes */}
        {invites.length > 0 && (
          <div className="bg-white dark:bg-[#151b2d] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Invitaciones pendientes ({invites.length})
            </h2>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.email}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg group"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                    <button
                      onClick={() => copyToClipboard(invite.token)}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors"
                    >
                      {invite.token}
                      <Copy className="w-3 h-3" />
                    </button>
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
        <div className="bg-white dark:bg-[#151b2d] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Docentes activos ({teachers.length})
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
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {teacher.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {teacher.full_name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 leading-relaxed">
                        {teacher.email || "Email no disponible"}
                        {teacher.role === 'coordinator' && (
                          <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
                            Coordinador
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      onClick={() => handleToggleState(teacher)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight cursor-pointer transition-colors ${
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

      {/* Invitación Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-slate-50 dark:bg-slate-900/50 p-8 pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                 <Mail className="w-6 h-6" />
              </div>
              Nueva invitación
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-2 font-medium">
              Genera un código de acceso para que un docente pueda registrarse.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 pt-2 space-y-6">
            {lastGeneratedToken ? (
              <div className="space-y-6 text-center">
                <div className="p-8 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-lg space-y-3 relative overflow-hidden group">
                   <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl transition-colors" />
                   <p className="text-[10px] font-bold text-primary tracking-widest">Código generado</p>
                   <h3 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">{lastGeneratedToken}</h3>
                   <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Token guardado exitosamente
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    onClick={() => handleSendEmail()}
                    className="w-full h-14 gap-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 dark:shadow-none font-bold"
                  >
                    <Mail className="w-5 h-5" />
                    Enviar invitación (Email)
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => copyToClipboard(lastGeneratedToken)}
                        className="h-12 gap-2 rounded-lg border-slate-200 font-bold text-xs"
                      >
                        <Copy className="w-4 h-4" />
                        Copiar pin
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={() => setIsDialogOpen(false)}
                        className="h-12 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-800"
                      >
                        Finalizar
                      </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-5 px-1">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-[10px] font-black tracking-widest text-slate-400 ml-2">Apellidos y nombres</Label>
                  <Input
                    id="fullName"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Ej. Pérez, Juan"
                    required
                    className="h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border-none px-4 font-bold placeholder:text-slate-400/60 transition-all focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black tracking-widest text-slate-400 ml-2">Correo institucional</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ejemplo@institucion.edu.co"
                    required
                    className="h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border-none px-4 font-bold placeholder:text-slate-400/60 transition-all focus:ring-primary/20"
                  />
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full h-14 rounded-lg shadow-xl shadow-primary/10 font-black tracking-wide active:scale-95 transition-all text-xs"
                  >
                    {isCreating ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generando...
                      </div>
                    ) : "Generar código de acceso"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog
        open={!!editingTeacher}
        onOpenChange={(open) => !open && setEditingTeacher(null)}
      >
        <DialogContent className="sm:max-w-md rounded-lg border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-slate-50 dark:bg-slate-900/50 p-8 pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                 <Pencil className="w-6 h-6" />
              </div>
              Editar docente
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-2 font-medium">
              Actualiza el perfil del docente activo.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateTeacher} className="p-8 pt-2 space-y-6 px-9">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName" className="text-[10px] font-black tracking-widest text-slate-400 ml-2">Nombre completo</Label>
              <Input
                id="edit-fullName"
                name="fullName"
                defaultValue={editingTeacher?.full_name || ""}
                placeholder="Ej. Gómez, Roberto"
                required
                className="h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border-none px-4 font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest text-slate-400 ml-2">Correo institucional (No modificable)</Label>
              <Input value={editingTeacher?.email || ""} disabled className="h-12 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-bold opacity-70" />
            </div>
            
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800/50 shadow-inner">
               <div className="space-y-0.5">
                  <Label className="text-sm font-black text-slate-800 dark:text-white leading-none">Rol de coordinador</Label>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 leading-tight">Privilegios para gestionar asistencias generales.</p>
               </div>
               <Switch 
                  id="isCoordinator"
                  checked={isCoordinator}
                  onCheckedChange={setIsCoordinator}
                  className="data-[state=checked]:bg-primary"
               />
            </div>

            <div className="flex gap-4 pt-4 pb-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingTeacher(null)}
                className="flex-1 h-12 rounded-lg font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating} className="flex-[2] h-12 rounded-lg shadow-lg shadow-primary/10 font-bold text-xs">
                {isUpdating ? <Loader2 className="animate-spin" /> : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
