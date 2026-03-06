import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useObservationDetail, useSaveStudentDefense } from '@/lib/hooks/useObservador';
import { useUserProfile } from '@/lib/context/UserProfileContext';
import SignatureCanvas from 'react-signature-canvas';
import { 
  User, 
  Clock, 
  AlertCircle,
  PenTool
} from 'lucide-react';
import { FormView } from '@/components/ui/FormView';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function StudentDefenseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  
  const { data: observation, isLoading } = useObservationDetail(id!);
  const saveDefense = useSaveStudentDefense();

  const [defenseText, setDefenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  
  // Referencia al SignatureCanvas
  const sigCanvas = useRef<SignatureCanvas>(null);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!observation) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-semibold">Anotación no encontrada</h2>
        <Button onClick={() => navigate(-1)} variant="outline">Volver</Button>
      </div>
    );
  }

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async () => {
    if (!defenseText.trim()) {
      return toast.error("Debe escribir sus descargos / versión de los hechos");
    }

    if (sigCanvas.current?.isEmpty()) {
      return toast.error("Debe firmar el documento para constancia");
    }

    setIsSubmitting(true);
    try {
      const signatureDataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
      
      await saveDefense.mutateAsync({
        id: observation.id,
        defense: defenseText,
        signatureDataUrl: signatureDataUrl || '',
        studentId: observation.studentId
      });

      toast.success("Descargos y firma guardados correctamente");
      setExiting(true);
      setTimeout(() => navigate('/dashboard/observations'), 220);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar los descargos");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Solo estudiantes deberían poder llenar esto, o un coordinador/docente asistiendo al estudiante
  // Para propósitos de este prototipo, mostramos la UI habilitada
  const hasAlreadyDefended = !!observation.studentDefense;

  return (
    <FormView exiting={exiting} className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Izquierdo: Resumen del Hecho */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/20">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 tracking-wide">
                Hechos registrados
              </h2>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-white dark:bg-slate-800">{observation.type}</Badge>
                  {observation.law1620Category !== 'No Aplica' && (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {observation.law1620Category}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  {format(new Date(observation.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <User className="w-4 h-4" />
                  Reportado por: <span className="font-semibold text-slate-900 dark:text-slate-200">{observation.creatorName}</span>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Descripción de lo sucedido</p>
                  <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {observation.description}
                  </div>
                </div>

                {observation.agreements && observation.agreements.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Compromisos / Medidas</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 ml-1">
                      {observation.agreements.map((agreement, i) => (
                        <li key={i}>{agreement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Derecho: Formulario de Defensa y Firma */}
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-md bg-white dark:bg-[#151b2d] h-full flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              <h2 className="text-lg font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3 mb-4 tracking-wide">
                <PenTool className="w-5 h-5" />
                Espacio del estudiante
              </h2>

              {hasAlreadyDefended ? (
                <div className="space-y-6 flex-1">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Los descargos ya fueron presentados el {format(new Date(observation.studentDefenseDate!), "dd/MM/yyyy HH:mm")}.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Versión del estudiante</p>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {observation.studentDefense}
                    </div>
                  </div>

                  {observation.studentSignatureDataUrl && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Firma registrada</p>
                      <div className="bg-white p-2 rounded-xl border border-slate-200 max-w-[300px]">
                        <img src={observation.studentSignatureDataUrl} alt="Firma del estudiante" className="w-full h-auto" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    Tienes derecho a presentar tu versión libre de los hechos. Escribe con respeto y claridad.
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tus Descargos
                    </label>
                    <Textarea 
                      value={defenseText}
                      onChange={(e) => setDefenseText(e.target.value)}
                      placeholder="Escribe tu versión de lo sucedido..."
                      className="min-h-[120px] resize-none dark:text-white"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Firma Digital
                      </label>
                      <Button variant="ghost" size="sm" onClick={handleClearSignature} className="h-6 text-xs text-slate-500">
                        Limpiar firma
                      </Button>
                    </div>
                    
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 overflow-hidden touch-none relative h-[200px]">
                      <SignatureCanvas 
                        ref={sigCanvas}
                        canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                        backgroundColor="transparent"
                        penColor={profile?.role === 'user' ? 'black' : 'black'} 
                      />
                      <div className="absolute inset-x-0 bottom-6 border-b border-slate-300 dark:border-slate-700/50 mx-8 pointer-events-none" />
                      <p className="absolute inset-x-0 bottom-2 text-center text-[10px] text-slate-400 font-medium pointer-events-none tracking-widest uppercase">
                        Firma aquí
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs tracking-widest uppercase h-12 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                  >
                    {isSubmitting ? 'Guardando firmando...' : 'Guardar y firmar'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FormView>
  );
}
