import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { EduButton } from "@/components/ui/EduButton";
import { toast } from "sonner";
import {
  Trash2,
  Mail,
  Plus,
  Pencil,
  Copy,
  CheckCircle2,
  UserCheck,
  UserMinus,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

  // Estados para filtro y paginación
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchData() }, []);

  // Reiniciar página a 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTeachers(), fetchInvites()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    const q = query(collection(db, "profiles"), where("role", "in", ["teacher", "coordinator"]));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Teacher[];
    data.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    setTeachers(data);
  };

  const fetchInvites = async () => {
    const q = query(collection(db, "teacher_invites"), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    setInvites(snap.docs.map(d => d.data()) as Invite[]);
  };

  const handleDeleteInvite = async (email: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;
    const q = query(collection(db, "teacher_invites"), where("email", "==", email));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "teacher_invites", d.id))));
    toast.success("Invitación eliminada");
    setInvites(prev => prev.filter(i => i.email !== email));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Código copiado");
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("¿Eliminar este docente?")) return;
    await deleteDoc(doc(db, "profiles", id));
    toast.success("Docente eliminado");
    setTeachers(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleState = async (teacher: Teacher) => {
    const newState = !teacher.state;
    await updateDoc(doc(db, "profiles", teacher.id), { state: newState });
    toast.success(newState ? "Docente activado" : "Docente desactivado");
    setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, state: newState } : t));
  };

  // Filtrado de docentes
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch =
      (t.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || t.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Paginación de docentes
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeachers = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);

  if (loading && teachers.length === 0 && invites.length === 0)
    return <LoadingSpinner message="Cargando gestión docente..." />;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <div className="sticky top-0 bg-background-light dark:bg-background-dark px-4 lg:px-8 py-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Docentes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gestiona invitaciones y docentes activos de la institución.
            </p>
          </div>
          <EduButton
            onClick={() => navigate("/dashboard/teachers/new")}
            icon={Plus}
            className="h-12 px-6 w-full sm:w-auto"
          >
            Nueva invitación
          </EduButton>
        </div>

        {/* Sección de Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white dark:bg-[#151b2d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm px-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer"
            >
              <option value="all">Todos los perfiles</option>
              <option value="teacher">Docentes</option>
              <option value="coordinator">Coordinadores</option>
            </select>
          </div>
        </div>
      </div>

      <main className="px-4 lg:px-8 lg:pb-16 space-y-4">
        {/* Invitaciones pendientes */}
        {invites.length > 0 && (
          <div className="bg-white dark:bg-[#151b2d] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Invitaciones pendientes ({invites.length})
            </h2>
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.email} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{invite.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{invite.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyToClipboard(invite.token)}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors shadow-sm"
                    >
                      {invite.token}
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvite(invite.email)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/20 rounded-lg text-xs font-semibold hover:bg-red-50 transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Docentes registrados */}
        <div className="bg-white dark:bg-[#151b2d] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Docentes ({filteredTeachers.length})
          </h2>
          <div className="space-y-2">
            {currentTeachers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No se encontraron docentes.</p>
            ) : (
              currentTeachers.map(teacher => (
                <div key={teacher.id} className="flex flex-col bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 overflow-hidden mb-3 last:mb-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[#C6E7FC] overflow-hidden flex items-center justify-center text-[#0099FE] font-semibold text-sm flex-shrink-0 border border-primary/10">
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt={teacher.full_name || ""} className="w-full h-full object-cover" />
                        ) : (
                          teacher.full_name?.charAt(0) || "?"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">{teacher.full_name || "Sin nombre"}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                          {teacher.email || "Email no disponible"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {teacher.role === 'coordinator' && (
                        <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase">
                          Coordinador
                        </span>
                      )}
                      <div
                        onClick={() => handleToggleState(teacher)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight cursor-pointer transition-colors ${teacher.state !== false
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                      >
                        {teacher.state !== false ? "Activo" : "Inactivo"}
                      </div>
                    </div>
                  </div>

                  {/* Acciones del docente */}
                  <div className="px-3 pb-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-nowrap items-center justify-end w-full gap-1 overflow-x-auto bg-white/50 dark:bg-black/10">
                    <button
                      onClick={() => handleToggleState(teacher)}
                      className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold border transition-all ${teacher.state !== false
                        ? "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30 hover:bg-amber-100"
                        : "text-green-600 bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30 hover:bg-green-100"
                        }`}
                    >
                      {teacher.state !== false ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      <span className="truncate">{teacher.state !== false ? "Desactivar" : "Activar"}</span>
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)}
                      className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="truncate">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-red-500 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="truncate">Eliminar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 gap-3">
              <p className="text-xs text-slate-500">
                Mostrando <span className="font-semibold text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}</span> a{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {Math.min(indexOfLastItem, filteredTeachers.length)}
                </span>{" "}
                de <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredTeachers.length}</span> docentes
              </p>
              <div className="flex items-center gap-1.5 justify-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-95 ${currentPage === page
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

