import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { getArtisanFull, listArtisanProducts } from '@/lib/db';
import { getVerificationDocUrl } from '@/lib/storage';
import { evaluateVerificationRules, rulesSummary } from '@/lib/verificationRules';
import ArtisanReviewClient from './ArtisanReviewClient';

export const dynamic = 'force-dynamic';

export default async function AdminArtisanReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artisan = await getArtisanFull(Number(id));
  if (!artisan) notFound();
  const products = await listArtisanProducts(artisan.id);

  const rules = artisan.verification_criteria?.length === 14
    ? artisan.verification_criteria
    : evaluateVerificationRules({
      idType: artisan.id_type,
      detectedIdType: null,
      idDocumentsReadable: null,
      duplicateId: null,
      livenessPassed: artisan.liveness_status === 'passed' ? true :
        artisan.liveness_status === 'manual_review' ? false : null,
      faceMatched: artisan.face_matched,
      duplicateFaceMatch: artisan.duplicate_face_match,
      dob: artisan.dob,
      dobFromOcr: false,
      idAddress: null,
      proofOfCraftStatus: 'review',
      productSamplesStatus: 'fail',
      craftType: artisan.craft_type,
      businessName: artisan.business_name,
      indigenousAffiliation: artisan.indigenous_affiliation,
    });
  const summary = rulesSummary(rules);

  // Signed URLs (5 min) for every submitted evidence image.
  const evidenceSources = [
    { key: 'id_front', label: 'ID front', path: artisan.id_document_path },
    { key: 'id_back', label: 'ID back', path: artisan.id_document_back_path },
    { key: 'affiliation', label: 'Affiliation evidence', path: artisan.affiliation_document_path },
    { key: 'proof', label: 'Proof of craft', path: artisan.proof_of_craft_path, mediaType: artisan.proof_of_craft_media_type },
    { key: 'sample1', label: 'Product sample 1', path: artisan.product_sample_1_path },
    { key: 'sample2', label: 'Product sample 2', path: artisan.product_sample_2_path },
    { key: 'selfie', label: 'Live selfie', path: artisan.selfie_path },
  ];
  const evidence = await Promise.all(
    evidenceSources.map(async (e) => {
      let url: string | null = null;
      let urlError = false;
      if (e.path) {
        try {
          url = await getVerificationDocUrl(e.path);
        } catch (error) {
          urlError = true;
          console.error('[admin artisan review] evidence signing failed', {
            artisanId: artisan.id,
            evidenceKey: e.key,
            error: error instanceof Error ? error.message : 'Unknown storage error',
          });
        }
      }
      return { key: e.key, label: e.label, submitted: Boolean(e.path), url, urlError };
    }),
  );

  return (
    <main className="mx-auto max-w-7xl font-sans">
      <Link
        href="/admin/artisans"
        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-brand-800 transition hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to artisan directory
      </Link>
      <header className="mt-4 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-abaca-200/80 bg-gradient-to-r from-[#fffaf0] via-white to-[#f8f2e7] px-5 py-5 shadow-sm sm:px-7">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ochre-800">
            <ShieldCheck size={14} aria-hidden="true" />
            Artisan application review
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-brand-900 sm:text-3xl">
            Review: {artisan.name}
          </h1>
          <p className="mt-1 text-sm leading-5 text-stone-600">
            Check the profile, verification results, and submitted evidence before making a decision.
          </p>
        </div>
      </header>
      <ArtisanReviewClient
        artisan={{
          id: artisan.id, name: artisan.name, email: artisan.email, phone: artisan.phone,
          location: artisan.location, craft_type: artisan.craft_type, business_name: artisan.business_name,
          bio: artisan.bio, status: artisan.verification_status,
          application_submitted: artisan.application_submitted !== false,
          id_number: artisan.id_number ?? null, id_type: artisan.id_type ?? null, dob: artisan.dob ?? null,
          id_expiry_date: artisan.id_expiry_date ?? null, id_expiry_checked: artisan.id_expiry_checked ?? false,
          face_matched: artisan.face_matched ?? null, face_confidence: artisan.face_confidence ?? null,
          duplicate_face_match: artisan.duplicate_face_match ?? null,
          liveness_status: artisan.liveness_status ?? null,
          liveness_challenges: Array.isArray(artisan.liveness_challenges) ? artisan.liveness_challenges : [],
          liveness_verified_at: artisan.liveness_verified_at ?? null,
          registration_notes: artisan.registration_notes ?? null,
          verification_decision: artisan.verification_decision ?? 'manual_review',
          indigenous_affiliation: artisan.indigenous_affiliation ?? null,
          has_id_docs: Boolean(artisan.id_document_path), has_proof: Boolean(artisan.proof_of_craft_path),
        }}
        productCount={products.length}
        rules={rules}
        ruleSummary={summary}
        evidence={evidence}
      />
    </main>
  );
}
