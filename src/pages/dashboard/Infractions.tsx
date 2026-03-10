import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy
} from "firebase/firestore";
import { useUserProfile } from "@/lib/context/UserProfileContext";
import { Button } from "@/components/ui/button";
import { EduButton } from "@/components/ui/EduButton";
import { EduInput } from "@/components/ui/EduInput";
import { toast } from "sonner";
import { ShieldAlert, Plus, Trash2, Edit2, Search, Lock, BookOpen } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SYSTEM_INFRACTIONS = [
  { id: "sys-1", title: "1. Incumplimiento del uniforme escolar", description: "El estudiante asiste a la institución sin el uso adecuado del uniforme reglamentario establecido en el Manual de Convivencia.", type: "leve" as const, legal_ref: "Art. 40 Lit. a · Decreto 1965/2013" },
  { id: "sys-2", title: "2. Uso de dispositivos móviles en clase sin autorización", description: "Uso de celular, tablet u otro dispositivo electrónico durante el desarrollo de actividades académicas sin permiso del docente.", type: "leve" as const, legal_ref: "Art. 40 Lit. b · Decreto 1965/2013" },
  { id: "sys-3", title: "1. Comportamiento irrespetuoso verbal", description: "Expresiones verbales ofensivas, insultos o lenguaje soez dirigido a compañeros, docentes o personal de la institución.", type: "grave" as const, legal_ref: "Art. 40 Lit. c · Decreto 1965/2013" },
  { id: "sys-4", title: "2. Daño intencional a bienes institucionales", description: "Deterioro, destrucción o alteración voluntaria de bienes muebles e inmuebles de la institución educativa o de terceros.", type: "grave" as const, legal_ref: "Art. 40 Lit. d · Decreto 1965/2013" },
  { id: "sys-5", title: "1. Agresión física entre estudiantes", description: "Actos de violencia física que causen daño corporal a otro integrante de la comunidad educativa.", type: "gravisima" as const, legal_ref: "Art. 40 Lit. e · Decreto 1965/2013 · Ley 1620/2013" },
  { id: "sys-6", title: "2. Porte de armas u objetos peligrosos", description: "Ingreso o tenencia dentro de la institución de armas, explosivos, sustancias peligrosas u objetos que puedan causar daño.", type: "gravisima" as const, legal_ref: "Art. 40 Lit. f · Decreto 1965/2013 · Código Penal" },
  { id: "sys-7", title: "3. Acoso escolar (Bullying)", description: "Conducta de hostigamiento, acoso, intimidación o maltrato repetitivo y sistemático que vulnere los derechos del estudiante.", type: "gravisima" as const, legal_ref: "Art. 40 Lit. g · Ley 1620/2013 · Decreto 1965/2013" },
];

type InfractionType = "leve" | "grave" | "gravisima";
type InfractionStatus = "abierto" | "seguimiento" | "cerrado";
type TabFilter = "todas" | InfractionType;

interface Infraction {
  id: string; student_id: string; student_name: string; type: InfractionType;
  description: string; date: string; status: InfractionStatus; reported_by_name: string; created_at?: any;
}

