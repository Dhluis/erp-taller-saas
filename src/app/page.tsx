// Root page - redirects to landing or dashboard
import { redirect } from 'next/navigation'

export default function RootPage() {
  // Por ahora redirige a la landing page
  // Puedes cambiar esto para verificar autenticación
  redirect('/')
}