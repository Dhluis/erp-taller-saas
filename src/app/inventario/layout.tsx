// Force dynamic rendering for all inventory pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}




