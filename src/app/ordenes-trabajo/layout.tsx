// Force dynamic rendering for all work order pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function OrdenesTrabajoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}






