import { redirect } from 'next/navigation'

/**
 * Redirección permanente: /comercial → /leads
 * La sección se renombró a "Leads".
 */
export default function ComercialRedirect() {
  redirect('/leads')
}
