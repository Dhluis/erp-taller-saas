'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Moon, 
  Sun,
  Volume2,
  VolumeX
} from 'lucide-react';

interface QuickSettingsProps {
  children: React.ReactNode;
}

export function QuickSettings({ children }: QuickSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Estados de configuración
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleSaveSettings = () => {
    // Aquí implementarías la lógica para guardar las configuraciones
    console.log('Configuraciones guardadas:', {
      notifications,
      emailNotifications,
      darkMode,
      soundEffects,
      autoSave,
      twoFactor
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración Rápida
          </DialogTitle>
          <DialogDescription>
            Ajusta las configuraciones básicas de tu cuenta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notificaciones */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium">Notificaciones</h4>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-sm">
                  Notificaciones en la aplicación
                </Label>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="text-sm">
                  Notificaciones por email
                </Label>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Apariencia */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-500" />
              <h4 className="font-medium">Apariencia</h4>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-sm">
                  Modo oscuro
                </Label>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sonido */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {soundEffects ? (
                <Volume2 className="h-4 w-4 text-green-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-500" />
              )}
              <h4 className="font-medium">Sonido</h4>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-effects" className="text-sm">
                  Efectos de sonido
                </Label>
                <Switch
                  id="sound-effects"
                  checked={soundEffects}
                  onCheckedChange={setSoundEffects}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Seguridad */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <h4 className="font-medium">Seguridad</h4>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="two-factor" className="text-sm">
                  Autenticación de dos factores
                </Label>
                <Switch
                  id="two-factor"
                  checked={twoFactor}
                  onCheckedChange={setTwoFactor}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save" className="text-sm">
                  Guardado automático
                </Label>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveSettings}>
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
