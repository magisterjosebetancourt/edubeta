import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trash2, GraduationCap, Copy, RefreshCw, Mail } from 'lucide-react'
import { Badge } from "@/components/ui/badge"



type Teacher = {
  id: string
  full_name: string | null
  email?: string
  avatar_url?: string | null
}

type Invite = {
    email: string
    token: string
    full_name: string
    created_at: string
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [lastGeneratedToken, setLastGeneratedToken] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchTeachers(), fetchInvites()])
    setLoading(false)
  }

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name', { ascending: true })

      if (error) throw error
      setTeachers(data || [])
    } catch (error: any) {
      console.error('Error fetching teachers:', error)
    }
  }

  const fetchInvites = async () => {
    try {
        const { data, error } = await supabase
            .from('teacher_invites')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) {
            // If table doesn't exist yet (404/42P01), ignore silently or log
            if (error.code !== '42P01') console.error('Error fetching invites:', error)
        } else {
            setInvites(data as Invite[] || [])
        }
    } catch (error) {
        // silent fail
    }
  }

  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    setLastGeneratedToken(null)
    
    const form = e.currentTarget
    const formData = new FormData(form)
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    
    // Generate 5 digit token
    const token = Math.floor(10000 + Math.random() * 90000).toString()

    try {
        const { error } = await supabase
            .from('teacher_invites')
            .insert([{ full_name: fullName, email, token }] as any)

        if (error) throw error

        toast.success('Invitación generada correctamente')
        setLastGeneratedToken(token)
        fetchInvites()
        
        // Reset form safely
        form.reset()
    } catch (error: any) {
        toast.error('Error al generar invitación', { description: error.message })
    } finally {
        setIsCreating(false)
    }
  }

  const handleDeleteInvite = async (email: string) => {
      if (!confirm('¿Borrar esta invitación? El código dejará de funcionar.')) return;

      try {
          const { error } = await supabase
            .from('teacher_invites')
            .delete()
            .eq('email', email)
          
          if (error) throw error
          toast.success('Invitación eliminada')
          setInvites(prev => prev.filter(i => i.email !== email))
      } catch (error: any) {
          toast.error('Error al borrar', { description: error.message })
      }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
      toast.success('Código copiado al portapapeles')
  }

  /* 
    Nota: Borrar un profesor real (auth.users) sigue requiriendo permisos de admin. 
    Por ahora mantenemos solo borrado de perfil o advertencia.
  */
  const handleDeleteTeacher = async (id: string) => {
    if(!confirm('¿Eliminar perfil de profesor? La cuenta de acceso permanecerá (requiere admin DB explícito).')) return;
    try {
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) throw error
        toast.success('Perfil eliminado')
        setTeachers(prev => prev.filter(t => t.id !== id))
    } catch (error: any) {
        toast.error('No se pudo eliminar', { description: error.message })
    }
  }

  if (loading && teachers.length === 0 && invites.length === 0) return <div className="p-8 text-center text-slate-500">Cargando gestión docente...</div>

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Cuerpo Docente</h1>
           <p className="text-gray-500 underline decoration-dotted decoration-1 underline-offset-4">Sistema de Invitaciones y Gestión.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Formulario de Invitación (Izquierda) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 h-fit space-y-6">
            <Card className="border-l-4 border-l-primary shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Generar Invitación
                    </CardTitle>
                    <CardDescription>Crea un código de acceso para un nuevo docente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nombre Completo</Label>
                        <Input id="fullName" name="fullName" placeholder="Ej. Roberto Gómez" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Institucional</Label>
                        <Input id="email" name="email" type="email" placeholder="profe@edubeta.com" required />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isCreating}>
                        {isCreating ? 'Generando...' : 'Generar Código PIN'}
                    </Button>
                    </form>

                    {lastGeneratedToken && (
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center animate-in fade-in zoom-in duration-300">
                            <p className="text-sm text-green-800 dark:text-green-300 mb-1 font-medium">¡Invitación Creada!</p>
                            <div className="text-3xl font-mono font-bold tracking-widest text-slate-900 dark:text-white my-2">
                                {lastGeneratedToken}
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-2 border-green-200 hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900/40"
                                onClick={() => copyToClipboard(lastGeneratedToken)}
                            >
                                <Copy className="w-3 h-3 mr-2" /> Copiar Código
                            </Button>
                            <p className="text-xs text-slate-500 mt-2">Comparte este código y el correo con el docente.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lista de Invitaciones Pendientes */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-600 dark:text-slate-300">
                        Invitaciones Pendientes ({invites.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0 max-h-[300px] overflow-y-auto">
                    {invites.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-4">No hay invitaciones activas.</p>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {invites.map((invite) => (
                                <div key={invite.email} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between group">
                                    <div className="min-w-0 flex-1 pr-3">
                                        <p className="font-medium text-sm truncate text-slate-800 dark:text-slate-200">{invite.full_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{invite.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono font-bold text-slate-600 dark:text-slate-400 select-all">
                                            {invite.token}
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteInvite(invite.email)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Lista de Profesores Activos (Derecha) */}
        <div className="lg:col-span-8">
            <Card className="h-full border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Docentes Registrados</CardTitle>
                        <CardDescription>Usuarios activos con rol de profesor.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {teachers.length === 0 ? (
                             <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                                <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                                <p className="text-slate-500">No hay docentes registrados aún.</p>
                                <p className="text-sm text-slate-400">Genera una invitación para comenzar.</p>
                             </div>
                        ) : (
                            teachers.map((teacher) => (
                                <div key={teacher.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <GraduationCap className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{teacher.full_name || 'Sin Nombre'}</h3>
                                        <p className="text-sm text-slate-500 truncate">{teacher.email || 'Email no disponible'}</p>
                                        <Badge variant="secondary" className="mt-1 text-xs">Docente</Badge>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-slate-400 hover:text-red-500"
                                        onClick={() => handleDeleteTeacher(teacher.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
