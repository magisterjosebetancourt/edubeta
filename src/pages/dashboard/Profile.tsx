import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import { getUserProfile, saveUserProfile } from '@/lib/firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Mail, Shield, Save, Loader2, Image as ImageIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { useUserProfile } from '@/lib/context/UserProfileContext'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const { refreshProfile } = useUserProfile()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const currentUser = auth.currentUser
      
      if (currentUser) {
        setUser(currentUser)
        setEmail(currentUser.email || '')
        
        const profileData = await getUserProfile(currentUser.uid)
        
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
      if (file.size > 1024 * 1024) { // 1MB limit for Base64 efficiency
        throw new Error('La imagen es demasiado grande (Máximo 1MB para optimización).')
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        setAvatarUrl(base64String)
        
        // Auto-save profile with new avatar (Base64)
        await updateUserProfile({ avatar_url: base64String })
        setProfile((prev: any) => ({ ...prev, avatar_url: base64String }))
        await refreshProfile()
        toast.success('Avatar actualizado (Base64)')
        setUploading(false)
      }
      reader.readAsDataURL(file)
      return; // handleUploadAvatar logic continues in reader.onloadend
    } catch (error: any) {
      toast.error('Error subiendo imagen', { description: error.message })
    } finally {
      setUploading(false)
    }
  }

  const updateUserProfile = async (updates: any) => {
      await saveUserProfile(user.uid, {
          full_name: fullName,
          email: email,
          ...updates
      })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateUserProfile({ full_name: fullName }) // Avatar is already saved on upload
      await refreshProfile()
      toast.success('Perfil actualizado correctamente')
    } catch (error: any) {
      toast.error('Error al guardar perfil', { description: error.message })
    } finally {
      setSaving(false)
    }
  }


  if (loading) return <LoadingSpinner message="Cargando perfil..." />;

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto h-full overflow-y-auto pb-24">
      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Foto de Perfil</CardTitle>
                <CardDescription>Esta imagen será visible para tus estudiantes y colegas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative group mx-auto md:mx-0">
                    <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-[1.02] duration-300">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-12 h-12 text-slate-300" />
                        )}
                        
                        {/* Overlay Loading State */}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 w-full space-y-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-xs font-semibold tracking-widest text-slate-700 dark:text-slate-200 shadow-sm gap-2 h-auto py-3.5 px-6">
                             <ImageIcon className="w-4 h-4" />
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
                        Sube una imagen JPG o PNG. Máximo 1MB.
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
                            className="pl-9 w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] text-sm outline-none focus:ring-2 focus:ring-primary/50 opacity-70" 
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
                            value={
                                profile?.role === 'admin' ? 'Administrador' : 
                                profile?.role === 'coordinator' ? 'Coordinador' : 
                                'Docente'
                            } 
                            disabled 
                            className="pl-9 w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] text-sm outline-none focus:ring-2 focus:ring-primary/50 opacity-70 capitalize" 
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
                            className="pl-9 w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Ej. GÓMEZ, Roberto"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-20 lg:bottom-8 left-0 right-0 z-50 px-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  )
}