const TYPE_MAP: Record<InfractionType, { label: string; color: string; bg: string; border: string; dot: string }> = {
  leve: { label: "Tipo I", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800/50", dot: "bg-blue-500" },
  grave: { label: "Tipo II", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-100 dark:border-orange-800/50", dot: "bg-orange-500" },
  gravisima: { label: "Tipo III", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-800/50", dot: "bg-red-500" },
};
const STATUS_MAP: Record<InfractionStatus, { label: string; color: string; bg: string }> = {
  abierto: { label: "Abierto", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  seguimiento: { label: "En seguimiento", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  cerrado: { label: "Cerrado", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
};
const TABS: { id: TabFilter; label: string }[] = [
  { id: "todas", label: "Todas" }, { id: "leve", label: "Tipo I" }, { id: "grave", label: "Tipo II" }, { id: "gravisima", label: "Tipo III" },
];

export default function InfractionsPage() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const userRole = profile?.role || 'teacher';

  const fetchData = async () => {
    try {
      const infSnap = await getDocs(query(collection(db, "infractions"), orderBy("created_at", "desc")));
      setInfractions(infSnap.docs.map(d => ({ id: d.id, ...d.data() } as Infraction)));
    } catch (err: any) {
      toast.error("Error al cargar faltas", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de falta definitivamente?")) return;
    await deleteDoc(doc(db, "infractions", id));
    setInfractions(prev => prev.filter(i => i.id !== id));
    toast.success("Falta eliminada");
  };

  const filteredInfractions = infractions.filter(inf => {
    const matchesTab = activeTab === "todas" || inf.type === activeTab;
    const matchesSearch = inf.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });
  const filteredSystem = SYSTEM_INFRACTIONS.filter(inf => activeTab === "todas" || inf.type === activeTab);
  const isAdmin = userRole === "admin";

  if (loading) return <LoadingSpinner message="Cargando faltas..." />;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }} className="bg-[#f8faff] dark:bg-[#0f1117] min-h-screen pb-24 transition-colors duration-300">
      {/* Tabs */}
      <div className="bg-white dark:bg-[#121022] px-4 pt-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("pb-4 text-sm font-semibold transition-all relative whitespace-nowrap",
                activeTab === tab.id ? "text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}>
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-lg" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between px-1">
          {isAdmin && (
            <EduButton onClick={() => navigate('/dashboard/infractions/new')}
              icon={Plus}
              className="h-12 px-6 w-full sm:w-auto"
            >
              Registrar falta
            </EduButton>
          )}
        </div>

          <EduInput type="text" placeholder="Buscar por descripción..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            icon={Search}
            className="h-12"
          />

        {/* System Infractions */}
        {filteredSystem.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs tracking-wider text-slate-400">Marco Legal — Decreto 1965 / 2013</h2>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {infractions.length} faltas
            </p>
            {filteredSystem.map(inf => {
              const TConfig = TYPE_MAP[inf.type];
              return (
                <div key={inf.id} className={cn("bg-white dark:bg-[#151b2d] border rounded-lg p-5 shadow-sm relative overflow-hidden", TConfig.border)}>
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", TConfig.dot)} />
                  <div className="pl-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest", TConfig.bg, TConfig.color)}>{TConfig.label.toUpperCase()}</span>
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <Lock className="w-2.5 h-2.5" />SISTEMA
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white text-base leading-snug">{inf.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{inf.description}</p>
                    </div>
                    <p className="text-[10px] tracking-widest text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-2">{inf.legal_ref}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Infractions */}
        {filteredInfractions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-black tracking-wider text-slate-400">Faltas Registradas</h2>
            </div>
            {filteredInfractions.map(inf => {
              const TConfig = TYPE_MAP[inf.type];
              const SConfig = STATUS_MAP[inf.status];
              const dateLabel = inf.date ? format(new Date(inf.date + "T00:00:00"), "d 'de' MMM yyyy", { locale: es }) : "—";
              return (
                <div key={inf.id}
                  className={cn("bg-white dark:bg-[#151b2d] border rounded-lg p-5 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden", TConfig.border)}>
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", TConfig.dot)} />
                  <div className="pl-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest", TConfig.bg, TConfig.color)}>{TConfig.label.toUpperCase()}</span>
                        <span className={cn("px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest", SConfig.bg, SConfig.color)}>{SConfig.label}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => navigate(`/dashboard/infractions/${inf.id}/edit`)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            onClick={() => handleDelete(inf.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white text-base">{inf.student_name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{inf.description}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2">
                      <span className="text-[10px] font-semibold text-slate-400">{dateLabel}</span>
                      <span className="text-[10px] font-semibold text-slate-400">Reportado por: {inf.reported_by_name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredInfractions.length === 0 && searchTerm && (
          <div className="bg-white dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg py-20 px-10 text-center mt-4">
            <ShieldAlert className="w-8 h-8 text-slate-300/50 mx-auto mb-4" />
            <h4 className="font-semibold text-slate-800 dark:text-white">Sin resultados</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto">No se encontraron faltas que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
