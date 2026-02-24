import { useState } from "react";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, ArrowUpCircle, Loader2, CheckCircle2 } from "lucide-react";

// Importar el archivo directamente
import exportData from "../../full_export.json";

export default function MigrationPage() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  const addLog = (msg: string) => setProgress(prev => [...prev, msg]);

  const migrate = async () => {
    setIsMigrating(true);
    setProgress(["Iniciando migración..."]);

    try {
      // 1. Migrar Grados
      if (exportData.grades && exportData.grades.length > 0) {
        addLog(`Migrando ${exportData.grades.length} grados...`);
        for (const item of exportData.grades) {
          await setDoc(doc(db, "grades", item.id.toString()), {
            name: item.name,
            state: item.state,
            created_at: item.created_at
          });
        }
        addLog("✅ Grados migrados.");
      }

      // 2. Migrar Materias
      if (exportData.subjects && exportData.subjects.length > 0) {
        addLog(`Migrando ${exportData.subjects.length} materias...`);
        for (const item of exportData.subjects) {
          await setDoc(doc(db, "subjects", item.id.toString()), {
            name: item.name,
            state: item.state,
            created_at: item.created_at
          });
        }
        addLog("✅ Materias migradas.");
      }

      // 3. Migrar Barrios
      if (exportData.neighborhoods && exportData.neighborhoods.length > 0) {
        addLog(`Migrando ${exportData.neighborhoods.length} barrios...`);
        for (const item of exportData.neighborhoods) {
          await setDoc(doc(db, "neighborhoods", item.id.toString()), {
            name: item.name,
            state: item.state,
            created_at: item.created_at
          });
        }
        addLog("✅ Barrios migrados.");
      }

      // 4. Migrar Asignaciones
      if (exportData.assignments && exportData.assignments.length > 0) {
        addLog(`Migrando ${exportData.assignments.length} asignaciones...`);
        for (const item of exportData.assignments) {
          await setDoc(doc(db, "assignments", item.id.toString()), {
            teacher_id: item.teacher_id,
            grade_id: item.grade_id,
            subject_id: item.subject_id,
            state: item.state,
            created_at: item.created_at
          });
        }
        addLog("✅ Asignaciones migradas.");
      }

      // 5. Migrar Periodos Académicos
      if (exportData.academic_periods && exportData.academic_periods.length > 0) {
        addLog(`Migrando ${exportData.academic_periods.length} periodos...`);
        for (const item of exportData.academic_periods) {
          await setDoc(doc(db, "academic_periods", item.id.toString()), {
            period_number: item.period_number,
            start_date: item.start_date,
            end_date: item.end_date,
            created_at: item.created_at
          });
        }
        addLog("✅ Periodos migrados.");
      }

      addLog("🎉 ¡Migración completada con éxito!");
      toast.success("Migración completada");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      toast.error("Error en la migración");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
              <Database className="w-6 h-6" />
            </div>
            <CardTitle>Migrador Supabase → Firebase</CardTitle>
          </div>
          <CardDescription>
            Usa esta herramienta para importar los datos exportados de Supabase a tu nueva base de datos Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-slate-400">Resumen de Datos</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                <span>Grados</span>
                <span className="font-bold">{exportData.grades?.length || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                <span>Materias</span>
                <span className="font-bold">{exportData.subjects?.length || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                <span>Asignaciones</span>
                <span className="font-bold">{exportData.assignments?.length || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                <span>Barrios</span>
                <span className="font-bold">{exportData.neighborhoods?.length || 0}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={migrate} 
            disabled={isMigrating}
            className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-xs gap-3"
          >
            {isMigrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpCircle className="w-5 h-5" />}
            Empezar Migración
          </Button>

          {progress.length > 0 && (
            <div className="bg-black text-green-500 p-4 rounded-xl font-mono text-[10px] h-48 overflow-y-auto space-y-1">
              {progress.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
        No olvides borrar esta página después de la migración.
      </p>
    </div>
  );
}
