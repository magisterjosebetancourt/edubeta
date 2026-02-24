import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Switch } from "../../components/ui/switch";
import { 
  Sun, 
  Globe, 
  Save, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const [language, setLanguage] = useState('es');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Configuración guardada correctamente');
    }, 500);
  };


  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-24 lg:pb-6">
      <div className="px-1 mb-8">
        <p className="text-[10px] font-black tracking-widest text-primary mb-1">
          BETASOFT
        </p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Configuración
        </h1>
      </div>
      <div className="px-1 py-4 border-b border-slate-100 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personaliza tu experiencia en la plataforma.
        </p>
      </div>


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
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
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
                className="flex-1 rounded-lg h-11"
              >
                Español
              </Button>
              <Button 
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguage('en')}
                className="flex-1 rounded-lg h-11"
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
            className="w-full md:w-auto px-8 shadow-xl shadow-primary/20 rounded-lg"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}