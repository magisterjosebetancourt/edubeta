import { useState } from 'react';
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

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['isa_history', selectedPeriodId, selectedGradeId],
    queryFn: () => getISAHistory({ 
      period_id: selectedPeriodId === 'all' ? undefined : selectedPeriodId,
      grade_id: selectedGradeId === 'all' ? undefined : selectedGradeId
    })
  });

  const clearFilters = () => {
    setSelectedPeriodId('all');
    setSelectedGradeId('all');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-24 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Consulta y revisión de reportes históricos de seguimiento académico.
            </p>
          </div>
          <Button onClick={() => navigate('/dashboard/isa')} className="bg-primary hover:bg-primary/90 text-white rounded-[5px] h-9 px-4 gap-2 shadow-lg shadow-primary/10 font-semibold text-[10px] tracking-widest uppercase">
            <FileText className="w-4 h-4" />
            Nuevo Pre-informe
          </Button>
        </div>
        </div>

        {/* Filters Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d] rounded-[5px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Filtros de Búsqueda</CardTitle>
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
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none font-medium appearance-none"
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
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none font-medium appearance-none"
                  >
                    <option value="all">Todos los grupos</option>
                    {grades.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <Users className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full p-3 bg-primary/5 rounded-[5px] border border-primary/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">{history.length} reportes encontrados</span>
                  <Search className="w-4 h-4 text-primary opacity-50" />
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
        ) : history.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Search className="w-10 h-10" />
              <p className="text-sm font-medium">No se encontraron registros con los filtros seleccionados</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {[...history]
              .sort((a: any, b: any) => (a.student_last_name || '').localeCompare(b.student_last_name || '', 'es'))
              .map((record: any) => (
              <Card key={record.id} className="group hover:border-primary/30 transition-all shadow-sm bg-white dark:bg-[#1e1e2d] border-slate-200 dark:border-slate-800 overflow-hidden rounded-[5px]">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Premium Avatar Fallback */}
                    <div className="w-12 h-12 rounded-full bg-[#C6E7FC] overflow-hidden flex items-center justify-center text-[#0099FE] font-semibold text-sm shrink-0 border border-primary/10">
                      {record.student_avatar_url ? (
                        <img src={record.student_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="uppercase">{(record.student_first_name || record.student_full_name || '?')[0]}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col">
                      <h4 className="font-semibold text-slate-900 dark:text-white leading-tight uppercase text-sm tracking-tight">
                        {record.student_last_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {record.student_first_name}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 opacity-80">
                        <span className="text-[9px] font-semibold text-primary flex items-center gap-1">
                          <Users className="w-3 h-3" /> {grades.find((g: any) => g.id === record.grade_id)?.name || 'Grupo'}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> P{periods.find((p: any) => p.id === record.period_id)?.period_number || '?'}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400">
                          {record.created_at?.toDate ? format(record.created_at.toDate(), "d MMM yy", { locale: es }) : record.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="flex gap-1 mr-2">
                      {['I1', 'I2', 'I3'].map(ind => (
                        <div 
                          key={ind} 
                          className={cn(
                            "w-7 h-7 rounded-[5px] flex items-center justify-center text-[9px] font-black border transition-all",
                            record[ind.toLowerCase()] 
                              ? "bg-primary text-white border-primary shadow-sm" 
                              : "bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800"
                          )}
                        >
                          {ind}
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
