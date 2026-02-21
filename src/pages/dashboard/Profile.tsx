import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Mail, Shield, Save, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      if (user) {
        setUser(user)
        setEmail(user.email || '')
        
        // Fetch profile details if table exists
        const { data: profileData, error: profileError } = await (supabase
            .from('profiles') as any)
            .select('*')
            .eq('id', user.id)
            .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
             console.error('Error fetching profile details:', profileError)
        }

        if (profileData) {
            setProfile(profileData)
            setFullName(profileData.full_name || '')
            setAvatarUrl(profileData.avatar_url || '')
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen para subir.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}-${Math.random()}.${fileExt}`

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      
      // 3. Auto-save profile with new avatar
      await updateUserProfile({ avatar_url: publicUrl })

      toast.success('Avatar actualizado')
    } catch (error: any) {
      toast.error('Error subiendo imagen', { description: error.message })
    } finally {
      setUploading(false)
    }
  }

  const updateUserProfile = async (updates: any) => {
      const { error } = await (supabase
        .from('profiles') as any)
        .upsert({
            id: user.id,
            full_name: fullName,
            email: email,
            updated_at: new Date().toISOString(),
            ...updates
        })
      if (error) throw error
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateUserProfile({ full_name: fullName }) // Avatar is already saved on upload
      toast.success('Perfil actualizado correctamente')
    } catch (error: any) {
      toast.error('Error al guardar perfil', { description: error.message })
    } finally {
      setSaving(false)
    }
  }


  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto h-full overflow-y-auto pb-24">
      <div className="flex items-center gap-3 mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
             <User className="w-8 h-8 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Mi Perfil</h1>
            <p className="text-slate-500 dark:text-slate-400">Gestiona tu información personal.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Foto de Perfil</CardTitle>
                <CardDescription>Esta imagen será visible para tus estudiantes y colegas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-slate-300" />
                        )}
                        
                        {/* Overlay Loading State */}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 w-full space-y-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm">
                             Cambiar Foto
                        </div>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleUploadAvatar}
                            disabled={uploading}
                            className="hidden" 
                        />
                    </Label>
                    <p className="text-xs text-slate-500">
                        Sube una imagen JPG o PNG. Máximo 2MB.
                    </p>
                    
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle className="text-lg">Información de Cuenta</CardTitle>
            <CardDescription>Datos asociados a tu incio de sesión.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="email" 
                            value={email} 
                            disabled 
                            className="pl-9 bg-slate-50 dark:bg-slate-900/50" 
                        />
                    </div>
                    <p className="text-xs text-slate-400">El correo no se puede cambiar directamente.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="role">Rol de Usuario</Label>
                    <div className="relative">
                        <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="role" 
                            value={profile?.role === 'admin' ? 'Administrador' : 'Profesor'} 
                            disabled 
                            className="pl-9 bg-slate-50 dark:bg-slate-900/50 capitalize" 
                        />
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle className="text-lg">Datos Personales</CardTitle>
            <CardDescription>Información visible para otros usuarios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="fullName" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-9"
                            placeholder="Ej. GÓMEZ, Roberto"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
