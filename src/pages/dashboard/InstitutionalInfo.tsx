import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building, 
  Calendar, 
  Save, 
  Loader2, 
  Type, 
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { differenceInWeeks, parseISO } from 'date-fns'

type Period = {
  id?: number
  period_number: number
  start_date: string
  end_date: string
}

export default function InstitutionalInfo() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const supabase = createClient()

  // Info Institucional
  const [settingsId, setSettingsId] = useState<number | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())
  const [logoUrl, setLogoUrl] = useState('')

  // Periodos
  const [periods, setPeriods] = useState<Period[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [settingsRes, periodsRes] = await Promise.all([
        supabase.from('settings').select('*').limit(1).single() as any,
        supabase.from('academic_periods').select('*').order('period_number', { ascending: true }) as any
      ])

      if (settingsRes.data) {
        const s = settingsRes.data
        setSettingsId(s.id)
        setSchoolName(s.school_name || '')
        setSlogan(s.slogan || '')
        setAcademicYear(s.academic_year || '')
        setLogoUrl(s.logo_url || '')
      }

      if (periodsRes.data && periodsRes.data.length > 0) {
        setPeriods(periodsRes.data)
      } else {
        // Default periods if none exist
        const defaultPeriods = Array.from({ length: 4 }, (_, i) => ({
          period_number: i + 1,
          start_date: '',
          end_date: ''
        }))
        setPeriods(defaultPeriods)
      }
    } catch (error: any) {
      console.error('Error loading institutional data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = (index: number, field: 'start_date' | 'end_date', value: string) => {
    const newPeriods = [...periods]
    newPeriods[index] = { ...newPeriods[index], [field]: value }
    setPeriods(newPeriods)
  }

  const calculateWeeks = (start: string, end: string) => {
    if (!start || !end) return 0
    try {
      const d1 = parseISO(start)
      const d2 = parseISO(end)
      return Math.max(0, differenceInWeeks(d2, d1))
    } catch {
      return 0
    }
  }

  const totalWeeks = periods.reduce((acc, p) => acc + calculateWeeks(p.start_date, p.end_date), 0)

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // 1. Save Settings
      const settingsPayload = {
        school_name: schoolName,
        slogan: slogan,
        academic_year: academicYear,
        logo_url: logoUrl
      }

      if (settingsId) {
        await (supabase.from('settings') as any).update(settingsPayload).eq('id', settingsId)
      } else {
        await (supabase.from('settings') as any).insert([settingsPayload])
      }

      // 2. Save Periods (simplified: delete and re-insert for now or upsert)
      // For more robustness, we use upsert if they have IDs
      const { error: pError } = await (supabase.from('academic_periods') as any).upsert(
        periods.map(p => ({
          ...(p.id ? { id: p.id } : {}),
          period_number: p.period_number,
          start_date: p.start_date,
          end_date: p.end_date
        }))
      )

      if (pError) throw pError

      toast.success('Información institucional guardada')
      fetchData()
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 p-6 pb-24 lg:pb-6 max-w-5xl mx-auto h-full overflow-y-auto">

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <Type className="w-4 h-4" /> Identidad
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Básica</CardTitle>
              <CardDescription>Datos que identifican al establecimiento educativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Nombre del Colegio / Institución</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="schoolName" 
                      className="pl-9"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Ej. Institución Educativa Distrital..." 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicYear">Año Lectivo Actual</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="academicYear" 
                      className="pl-9"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="Ej. 2026" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slogan">Lema o Slogan Institucional</Label>
                <div className="relative">
                  <Type className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="slogan" 
                    className="pl-9"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ej. Hacia la excelencia integral" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo (URL de imagen)</Label>
                <div className="flex gap-4 items-start">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="logoUrl" 
                      className="pl-9"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://servidor.com/logo.png" 
                    />
                  </div>
                  {logoUrl && (
                    <div className="w-16 h-16 border rounded-lg bg-white p-2 flex items-center justify-center overflow-hidden">
                      <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Periodos Académicos
                </CardTitle>
                <CardDescription>Define las fechas de inicio y fin para cada periodo del año.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {periods.map((period, index) => (
                  <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary uppercase tracking-wider">Periodo {period.period_number}</span>
                      <span className="text-xs font-medium text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border">
                        {calculateWeeks(period.start_date, period.end_date)} semanas
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fecha de Inicio</Label>
                        <Input 
                          type="date" 
                          value={period.start_date}
                          onChange={(e) => handlePeriodChange(index, 'start_date', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fecha de Finalización</Label>
                        <Input 
                          type="date" 
                          value={period.end_date}
                          onChange={(e) => handlePeriodChange(index, 'end_date', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">Resumen Anual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 shadow-sm">
                    <p className="text-sm text-slate-500 uppercase tracking-tighter mb-1">Total Semanas</p>
                    <p className="text-5xl font-black text-primary">{totalWeeks}</p>
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      {totalWeeks >= 40 ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> CUMPLE LEY 115
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          META: 40 SEMANAS
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    "Los establecimientos educativos incorporarán en el Proyecto Educativo Institucional (PEI) la organización de las actividades escolares... que garanticen cuarenta (40) semanas lectivas."
                    <br />
                    <span className="font-bold not-italic font-mono mt-2 block">— Decreto 1075 de 2015</span>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
