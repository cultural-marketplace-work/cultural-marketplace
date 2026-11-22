
import { getCategoryOverview } from '@/lib/db';
import CategoriesClient from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const overview = await getCategoryOverview();

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-brand-900">
        Categories
      </h1>

      <CategoriesClient
        initial={overview.categories}
        initialTotals={overview.totals}
      />
    </div>
  );
}
