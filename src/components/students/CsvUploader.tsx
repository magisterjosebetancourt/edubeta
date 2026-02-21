import { useState } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, FileUp, Loader2, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from '@/components/ui/textarea'

type CsvRow = {
  nombres: string
  apellidos: string
  grado: string
  barrio?: string
}

type Grade = {
  id: number
  name: string
}

type UploadMode = 'csv' | 'text'

export function CsvUploader({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<UploadMode>('csv')
  const [file, setFile] = useState<File | null>(null)
  const [textList, setTextList] = useState('')
  const [preview, setPreview] = useState<CsvRow[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setErrors([])
      parseFile(selectedFile)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setTextList(value)
    if (value.trim()) {
      parseText(value)
    } else {
      setPreview([])
      setErrors([])
    }
  }

  const parseFile = (file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrors(results.errors.map((e: any) => `Fila ${e.row}: ${e.message}`))
          return
        }
        
        const headers = results.meta.fields || []
        const required = ['apellidos', 'nombres', 'grado']
        const missing = required.filter(h => !headers.includes(h))
        
        if (missing.length > 0) {
          setErrors([`Faltan columnas requeridas: ${missing.join(', ')}`])
          return
        }

        setPreview(results.data as CsvRow[])
        validateGrades(results.data as CsvRow[])
      }
    })
  }

  const parseText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '')
    const data: CsvRow[] = []
    const newErrors: string[] = []

    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 3) {
        data.push({
          apellidos: parts[0],
          nombres: parts[1],
          grado: parts[2],
          barrio: parts[3] || ''
        })
      } else if (parts.length > 0) {
        newErrors.push(`Fila ${index + 1}: Formato incorrecto. Debe tener al menos "apellido, nombre, grado"`)
      }
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
      setPreview([])
    } else {
      setErrors([])
      setPreview(data)
      validateGrades(data)
    }
  }

  const validateGrades = async (rows: CsvRow[]) => {
    setValidating(true)
    try {
      const { data: dbGrades, error } = await supabase.from('grades').select('id, name')
      if (error) throw error
      
      const gradeList = (dbGrades as any[]) || []
      setGrades(gradeList)

      const newErrors: string[] = []
      const uniqueCsvGrades = new Set(rows.map((r) => r.grado?.trim()))
      
      uniqueCsvGrades.forEach(csvGradeName => {
        const exists = gradeList.some(g => (g.name || '').toLowerCase() === (csvGradeName || '').toLowerCase())
        if (!exists) {
          newErrors.push(`El grado "${csvGradeName}" no existe en la base de datos.`)
        }
      })

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors])
      }

    } catch (err: any) {
      toast.error('Error validando grados', { description: err.message })
    } finally {
      setValidating(false)
    }
  }

  const handleUpload = async () => {
    if (!preview.length || errors.length > 0) return

    setLoading(true)
    try {
      const studentsToInsert = preview.map(row => {
        const grade = grades.find(g => (g.name || '').toLowerCase() === row.grado.trim().toLowerCase())
        return {
          first_name: row.nombres,
          last_name: row.apellidos,
          neighborhood: row.barrio || null,
          grade_id: grade?.id
        }
      })

      const { error } = await supabase.from('students').insert(studentsToInsert as any)
      if (error) throw error

      toast.success(`${studentsToInsert.length} estudiantes importados correctamente`)
      setFile(null)
      setTextList('')
      setPreview([])
      onSuccess()
    } catch (err: any) {
      toast.error('Error en la importación', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <button
          onClick={() => { setMode('csv'); setPreview([]); setErrors([]); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'csv' 
              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <FileUp className="w-4 h-4" />
          Cargar CSV
        </button>
        <button
          onClick={() => { setMode('text'); setPreview([]); setErrors([]); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'text' 
              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Pegar Lista
        </button>
      </div>

      {mode === 'csv' ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {file ? file.name : 'Arrastra o selecciona un archivo CSV'}
            </p>
            <p className="text-xs text-slate-500">
                Formato: apellidos, nombres, grado, barrio (opcional)
            </p>
          </div>
          <Input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            id="csv-upload"
            onChange={handleFileChange}
          />
          <Label htmlFor="csv-upload">
            <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">Seleccionar Archivo</span>
            </Button>
          </Label>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="text-list">Lista de estudiantes (apellido, nombre, grado, barrio opcional)</Label>
          <Textarea
            id="text-list"
            placeholder="Pérez, Juan, Primero, Centro&#10;López, María, Segundo, Norte"
            className="min-h-[150px] font-mono text-sm"
            value={textList}
            onChange={handleTextChange}
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            * Un estudiante por fila. Formato: apellido, nombre, grado, barrio (opcional).
          </p>
        </div>
      )}

       {validating && (
         <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Validando datos...
         </div>
       )}

       {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en Validacion</AlertTitle>
            <AlertDescription>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                    {errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                    ))}
                    {errors.length > 5 && <li>...y {errors.length - 5} errores más</li>}
                </ul>
            </AlertDescription>
          </Alert>
       )}

       {preview.length > 0 && errors.length === 0 && !validating && (
           <div className="space-y-3">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900 text-green-800 dark:text-green-300">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle>Datos Válidos</AlertTitle>
                <AlertDescription>
                    Se importarán {preview.length} estudiantes.
                </AlertDescription>
              </Alert>
              
              <Button onClick={handleUpload} disabled={loading} className="w-full">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? 'Importando...' : 'Confirmar Importación'}
              </Button>
           </div>
       )}
    </div>
  )
}
