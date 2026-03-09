import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGrades, usePeriods } from '@/lib/hooks/useFirebaseData';
import { getISAHistory } from '@/lib/firebase/isa';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, FileText, ChevronRight, Calendar, Users, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function IsaHistoryPage() {
  const navigate = useNavigate();
  const [selectedPeriodId, setSelectedPeriodId] = useState('all');
  const [selectedGradeId, setSelectedGradeId] = useState('all');

  const { data: grades = [] } = useGrades();
  const { data: periods = [] } = usePeriods();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['isa_history', selectedPeriodId, selectedGradeId],
    queryFn: () => getISAHistory({ 
      period_id: selectedPeriodId === 'all' ? undefined : selectedPeriodId,
      grade_id: selectedGradeId === 'all' ? undefined : selectedGradeId
    })
  });

  // Lógica de Agregación para la Vista de Auditoría
  const aggregatedSessions = useMemo(() => {
    const groups: Record<string, any> = {};
    
    history.forEach((record: any) => {
      // Clave única por sesión: Grupo + Asignatura + Docente + Periodo
      const key = `${record.grade_id}_${record.subject_id}_${record.teacher_id}_${record.period_id}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          grade_id: record.grade_id,
          subject_id: record.subject_id,
          subject_name: record.subject_name || 'Asignatura',
          teacher_id: record.teacher_id,
          teacher_name: record.teacher_name || 'Docente',
          period_id: record.period_id,
          grade_name: grades.find((g: any) => g.id === record.grade_id)?.name || 'Grupo',
          student_count: 0,
          last_update: record.updated_at || record.created_at,
          records: []
        };
      }
      
      groups[key].student_count++;
      groups[key].records.push(record);
    });

    return Object.values(groups).sort((a: any, b: any) => {
      const timeA = a.last_update?.seconds || 0;
      const timeB = b.last_update?.seconds || 0;
      return timeB - timeA;
    });
  }, [history, grades]);

  // Filtrado por buscador (Docente o Asignatura)
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return aggregatedSessions;
    const term = searchTerm.toLowerCase();
    return aggregatedSessions.filter((s: any) => 
      s.teacher_name.toLowerCase().includes(term) || 
      s.subject_name.toLowerCase().includes(term) ||
      s.grade_name.toLowerCase().includes(term)
    );
  }, [aggregatedSessions, searchTerm]);

  const clearFilters = () => {
    setSelectedPeriodId('all');
    setSelectedGradeId('all');
    setSearchTerm('');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-24 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header - Sin título por solicitud */}
        <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
          <Button 
            onClick={() => navigate('/dashboard/isa')} 
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
          >
            <FileText className="w-4 h-4" />
            Nuevo Pre-informe
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d] rounded-[5px]">
          <CardHeader className="pb-3 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
              </div>
              {(selectedPeriodId !== 'all' || selectedGradeId !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1 uppercase">
                  <X className="w-3 h-3" /> Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Periodo Académico</Label>
                <div className="relative">
                  <select 
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium"
                  >
                    <option value="all">Todos los periodos</option>
                    {periods.map((p: any) => (
                      <option key={p.id} value={p.id}>Periodo {p.period_number}</option>
                    ))}
                  </select>
                  <Calendar className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Grupo / Grado</Label>
                <div className="relative">
                  <select 
                    value={selectedGradeId}
                    onChange={(e) => setSelectedGradeId(e.target.value)}
                    className="pl-9 h-10 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all font-medium"
                  >
                    <option value="all">Todos los grupos</option>
                    {grades.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <Users className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Buscar por Docente o Asignatura</Label>
                <div className="relative">
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: Matemáticas, Juan Perez..."
                    className="w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                  />
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="flex items-end lg:col-span-3">
                <div className="w-full p-3 bg-primary/5 rounded-[5px] border border-primary/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">{filteredSessions.length} sesiones de reporte encontradas ({history.length} estudiantes)</span>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Completo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        {isLoading ? (
          <div className="py-20 text-center">
            <LoadingSpinner message="Buscando en el historial..." />
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Search className="w-10 h-10" />
              <p className="text-sm font-medium">No se encontraron sesiones de reporte con estos criterios</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session: any) => (
              <Card 
                key={session.id} 
                onClick={() => setSelectedSession(session)}
                className="group hover:border-primary/40 cursor-pointer transition-all shadow-sm bg-white dark:bg-[#1e1e2d] border-slate-200 dark:border-slate-800 overflow-hidden rounded-[5px] flex flex-col"
              >
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white uppercase text-xs tracking-wider">
                          {session.grade_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900">
                            {session.subject_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black text-slate-400">P{periods.find((p: any) => p.id === session.period_id)?.period_number || '?'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[10px]">
                         {session.teacher_name[0]}
                       </div>
                       <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                         {session.teacher_name}
                       </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                       <div className="flex items-center gap-1.5">
                         <div className="text-xs font-semibold text-primary">{session.student_count}</div>
                         <div className="text-[10px] text-slate-400 font-medium">Estudiantes reportados</div>
                       </div>
                       <Button 
                         variant="ghost" 
                         className="h-7 px-2 text-[10px] font-semibold uppercase gap-1 text-primary hover:bg-primary/5 rounded-[5px]"
                       >
                         Ver detalle <ChevronRight className="w-3 h-3" />
                       </Button>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 font-medium">Último cambio</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase">
                    {session.last_update?.toDate ? format(session.last_update.toDate(), "d MMM HH:mm", { locale: es }) : 'Reciente'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal / Overlay de Detalle de Sesión */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-primary/20 bg-white dark:bg-[#151b2d] rounded-[5px]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold uppercase tracking-tight">{selectedSession.grade_name}</CardTitle>
                    <p className="text-xs text-slate-500 font-medium">{selectedSession.subject_name} • {selectedSession.teacher_name}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedSession(null)}
                  className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedSession.records
                  .sort((a: any, b: any) => (a.student_last_name || '').localeCompare(b.student_last_name || '', 'es'))
                  .map((record: any) => (
                  <div key={record.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[5px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C6E7FC] flex items-center justify-center text-[#0099FE] font-semibold text-[10px] shrink-0">
                        {record.student_last_name[0]}{record.student_first_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate uppercase">{record.student_last_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{record.student_first_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                       {['I1', 'I2', 'I3'].map(ind => (
                         <div 
                           key={ind} 
                           className={cn(
                             "w-6 h-6 rounded-[3px] flex items-center justify-center text-[8px] font-black border",
                             record[ind.toLowerCase()] 
                               ? "bg-red-50 text-red-400 border-red-200" 
                               : "bg-white dark:bg-slate-800 text-slate-200 dark:text-slate-700 border-slate-100 dark:border-slate-800"
                           )}
                         >
                           {ind}
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex justify-end">
               <Button 
                 onClick={() => setSelectedSession(null)} 
                 className="w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs"
               >
                 <X className="w-4 h-4" />
                 Cerrar Detalle
               </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
