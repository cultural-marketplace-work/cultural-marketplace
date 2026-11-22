
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CategoryRow = {
  id: number;
  name: string;
  type: string;
  listing_count: number;
  artisan_count: number;
  units_ordered: number;
};

type CategoryTotals = {
  category_count: number;
  product_category_count: number;
  experience_category_count: number;
  listing_count: number;
  artisan_count: number;
  units_ordered: number;
};

type Props = {
  initial: CategoryRow[];
  initialTotals: CategoryTotals;
};

export default function CategoriesClient({
  initial,
  initialTotals,
}: Props) {
  const router = useRouter();

  const [rows, setRows] = useState<CategoryRow[]>(initial);
  const [totals, setTotals] = useState(initialTotals);

  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'experience'>('product');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'product' | 'experience'
  >('all');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const q = query.trim().toLowerCase();

  const visible = rows.filter(
    (c) =>
      (typeFilter === 'all' || c.type === typeFilter) &&
      (!q || c.name.toLowerCase().includes(q))
  );

  const stats = [
    { label: 'Total categories', value: totals.category_count },
    { label: 'Product categories', value: totals.product_category_count },
    { label: 'Experience categories', value: totals.experience_category_count },
    { label: 'Categorized listings', value: totals.listing_count },
    { label: 'Artisans using categories', value: totals.artisan_count },
    { label: 'Total units ordered', value: totals.units_ordered },
  ];

  async function addCategory() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setMsg({ text: 'Please enter a category name.', error: true });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: trimmedName,
          type,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success' || !data.category) {
        setMsg({
          text: data.message ?? 'Could not add category.',
          error: true,
        });
        return;
      }

      const added: CategoryRow = {
        ...data.category,
        listing_count: 0,
        artisan_count: 0,
        units_ordered: 0,
      };

      setRows((current) =>
        [...current, added].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setTotals((current) => ({
        ...current,
        category_count: current.category_count + 1,
        product_category_count:
          current.product_category_count +
          (type === 'product' ? 1 : 0),
        experience_category_count:
          current.experience_category_count +
          (type === 'experience' ? 1 : 0),
      }));

      setName('');
      setMsg({ text: `Category "${trimmedName}" added successfully.` });

      router.refresh();
    } catch {
      setMsg({
        text: 'Could not add category. Please try again.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(category: CategoryRow) {
    if (category.listing_count > 0) {
      setMsg({
        text: `Cannot delete "${category.name}" because listings are still assigned to it.`,
        error: true,
      });
      return;
    }

    if (
      !window.confirm(
        `Delete the "${category.name}" ${category.type} category? This action cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: category.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg({
          text: data.message ?? 'Could not delete category.',
          error: true,
        });
        return;
      }

      setRows((current) =>
        current.filter((c) => c.id !== category.id)
      );

      setTotals((current) => ({
        ...current,
        category_count: Math.max(0, current.category_count - 1),
        product_category_count: Math.max(
          0,
          current.product_category_count -
            (category.type === 'product' ? 1 : 0)
        ),
        experience_category_count: Math.max(
          0,
          current.experience_category_count -
            (category.type === 'experience' ? 1 : 0)
        ),
      }));

      setMsg({
        text: `Category "${category.name}" deleted successfully.`,
      });

      router.refresh();
    } catch {
      setMsg({
        text: 'Could not delete category. Please try again.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const btn =
    'rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

  const label =
    'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#3D3028]';

  return (
    <div className="mt-5 space-y-5">

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-[#71675F]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#8B0000]">
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* ADD CATEGORY */}
      <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[#3D3028]">
            Add New Category
          </h2>
          <p className="mt-1 text-xs text-[#71675F]">
            Create a category for Indigenous crafts or cultural experiences.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className={label}>Category name</label>
            <input
              className="input text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basketry, Pottery, Weaving"
              disabled={busy}
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addCategory();
                }
              }}
            />
          </div>

          <div className="sm:w-48">
            <label className={label}>Category type</label>
            <select
              className="input text-sm"
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'product' | 'experience')
              }
              disabled={busy}
            >
              <option value="product">Product</option>
              <option value="experience">Experience</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary px-5 py-2 text-sm"
            disabled={busy || !name.trim()}
            onClick={() => void addCategory()}
          >
            {busy ? 'Processing...' : '+ Add Category'}
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#D6D0C9] bg-white p-3 shadow-sm">
        <input
          className="input !w-full text-sm sm:!w-72"
          placeholder="Search category name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'product', 'experience'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                typeFilter === f
                  ? 'border-[#8B0000] bg-[#8B0000] text-white'
                  : 'border-[#D6D0C9] bg-white text-[#3D3028] hover:bg-[#FFF5E4]'
              }`}
            >
              {f === 'all' ? 'All types' : f}
            </button>
          ))}
        </div>

        <p className="ml-auto text-xs text-[#71675F]">
          Showing{' '}
          <b className="text-[#3D3028]">{visible.length}</b> of{' '}
          {rows.length}
        </p>
      </div>

      {/* MESSAGE */}
      {msg && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-[#D6B56D] bg-[#FFF9EF] text-[#9A681D]'
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* CATEGORY TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-[#D6D0C9] bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-[#E8DCCB] bg-[#FCF9F4] text-[11px] uppercase tracking-wider text-[#71675F]">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 text-center font-semibold">
                Listings
              </th>
              <th className="px-4 py-3 text-center font-semibold">
                Artisans
              </th>
              <th className="px-4 py-3 text-center font-semibold">
                Units ordered
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.map((category) => (
              <tr
                key={category.id}
                className="border-b border-[#F0E8DC] hover:bg-[#FFFBF4]"
              >
                <td className="px-4 py-3 font-semibold text-[#3D3028]">
                  {category.name}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      category.type === 'experience'
                        ? 'border-[#D6B56D] bg-[#FFF5E4] text-[#9A681D]'
                        : 'border-[#D6D0C9] bg-stone-100 text-[#71675F]'
                    }`}
                  >
                    {category.type}
                  </span>
                </td>

                <td className="px-4 py-3 text-center font-medium text-[#3D3028]">
                  {category.listing_count.toLocaleString()}
                </td>

                <td className="px-4 py-3 text-center font-medium text-[#3D3028]">
                  {category.artisan_count.toLocaleString()}
                </td>

                <td className="px-4 py-3 text-center font-medium text-[#3D3028]">
                  {category.units_ordered.toLocaleString()}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={`${btn} border-[#D9A6A6] bg-[#FCEEEE] text-[#8B0000] hover:bg-[#F8DEDE]`}
                      disabled={busy}
                      onClick={() => void removeCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center"
                >
                  <p className="font-semibold text-[#3D3028]">
                    {rows.length === 0
                      ? 'No categories yet.'
                      : 'No matching categories found.'}
                  </p>
                  <p className="mt-1 text-xs text-[#71675F]">
                    {rows.length === 0
                      ? 'Add your first category using the form above.'
                      : 'Try changing your search or category type filter.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#71675F]">
        Categories with assigned listings cannot be deleted. Reassign their
        listings before attempting deletion.
      </p>
    </div>
  );
}
