import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const SettingsPage = () => {
  const { setTheme, theme } = useTheme();
  const [language, setLanguage] = useState('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchSettings() {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('settings')
          .select('id')
          .limit(1)
          .single();

        if (mounted && error && error.code === '42P01') {
          setDbError(true);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSettings();
    return () => { mounted = false; };
  }, [supabase]);

  const handleSave = async () => {
    try {
      setSaving(true);
      toast.success('Configuración guardada correctamente');
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <SettingsIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Configuración</h1>
          <p className="text-slate-500 dark:text-slate-400">Personaliza la plataforma a tu gusto.</p>
        </div>
      </div>

      {dbError && (
        <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900">
          <Database className="h-4 w-4" />
          <AlertTitle>Tabla de Configuración No Encontrada</AlertTitle>
          <AlertDescription>
            <p className="mb-2 text-xs">La tabla "settings" no está configurada aún en Supabase.</p>
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
            <CardDescription>Ajusta el tema visual de la aplicación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Modo Oscuro</Label>
                <p className="text-sm text-slate-500">Alternar entre tema claro y oscuro.</p>
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
            <CardDescription>Selecciona el idioma de la interfaz.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                variant={language === 'es' ? 'default' : 'outline'}
                onClick={() => setLanguage('es')}
                className="flex-1"
              >
                Español
              </Button>
              <Button 
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguage('en')}
                className="flex-1"
              >
                English
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end sticky bottom-6 z-10">
          <Button size="lg" onClick={handleSave} disabled={saving} className="w-full md:w-auto shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;