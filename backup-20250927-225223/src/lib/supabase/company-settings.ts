import { createClient } from '@/lib/supabase/client'

export interface CompanySettings {
  id: string
  name: string
  rfc: string
  address: string
  phone: string
  email: string
  website: string
  logo: string
  business_hours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
  billing: {
    currency: string
    tax_rate: number
    invoice_prefix: string
    payment_terms: number
  }
  services: {
    default_service_time: number
    require_appointment: boolean
    send_notifications: boolean
  }
  created_at: string
  updated_at: string
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching company settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching company settings:', error)
    return null
  }
}

export async function updateCompanySettings(settings: Partial<CompanySettings>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('company_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id)

    if (error) {
      console.error('Error updating company settings:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating company settings:', error)
    return false
  }
}

export async function createCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .insert([{
        name: settings.name,
        rfc: settings.rfc,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        logo: settings.logo,
        business_hours: settings.business_hours,
        billing: settings.billing,
        services: settings.services
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating company settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating company settings:', error)
    return null
  }
}