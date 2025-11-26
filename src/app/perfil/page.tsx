'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle,
  AlertCircle,
  Camera
} from 'lucide-react';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { useUserProfile, useSecuritySettings } from '@/hooks/use-user-profile';
import { UserSessionsModal } from '@/components/user-sessions-modal';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function PerfilPage() {
  const { 
    profile, 
    isLoading, 
    isSaving, 
    error, 
    updateProfile, 
    changePassword, 
    uploadAvatar, 
    getInitials 
  } = useUserProfile();
  
  const { securitySettings } = useSecuritySettings();

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mostrar mensajes de error del hook
  useEffect(() => {
    if (error) {
      setMessage({ type: 'error', text: error });
    }
  }, [error]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    try {
      setMessage(null);

      // Validaciones básicas
      if (!profile.full_name.trim()) {
        setMessage({ type: 'error', text: 'El nombre completo es requerido' });
        return;
      }

      if (!profile.email.trim()) {
        setMessage({ type: 'error', text: 'El email es requerido' });
        return;
      }

      // Actualizar perfil usando el hook
      await updateProfile({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address
      });

      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Error al actualizar el perfil' });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setMessage(null);

      // Validaciones de contraseña
      if (!passwordData.currentPassword) {
        setMessage({ type: 'error', text: 'La contraseña actual es requerida' });
        return;
      }

      if (!passwordData.newPassword) {
        setMessage({ type: 'error', text: 'La nueva contraseña es requerida' });
        return;
      }

      if (passwordData.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres' });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
        return;
      }

      // Cambiar contraseña usando el hook
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Error al cambiar la contraseña' });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setMessage(null);
      await uploadAvatar(file);
      setMessage({ type: 'success', text: 'Avatar actualizado exitosamente' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Error al subir el avatar' });
    }
  };

  if (isLoading || !profile) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando perfil...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <StandardBreadcrumbs 
          currentPage="Perfil"
          parentPages={[]}
        />

        {/* Page Header */}
        <PageHeader
          title="Mi Perfil"
          description="Gestiona tu información personal y configuración de cuenta"
        />

        {/* Mensaje de estado */}
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs para diferentes secciones */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Información Personal</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
          </TabsList>

          {/* Tab de Información Personal */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Avatar y información básica */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Foto de Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                      <AvatarFallback className="text-lg">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Cambiar Foto
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Organización</Label>
                      <p className="text-sm">{profile.organization_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Rol</Label>
                      <p className="text-sm">{profile.role}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Miembro desde</Label>
                      <p className="text-sm">{new Date(profile.created_at).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formulario de edición */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre Completo *</Label>
                        <Input
                          id="full_name"
                          value={profile.full_name}
                          onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Ingresa tu nombre completo"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={profile.phone || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                          id="address"
                          value={profile.address || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Calle, Ciudad, País"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab de Seguridad */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual *</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Ingresa tu contraseña actual"
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña *</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Ingresa tu nueva contraseña"
                        autoComplete="new-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      La contraseña debe tener al menos 8 caracteres
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirma tu nueva contraseña"
                        autoComplete="new-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      <Lock className="h-4 w-4 mr-2" />
                      {isSaving ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Información de seguridad adicional */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Seguridad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Autenticación de dos factores</h4>
                    <p className="text-sm text-muted-foreground">
                      {securitySettings?.twoFactorEnabled 
                        ? 'Autenticación de dos factores habilitada'
                        : 'Añade una capa extra de seguridad a tu cuenta'
                      }
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {securitySettings?.twoFactorEnabled ? 'Deshabilitar' : 'Configurar'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Sesiones activas</h4>
                    <p className="text-sm text-muted-foreground">
                      {securitySettings?.activeSessions?.length || 0} sesión(es) activa(s)
                    </p>
                  </div>
                  <UserSessionsModal>
                    <Button variant="outline" size="sm">
                      Ver sesiones ({securitySettings?.activeSessions?.length || 0})
                    </Button>
                  </UserSessionsModal>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
