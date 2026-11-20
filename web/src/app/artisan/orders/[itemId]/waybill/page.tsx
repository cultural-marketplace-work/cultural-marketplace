import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { getShipmentByOrderItem } from '@/lib/shipments';
import WaybillPrint from './WaybillPrint';

export const dynamic = 'force-dynamic';

// Printable J&T-style waybill for a shipment. Owner (artisan) or admin may print.
export default async function WaybillPage({ params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'artisan' && session.role !== 'admin')) redirect('/auth/login');
  if (session.role === 'artisan') await requireVerifiedArtisan(session.id);
  const { itemId } = await params;

  const shipment = await getShipmentByOrderItem(Number(itemId));
  if (!shipment) notFound();
  if (session.role === 'artisan' && shipment.artisan_id !== session.id) notFound();

  return <WaybillPrint shipment={shipment} />;
}
