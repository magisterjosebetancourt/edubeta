import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Settings as SettingsIcon, 
  Sun, 
  Globe, 
  Building, 
  Save, 
  Database,
  Loader2,
  CalendarDays,
  Type
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { setTheme, theme } = useTheme()
  const [language, setLanguage] = useState('es')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dbError, setDbError] = useState(false)
  
  const [settingsId, setSettingsId] = useState<number | null>(null)
  
  // Form State
  const [logoUrl, setLogoUrl] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single() // Expecting single row or error if empty

      if (error) {
        // If error is PGRST116 (0 rows), we just initialize defaults.
        // If error is code 42P01 (relation does not exist), we show DB setup.
        if (error.code === 'PGRST116') {
             // No rows, clean state
             setSchoolName('EduBeta School')
             setAcademicYear(new Date().getFullYear().toString())
             setSettingsId(null)
        } else if (error.code === '42P01') { 
             setDbError(true)
             throw error
        } else {
             console.error('Error fetching settings:', error)
        }
      } else if (data) {
        const settings = data as any
        setSettingsId(settings.id)
        setSchoolName(settings.school_name || '')
        setSlogan(settings.slogan || '')
        setAcademicYear(settings.academic_year || '')
        setLogoUrl(settings.logo_url || '')
      }
    } catch (error: any) {
      if (error.code !== '42P01') {
          toast.error('Error cargando configuración', { description: error.message })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      let error;
      
      const payload = {
        school_name: schoolName,
        slogan: slogan,
        academic_year: academicYear,
        logo_url: logoUrl
      }

      if (settingsId) {
          // Update existing
          const { error: updateError } = await (supabase
            .from('settings') as any) // Cast any to avoid typing issues
            .update(payload)
            .eq('id', settingsId)
          error = updateError
      } else {
          // Insert new (let ID auto-generate)
          const { error: insertError, data: insertData } = await (supabase
             .from('settings') as any)
             .insert([payload])
             .select()
             .single()
          
          error = insertError
          if (insertData) setSettingsId(insertData.id)
      }

      if (error) throw error

      toast.success('Configuración guardada correctamente')
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const SQL_SCRIPT = `
-- Crea la tabla de configuración si no existe
create table if not exists settings (
  id bigint primary key generated always as identity,
  school_name text not null default 'EduBeta School',
  slogan text,
  academic_year text default '2025',
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilita RLS
alter table settings enable row level security;

-- Políticas de acceso
create policy "Settings viewable by everyone" on settings for select using (true);
create policy "Settings insertable by auth users" on settings for insert with check (auth.role() = 'authenticated');
create policy "Settings updateable by auth users" on settings for update using (auth.role() = 'authenticated');

-- Inserta configuración por defecto si está vacía
insert into settings (id, school_name, academic_year)
overriding system value
values (1, 'EduBeta School', '2025')
on conflict (id) do nothing;
  `

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

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
                <p className="mb-2">Parece que la tabla <code>settings</code> no existe en tu base de datos Supabase.</p>
                <p className="mb-2 text-xs">Ejecuta este script en el Editor SQL de Supabase para corregirlo:</p>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded-md text-xs overflow-x-auto select-all cursor-pointer">
                    {SQL_SCRIPT}
                </pre>
            </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        
        {/* Institution Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Institución
            </CardTitle>
            <CardDescription>Datos básicos del centro educativo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                      <Label htmlFor="schoolName">Nombre de la Institución</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="schoolName" 
                            className="pl-9"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            placeholder="Ej. Colegio San José" 
                        />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="academicYear">Año Lectivo</Label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="academicYear" 
                            className="pl-9"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="Ej. 2025" 
                        />
                      </div>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="slogan">Lema / Slogan</Label>
                  <div className="relative">
                    <Type className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="slogan" 
                        className="pl-9"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Ej. Comprometidos con la excelencia" 
                    />
                  </div>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL del Logo (Opcional)</Label>
                  <div className="flex gap-4 items-start">
                    <div className="relative flex-1">
                        <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="logoUrl" 
                            className="pl-9"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="https://ejemplo.com/logo.png" 
                        />
                        <p className="text-xs text-slate-400 mt-1">Pega aquí el enlace directo a tu imagen (PNG, JPG).</p>
                    </div>
                    {logoUrl && (
                        <div className="w-12 h-12 shrink-0 border rounded-md p-1 bg-white overflow-hidden flex items-center justify-center">
                            <img src={logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                    )}
                  </div>
              </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
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
                    <Label className="text-base">Modo Oscuro</Label>
                    <p className="text-sm text-slate-500">Alternar entre tema claro y oscuro.</p>
                </div>
                <Switch 
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
             </div>
          </CardContent>
        </Card>
        
        {/* Language Section (Placeholder) */}
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
  )
}
