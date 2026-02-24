import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  Lock,
  BookOpen,
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

// ──────────────────────────────────────────────────────────────────────────────
// FALTAS DEL SISTEMA (Decreto 1965/2013 – Art. 40)
// Estas faltas NO son editables ni eliminables en ningún caso.
// ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_INFRACTIONS: SystemInfraction[] = [
  {
    id: "sys-1",
    title: "Incumplimiento del uniforme escolar",
    description:
      "El estudiante asiste a la institución sin el uso adecuado del uniforme reglamentario establecido en el Manual de Convivencia.",
    type: "leve",
    legal_ref: "Art. 40 Lit. a · Decreto 1965/2013",
  },
  {
    id: "sys-2",
    title: "Uso de dispositivos móviles en clase sin autorización",
    description:
      "Uso de celular, tablet u otro dispositivo electrónico durante el desarrollo de actividades académicas sin permiso del docente.",
    type: "leve",
    legal_ref: "Art. 40 Lit. b · Decreto 1965/2013",
  },
  {
    id: "sys-3",
    title: "Comportamiento irrespetuoso verbal",
    description:
      "Expresiones verbales ofensivas, insultos o lenguaje soez dirigido a compañeros, docentes o personal de la institución.",
    type: "grave",
    legal_ref: "Art. 40 Lit. c · Decreto 1965/2013",
  },
  {
    id: "sys-4",
    title: "Daño intencional a bienes institucionales",
    description:
      "Deterioro, destrucción o alteración voluntaria de bienes muebles e inmuebles de la institución educativa o de terceros.",
    type: "grave",
    legal_ref: "Art. 40 Lit. d · Decreto 1965/2013",
  },
  {
    id: "sys-5",
    title: "Agresión física entre estudiantes",
    description:
      "Actos de violencia física que causen daño corporal a otro integrante de la comunidad educativa, constituyendo vulneración grave de derechos.",
    type: "gravisima",
    legal_ref: "Art. 40 Lit. e · Decreto 1965/2013 · Ley 1620/2013",
  },
  {
    id: "sys-6",
    title: "Porte de armas u objetos peligrosos",
    description:
      "Ingreso o tenencia dentro de la institución de armas, explosivos, sustancias peligrosas u objetos que puedan causar daño a la integridad física.",
    type: "gravisima",
    legal_ref: "Art. 40 Lit. f · Decreto 1965/2013 · Código Penal",
  },
  {
    id: "sys-7",
    title: "Acoso escolar (Bullying)",
    description:
      "Conducta de hostigamiento, acoso, intimidación o maltrato repetitivo y sistemático que vulnere los derechos del estudiante y afecte su bienestar.",
    type: "gravisima",
    legal_ref: "Art. 40 Lit. g · Ley 1620/2013 · Decreto 1965/2013",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type InfractionType = "leve" | "grave" | "gravisima";
type InfractionStatus = "abierto" | "seguimiento" | "cerrado";
type TabFilter = "todas" | InfractionType;

interface SystemInfraction {
  id: string;
  title: string;
  description: string;
  type: InfractionType;
  legal_ref: string;
}

interface Infraction {
  id: string;
  student_id: string;
  student_name: string;
  type: InfractionType;
  description: string;
  date: string;
  status: InfractionStatus;
  reported_by_name: string;
  created_at?: any;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Config maps
// ──────────────────────────────────────────────────────────────────────────────
const TYPE_MAP: Record<InfractionType, { label: string; color: string; bg: string; border: string; dot: string }> = {
  leve: {
    label: "Leve",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-800/50",
    dot: "bg-blue-500",
  },
  grave: {
    label: "Grave",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-100 dark:border-orange-800/50",
    dot: "bg-orange-500",
  },
  gravisima: {
    label: "Gravísima",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-100 dark:border-red-800/50",
    dot: "bg-red-500",
  },
};

const STATUS_MAP: Record<InfractionStatus, { label: string; color: string; bg: string }> = {
  abierto: { label: "Abierto", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  seguimiento: { label: "En seguimiento", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  cerrado: { label: "Cerrado", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
};

const TABS: { id: TabFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "leve", label: "Leve" },
  { id: "grave", label: "Grave" },
  { id: "gravisima", label: "Gravísima" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
export default function InfractionsPage() {
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInfraction, setEditingInfraction] = useState<Infraction | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string>("teacher");
  const [currentUserName, setCurrentUserName] = useState("Docente");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const [profileSnap, infSnap, studentsSnap] = await Promise.all([
        getDoc(doc(db, "profiles", user.uid)),
        getDocs(query(collection(db, "infractions"), orderBy("created_at", "desc"))),
        getDocs(collection(db, "students")),
      ]);

      setUserRole(profileSnap.data()?.role || "teacher");
      setCurrentUserName(profileSnap.data()?.full_name || "Docente");

      const infData = infSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Infraction));
      setInfractions(infData);

      const studentsData = studentsSnap.docs
        .map((d) => ({ id: d.id, first_name: d.data().first_name, last_name: d.data().last_name } as Student))
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "es"));
      setStudents(studentsData);
    } catch (err: any) {
      console.error("Fetch Infractions Error:", err);
      toast.error("Error al cargar faltas", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const studentId = formData.get("student_id") as string;
    const type = formData.get("type") as InfractionType;
    const description = formData.get("description") as string;
    const date = formData.get("date") as string;
    const status = formData.get("status") as InfractionStatus;

    const selectedStudent = students.find((s) => s.id === studentId);
    const studentName = selectedStudent
      ? `${selectedStudent.last_name}, ${selectedStudent.first_name}`
      : "Desconocido";

    try {
      if (editingInfraction) {
        await updateDoc(doc(db, "infractions", editingInfraction.id), {
          student_id: studentId,
          student_name: studentName,
          type,
          description,
          date,
          status,
          updated_at: serverTimestamp(),
        });
        toast.success("Falta actualizada correctamente");
      } else {
        await addDoc(collection(db, "infractions"), {
          student_id: studentId,
          student_name: studentName,
          type,
          description,
          date,
          status,
          reported_by_name: currentUserName,
          created_at: serverTimestamp(),
        });
        toast.success("Falta registrada correctamente");
      }

      setIsDialogOpen(false);
      setEditingInfraction(null);
      fetchData();
    } catch (err: any) {
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de falta definitivamente?")) return;
    try {
      await deleteDoc(doc(db, "infractions", id));
      setInfractions((prev) => prev.filter((i) => i.id !== id));
      toast.success("Falta eliminada");
    } catch (err: any) {
      toast.error("Error al eliminar", { description: err.message });
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredInfractions = infractions.filter((inf) => {
    const matchesTab = activeTab === "todas" || inf.type === activeTab;
    const matchesSearch =
      inf.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredSystemInfractions = SYSTEM_INFRACTIONS.filter(
    (inf) => activeTab === "todas" || inf.type === activeTab
  );

  const isAdmin = userRole === "admin";

  // ── Outfit font injection (scoped to this page only) ──────────────────────
  useEffect(() => {
    const linkId = 'outfit-font-link';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif" }} className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-semibold tracking-widest">Cargando faltas...</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }} className="bg-[#f8faff] dark:bg-[#0f1117] min-h-screen pb-24 transition-colors duration-300">

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#121022] px-4 pt-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-4 text-sm font-semibold transition-all relative whitespace-nowrap",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-lg" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">

        {/* ── Header row ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {filteredSystemInfractions.length + filteredInfractions.length} faltas
          </p>
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingInfraction(null);
                setIsDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3 px-5 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-wide transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Registrar falta
            </Button>
          )}
        </div>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <div className="relative px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 h-12 bg-white dark:bg-slate-800 border-none rounded-lg shadow-sm font-medium"
          />
        </div>

        {/* ── System Infractions ────────────────────────────────────────── */}
        {filteredSystemInfractions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs tracking-wider text-slate-400">
                Marco Legal — Decreto 1965 / 2013
              </h2>
            </div>

            {filteredSystemInfractions.map((inf) => {
              const TConfig = TYPE_MAP[inf.type];
              return (
                <div
                  key={inf.id}
                  className={cn(
                    "bg-white dark:bg-[#151b2d] border rounded-lg p-5 shadow-sm relative overflow-hidden",
                    TConfig.border
                  )}
                >
                  {/* Left accent */}
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", TConfig.dot)} />

                  <div className="pl-3 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest",
                            TConfig.bg,
                            TConfig.color
                          )}
                        >
                          {TConfig.label.toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <Lock className="w-2.5 h-2.5" />
                          SISTEMA
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white text-base leading-snug">
                        {inf.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {inf.description}
                      </p>
                    </div>

                    <p className="text-[10px] tracking-widest text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-2">
                      {inf.legal_ref}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Custom Infractions ────────────────────────────────────────── */}
        {filteredInfractions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-black tracking-wider text-slate-400">
                Faltas Registradas
              </h2>
            </div>

            {filteredInfractions.map((inf) => {
              const TConfig = TYPE_MAP[inf.type];
              const SConfig = STATUS_MAP[inf.status];
              const dateLabel = inf.date
                ? format(new Date(inf.date + "T00:00:00"), "d 'de' MMM yyyy", { locale: es })
                : "—";

              return (
                <div
                  key={inf.id}
                  className={cn(
                    "bg-white dark:bg-[#151b2d] border rounded-lg p-5 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden",
                    TConfig.border
                  )}
                >
                  {/* Left accent */}
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", TConfig.dot)} />

                  <div className="pl-3 flex flex-col gap-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest",
                            TConfig.bg,
                            TConfig.color
                          )}
                        >
                          {TConfig.label.toUpperCase()}
                        </span>
                        <span
                          className={cn(
                            "px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest",
                            SConfig.bg,
                            SConfig.color
                          )}
                        >
                          {SConfig.label}
                        </span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => {
                              setEditingInfraction(inf);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            onClick={() => handleDelete(inf.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Student name */}
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white text-base">
                        {inf.student_name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {inf.description}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2">
                      <span className="text-[10px] font-semibold text-slate-400">{dateLabel}</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Reportado por: {inf.reported_by_name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {filteredInfractions.length === 0 && searchTerm && (
          <div className="bg-white dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg py-20 px-10 text-center mt-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/60 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-slate-300/50" />
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-white">Sin resultados</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto">
              No se encontraron faltas que coincidan con la búsqueda.
            </p>
          </div>
        )}
      </div>

      {/* ── Dialog (solo admin) ─────────────────────────────────────────────── */}
      {isAdmin && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md rounded-lg border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-slate-900/50">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {editingInfraction ? (
                    <Edit2 className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>
                {editingInfraction ? "Editar falta" : "Registrar falta"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Formulario para {editingInfraction ? "editar" : "registrar"} una falta disciplinaria.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {/* Estudiante */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">
                  Estudiante
                </Label>
                <select
                  name="student_id"
                  required
                  defaultValue={editingInfraction?.student_id ?? ""}
                  className="w-full h-12 rounded-lg bg-slate-100 dark:bg-slate-900 px-4 text-sm outline-none border-none"
                >
                  <option value="">Seleccionar estudiante...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.last_name}, {s.first_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">
                    Tipo de falta
                  </Label>
                  <select
                    name="type"
                    required
                    defaultValue={editingInfraction?.type ?? "leve"}
                    className="w-full h-12 rounded-lg bg-slate-100 dark:bg-slate-900 px-4 text-xs outline-none border-none"
                  >
                    <option value="leve">Leve</option>
                    <option value="grave">Grave</option>
                    <option value="gravisima">Gravísima</option>
                  </select>
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">
                    Estado
                  </Label>
                  <select
                    name="status"
                    required
                    defaultValue={editingInfraction?.status ?? "abierto"}
                    className="w-full h-12 rounded-lg bg-slate-100 dark:bg-slate-900 px-4 text-xs outline-none border-none"
                  >
                    <option value="abierto">Abierto</option>
                    <option value="seguimiento">En seguimiento</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">
                  Descripción del hecho
                </Label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  defaultValue={editingInfraction?.description ?? ""}
                  placeholder="Describe brevemente la situación ocurrida..."
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 px-4 py-3 text-sm font-medium outline-none border-none resize-none"
                />
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">
                  Fecha del hecho
                </Label>
                <Input
                  name="date"
                  type="date"
                  required
                  defaultValue={
                    editingInfraction?.date ?? format(new Date(), "yyyy-MM-dd")
                  }
                  className="h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest rounded-lg h-14 shadow-xl shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : editingInfraction ? (
                    "Guardar cambios"
                  ) : (
                    "Registrar falta"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
