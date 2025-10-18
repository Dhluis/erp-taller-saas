/**
 * Tipos TypeScript generados automáticamente desde Supabase
 * Generado el: 2025-09-29T21:07:27.939Z
 * 
 * Este archivo contiene los tipos exactos de tu base de datos.
 * Basado en el esquema actual de la base de datos.
 */

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          address: string;
          phone: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          phone: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          phone?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          address: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          address: string;
          notes: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          customer_id: string;
          brand: string;
          model: string;
          year: number;
          license_plate: string;
          vin: string;
          color: string;
          mileage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          brand: string;
          model: string;
          year: number;
          license_plate: string;
          vin: string;
          color: string;
          mileage: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          brand?: string;
          model?: string;
          year?: number;
          license_plate?: string;
          vin?: string;
          color?: string;
          mileage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      work_orders: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          status: string;
          description: string;
          estimated_cost: number;
          final_cost: number;
          entry_date: string;
          estimated_completion: string;
          completed_at: string;
          notes: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          status: string;
          description: string;
          estimated_cost: number;
          final_cost: number;
          entry_date: string;
          estimated_completion: string;
          completed_at: string;
          notes: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          vehicle_id?: string;
          status?: string;
          description?: string;
          estimated_cost?: number;
          final_cost?: number;
          entry_date?: string;
          estimated_completion?: string;
          completed_at?: string;
          notes?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotations: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          quotation_number: string;
          status: string;
          valid_until: string;
          terms_and_conditions: string;
          notes: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          quotation_number: string;
          status: string;
          valid_until: string;
          terms_and_conditions: string;
          notes: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          updated_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          vehicle_id?: string;
          quotation_number?: string;
          status?: string;
          valid_until?: string;
          terms_and_conditions?: string;
          notes?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          updated_by?: string;
        };
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          category: string;
          type: string;
          unit: string;
          price: number;
          cost: number;
          tax_rate: number;
          stock_quantity: number;
          min_stock: number;
          max_stock: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          category: string;
          type: string;
          unit: string;
          price: number;
          cost: number;
          tax_rate: number;
          stock_quantity: number;
          min_stock: number;
          max_stock: number;
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          updated_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          code?: string;
          name?: string;
          description?: string;
          category?: string;
          type?: string;
          unit?: string;
          price?: number;
          cost?: number;
          tax_rate?: number;
          stock_quantity?: number;
          min_stock?: number;
          max_stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          updated_by?: string;
        };
      };
      inventory_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string;
          parent_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description: string;
          parent_id: string;
          status: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string;
          parent_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          quantity: number;
          min_quantity: number;
          unit_price: number;
          category: string;
          created_at: string;
          updated_at: string;
          category_id: string;
          sku: string;
          barcode: string;
          current_stock: number;
          min_stock: number;
          max_stock: number;
          unit: string;
          status: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          quantity: number;
          min_quantity: number;
          unit_price: number;
          category: string;
          created_at?: string;
          updated_at?: string;
          category_id: string;
          sku: string;
          barcode: string;
          current_stock: number;
          min_stock: number;
          max_stock: number;
          unit: string;
          status: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          code?: string;
          name?: string;
          description?: string;
          quantity?: number;
          min_quantity?: number;
          unit_price?: number;
          category?: string;
          created_at?: string;
          updated_at?: string;
          category_id?: string;
          sku?: string;
          barcode?: string;
          current_stock?: number;
          min_stock?: number;
          max_stock?: number;
          unit?: string;
          status?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          country: string;
          tax_id: string;
          payment_terms: string;
          notes: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          country: string;
          tax_id: string;
          payment_terms: string;
          notes: string;
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          updated_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
          country?: string;
          tax_id?: string;
          payment_terms?: string;
          notes?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          updated_by?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          organization_id: string;
          supplier_id: string;
          order_number: string;
          order_date: string;
          expected_delivery_date: string;
          status: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          notes: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          supplier_id: string;
          order_number: string;
          order_date: string;
          expected_delivery_date: string;
          status: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          notes: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          updated_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          supplier_id?: string;
          order_number?: string;
          order_date?: string;
          expected_delivery_date?: string;
          status?: string;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          updated_by?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          supplier_id: string;
          invoice_number: string;
          amount: number;
          payment_date: string;
          payment_method: string;
          reference: string;
          status: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          supplier_id: string;
          invoice_number: string;
          amount: number;
          payment_date: string;
          payment_method: string;
          reference: string;
          status: string;
          notes: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          supplier_id?: string;
          invoice_number?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string;
          reference?: string;
          status?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          invoice_number: string;
          status: string;
          due_date: string;
          paid_date: string;
          payment_method: string;
          notes: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total: number;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          invoice_number: string;
          status: string;
          due_date: string;
          paid_date: string;
          payment_method: string;
          notes: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total: number;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          updated_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          vehicle_id?: string;
          invoice_number?: string;
          status?: string;
          due_date?: string;
          paid_date?: string;
          payment_method?: string;
          notes?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          updated_by?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          role: string;
          specialties: any[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          role: string;
          specialties: any[];
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          role?: string;
          specialties?: any[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          category: string;
          base_price: number;
          estimated_hours: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          category: string;
          base_price: number;
          estimated_hours: number;
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          code?: string;
          name?: string;
          description?: string;
          category?: string;
          base_price?: number;
          estimated_hours?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          service_type: string;
          appointment_date: string;
          duration: number;
          status: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          vehicle_id: string;
          service_type: string;
          appointment_date: string;
          duration: number;
          status: string;
          notes: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          vehicle_id?: string;
          service_type?: string;
          appointment_date?: string;
          duration?: number;
          status?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          source: string;
          status: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string;
          source: string;
          status: string;
          notes: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          source?: string;
          status?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: string;
          status: string;
          leads_generated: number;
          conversion_rate: number;
          budget: number;
          spent: number;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          type: string;
          status: string;
          leads_generated: number;
          conversion_rate: number;
          budget: number;
          spent: number;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          type?: string;
          status?: string;
          leads_generated?: number;
          conversion_rate?: number;
          budget?: number;
          spent?: number;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_users: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: string;
          is_active: boolean;
          last_login: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: string;
          is_active: boolean;
          last_login: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          role?: string;
          is_active?: boolean;
          last_login?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_settings: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          tax_id: string;
          address: string;
          phone: string;
          email: string;
          logo_url: string;
          currency: string;
          tax_rate: number;
          working_hours: any;
          invoice_terms: string;
          appointment_defaults: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          tax_id: string;
          address: string;
          phone: string;
          email: string;
          logo_url: string;
          currency: string;
          tax_rate: number;
          working_hours: any;
          invoice_terms: string;
          appointment_defaults: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_name?: string;
          tax_id?: string;
          address?: string;
          phone?: string;
          email?: string;
          logo_url?: string;
          currency?: string;
          tax_rate?: number;
          working_hours?: any;
          invoice_terms?: string;
          appointment_defaults?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Tipos de utilidad
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Tipos específicos para tablas principales
export type Customer = Tables<'customers'>;
export type CustomerInsert = TablesInsert<'customers'>;
export type CustomerUpdate = TablesUpdate<'customers'>;

export type Vehicle = Tables<'vehicles'>;
export type VehicleInsert = TablesInsert<'vehicles'>;
export type VehicleUpdate = TablesUpdate<'vehicles'>;

export type WorkOrder = Tables<'work_orders'>;
export type WorkOrderInsert = TablesInsert<'work_orders'>;
export type WorkOrderUpdate = TablesUpdate<'work_orders'>;

export type Quotation = Tables<'quotations'>;
export type QuotationInsert = TablesInsert<'quotations'>;
export type QuotationUpdate = TablesUpdate<'quotations'>;

export type Product = Tables<'products'>;
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;

export type InventoryCategory = Tables<'inventory_categories'>;
export type InventoryCategoryInsert = TablesInsert<'inventory_categories'>;
export type InventoryCategoryUpdate = TablesUpdate<'inventory_categories'>;

export type Supplier = Tables<'suppliers'>;
export type SupplierInsert = TablesInsert<'suppliers'>;
export type SupplierUpdate = TablesUpdate<'suppliers'>;

export type PurchaseOrder = Tables<'purchase_orders'>;
export type PurchaseOrderInsert = TablesInsert<'purchase_orders'>;
export type PurchaseOrderUpdate = TablesUpdate<'purchase_orders'>;

export type Payment = Tables<'payments'>;
export type PaymentInsert = TablesInsert<'payments'>;
export type PaymentUpdate = TablesUpdate<'payments'>;

export type Invoice = Tables<'invoices'>;
export type InvoiceInsert = TablesInsert<'invoices'>;
export type InvoiceUpdate = TablesUpdate<'invoices'>;

export type Employee = Tables<'employees'>;
export type EmployeeInsert = TablesInsert<'employees'>;
export type EmployeeUpdate = TablesUpdate<'employees'>;

export type Service = Tables<'services'>;
export type ServiceInsert = TablesInsert<'services'>;
export type ServiceUpdate = TablesUpdate<'services'>;

export type Appointment = Tables<'appointments'>;
export type AppointmentInsert = TablesInsert<'appointments'>;
export type AppointmentUpdate = TablesUpdate<'appointments'>;

export type Lead = Tables<'leads'>;
export type LeadInsert = TablesInsert<'leads'>;
export type LeadUpdate = TablesUpdate<'leads'>;

export type Campaign = Tables<'campaigns'>;
export type CampaignInsert = TablesInsert<'campaigns'>;
export type CampaignUpdate = TablesUpdate<'campaigns'>;

export type Notification = Tables<'notifications'>;
export type NotificationInsert = TablesInsert<'notifications'>;
export type NotificationUpdate = TablesUpdate<'notifications'>;

export type SystemUser = Tables<'system_users'>;
export type SystemUserInsert = TablesInsert<'system_users'>;
export type SystemUserUpdate = TablesUpdate<'system_users'>;

export type CompanySetting = Tables<'company_settings'>;
export type CompanySettingInsert = TablesInsert<'company_settings'>;
export type CompanySettingUpdate = TablesUpdate<'company_settings'>;
