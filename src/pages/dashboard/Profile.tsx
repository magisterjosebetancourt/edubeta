import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import { getUserProfile, saveUserProfile } from '@/lib/firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { EduButton } from '@/components/ui/EduButton'
import { EduInput } from '@/components/ui/EduInput'
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
                        <EduButton 
                             onClick={() => document.getElementById('avatar-upload')?.click()}
                             variant="secondary"
                             icon={ImageIcon}
                             className="h-12 px-6 w-full md:w-auto text-[11px] font-semibold tracking-widest"
                        >
                             Cambiar Foto
                        </EduButton>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleUploadAvatar}
                            disabled={uploading}
                            className="hidden" 
                        />
                    
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
                        <EduInput 
                            id="email" 
                            value={email} 
                            disabled 
                            icon={Mail}
                        />
                    </div>
                    <p className="text-xs text-slate-400">El correo no se puede cambiar directamente.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="role">Rol de Usuario</Label>
                    <div className="relative">
                        <EduInput 
                            id="role" 
                            value={
                                profile?.role === 'admin' ? 'Administrador' : 
                                profile?.role === 'coordinator' ? 'Coordinador' : 
                                'Docente'
                            } 
                            disabled 
                            icon={Shield}
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
                        <EduInput 
                            id="fullName" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ej. GÓMEZ, Roberto"
                            icon={User}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-20 lg:bottom-8 left-0 right-0 z-50 px-6">
        <div className="max-w-2xl mx-auto">
          <EduButton 
            onClick={handleSave} 
            disabled={saving}
            icon={saving ? Loader2 : Save}
            distributed
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </EduButton>
        </div>
      </div>
    </div>
  )
}
