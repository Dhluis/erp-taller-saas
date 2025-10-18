'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Monitor, Smartphone, Tablet, LogOut, Shield } from 'lucide-react';
import { useSecuritySettings } from '@/hooks/use-user-profile';

interface UserSessionsModalProps {
  children: React.ReactNode;
}

export function UserSessionsModal({ children }: UserSessionsModalProps) {
  const { securitySettings, isLoading } = useSecuritySettings();
  const [isOpen, setIsOpen] = useState(false);

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('android')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (device.toLowerCase().includes('ipad') || device.toLowerCase().includes('tablet')) {
      return <Tablet className="h-4 w-4" />;
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Ahora';
    } else if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Hace ${hours} h`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      // Aquí implementarías la lógica para terminar la sesión
      console.log('Terminating session:', sessionId);
      // Simular terminación de sesión
      alert(`Sesión ${sessionId} terminada exitosamente`);
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Error al terminar la sesión');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sesiones Activas
          </DialogTitle>
          <DialogDescription>
            Gestiona las sesiones activas en diferentes dispositivos. Puedes terminar sesiones que no reconozcas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Información general */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Resumen de Seguridad</h4>
                      <p className="text-sm text-muted-foreground">
                        {securitySettings?.activeSessions?.length || 0} sesión(es) activa(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={securitySettings?.twoFactorEnabled ? "default" : "secondary"}>
                        {securitySettings?.twoFactorEnabled ? "2FA Habilitado" : "2FA Deshabilitado"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de sesiones */}
              <div className="space-y-3">
                <h4 className="font-medium">Dispositivos Conectados</h4>
                {securitySettings?.activeSessions?.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h4 className="font-medium mb-2">No hay sesiones activas</h4>
                      <p className="text-sm text-muted-foreground">
                        No se encontraron sesiones activas en otros dispositivos.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  securitySettings?.activeSessions?.map((session, index) => (
                    <Card key={session.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getDeviceIcon(session.device)}
                            <div>
                              <h4 className="font-medium">{session.device}</h4>
                              <p className="text-sm text-muted-foreground">
                                {session.location} • {formatLastActive(session.lastActive)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Sesión Actual
                              </Badge>
                            )}
                            {index > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTerminateSession(session.id)}
                              >
                                <LogOut className="h-3 w-3 mr-1" />
                                Terminar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <Separator />

              {/* Información adicional */}
              <div className="space-y-3">
                <h4 className="font-medium">Recomendaciones de Seguridad</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Shield className="h-4 w-4 mt-0.5 text-blue-500" />
                    <div>
                      <h5 className="text-sm font-medium">Habilita la autenticación de dos factores</h5>
                      <p className="text-xs text-muted-foreground">
                        Añade una capa extra de seguridad a tu cuenta
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <LogOut className="h-4 w-4 mt-0.5 text-orange-500" />
                    <div>
                      <h5 className="text-sm font-medium">Revisa regularmente tus sesiones</h5>
                      <p className="text-xs text-muted-foreground">
                        Termina sesiones en dispositivos que no uses regularmente
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
