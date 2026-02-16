'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization, useSession } from '@/lib/context/SessionContext';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  Car,
  Clipboard,
  Wrench,
  DollarSign,
  FileSignature,
  ArrowLeft,
  ArrowRight,
  Check,
  Droplet,
  Fuel,
  FileText,
  Upload,
  X,
  CheckCircle2,
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { OrderCreationImageCapture, TemporaryImage } from './OrderCreationImageCapture';
import { sanitize } from '@/lib/utils/input-sanitizers';
import type { WorkOrder } from '@/types/orders';

const STEP_ICONS = [User, Clipboard, DollarSign, FileSignature];
const STEP_COLORS = [
  { active: 'bg-cyan-500 ring-cyan-400 text-white', label: 'text-cyan-400', pending: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' },
  { active: 'bg-amber-500 ring-amber-400 text-white', label: 'text-amber-400', pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/50' },
  { active: 'bg-emerald-500 ring-emerald-400 text-white', label: 'text-emerald-400', pending: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' },
  { active: 'bg-violet-500 ring-violet-400 text-white', label: 'text-violet-400', pending: 'bg-violet-500/20 text-violet-400 border border-violet-500/50' },
];

function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  const labels = ['Cliente y Vehículo', 'Inspección', 'Servicios y Costos', 'Términos y Firma'];
  return (
    <div className="flex items-center justify-between gap-2 py-3 px-4 bg-slate-900/90 rounded-lg border border-slate-600 mb-4">
      {[1, 2, 3, 4].map((step) => {
        const Icon = STEP_ICONS[step - 1];
        const colors = STEP_COLORS[step - 1];
        const isActive = currentStep === step;
        const isCompleted = completedSteps.includes(step);
        const circleClass = isActive
          ? `${colors.active} ring-2 ring-offset-2 ring-offset-slate-900`
          : isCompleted
            ? 'bg-green-500 text-white border-2 border-green-400'
            : colors.pending;
        return (
          <div key={step} className={`flex items-center gap-2 flex-1 min-w-0 ${step < 4 ? 'border-r border-slate-600 pr-2' : ''}`}>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${circleClass}`}>
              {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 hidden sm:block">
              <span className={`text-xs font-medium block truncate ${isActive ? colors.label : isCompleted ? 'text-green-400' : 'text-slate-400'}`}>
                {labels[step - 1]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface EditWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkOrder | null;
  onSuccess?: () => void;
}

type OrderImage = { path: string; url: string; uploadedAt?: string };
type FullOrder = WorkOrder & {
  vehicle?: { id: string; brand: string; model: string; year: number | null; license_plate: string | null; color: string | null; vin: string | null; mileage: number | null };
  inspection?: {
    fluids_check?: Record<string, boolean>;
    fuel_level?: string;
    valuable_items?: string;
    entry_reason?: string;
    procedures?: string;
    will_diagnose?: boolean;
    is_warranty?: boolean;
    authorize_test_drive?: boolean;
  };
  images?: OrderImage[];
  terms_type?: string;
  terms_text?: string | null;
  terms_file_url?: string | null;
  terms_accepted?: boolean;
  customer_signature?: string | null;
};

const DEFAULT_FLUIDS = {
  aceite_motor: false,
  aceite_transmision: false,
  liquido_frenos: false,
  liquido_embrague: false,
  refrigerante: false,
  aceite_hidraulico: false,
  limpia_parabrisas: false,
};

export function EditWorkOrderModal({ open, onOpenChange, order, onSuccess }: EditWorkOrderModalProps) {
  const { user, profile } = useAuth();
  const { organizationId: contextOrgId, workshopId: sessionWorkshopId, hasMultipleWorkshops } = useSession();
  const organizationId = contextOrgId ?? (profile?.organization_id as string | undefined);
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [fullOrder, setFullOrder] = useState<FullOrder | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state (vehículo editable)
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleMileage, setVehicleMileage] = useState('');

  const [description, setDescription] = useState('');
  const [estimated_cost, setEstimated_cost] = useState('');
  const [assigned_to, setAssigned_to] = useState('');

  const [fluids, setFluids] = useState(DEFAULT_FLUIDS);
  const [fuel_level, setFuel_level] = useState('half');
  const [valuable_items, setValuable_items] = useState('');
  const [entry_reason, setEntry_reason] = useState('');
  const [procedures, setProcedures] = useState('');
  const [will_diagnose, setWill_diagnose] = useState(false);
  const [is_warranty, setIs_warranty] = useState(false);
  const [authorize_test_drive, setAuthorize_test_drive] = useState(false);

  const [terms_type, setTerms_type] = useState<'text' | 'file'>('text');
  const [terms_text, setTerms_text] = useState('');
  const [terms_file, setTerms_file] = useState<File | null>(null);
  const [terms_accepted, setTerms_accepted] = useState(false);
  const [customer_signature, setCustomer_signature] = useState('');

  const [employees, setEmployees] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [temporaryImages, setTemporaryImages] = useState<TemporaryImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  const signatureRef = useRef<SignatureCanvas>(null);
  const signatureContainerRef = useRef<HTMLDivElement>(null);
  const SIGNATURE_HEIGHT = typeof window !== 'undefined' && window.innerWidth < 640 ? 220 : 180;

  const loadFullOrder = useCallback(async (orderId: string) => {
    setLoadingOrder(true);
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar orden');
      const data = json.data;
      setFullOrder(data);
      const v = data.vehicle;
      setVehicleBrand(v?.brand || '');
      setVehicleModel(v?.model || '');
      setVehicleYear(v?.year != null ? String(v.year) : '');
      setVehiclePlate(v?.license_plate || '');
      setVehicleColor(v?.color || '');
      setVehicleVin((v as any)?.vin || '');
      setVehicleMileage(v?.mileage != null ? String(v.mileage) : '');
      setDescription(data.description || '');
      setEstimated_cost(data.estimated_cost != null ? String(data.estimated_cost) : '');
      setAssigned_to((data as any).assigned_to || '');
      const insp = data.inspection;
      if (insp?.fluids_check && typeof insp.fluids_check === 'object') {
        setFluids({ ...DEFAULT_FLUIDS, ...insp.fluids_check });
      }
      setFuel_level(insp?.fuel_level || 'half');
      setValuable_items(insp?.valuable_items || '');
      setEntry_reason(insp?.entry_reason || '');
      setProcedures(insp?.procedures || '');
      setWill_diagnose(!!insp?.will_diagnose);
      setIs_warranty(!!insp?.is_warranty);
      setAuthorize_test_drive(!!insp?.authorize_test_drive);
      setTerms_type((data as any).terms_type === 'file' ? 'file' : 'text');
      setTerms_text((data as any).terms_text || '');
      setTerms_accepted(!!(data as any).terms_accepted);
      setCustomer_signature((data as any).customer_signature || '');
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar la orden');
      onOpenChange(false);
    } finally {
      setLoadingOrder(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open && order?.id) {
      loadFullOrder(order.id);
      setCurrentStep(1);
      setCompletedSteps([]);
      setErrors({});
      setTemporaryImages([]);
      setImagesToDelete([]);
    }
  }, [open, order?.id, loadFullOrder]);

  const loadEmployees = useCallback(async () => {
    if (!organizationId) return;
    setLoadingEmployees(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: mechanics, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, workshop_id')
        .eq('organization_id', organizationId)
        .in('role', ['MECANICO', 'ASESOR'])
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      let list = (mechanics || []).map((m: any) => ({
        id: m.id,
        name: m.full_name || m.email || 'Sin nombre',
        role: m.role || 'MECANICO',
      }));
      if (sessionWorkshopId && hasMultipleWorkshops) {
        list = (mechanics || []).filter((m: any) => m.workshop_id === sessionWorkshopId || m.workshop_id == null).map((m: any) => ({
          id: m.id,
          name: m.full_name || m.email || 'Sin nombre',
          role: m.role || 'MECANICO',
        }));
      }
      setEmployees(list);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [organizationId, sessionWorkshopId, hasMultipleWorkshops, supabase]);

  useEffect(() => {
    if (open && organizationId) loadEmployees();
  }, [open, organizationId, loadEmployees]);

  useEffect(() => {
    const adjustCanvas = () => {
      if (!signatureContainerRef.current || !signatureRef.current) return;
      const container = signatureContainerRef.current;
      const canvas = signatureRef.current.getCanvas();
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = SIGNATURE_HEIGHT;
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    const t = setTimeout(adjustCanvas, 150);
    window.addEventListener('resize', adjustCanvas);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', adjustCanvas);
    };
  }, []);

  useEffect(() => {
    if (!open || currentStep !== 4) return;
    const timer = setTimeout(() => {
      if (signatureContainerRef.current && signatureRef.current) {
        const container = signatureContainerRef.current;
        const canvas = signatureRef.current.getCanvas();
        const rect = container.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = SIGNATURE_HEIGHT;
        const dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, currentStep]);

  const handleSaveSignature = () => {
    if (signatureRef.current) {
      setCustomer_signature(signatureRef.current.toDataURL());
      toast.success('Firma guardada');
    }
  };
  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setCustomer_signature('');
    }
  };

  const existingImages = (fullOrder?.images || []) as OrderImage[];
  const displayImages = existingImages.filter((img) => !imagesToDelete.includes(img.path));

  const handleRemoveExistingImage = (path: string) => {
    setImagesToDelete((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      if (!completedSteps.includes(currentStep)) setCompletedSteps((p) => [...p, currentStep]);
      setCurrentStep((p) => p + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullOrder?.id || !organizationId || !user || !profile) {
      toast.error('Datos incompletos');
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'La descripción es requerida';
    if (terms_type === 'text' && !terms_text.trim()) newErrors.terms_text = 'Los términos son requeridos';
    if (terms_type === 'file' && !terms_file && !(fullOrder as any).terms_file_url) newErrors.terms_file = 'Sube un PDF o conserva el actual';
    if (!terms_accepted) newErrors.terms_accepted = 'El cliente debe aceptar los términos';
    if (!customer_signature) newErrors.customer_signature = 'La firma es requerida';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Corrige los campos indicados');
      return;
    }

    setLoading(true);
    try {
      const vehicleId = fullOrder.vehicle_id;
      const workshopId = sessionWorkshopId || profile?.workshop_id || null;

      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          brand: vehicleBrand.trim(),
          model: vehicleModel.trim(),
          year: vehicleYear ? parseInt(vehicleYear, 10) : null,
          license_plate: vehiclePlate.trim().toUpperCase(),
          color: vehicleColor.trim() || null,
          vin: vehicleVin.trim().toUpperCase() || null,
          mileage: vehicleMileage ? parseInt(vehicleMileage, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicleId)
        .eq('organization_id', organizationId);

      if (vehicleError) throw new Error(vehicleError.message);

      const inspectionPayload = {
        order_id: fullOrder.id,
        organization_id: organizationId,
        ...(workshopId && { workshop_id: workshopId }),
        fluids_check: fluids,
        fuel_level,
        valuable_items: valuable_items || null,
        will_diagnose: will_diagnose,
        entry_reason: entry_reason || null,
        procedures: procedures || null,
        is_warranty: is_warranty,
        authorize_test_drive: authorize_test_drive,
      };

      const { data: existingInsp } = await supabase
        .from('vehicle_inspections')
        .select('id')
        .eq('order_id', fullOrder.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingInsp?.id) {
        await supabase.from('vehicle_inspections').update(inspectionPayload).eq('id', existingInsp.id).eq('organization_id', organizationId);
      } else {
        await supabase.from('vehicle_inspections').insert(inspectionPayload as any);
      }

      let termsFileUrl: string | null = (fullOrder as any).terms_file_url || null;
      if (terms_type === 'file' && terms_file) {
        const ext = terms_file.name.split('.').pop() || 'pdf';
        const path = `terms/${organizationId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('work-order-documents').upload(path, terms_file, { contentType: terms_file.type, upsert: false });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('work-order-documents').getPublicUrl(path);
          termsFileUrl = urlData.publicUrl;
        }
      }

      const putBody: Record<string, unknown> = {
        description: description.trim(),
        estimated_cost: parseFloat(estimated_cost) || 0,
        terms_type,
        terms_text: terms_type === 'text' ? terms_text : null,
        terms_file_url: termsFileUrl,
        terms_accepted,
        terms_accepted_at: terms_accepted ? new Date().toISOString() : null,
        customer_signature: customer_signature || null,
      };
      if (assigned_to && assigned_to !== 'none') putBody.assigned_to = assigned_to;
      else putBody.assigned_to = null;

      const putRes = await fetch(`/api/work-orders/${fullOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });
      if (!putRes.ok) {
        const errData = await putRes.json();
        throw new Error(errData.error || 'Error al actualizar orden');
      }

      if (imagesToDelete.length > 0) {
        await fetch(`/api/work-orders/${fullOrder.id}/images/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: imagesToDelete }),
        });
      }

      if (temporaryImages.length > 0) {
        const formData = new FormData();
        temporaryImages.forEach((img) => formData.append('files', img.file));
        const uploadRes = await fetch(`/api/work-orders/${fullOrder.id}/images/upload`, { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const ud = await uploadRes.json();
          toast.warning(ud.error || 'Algunas fotos no se subieron');
        }
      }

      toast.success('Orden actualizada correctamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-4xl min-h-[80vh] max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Orden de Trabajo</DialogTitle>
          <DialogDescription>Modifica los datos de la orden. Cliente en solo lectura.</DialogDescription>
        </DialogHeader>

        {loadingOrder ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-slate-400">Cargando orden...</p>
          </div>
        ) : !fullOrder ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-red-400">No se pudo cargar la orden.</p>
          </div>
        ) : (
          <>
            <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (currentStep === 4) handleSubmit(e);
              }}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto min-h-[320px] space-y-6 pb-4">
                {currentStep === 1 && (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b border-slate-700 pb-2">Cliente (solo lectura)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input value={fullOrder.customer?.name || ''} readOnly className="bg-slate-800/50" />
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <Input value={fullOrder.customer?.phone || ''} readOnly className="bg-slate-800/50" />
                        </div>
                        <div className="col-span-2">
                          <Label>Email</Label>
                          <Input value={fullOrder.customer?.email || ''} readOnly className="bg-slate-800/50" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b border-slate-700 pb-2">Vehículo (editable)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Marca *</Label>
                          <Input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="Marca" required />
                        </div>
                        <div>
                          <Label>Modelo *</Label>
                          <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Modelo" required />
                        </div>
                        <div>
                          <Label>Año *</Label>
                          <Input value={vehicleYear} onChange={(e) => setVehicleYear(sanitize.year(e.target.value))} placeholder="Año" maxLength={4} required />
                        </div>
                        <div>
                          <Label>Placa *</Label>
                          <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(sanitize.plate(e.target.value))} placeholder="Placa" className="uppercase" required />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Color" />
                        </div>
                        <div>
                          <Label>VIN</Label>
                          <Input value={vehicleVin} onChange={(e) => setVehicleVin(sanitize.vin(e.target.value))} placeholder="VIN" className="uppercase" maxLength={17} />
                        </div>
                        <div>
                          <Label>Kilometraje</Label>
                          <Input value={vehicleMileage} onChange={(e) => setVehicleMileage(sanitize.mileage(e.target.value))} placeholder="Km" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
                      <h3 className="font-semibold text-sm border-b border-slate-700 pb-2">Inspección</h3>
                      <div>
                        <Label className="text-slate-300 mb-2 block">Nivel de combustible</Label>
                        <div className="flex gap-2 flex-wrap">
                          {['empty', 'quarter', 'half', 'three_quarters', 'full'].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setFuel_level(level)}
                              className={`px-3 py-2 rounded text-xs ${fuel_level === level ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                            >
                              {level === 'half' ? '1/2' : level === 'three_quarters' ? '3/4' : level === 'empty' ? 'Vacío' : level === 'quarter' ? '1/4' : 'Lleno'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Objetos de valor</Label>
                        <Textarea value={valuable_items} onChange={(e) => setValuable_items(e.target.value)} rows={2} className="bg-slate-800 border-slate-600" />
                      </div>
                      <div>
                        <Label className="text-slate-300">Motivo de ingreso</Label>
                        <Textarea value={entry_reason} onChange={(e) => setEntry_reason(e.target.value)} rows={2} className="bg-slate-800 border-slate-600" />
                      </div>
                      <div>
                        <Label className="text-slate-300">Procedimientos</Label>
                        <Textarea value={procedures} onChange={(e) => setProcedures(e.target.value)} rows={2} className="bg-slate-800 border-slate-600" />
                      </div>
                      <div className="flex gap-4 flex-wrap">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={will_diagnose} onChange={(e) => setWill_diagnose(e.target.checked)} /> ¿Diagnóstico?</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={is_warranty} onChange={(e) => setIs_warranty(e.target.checked)} /> ¿Garantía?</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={authorize_test_drive} onChange={(e) => setAuthorize_test_drive(e.target.checked)} /> Prueba de ruta</label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm border-b border-slate-700 pb-2">Fotos existentes</h3>
                      {displayImages.length === 0 && imagesToDelete.length === 0 && <p className="text-slate-500 text-sm">No hay fotos.</p>}
                      <div className="flex flex-wrap gap-2">
                        {displayImages.map((img) => (
                          <div key={img.path} className="relative group">
                            <img src={img.url} alt="" className="w-20 h-20 object-cover rounded border border-slate-600" />
                            <button type="button" onClick={() => handleRemoveExistingImage(img.path)} className="absolute top-0 right-0 bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                      <Label className="text-slate-300 block mt-2">Agregar fotos</Label>
                      <OrderCreationImageCapture images={temporaryImages} onImagesChange={setTemporaryImages} maxImages={20} disabled={loading} />
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Descripción del trabajo *</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
                    </div>
                    <div>
                      <Label>Costo estimado (MXN)</Label>
                      <Input type="number" step="0.01" value={estimated_cost} onChange={(e) => setEstimated_cost(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Asignar empleado</Label>
                      <Select value={assigned_to || 'none'} onValueChange={(v) => setAssigned_to(v === 'none' ? '' : v)}>
                        <SelectTrigger className="bg-slate-900 border-slate-600"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <Button type="button" variant={terms_type === 'text' ? 'default' : 'outline'} onClick={() => setTerms_type('text')}>Texto</Button>
                        <Button type="button" variant={terms_type === 'file' ? 'default' : 'outline'} onClick={() => setTerms_type('file')}>Subir PDF</Button>
                      </div>
                      {terms_type === 'text' && (
                        <div>
                          <Label>Términos y condiciones *</Label>
                          <Textarea value={terms_text} onChange={(e) => setTerms_text(e.target.value)} rows={6} className="bg-slate-900 border-slate-600" />
                        </div>
                      )}
                      {terms_type === 'file' && (
                        <div>
                          <Label>PDF de términos</Label>
                          <Input type="file" accept=".pdf,application/pdf" onChange={(e) => setTerms_file(e.target.files?.[0] || null)} />
                          {(fullOrder as any).terms_file_url && !terms_file && <p className="text-xs text-slate-400 mt-1">Se conservará el PDF actual.</p>}
                        </div>
                      )}
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={terms_accepted} onChange={(e) => setTerms_accepted(e.target.checked)} />
                        <span>El cliente acepta los términos *</span>
                      </label>
                      {errors.terms_accepted && <p className="text-red-400 text-xs">{errors.terms_accepted}</p>}
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                      <Label className="block mb-2">Firma del cliente *</Label>
                      <div ref={signatureContainerRef} className="bg-white rounded-lg p-3 border border-slate-600 min-h-[180px] touch-none" style={{ touchAction: 'none' }}>
                        <SignatureCanvas
                          ref={signatureRef}
                          canvasProps={{ height: SIGNATURE_HEIGHT, className: 'signature-canvas w-full block border-0' }}
                          onEnd={handleSaveSignature}
                          backgroundColor="white"
                          penColor="black"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleClearSignature}>Limpiar</Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleSaveSignature}>Guardar firma</Button>
                      </div>
                      {customer_signature && <p className="text-green-400 text-sm mt-1 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Firma guardada</p>}
                      {errors.customer_signature && <p className="text-red-400 text-xs">{errors.customer_signature}</p>}
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-slate-700 flex-shrink-0">
                {currentStep === 4 ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(3)} disabled={loading}>Anterior</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
                  </>
                ) : (
                  <>
                    <div>
                      {currentStep > 1 ? (
                        <Button type="button" variant="outline" onClick={() => setCurrentStep((p) => p - 1)} disabled={loading}>Anterior</Button>
                      ) : (
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                      )}
                    </div>
                    <Button type="button" onClick={handleNext}>Siguiente</Button>
                  </>
                )}
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
