/**
 * Tipos TypeScript simplificados para Supabase
 * Versión compatible que elimina errores de tipos
 */

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          customer_id: string
          brand: string
          model: string
          year: number | null
          license_plate: string | null
          vin: string | null
          color: string | null
          mileage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          brand: string
          model: string
          year?: number | null
          license_plate?: string | null
          vin?: string | null
          color?: string | null
          mileage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          brand?: string
          model?: string
          year?: number | null
          license_plate?: string | null
          vin?: string | null
          color?: string | null
          mileage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      work_orders: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          status: string
          description: string | null
          estimated_cost: number | null
          final_cost: number | null
          entry_date: string
          estimated_completion: string | null
          completed_at: string | null
          notes: string | null
          subtotal: number | null
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          status?: string
          description?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          entry_date?: string
          estimated_completion?: string | null
          completed_at?: string | null
          notes?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          vehicle_id?: string
          status?: string
          description?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          entry_date?: string
          estimated_completion?: string | null
          completed_at?: string | null
          notes?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          quotation_number: string
          status: string
          valid_until: string
          terms_and_conditions: string | null
          notes: string | null
          subtotal: number | null
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          quotation_number: string
          status?: string
          valid_until: string
          terms_and_conditions?: string | null
          notes?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          vehicle_id?: string
          quotation_number?: string
          status?: string
          valid_until?: string
          terms_and_conditions?: string | null
          notes?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      products: {
        Row: {
          id: string
          organization_id: string
          code: string | null
          name: string
          description: string | null
          category: string | null
          type: string
          unit: string
          price: number
          cost: number
          tax_rate: number | null
          stock_quantity: number | null
          min_stock: number | null
          max_stock: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          code?: string | null
          name: string
          description?: string | null
          category?: string | null
          type?: string
          unit?: string
          price?: number
          cost?: number
          tax_rate?: number | null
          stock_quantity?: number | null
          min_stock?: number | null
          max_stock?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          code?: string | null
          name?: string
          description?: string | null
          category?: string | null
          type?: string
          unit?: string
          price?: number
          cost?: number
          tax_rate?: number | null
          stock_quantity?: number | null
          min_stock?: number | null
          max_stock?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      inventory_categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          parent_id: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          parent_id?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          organization_id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          tax_id: string | null
          payment_terms: string | null
          notes: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      purchase_orders: {
        Row: {
          id: string
          organization_id: string
          supplier_id: string
          order_number: string
          order_date: string
          expected_delivery_date: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          supplier_id: string
          order_number: string
          order_date: string
          expected_delivery_date?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          supplier_id?: string
          order_number?: string
          order_date?: string
          expected_delivery_date?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          organization_id: string
          supplier_id: string
          invoice_number: string
          amount: number
          payment_date: string
          payment_method: string
          reference: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          supplier_id: string
          invoice_number: string
          amount: number
          payment_date: string
          payment_method: string
          reference?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          supplier_id?: string
          invoice_number?: string
          amount?: number
          payment_date?: string
          payment_method?: string
          reference?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          invoice_number: string
          status: string
          due_date: string
          paid_date: string | null
          payment_method: string | null
          notes: string | null
          subtotal: number | null
          tax_amount: number | null
          discount_amount: number | null
          total: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          invoice_number: string
          status?: string
          due_date: string
          paid_date?: string | null
          payment_method?: string | null
          notes?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          vehicle_id?: string
          invoice_number?: string
          status?: string
          due_date?: string
          paid_date?: string | null
          payment_method?: string | null
          notes?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      employees: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          role: string
          specialties: any | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          role?: string
          specialties?: any | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          role?: string
          specialties?: any | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          organization_id: string
          code: string | null
          name: string
          description: string | null
          category: string | null
          base_price: number
          estimated_hours: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          code?: string | null
          name: string
          description?: string | null
          category?: string | null
          base_price?: number
          estimated_hours?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          code?: string | null
          name?: string
          description?: string | null
          category?: string | null
          base_price?: number
          estimated_hours?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          service_type: string
          appointment_date: string
          duration: number | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          vehicle_id: string
          service_type: string
          appointment_date: string
          duration?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          vehicle_id?: string
          service_type?: string
          appointment_date?: string
          duration?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          source: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: string
          status: string
          leads_generated: number | null
          conversion_rate: number | null
          budget: number | null
          spent: number | null
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type: string
          status?: string
          leads_generated?: number | null
          conversion_rate?: number | null
          budget?: number | null
          spent?: number | null
          start_date: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: string
          status?: string
          leads_generated?: number | null
          conversion_rate?: number | null
          budget?: number | null
          spent?: number | null
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          type?: string
          title?: string
          message?: string
          read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_users: {
        Row: {
          id: string
          organization_id: string
          email: string
          first_name: string
          last_name: string
          role: string
          is_active: boolean | null
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          first_name: string
          last_name: string
          role?: string
          is_active?: boolean | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: string
          is_active?: boolean | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_settings: {
        Row: {
          id: string
          organization_id: string
          company_name: string
          tax_id: string | null
          address: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          currency: string | null
          tax_rate: number | null
          working_hours: any | null
          invoice_terms: string | null
          appointment_defaults: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_name: string
          tax_id?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          currency?: string | null
          tax_rate?: number | null
          working_hours?: any | null
          invoice_terms?: string | null
          appointment_defaults?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_name?: string
          tax_id?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          currency?: string | null
          tax_rate?: number | null
          working_hours?: any | null
          invoice_terms?: string | null
          appointment_defaults?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          organization_id: string
          role: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          department: string | null
          position: string | null
          is_active: boolean | null
          email_verified: boolean | null
          last_login_at: string | null
          preferences: any | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          role?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          position?: string | null
          is_active?: boolean | null
          email_verified?: boolean | null
          last_login_at?: string | null
          preferences?: any | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          role?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          position?: string | null
          is_active?: boolean | null
          email_verified?: boolean | null
          last_login_at?: string | null
          preferences?: any | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          movement_type: 'entry' | 'exit' | 'adjustment' | 'transfer'
          quantity: number
          previous_stock: number
          new_stock: number
          reference_type: 'purchase_order' | 'work_order' | 'adjustment' | 'transfer' | 'initial' | null
          reference_id: string | null
          unit_cost: number | null
          total_cost: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          movement_type: 'entry' | 'exit' | 'adjustment' | 'transfer'
          quantity: number
          previous_stock: number
          new_stock: number
          reference_type?: 'purchase_order' | 'work_order' | 'adjustment' | 'transfer' | 'initial' | null
          reference_id?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          movement_type?: 'entry' | 'exit' | 'adjustment' | 'transfer'
          quantity?: number
          previous_stock?: number
          new_stock?: number
          reference_type?: 'purchase_order' | 'work_order' | 'adjustment' | 'transfer' | 'initial' | null
          reference_id?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos de utilidad
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Tipos específicos para tablas principales
export type Customer = Tables<'customers'>
export type CustomerInsert = TablesInsert<'customers'>
export type CustomerUpdate = TablesUpdate<'customers'>

export type Vehicle = Tables<'vehicles'>
export type VehicleInsert = TablesInsert<'vehicles'>
export type VehicleUpdate = TablesUpdate<'vehicles'>

export type WorkOrder = Tables<'work_orders'>
export type WorkOrderInsert = TablesInsert<'work_orders'>
export type WorkOrderUpdate = TablesUpdate<'work_orders'>

export type Quotation = Tables<'quotations'>
export type QuotationInsert = TablesInsert<'quotations'>
export type QuotationUpdate = TablesUpdate<'quotations'>

export type Product = Tables<'products'>
export type ProductInsert = TablesInsert<'products'>
export type ProductUpdate = TablesUpdate<'products'>

export type InventoryCategory = Tables<'inventory_categories'>
export type InventoryCategoryInsert = TablesInsert<'inventory_categories'>
export type InventoryCategoryUpdate = TablesUpdate<'inventory_categories'>

export type Supplier = Tables<'suppliers'>
export type SupplierInsert = TablesInsert<'suppliers'>
export type SupplierUpdate = TablesUpdate<'suppliers'>

export type PurchaseOrder = Tables<'purchase_orders'>
export type PurchaseOrderInsert = TablesInsert<'purchase_orders'>
export type PurchaseOrderUpdate = TablesUpdate<'purchase_orders'>

export type Payment = Tables<'payments'>
export type PaymentInsert = TablesInsert<'payments'>
export type PaymentUpdate = TablesUpdate<'payments'>

export type Invoice = Tables<'invoices'>
export type InvoiceInsert = TablesInsert<'invoices'>
export type InvoiceUpdate = TablesUpdate<'invoices'>

export type Employee = Tables<'employees'>
export type EmployeeInsert = TablesInsert<'employees'>
export type EmployeeUpdate = TablesUpdate<'employees'>

export type Service = Tables<'services'>
export type ServiceInsert = TablesInsert<'services'>
export type ServiceUpdate = TablesUpdate<'services'>

export type Appointment = Tables<'appointments'>
export type AppointmentInsert = TablesInsert<'appointments'>
export type AppointmentUpdate = TablesUpdate<'appointments'>

export type Lead = Tables<'leads'>
export type LeadInsert = TablesInsert<'leads'>
export type LeadUpdate = TablesUpdate<'leads'>

export type Campaign = Tables<'campaigns'>
export type CampaignInsert = TablesInsert<'campaigns'>
export type CampaignUpdate = TablesUpdate<'campaigns'>

export type Notification = Tables<'notifications'>
export type NotificationInsert = TablesInsert<'notifications'>
export type NotificationUpdate = TablesUpdate<'notifications'>

export type SystemUser = Tables<'system_users'>
export type SystemUserInsert = TablesInsert<'system_users'>
export type SystemUserUpdate = TablesUpdate<'system_users'>

export type CompanySetting = Tables<'company_settings'>
export type CompanySettingInsert = TablesInsert<'company_settings'>
export type CompanySettingUpdate = TablesUpdate<'company_settings'>

export type InventoryMovement = Tables<'inventory_movements'>
export type InventoryMovementInsert = TablesInsert<'inventory_movements'>
export type InventoryMovementUpdate = TablesUpdate<'inventory_movements'>

export type UserProfile = Tables<'user_profiles'>
export type UserProfileInsert = TablesInsert<'user_profiles'>
export type UserProfileUpdate = TablesUpdate<'user_profiles'>
