import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import { useGrades, useStudents, useAssignments, usePeriods, useSubjects } from '@/lib/hooks/useFirebaseData';
import { useSaveISA, useISARecords } from '@/lib/hooks/useIsa';
import { ISA_INDICATORS, CreateISARecordParams } from '@/types/isa';
import { FormView } from '@/components/ui/FormView';
import { EduButton } from '@/components/ui/EduButton';
import { EduSelect } from '@/components/ui/EduSelect';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Users, Loader2, Save, ShieldAlert } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

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
  const { profile } = useUserProfile();
  
  // Settings & Global Toggle
  const [isaEnabled, setIsaEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'institutional'));
        if (settingsSnap.exists()) {
          setIsaEnabled(settingsSnap.data().isa_enabled !== false);
        } else {
          setIsaEnabled(true);
        }
      } catch (e) {
        setIsaEnabled(true); // Fallback
      }
    };
    fetchSettings();
  }, []);

  const { data: grades = [], isLoading: loadingGrades } = useGrades();
  const { data: allStudents = [] } = useStudents();
  const { data: assignments = [] } = useAssignments();
  const { data: periods = [] } = usePeriods();
  const { data: subjects = [] } = useSubjects();
  const saveIsa = useSaveISA();

  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  
  const [loadedStudents, setLoadedStudents] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, { i1: boolean; i2: boolean; i3: boolean }>>({});
  const [isCargando, setIsCargando] = useState(false);

  // Fetching existing records
  const { data: existingRecords = [], isLoading: isLoadingExisting, error: fetchError } = useISARecords(
    selectedGradeId,
    selectedSubjectId,
    selectedPeriodId
  );

  // Mostrar error de carga si ocurre (útil para detectar falta de índices en Firestore)
  useEffect(() => {
    if (fetchError) {
      toast.error('Error al cargar datos previos', { description: (fetchError as any).message });
    }
  }, [fetchError]);

  const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordinator';

  // Available Data based on role and selections
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

  const availableSubjects = isAdminOrCoord
    ? subjects
    : subjects.filter((s: any) => 
        assignments.some((a: any) => a.teacher_id === profile?.uid && a.grade_id === selectedGradeId && a.subject_id === s.id)
      );

  // Auto-detect current period
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const now = new Date();
      const current = periods.find((p: any) => {
        const start = p.start_date ? new Date(p.start_date) : null;
        const end = p.end_date ? new Date(p.end_date) : null;
        return start && end && now >= start && now <= end;
      });
      if (current) setSelectedPeriodId(current.id);
    }
  }, [periods, selectedPeriodId]);

  const handleCargarEstudiantes = () => {
    if (!selectedGradeId || !selectedSubjectId || !selectedPeriodId) {
      toast.error('Complete todos los campos antes de cargar');
      return;
    }

    setIsCargando(true);
    const groupStudents = allStudents.filter((s: any) => String(s.grade_id) === String(selectedGradeId));
    groupStudents.sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || '', 'es'));
    
    // Limpiar selecciones actuales para evitar ver datos del grupo anterior
    setSelections({});
    setLoadedStudents(groupStudents);
    
    // El useEffect se encargará de sincronizar las selecciones una vez cargados los estudiantes
    setTimeout(() => {
      setIsCargando(false);
      if (groupStudents.length === 0) {
        toast.info('No se encontraron estudiantes');
      } else {
        toast.success(`Cargados ${groupStudents.length} estudiantes`);
      }
    }, 300);
  };

  // Sincronización reactiva de indicadores desde la base de datos
  useEffect(() => {
    // Solo sincronizar si NO está cargando datos de la DB y hay estudiantes en la lista
    if (!isLoadingExisting && loadedStudents.length > 0) {
      const newSelections: Record<string, { i1: boolean; i2: boolean; i3: boolean }> = {};
      
      loadedStudents.forEach((s: any) => {
        // Match string-safe IDs
        const existing = (existingRecords as any[]).find((r: any) => 
          String(r.student_id) === String(s.id)
        );
        
        newSelections[s.id] = existing 
          ? { i1: !!existing.i1, i2: !!existing.i2, i3: !!existing.i3 }
          : { i1: false, i2: false, i3: false };
      });
      
      setSelections(newSelections);
    }
  }, [existingRecords, loadedStudents, isLoadingExisting]);

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
    const idsToDelete: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    Object.entries(selections).forEach(([studentId, indicators]) => {
      const student = loadedStudents.find(s => String(s.id) === String(studentId));
      const hasIndicators = indicators.i1 || indicators.i2 || indicators.i3;
      const existing = (existingRecords as any[]).find((r: any) => String(r.student_id) === String(studentId));

      if (student) {
        if (hasIndicators) {
          // Buscamos el nombre de la asignatura en la lista global para asegurar que siempre esté disponible
          const subject = subjects.find((s: any) => s.id === selectedSubjectId);
          
          recordsToSave.push({
            student_id: studentId,
            student_full_name: `${student.last_name} ${student.first_name}`,
            student_last_name: student.last_name || '',
            student_first_name: student.first_name || '',
            student_avatar_url: student.avatar_url || '',
            grade_id: selectedGradeId,
            subject_id: selectedSubjectId, 
            subject_name: subject?.name || 'Asignatura',
            period_id: selectedPeriodId,   
            teacher_id: profile?.uid || '',
            teacher_name: profile?.full_name || 'Docente',
            date: today,
            ...indicators
          });
        } else if (existing) {
          // Si tenía registro pero ya no tiene indicadores, lo eliminamos
          idsToDelete.push(existing.id);
        }
      }
    });

    if (recordsToSave.length === 0 && idsToDelete.length === 0) {
      toast.warning('No hay cambios para guardar');
      return;
    }

    try {
      await saveIsa.mutateAsync({ records: recordsToSave, idsToDelete });
      // Limpiamos la lista para forzar una nueva carga si el usuario quiere seguir
      setLoadedStudents([]);
      // Mantenemos la asignatura y el periodo, limpiamos solo el grupo
      setSelectedGradeId('');
      toast.info('Reporte guardado. Seleccione otro grupo para continuar.');
    } catch (error) {
      console.error("Error al guardar ISA:", error);
    }
  };

  if (isaEnabled === false && !isAdminOrCoord) {
    return (
      <FormView>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/50">
          <CardContent className="p-12 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Módulo ISA Desactivado</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                La administración ha cerrado la ventana de captura de pre-informes cualitativos. 
                Contacte a coordinación para más información.
              </p>
            </div>
            <EduButton onClick={() => navigate('/dashboard')} variant="secondary" className="mt-4 rounded-lg">
              Volver al Inicio
            </EduButton>
          </CardContent>
        </Card>
      </FormView>
    );
  }

  if (loadingGrades || isaEnabled === null) return <LoadingSpinner message="Validando configuración de ISA..." />;

  return (
    <FormView>
      <div className="space-y-4">
        {/* Header con estilo premium - Solo descripción según feedback */}
        <div className="flex flex-col gap-0.5 px-1">
          <p className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1">
            Seguimiento cualitativo del desempeño académico por periodo. Seleccione los criterios para cargar la lista.
          </p>
        </div>

        {/* Leyenda de Indicadores en formato párrafo - Más compacto */}
        <div className="px-1">
          <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
            <span className="font-semibold text-primary mr-1">INDICADORES:</span>
            {ISA_INDICATORS.map((indicator, idx) => (
              <span key={indicator.id}>
                <span className="font-black text-slate-700 dark:text-slate-200">{indicator.id}:</span> {indicator.label} ({indicator.description}){idx < ISA_INDICATORS.length - 1 ? ' • ' : ''}
              </span>
            ))}
          </p>
        </div>

        {/* Filtros de Carga */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e1e2d] rounded-[5px]">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Selecciones de Admin */}
              {isAdminOrCoord && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Nivel</Label>
                    <EduSelect 
                      value={selectedLevelId}
                      onChange={(e) => { setSelectedLevelId(e.target.value); setSelectedGradeName(''); setSelectedGradeId(''); setLoadedStudents([]); }}
                    >
                      <option value="">Nivel...</option>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </EduSelect>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Grado</Label>
                    <EduSelect 
                      value={selectedGradeName}
                      onChange={(e) => { setSelectedGradeName(e.target.value); setSelectedGradeId(''); setLoadedStudents([]); }}
                      disabled={!selectedLevelId}
                    >
                      <option value="">Grado...</option>
                      {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => ( <option key={g} value={g}>{g}</option> ))}
                    </EduSelect>
                  </div>
                </>
              )}

              {/* Selectores Comunes */}
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Grupo</Label>
                <EduSelect 
                  value={selectedGradeId}
                  onChange={(e) => { setSelectedGradeId(e.target.value); setLoadedStudents([]); setSelectedSubjectId(''); }}
                  disabled={availableGrades.length === 0}
                >
                  <option value="">Grupo...</option>
                  {availableGrades.sort((a: any, b: any) => a.name?.localeCompare(b.name || '')).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </EduSelect>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Asignatura</Label>
                <EduSelect 
                  value={selectedSubjectId}
                  onChange={(e) => { setSelectedSubjectId(e.target.value); setLoadedStudents([]); }}
                  disabled={!selectedGradeId}
                >
                  <option value="">Asignatura...</option>
                  {availableSubjects.map((s: any) => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                </EduSelect>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Periodo</Label>
                <div className="relative">
                  <EduSelect 
                    value={selectedPeriodId}
                    onChange={(e) => { setSelectedPeriodId(e.target.value); setLoadedStudents([]); }}
                  >
                    {periods.map((p: any) => ( <option key={p.id} value={p.id}>Periodo {p.period_number}</option> ))}
                  </EduSelect>
                </div>
              </div>

              <div className="lg:col-span-1 flex items-end">
                <EduButton 
                  onClick={handleCargarEstudiantes}
                  disabled={!selectedGradeId || !selectedSubjectId || isCargando || isLoadingExisting}
                  icon={isCargando || isLoadingExisting ? Loader2 : Users}
                  distributed
                >
                  Cargar Lista
                </EduButton>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Estudiantes con Estilo Premium */}
        {loadedStudents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loadedStudents.map(student => (
              <div key={student.id} className="group relative bg-white dark:bg-[#151b2d] rounded-[5px] p-3 border border-slate-200 dark:border-slate-800 shadow-sm transition-all flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#C6E7FC] overflow-hidden flex items-center justify-center text-[#0099FE] font-semibold text-xs shrink-0 border border-primary/10">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="uppercase">{(student.last_name?.[0] || '') + (student.first_name?.[0] || '')}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white leading-tight uppercase tracking-tight truncate text-sm">
                      {student.last_name}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {student.first_name}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  {(['i1', 'i2', 'i3'] as const).map((ind) => {
                    const isSelected = selections[student.id]?.[ind];
                    return (
                      <button
                        key={ind}
                        onClick={() => toggleIndicator(student.id, ind)}
                        className={cn(
                          "flex-1 py-1.5 rounded-[5px] text-[11px] font-black uppercase tracking-tighter transition-all border",
                          isSelected 
                            ? "bg-red-50 text-red-400 border-red-400 shadow-md scale-[1.05] z-10" 
                            : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-red-400/40"
                        )}
                      >
                        {ind.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadedStudents.length && !isCargando && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Seguimiento Académico (ISA)</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm">
              Seleccione un grupo, asignatura y periodo para comenzar el reporte de indicadores.
            </p>
          </div>
        )}

        {/* Floating Save Button */}
        {loadedStudents.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
            <EduButton 
              onClick={handleSave}
              disabled={saveIsa.isPending}
              icon={saveIsa.isPending ? Loader2 : Save}
              distributed
            >
              {saveIsa.isPending ? 'Guardando...' : 'Guardar Reporte'}
            </EduButton>
          </div>
        )}
      </div>
    </FormView>
  );
}
