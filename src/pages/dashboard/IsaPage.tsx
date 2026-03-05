import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import { useGrades, useStudents, useAssignments } from '@/lib/hooks/useFirebaseData';
import { useSaveISA } from '@/lib/hooks/useIsa';
import { ISA_INDICATORS, CreateISARecordParams } from '@/types/isa';
import { FormView } from '@/components/ui/FormView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Users, Info, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

const LEVELS = [
  { id: 'preescolar', name: 'Preescolar', grades: ['Transición'] },
  { id: 'primaria', name: 'Básica Primaria', grades: ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'] },
  { id: 'secundaria', name: 'Básica Secundaria', grades: ['Sexto', 'Séptimo', 'Octavo', 'Noveno'] },
  { id: 'media', name: 'Educación Media', grades: ['Décimo', 'Once'] },
];

const GRADE_MAP: Record<string, string> = {
  Primero:'1',Segundo:'2',Tercero:'3',Cuarto:'4',Quinto:'5',
  Sexto:'6','Séptimo':'7',Octavo:'8',Noveno:'9','Décimo':'10',Once:'11',
};

export default function IsaPage() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const { profile } = useUserProfile();
  const { data: grades = [], isLoading: loadingGrades } = useGrades();
  const { data: allStudents = [] } = useStudents();
  const { data: assignments = [] } = useAssignments();
  const saveIsa = useSaveISA();

  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [loadedStudents, setLoadedStudents] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, { i1: boolean; i2: boolean; i3: boolean }>>({});
  const [isCargando, setIsCargando] = useState(false);

  const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordinator';

  // Obtener grados disponibles según rol y filtros
  const availableGrades = isAdminOrCoord 
    ? grades.filter((g: any) => {
        if (!selectedGradeName) return true;
        if (selectedGradeName === 'Transición') return g.name.includes('Transición');
        const prefix = GRADE_MAP[selectedGradeName];
        if (!prefix) return false;
        if (prefix === '1') return g.name.startsWith('1') && !g.name.startsWith('11');
        return g.name.startsWith(prefix);
      })
    : grades.filter((g: any) => 
        assignments.some((a: any) => a.teacher_id === profile?.uid && a.grade_id === g.id && a.state === true)
      );

  const handleCargarEstudiantes = () => {
    if (!selectedGradeId) {
      toast.error('Debe seleccionar un grupo antes de cargar estudiantes');
      return;
    }

    setIsCargando(true);
    // Filtrar estudiantes por grado seleccionado
    const groupStudents = allStudents.filter((s: any) => String(s.grade_id) === String(selectedGradeId));
    
    // Ordenar por apellido
    groupStudents.sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || '', 'es'));
    
    setLoadedStudents(groupStudents);
    
    // Inicializar selecciones si no existen
    const newSelections = { ...selections };
    groupStudents.forEach((s: any) => {
      if (!newSelections[s.id]) {
        newSelections[s.id] = { i1: false, i2: false, i3: false };
      }
    });
    setSelections(newSelections);
    
    setTimeout(() => {
      setIsCargando(false);
      if (groupStudents.length === 0) {
        toast.info('No se encontraron estudiantes en este grupo');
      } else {
        toast.success(`${groupStudents.length} estudiantes cargados`);
      }
    }, 500);
  };

  const toggleIndicator = (studentId: string, indicator: 'i1' | 'i2' | 'i3') => {
    setSelections(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [indicator]: !prev[studentId][indicator]
      }
    }));
  };

  const handleSave = async () => {
    const recordsToSave: CreateISARecordParams[] = [];
    const today = new Date().toISOString().split('T')[0];

    Object.entries(selections).forEach(([studentId, indicators]) => {
      if (indicators.i1 || indicators.i2 || indicators.i3) {
        const student = loadedStudents.find(s => s.id === studentId);
        if (student) {
          recordsToSave.push({
            student_id: studentId,
            student_full_name: `${student.last_name} ${student.first_name}`,
            grade_id: selectedGradeId,
            teacher_id: profile?.uid || '',
            date: today,
            ...indicators
          });
        }
      }
    });

    if (recordsToSave.length === 0) {
      toast.warning('No existen estudiantes con indicadores seleccionados para guardar');
      return;
    }

    try {
      await saveIsa.mutateAsync(recordsToSave);
      setExiting(true);
      setTimeout(() => navigate('/dashboard'), 220);
    } catch (error) {
      // toast ya se maneja en el hook
    }
  };

  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => navigate(-1), 220);
  };

  const getInitials = (student: any) => {
    const first = (student.first_name || '?')[0];
    const last = (student.last_name || '?')[0];
    return (last + first).toUpperCase();
  };

  return (
    <FormView exiting={exiting}>
      <div className="space-y-6">
        {/* Descripción e Indicadores */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d]">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
                  Informe de Seguimiento Académico (ISA)
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Registre el desempeño académico seleccionando los indicadores correspondientes para cada estudiante.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {ISA_INDICATORS.map(indicator => (
                <div key={indicator.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
                    {indicator.id}: {indicator.label}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {indicator.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Identificador de Grupo */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d]">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className={`grid grid-cols-1 ${isAdminOrCoord ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
                {isAdminOrCoord && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        Nivel
                      </label>
                      <select 
                        value={selectedLevelId}
                        onChange={(e) => {
                          setSelectedLevelId(e.target.value);
                          setSelectedGradeName('');
                          setSelectedGradeId('');
                          setLoadedStudents([]);
                        }}
                        className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white text-sm"
                      >
                        <option value="">Todos los niveles</option>
                        {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        Grado
                      </label>
                      <select 
                        value={selectedGradeName}
                        onChange={(e) => {
                          setSelectedGradeName(e.target.value);
                          setSelectedGradeId('');
                          setLoadedStudents([]);
                        }}
                        className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white text-sm"
                        disabled={!selectedLevelId}
                      >
                        <option value="">Todos los grados</option>
                        {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Identificador del grupo
                  </label>
                  <select 
                    value={selectedGradeId}
                    onChange={(e) => {
                      setSelectedGradeId(e.target.value);
                      setLoadedStudents([]);
                    }}
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white text-sm"
                    disabled={loadingGrades || (availableGrades.length === 0) || (isAdminOrCoord && !!selectedLevelId && !selectedGradeName)}
                  >
                    <option value="">{isAdminOrCoord ? 'Todos los grupos' : 'Seleccione un grupo...'}</option>
                    {availableGrades.sort((a: any, b: any) => a.name?.localeCompare(b.name || '')).map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleCargarEstudiantes}
                  disabled={!selectedGradeId || isCargando}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg h-11 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto"
                >
                  {isCargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Cargar estudiantes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Estudiantes */}
        {loadedStudents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadedStudents.map(student => (
              <div key={student.id} className="bg-white dark:bg-[#151b2d] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm transition-all flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 border-2 border-primary/10">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(student)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-none truncate">
                      {student.last_name?.toUpperCase()}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase">
                      {student.first_name}
                    </p>
                    <p className="text-[10px] text-primary font-bold tracking-tight flex items-center gap-1 mt-1 bg-primary/5 w-fit px-2 py-0.5 rounded-full">
                      {grades.find((g: any) => g.id === student.grade_id)?.name || 'Sin grupo'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                  {(['i1', 'i2', 'i3'] as const).map((ind) => {
                    const indicator = ISA_INDICATORS.find(i => i.id === ind.toUpperCase());
                    const isSelected = selections[student.id]?.[ind];
                    return (
                      <button
                        key={ind}
                        onClick={() => toggleIndicator(student.id, ind)}
                        title={indicator?.description}
                        className={cn(
                          "flex-1 py-2 px-1 rounded-lg text-[10px] font-black tracking-tighter transition-all border",
                          isSelected 
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                            : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-primary/50"
                        )}
                      >
                        {ind.toUpperCase()}: {indicator?.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <Button 
            onClick={handleSave}
            disabled={saveIsa.isPending || loadedStudents.length === 0}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-12 gap-2 shadow-xl shadow-primary/20 font-bold text-xs tracking-widest uppercase transition-all active:scale-95"
          >
            {saveIsa.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleCancel}
            disabled={saveIsa.isPending}
            className="flex-1 rounded-lg h-12 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        </div>
      </div>
    </FormView>
  );
}
