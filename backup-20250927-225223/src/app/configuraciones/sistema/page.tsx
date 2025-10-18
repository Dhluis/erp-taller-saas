"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Globe, 
  Mail, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

export default function ConfiguracionesSistemaPage() {
  const [settings, setSettings] = useState({
    // Configuración general
    systemName: "EAGLES ERP",
    systemVersion: "1.0.0",
    timezone: "America/Mexico_City",
    language: "es",
    
    // Configuración de base de datos
    dbBackupEnabled: true,
    dbBackupFrequency: "daily",
    dbRetentionDays: 30,
    
    // Configuración de seguridad
    sessionTimeout: 30,
    passwordPolicy: "strong",
    twoFactorAuth: false,
    ipWhitelist: "",
    
    // Configuración de notificaciones
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notificationEmail: "admin@eagles.com",
    
    // Configuración de integración
    apiEnabled: true,
    webhookUrl: "",
    externalIntegrations: false,
    
    // Configuración de mantenimiento
    maintenanceMode: false,
    debugMode: false,
    logLevel: "info"
  })

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setLastSaved(new Date())
  }

  const handleReset = () => {
    // Resetear a valores por defecto
    setSettings({
      systemName: "EAGLES ERP",
      systemVersion: "1.0.0",
      timezone: "America/Mexico_City",
      language: "es",
      dbBackupEnabled: true,
      dbBackupFrequency: "daily",
      dbRetentionDays: 30,
      sessionTimeout: 30,
      passwordPolicy: "strong",
      twoFactorAuth: false,
      ipWhitelist: "",
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      notificationEmail: "admin@eagles.com",
      apiEnabled: true,
      webhookUrl: "",
      externalIntegrations: false,
      maintenanceMode: false,
      debugMode: false,
      logLevel: "info"
    })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
          <p className="text-muted-foreground">Gestiona la configuración general del sistema</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {lastSaved && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Última actualización: {lastSaved.toLocaleString()}
        </div>
      )}

      <div className="grid gap-6">
        {/* Configuración General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systemName">Nombre del Sistema</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemVersion">Versión</Label>
                <Input
                  id="systemVersion"
                  value={settings.systemVersion}
                  onChange={(e) => setSettings({...settings, systemVersion: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona Horaria</Label>
                <Select value={settings.timezone} onValueChange={(value) => setSettings({...settings, timezone: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                    <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                    <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                    <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Select value={settings.language} onValueChange={(value) => setSettings({...settings, language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Base de Datos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Respaldo Automático</Label>
                <p className="text-sm text-muted-foreground">Habilitar respaldos automáticos de la base de datos</p>
              </div>
              <Switch
                checked={settings.dbBackupEnabled}
                onCheckedChange={(checked) => setSettings({...settings, dbBackupEnabled: checked})}
              />
            </div>
            
            {settings.dbBackupEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Frecuencia de Respaldo</Label>
                  <Select value={settings.dbBackupFrequency} onValueChange={(value) => setSettings({...settings, dbBackupFrequency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retentionDays">Días de Retención</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    value={settings.dbRetentionDays}
                    onChange={(e) => setSettings({...settings, dbRetentionDays: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuración de Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout de Sesión (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordPolicy">Política de Contraseñas</Label>
                <Select value={settings.passwordPolicy} onValueChange={(value) => setSettings({...settings, passwordPolicy: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básica</SelectItem>
                    <SelectItem value="strong">Fuerte</SelectItem>
                    <SelectItem value="enterprise">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticación de Dos Factores</Label>
                <p className="text-sm text-muted-foreground">Requerir 2FA para todos los usuarios</p>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ipWhitelist">Lista Blanca de IPs</Label>
              <Textarea
                id="ipWhitelist"
                placeholder="192.168.1.1, 10.0.0.1"
                value={settings.ipWhitelist}
                onChange={(e) => setSettings({...settings, ipWhitelist: e.target.value})}
              />
              <p className="text-sm text-muted-foreground">Separar múltiples IPs con comas</p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificaciones por correo electrónico</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones SMS</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificaciones por SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones Push</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificaciones push al navegador</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, pushNotifications: checked})}
                />
              </div>
            </div>
            
            {settings.emailNotifications && (
              <div className="space-y-2">
                <Label htmlFor="notificationEmail">Email de Notificaciones</Label>
                <Input
                  id="notificationEmail"
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => setSettings({...settings, notificationEmail: e.target.value})}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuración de Mantenimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Mantenimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo de Mantenimiento</Label>
                <p className="text-sm text-muted-foreground">Activar modo de mantenimiento (bloquea el acceso)</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Debug</Label>
                <p className="text-sm text-muted-foreground">Habilitar logs detallados para desarrollo</p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => setSettings({...settings, debugMode: checked})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logLevel">Nivel de Log</Label>
              <Select value={settings.logLevel} onValueChange={(value) => setSettings({...settings, logLevel: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Solo Errores</SelectItem>
                  <SelectItem value="warn">Advertencias</SelectItem>
                  <SelectItem value="info">Información</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
