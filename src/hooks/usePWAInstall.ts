import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalado/en modo standalone
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    const handler = (e: any) => {
      // Prevenir que el navegador muestre su propio prompt automáticamente
      e.preventDefault();
      // Guardar el evento para dispararlo luego
      setInstallPrompt(e);
      setIsInstallable(true);
      
      // ✅ Disparar notificación Sonner invitando a instalar
      // Solo si no estamos ya en modo standalone y el usuario está en el sitio
      if (!isStandaloneMode) {
        toast('🚀 ¡Instala Eagles ERP!', {
          description: 'Accede más rápido y recibe notificaciones instalando la app.',
          action: {
            label: 'Instalar',
            onClick: () => {
              e.prompt();
            }
          },
          duration: 10000,
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Mostrar el prompt nativo
    installPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    // Limpiar el prompt ya que solo se puede usar una vez
    setInstallPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, isStandalone, handleInstallClick };
}
