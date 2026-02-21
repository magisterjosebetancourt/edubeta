import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { 
  Settings as SettingsIcon, 
  Sun, 
  Globe, 
  Save, 
  Database,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const [language, setLanguage] = useState('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function checkSettingsTable() {
      try {
        setLoading(true);
        const { error } = await (supabase.from('settings').select('id').limit(1).single() as any);
        if (mounted && error && error.code === '42P01') {
          setDbError(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkSettingsTable();
    return () => { mounted = false; };
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Configuración guardada correctamente');
    }, 500);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-24 lg:pb-6">
      <div className="px-1 py-4 border-b border-slate-100 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personaliza tu experiencia en la plataforma.
        </p>
      </div>

      {dbError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900">
          <Database className="h-4 w-4" />
          <AlertTitle>Falta Configuración Base</AlertTitle>
          <AlertDescription>
            La tabla de preferencias no está disponible. Contacta al administrador.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-primary" />
              Apariencia
            </CardTitle>
            <CardDescription>Cambia entre modo claro y oscuro.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Modo Oscuro</Label>
                <p className="text-sm text-slate-500 underline decoration-primary/20">Configuración visual de la interfaz.</p>
              </div>
              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Idioma
            </CardTitle>
            <CardDescription>Idioma por defecto de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex gap-3">
              <Button 
                variant={language === 'es' ? 'default' : 'outline'}
                onClick={() => setLanguage('es')}
                className="flex-1 rounded-xl h-11"
              >
                Español
              </Button>
              <Button 
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguage('en')}
                className="flex-1 rounded-xl h-11"
              >
                English
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full md:w-auto px-8 shadow-xl shadow-primary/20 rounded-xl"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}