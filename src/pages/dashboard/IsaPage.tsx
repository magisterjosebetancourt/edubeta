import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import { useGrades, useStudents, useAssignments, usePeriods, useSubjects } from '@/lib/hooks/useFirebaseData';
import { useSaveISA, useISARecords } from '@/lib/hooks/useIsa';
import { ISA_INDICATORS, CreateISARecordParams } from '@/types/isa';
import { FormView } from '@/components/ui/FormView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Users, Loader2, Save, ShieldAlert } from 'lucide-react';
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
  const [exiting, setExiting] = useState(false);
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
  const { data: existingRecords = [], isLoading: isLoadingExisting } = useISARecords(
    selectedGradeId,
    selectedSubjectId,
    selectedPeriodId
  );

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
    
    setLoadedStudents(groupStudents);
    
    // Merge existing records into selections
    const newSelections: Record<string, { i1: boolean; i2: boolean; i3: boolean }> = {};
    groupStudents.forEach((s: any) => {
      const existing = (existingRecords as any[]).find((r: any) => r.student_id === s.id);
      newSelections[s.id] = existing 
        ? { i1: !!existing.i1, i2: !!existing.i2, i3: !!existing.i3 }
        : { i1: false, i2: false, i3: false };
    });
    setSelections(newSelections);
    
    setTimeout(() => {
      setIsCargando(false);
      if (groupStudents.length === 0) {
        toast.info('No se encontraron estudiantes');
      } else {
        toast.success(`Cargados ${groupStudents.length} estudiantes ${existingRecords.length > 0 ? '(con datos previos)' : '(sin reportes previos)'}`);
      }
    }, 400);
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
      const student = loadedStudents.find(s => s.id === studentId);
      if (student) {
        recordsToSave.push({
          student_id: studentId,
          student_full_name: `${student.last_name} ${student.first_name}`,
          student_last_name: student.last_name || '',
          student_first_name: student.first_name || '',
          student_avatar_url: student.avatar_url || '',
          grade_id: selectedGradeId,
          subject_id: selectedSubjectId, 
          period_id: selectedPeriodId,   
          teacher_id: profile?.uid || '',
          date: today,
          ...indicators
        });
      }
    });

    if (recordsToSave.length === 0) {
      toast.warning('No hay datos para guardar');
      return;
    }

    try {
      await saveIsa.mutateAsync(recordsToSave);
      setExiting(true);
      setTimeout(() => navigate('/dashboard'), 220);
    } catch (error) {}
  };

  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => navigate(-1), 220);
  };

  if (isaEnabled === false && !isAdminOrCoord) {
    return (
      <FormView exiting={exiting}>
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
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="mt-4 rounded-lg">
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </FormView>
    );
  }

  if (loadingGrades || isaEnabled === null) return <LoadingSpinner message="Validando configuración de ISA..." />;

  return (
    <FormView exiting={exiting}>
      <div className="space-y-4">
        {/* Header con estilo premium - Solo descripción según feedback */}
        <div className="flex flex-col gap-0.5 px-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Seguimiento cualitativo del desempeño académico por periodo académico. Seleccione los criterios para cargar la lista.
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
                    <select 
                      value={selectedLevelId}
                      onChange={(e) => { setSelectedLevelId(e.target.value); setSelectedGradeName(''); setSelectedGradeId(''); setLoadedStudents([]); }}
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[5px] text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                    >
                      <option value="">Nivel...</option>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Grado</Label>
                    <select 
                      value={selectedGradeName}
                      onChange={(e) => { setSelectedGradeName(e.target.value); setSelectedGradeId(''); setLoadedStudents([]); }}
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[5px] text-xs outline-none disabled:opacity-50 font-medium"
                      disabled={!selectedLevelId}
                    >
                      <option value="">Grado...</option>
                      {LEVELS.find(l => l.id === selectedLevelId)?.grades.map(g => ( <option key={g} value={g}>{g}</option> ))}
                    </select>
                  </div>
                </>
              )}

              {/* Selectores Comunes */}
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Grupo</Label>
                <select 
                  value={selectedGradeId}
                  onChange={(e) => { setSelectedGradeId(e.target.value); setLoadedStudents([]); setSelectedSubjectId(''); }}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[5px] text-xs outline-none font-medium"
                  disabled={availableGrades.length === 0}
                >
                  <option value="">Grupo...</option>
                  {availableGrades.sort((a: any, b: any) => a.name?.localeCompare(b.name || '')).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Asignatura</Label>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => { setSelectedSubjectId(e.target.value); setLoadedStudents([]); }}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[5px] text-xs outline-none font-medium"
                  disabled={!selectedGradeId}
                >
                  <option value="">Asignatura...</option>
                  {availableSubjects.map((s: any) => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Periodo</Label>
                <div className="relative">
                  <select 
                    value={selectedPeriodId}
                    onChange={(e) => { setSelectedPeriodId(e.target.value); setLoadedStudents([]); }}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[5px] text-xs outline-none font-medium"
                  >
                    {periods.map((p: any) => ( <option key={p.id} value={p.id}>Periodo {p.period_number}</option> ))}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-1 flex items-end">
                <Button 
                  onClick={handleCargarEstudiantes}
                  disabled={!selectedGradeId || !selectedSubjectId || isCargando || isLoadingExisting}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-[5px] h-14 shadow-lg shadow-primary/25 font-semibold text-[11px] tracking-widest uppercase transition-all active:scale-[0.98]"
                >
                  {isCargando || isLoadingExisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  Cargar Lista
                </Button>
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

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
                  {(['i1', 'i2', 'i3'] as const).map((ind) => {
                    const isSelected = selections[student.id]?.[ind];
                    return (
                      <button
                        key={ind}
                        onClick={() => toggleIndicator(student.id, ind)}
                        className={cn(
                          "flex-1 py-1 rounded-[5px] text-[9px] font-black uppercase tracking-tighter transition-all border",
                          isSelected 
                            ? "bg-primary text-white border-primary shadow-sm scale-[1.02] z-10" 
                            : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-primary/40"
                        )}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons - Pure Stacking without any container box */}
        <div className="flex flex-col gap-4 mt-10 pb-12 w-full max-w-md mx-auto px-4">
            <Button 
              onClick={handleSave}
              disabled={saveIsa.isPending || loadedStudents.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-[5px] h-14 shadow-lg shadow-primary/25 font-semibold text-[11px] tracking-widest uppercase transition-all active:scale-[0.98]"
            >
              {saveIsa.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5 mr-3" />}
              Guardar Reporte
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="w-full rounded-[5px] h-14 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2536] text-slate-700 dark:text-slate-200 font-semibold text-[11px] tracking-widest uppercase shadow-sm transition-all active:scale-[0.98]"
            >
              <X className="w-5 h-5 mr-3 text-slate-400" />
              Cancelar
            </Button>
        </div>
      </div>
    </FormView>
  );
}
