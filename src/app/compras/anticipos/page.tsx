import { redirect } from 'next/navigation'

export default function AnticiposRedirect() {
  redirect('/finanzas/pagos-gastos?tab=anticipos')
}
