import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  FileText,
  User,
  Layers,
  Calendar,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAllObservationsList } from '@/lib/hooks/useObservador';
import { useStudents, useGrades, useAssignments } from '@/lib/hooks/useFirebaseData';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ObservadorList() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { data: observations, isLoading: loadingObs } = useAllObservationsList();
  const { data: rawStudents, isLoading: loadingStudents } = useStudents();
  const { data: rawGrades, isLoading: loadingGrades } = useGrades();
  const { data: rawAssignments = [], isLoading: loadingAssignments } = useAssignments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordinator';
  const isLoading = loadingObs || loadingStudents || loadingGrades || loadingAssignments;

  // Vinculaciones del docente
  const teacherGradeIds = useMemo(() => {
    return rawAssignments
      .filter((a: any) => a.teacher_id === profile?.uid && a.state === true)
      .map((a: any) => a.grade_id);
  }, [rawAssignments, profile?.uid]);

  const availableGrades = useMemo(() => {
    if (!rawGrades) return [];
    if (isAdminOrCoord) return rawGrades;
    return rawGrades.filter((g: any) => teacherGradeIds.includes(g.id));
  }, [rawGrades, isAdminOrCoord, teacherGradeIds]);

  // Filtrado de lado del cliente
  const filteredObservations = useMemo(() => {
    if (!observations || !rawStudents || !rawGrades) return [];

    // Join virtual rápido con estudiantes para la búsqueda por nombre
    const getStudent = (id: string) => rawStudents.find((s: any) => s.id === id);
    
    let filtered = observations;

    // Restricción de base por rol si NO es admin/coord
    if (!isAdminOrCoord) {
      filtered = filtered.filter((obs: any) => {
        const s = getStudent(obs.studentId);
        return s && teacherGradeIds.includes(s.grade_id);
      });
    }

    // Filtrar por texto libre
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((obs: any) => {
        const s = getStudent(obs.studentId);
        const name = s ? `${s.firstName} ${s.lastName}`.toLowerCase() : '';
        return (
          obs.type.toLowerCase().includes(term) ||
          obs.law1620Category.toLowerCase().includes(term) ||
          obs.creatorName.toLowerCase().includes(term) ||
          name.includes(term)
        );
      });
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((obs: any) => obs.status === statusFilter);
    }

    if (gradeFilter !== 'all') {
      filtered = filtered.filter((obs: any) => {
        const s = getStudent(obs.studentId);
        return s && s.grade_id === gradeFilter;
      });
    }

    // Ordenar por fecha descendente
    return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [observations, rawStudents, rawGrades, searchTerm, statusFilter, gradeFilter]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStudentName = (id: string) => {
    if (!rawStudents) return 'Desconocido';
    const s = rawStudents.find((st: any) => st.id === id);
    return s ? `${s.lastName || ''} ${s.firstName || ''}`.trim() : 'Buscando...';
  };

  const getStudentGradeName = (id: string) => {
    if (!rawStudents || !rawGrades) return '';
    const s = rawStudents.find((st: any) => st.id === id);
    if (!s || !s.grade_id) return '';
    const g = rawGrades.find((gr: any) => gr.id === s.grade_id);
    return g ? g.name : '';
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Intro Text & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Control de Observaciones
          </h2>
          <p className="text-sm text-slate-500 max-w-2xl mt-1 leading-relaxed">
            Gestione las anotaciones formativas, disciplinarias y de reconocimiento del estudiante bajo las directrices de la Ley 1620 y el debido proceso de la Ley 1098.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/observations/new')}
          className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          Registrar Caso
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#151b2d] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por alumno, categoría o docente..."
            className="pl-9 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 h-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex items-center">
            <Layers className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select 
              className="pl-9 h-10 w-full sm:w-auto min-w-[160px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="all">Todos los grupos</option>
              {availableGrades.sort((a: any, b: any) => a.name?.localeCompare(b.name || '')).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select 
              className="pl-9 h-10 w-full sm:w-auto min-w-[150px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Cualquier estado</option>
              <option value="Abierto">Abiertos</option>
              <option value="En proceso">En proceso</option>
              <option value="Cerrado">Cerrados</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (md:hidden) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredObservations.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-[#151b2d]/50">
             <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
             <p className="text-slate-500 font-medium">No se encontraron observaciones.</p>
          </div>
        ) : (
          filteredObservations.map((obs: any) => {
            const gradeName = getStudentGradeName(obs.studentId);
            return (
            <div key={obs.id} className="bg-white dark:bg-[#151b2d] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 active:scale-[0.99] transition-transform">
              
              {/* Header Card */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col max-w-[70%]">
                  <span className="text-[10px] text-primary/80 font-semibold uppercase tracking-wider mb-1">
                    {format(new Date(obs.createdAt), "d 'de' MMM, yyyy", { locale: es })}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-white leading-tight truncate">
                    {getStudentName(obs.studentId)}
                  </h3>
                  {gradeName && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <Layers className="w-3 h-3 text-slate-400" /> {gradeName}
                    </span>
                  )}
                </div>
                
                <Badge variant="secondary" className={`font-semibold shrink-0 uppercase tracking-wider text-[9px] px-2 py-0.5 ${
                    obs.status === 'Abierto' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    obs.status === 'En proceso' ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                  {obs.status}
                </Badge>
              </div>

              {/* Body Card */}
              <div className="flex flex-col gap-2 border-y border-slate-100 dark:border-slate-800 py-3 mt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="font-medium bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700">
                    {obs.type}
                  </Badge>
                  {obs.law1620Category !== 'No Aplica' && (
                    <Badge variant="destructive" className="font-semibold text-[9px] uppercase tracking-wide bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
                      {obs.law1620Category}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mt-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                  Rep. por {obs.creatorName}
                </div>
              </div>

              {/* Actions */}
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/dashboard/observations/${obs.id}`)}
                className="w-full text-primary hover:text-primary/90 hover:bg-primary/5 font-semibold tracking-wider text-[11px] mt-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                VER DETALLE DEL CASO
              </Button>
            </div>
            );
          })
        )}
      </div>

      {/* TABLE DESKTOP VIEW (hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-[#151b2d] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-900 dark:text-slate-300">Fecha</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-300 md:w-[250px]">Estudiante</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-300">Gravedad y Tipo</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-300">Remitente</TableHead>
                <TableHead className="font-semibold text-slate-900 dark:text-slate-300">Estado</TableHead>
                <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 m-6 rounded-xl py-10 bg-slate-50/50 dark:bg-[#121022]">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400 text-base">Sin historial de observaciones</p>
                      <span className="text-sm font-medium">Modifique los filtros o registre un nuevo caso.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredObservations.map((obs: any) => {
                  const sName = getStudentName(obs.studentId);
                  const gName = getStudentGradeName(obs.studentId);
                  return (
                  <TableRow key={obs.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {format(new Date(obs.createdAt), "dd MMM, yyyy", { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col py-1">
                        <span className="font-semibold text-slate-900 dark:text-white leading-tight">
                          {sName}
                        </span>
                        {gName && (
                          <span className="text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1 mt-0.5">
                            <Layers className="w-2.5 h-2.5" /> {gName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge variant="outline" className="font-semibold bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 tracking-wide text-[10px]">
                          {obs.type}
                        </Badge>
                        {obs.law1620Category !== 'No Aplica' && (
                          <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                            <ShieldAlert className="w-3 h-3" />
                            {obs.law1620Category}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 opacity-60" />
                        {obs.creatorName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`font-semibold tracking-wider text-[10px] uppercase ${
                          obs.status === 'Abierto' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          obs.status === 'En proceso' ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {obs.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => navigate(`/dashboard/observations/${obs.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
