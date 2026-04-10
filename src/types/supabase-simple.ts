/**
 * Tipos TypeScript simplificados para Supabase
 * Versión compatible que elimina errores de tipos
 */

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          plan_tier: string
          subscription_status: string
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          plan_tier?: string
          subscription_status?: string
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          plan_tier?: string
          subscription_status?: string
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
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
          lead_id: string | null
          from_lead: boolean | null
          converted_from_whatsapp: boolean | null
          company: string | null
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
          lead_id?: string | null
          from_lead?: boolean | null
          converted_from_whatsapp?: boolean | null
          company?: string | null
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
          lead_id?: string | null
          from_lead?: boolean | null
          converted_from_whatsapp?: boolean | null
          company?: string | null
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
          customer_signature: string | null
          terms_type: string | null
          terms_text: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          terms_file_url: string | null
        }
        Insert: {
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
          customer_signature?: string | null
          terms_type?: string | null
          terms_text?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          terms_file_url?: string | null
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
          customer_signature?: string | null
          terms_type?: string | null
          terms_text?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          terms_file_url?: string | null
        }
      }
      vehicle_inspections: {
        Row: {
          id: string
          order_id: string
          organization_id: string
          workshop_id: string | null
          fluids_check: any
          fuel_level: string | null
          valuable_items: string | null
          will_diagnose: boolean | null
          entry_reason: string | null
          procedures: string | null
          is_warranty: boolean | null
          authorize_test_drive: boolean | null
          dashboard_indicators: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          organization_id: string
          workshop_id?: string | null
          fluids_check?: any
          fuel_level?: string | null
          valuable_items?: string | null
          will_diagnose?: boolean | null
          entry_reason?: string | null
          procedures?: string | null
          is_warranty?: boolean | null
          authorize_test_drive?: boolean | null
          dashboard_indicators?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          organization_id?: string
          workshop_id?: string | null
          fluids_check?: any
          fuel_level?: string | null
          valuable_items?: string | null
          will_diagnose?: boolean | null
          entry_reason?: string | null
          procedures?: string | null
          is_warranty?: boolean | null
          authorize_test_drive?: boolean | null
          dashboard_indicators?: any
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          work_order_id: string
          item_type: 'service' | 'part' | 'labor'
          item_name: string
          description: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_order_id?: string
          item_type?: 'service' | 'part' | 'labor'
          item_name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          item_type?: 'service' | 'part' | 'labor'
          item_name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          vehicle_id: string | null
          quotation_number: string
          status: string
          issue_date: string
          expiry_date: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          notes: string | null
          created_at: string
          updated_at: string
          work_order_id: string | null
          terms_and_conditions: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id?: string
          customer_id?: string
          vehicle_id?: string | null
          quotation_number?: string
          status?: string
          issue_date?: string
          expiry_date?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          work_order_id?: string | null
          terms_and_conditions?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          vehicle_id?: string | null
          quotation_number?: string
          status?: string
          issue_date?: string
          expiry_date?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          work_order_id?: string | null
          terms_and_conditions?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
      }
      quotation_items: {
        Row: {
          id: string
          quotation_id: string
          item_type: 'service' | 'part'
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
          item_name: string
        }
        Insert: {
          id?: string
          quotation_id: string
          item_type: 'service' | 'part'
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
          item_name: string
        }
        Update: {
          id?: string
          quotation_id?: string
          item_type?: 'service' | 'part'
          description?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
          item_name?: string
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
      inventory: {
        Row: {
          id: string
          organization_id: string
          code: string
          name: string
          description: string
          quantity: number
          min_quantity: number
          unit_price: number
          category: string
          created_at: string
          updated_at: string
          category_id: string
          sku: string
          barcode: string
          current_stock: number
          min_stock: number
          max_stock: number
          unit: string
          status: string
        }
        Insert: {
          id?: string
          organization_id: string
          code?: string
          name?: string
          description?: string
          quantity?: number
          min_quantity?: number
          unit_price?: number
          category?: string
          created_at?: string
          updated_at?: string
          category_id?: string
          sku?: string
          barcode?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number
          unit?: string
          status?: string
        }
        Update: {
          id?: string
          organization_id?: string
          code?: string
          name?: string
          description?: string
          quantity?: number
          min_quantity?: number
          unit_price?: number
          category?: string
          created_at?: string
          updated_at?: string
          category_id?: string
          sku?: string
          barcode?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number
          unit?: string
          status?: string
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
          subtotal: number
          tax_amount: number
          total: number
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          total_amount: number | null
        }
        Insert: {
          id?: string
          organization_id?: string
          supplier_id?: string
          order_number?: string
          order_date?: string
          expected_delivery_date?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          total_amount?: number | null
        }
        Update: {
          id?: string
          organization_id?: string
          supplier_id?: string
          order_number?: string
          order_date?: string
          expected_delivery_date?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          total_amount?: number | null
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          product_id: string
          quantity: number
          quantity_received: number | null
          unit_cost: number
          total_cost: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_order_id?: string
          product_id?: string
          quantity?: number
          quantity_received?: number | null
          unit_cost?: number
          total_cost?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          product_id?: string
          quantity?: number
          quantity_received?: number | null
          unit_cost?: number
          total_cost?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          organization_id: string
          supplier_id: string | null
          invoice_id: string | null
          invoice_number: string | null
          amount: number
          payment_date: string
          payment_method: string
          reference: string | null
          status: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          supplier_id?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          amount?: number
          payment_date?: string
          payment_method?: string
          reference?: string | null
          status?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          supplier_id?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          amount?: number
          payment_date?: string
          payment_method?: string
          reference?: string | null
          status?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          work_order_id: string | null
          quotation_id: string | null
          customer_id: string
          vehicle_id: string
          invoice_number: string
          description: string | null
          status: string | null
          due_date: string | null
          paid_date: string | null
          payment_method: string | null
          notes: string | null
          subtotal: number | null
          tax: number | null
          tax_amount: number | null
          discount: number | null
          discount_amount: number | null
          total: number | null
          total_amount: number | null
          paid_amount: number | null
          balance: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id?: string
          work_order_id?: string | null
          quotation_id?: string | null
          customer_id?: string
          vehicle_id?: string
          invoice_number?: string
          description?: string | null
          status?: string | null
          due_date?: string | null
          paid_date?: string | null
          payment_method?: string | null
          notes?: string | null
          subtotal?: number | null
          tax?: number | null
          tax_amount?: number | null
          discount?: number | null
          discount_amount?: number | null
          total?: number | null
          total_amount?: number | null
          paid_amount?: number | null
          balance?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          work_order_id?: string | null
          quotation_id?: string | null
          customer_id?: string
          vehicle_id?: string
          invoice_number?: string
          description?: string | null
          status?: string | null
          due_date?: string | null
          paid_date?: string | null
          payment_method?: string | null
          notes?: string | null
          subtotal?: number | null
          tax?: number | null
          tax_amount?: number | null
          discount?: number | null
          discount_amount?: number | null
          total?: number | null
          total_amount?: number | null
          paid_amount?: number | null
          balance?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          organization_id?: string
          item_type: string
          item_name?: string
          description: string | null
          quantity: number
          unit_price: number
          discount_percent?: number | null
          discount_amount?: number | null
          tax_percent?: number | null
          tax_amount?: number | null
          subtotal?: number | null
          total?: number | null
          total_amount?: number | null
          total_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string
          organization_id?: string
          item_type?: string
          item_name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          discount_percent?: number | null
          discount_amount?: number | null
          tax_percent?: number | null
          tax_amount?: number | null
          subtotal?: number | null
          total?: number | null
          total_amount?: number | null
          total_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          organization_id?: string
          item_type?: string
          item_name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          discount_percent?: number | null
          discount_amount?: number | null
          tax_percent?: number | null
          tax_amount?: number | null
          subtotal?: number | null
          total?: number | null
          total_amount?: number | null
          total_price?: number | null
          created_at?: string
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
          whatsapp_conversation_id: string | null
          customer_id: string | null
          lead_source: string | null
          assigned_to: string | null
          estimated_value: number | null
          lead_score: number | null
          converted_at: string | null
          company: string | null
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
          whatsapp_conversation_id?: string | null
          customer_id?: string | null
          lead_source?: string | null
          assigned_to?: string | null
          estimated_value?: number | null
          lead_score?: number | null
          converted_at?: string | null
          company?: string | null
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
          whatsapp_conversation_id?: string | null
          customer_id?: string | null
          lead_source?: string | null
          assigned_to?: string | null
          estimated_value?: number | null
          lead_score?: number | null
          converted_at?: string | null
          company?: string | null
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
      users: {
        Row: {
          id: string
          organization_id: string
          auth_user_id: string
          email: string
          full_name: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
          workshop_id: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          auth_user_id: string
          email: string
          full_name: string
          role: string
          is_active: boolean
          created_at?: string
          updated_at?: string
          workshop_id?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          auth_user_id?: string
          email?: string
          full_name?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          workshop_id?: string | null
        }
      }
      whatsapp_conversations: {
        Row: {
          id: string
          organization_id: string
          customer_name: string
          customer_phone: string
          last_message: string | null
          last_message_at: string | null
          status: string
          messages_count: number
          unread_count: number
          created_at: string
          updated_at: string
          customer_id: string | null
          lead_status: string | null
          lead_updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          customer_name: string
          customer_phone: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          messages_count?: number
          unread_count?: number
          created_at?: string
          updated_at?: string
          customer_id?: string | null
          lead_status?: string | null
          lead_updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          customer_name?: string
          customer_phone?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          messages_count?: number
          unread_count?: number
          created_at?: string
          updated_at?: string
          customer_id?: string | null
          lead_status?: string | null
          lead_updated_at?: string | null
        }
      }
      workshops: {
        Row: {
          id: string
          organization_id: string
          name: string
          address: string | null
          phone: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          address?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      workshop_members: {
        Row: {
          id: string
          workshop_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          user_id?: string
          role?: string
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
    CompositeTypes: {
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

export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type WhatsappConversation = Tables<'whatsapp_conversations'>
export type WhatsappConversationInsert = TablesInsert<'whatsapp_conversations'>
export type WhatsappConversationUpdate = TablesUpdate<'whatsapp_conversations'>

export type InventoryItem = Tables<'inventory'>
export type InventoryItemInsert = TablesInsert<'inventory'>
export type InventoryItemUpdate = TablesUpdate<'inventory'>

export type Workshop = Tables<'workshops'>
export type WorkshopInsert = TablesInsert<'workshops'>
export type WorkshopUpdate = TablesUpdate<'workshops'>

export type WorkshopMember = Tables<'workshop_members'>
export type WorkshopMemberInsert = TablesInsert<'workshop_members'>
export type WorkshopMemberUpdate = TablesUpdate<'workshop_members'>

export type VehicleInspection = Tables<'vehicle_inspections'>
export type VehicleInspectionInsert = TablesInsert<'vehicle_inspections'>
export type VehicleInspectionUpdate = TablesUpdate<'vehicle_inspections'>
