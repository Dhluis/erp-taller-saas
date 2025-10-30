export type OrderStatus = 
  | 'reception'
  | 'diagnosis'
  | 'initial_quote'
  | 'waiting_approval'
  | 'disassembly'
  | 'waiting_parts'
  | 'assembly'
  | 'testing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'in_progress';

export interface WorkOrder {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  status: OrderStatus;
  description: string;
  notes?: string;
  estimated_cost?: number;
  final_cost?: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  entry_date: string;
  estimated_completion?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    license_plate: string;
    color?: string;
  };
  
  // ✅ Campo de imágenes
  images?: Array<{
    id?: string;
    url: string;
    caption?: string;
    created_at?: string;
  }>;
}

export interface KanbanColumn {
  id: OrderStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  orders: WorkOrder[];
}
