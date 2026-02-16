import { cqcFetch } from "@/lib/cqc";
import { getLocalData } from "@/lib/search-local";
import RatingBadge from "@/components/RatingBadge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface LocationData {
  locationId: string;
  name: string;
  postalCode: string;
  postalAddressLine1?: string;
  postalAddressLine2?: string;
  postalAddressTownCity?: string;
  region?: string;
  localAuthority?: string;
  numberOfBeds?: number;
  website?: string;
  mainPhoneNumber?: string;
  brandName?: string;
  registrationDate?: string;
  gacServiceTypes?: { name: string; description: string }[];
  specialisms?: { name: string }[];
  regulatedActivities?: {
    name: string;
    contacts?: {
      personGivenName: string;
      personFamilyName: string;
      personRoles: string[];
    }[];
  }[];
  currentRatings?: {
    overall?: {
      rating?: string;
      reportDate?: string;
      keyQuestionRatings?: {
        name: string;
        rating: string;
        reportDate: string;
      }[];
    };
  };
  lastInspection?: { date?: string };
  lastReport?: { publicationDate?: string };
  reports?: { linkId: string; reportDate: string; reportUri: string }[];
}

async function getLocationData(id: string): Promise<LocationData | null> {
  try {
    return await cqcFetch(`/locations/${id}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getLocationData(id);
  if (!data) return { title: "Care Home Not Found" };
  const rating = data.currentRatings?.overall?.rating;
  const town = data.postalAddressTownCity || data.localAuthority || "";
  return {
    title: `${data.name}${town ? `, ${town}` : ""} — CQC Rating: ${rating || "Not Rated"} | Care Home Ratings`,
    description: `CQC inspection ratings for ${data.name} in ${town}. Overall: ${rating || "Not yet rated"}. ${data.numberOfBeds ? `${data.numberOfBeds} beds.` : ""} View full ratings breakdown and inspection details.`,
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLocationData(id);

  if (!data) notFound();

  const ratings = data.currentRatings?.overall;
  const keyRatings = ratings?.keyQuestionRatings || [];
  const address = [data.postalAddressLine1, data.postalAddressLine2]
    .filter(Boolean)
    .join(", ");
  const manager = data.regulatedActivities?.[0]?.contacts?.[0];
  const town = data.postalAddressTownCity || "";

  // Enriched local data
  const local = getLocalData(id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-slate-600">
          Home
        </Link>
        {" / "}
        <Link
          href={`/search?postcode=${encodeURIComponent(data.postalCode)}`}
          className="hover:text-slate-600"
        >
          Care homes near {data.postalCode}
        </Link>
      </nav>

      {/* Header */}
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(data.gacServiceTypes || []).map((t) => (
            <span
              key={t.name}
              className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded"
            >
              {t.name === "Residential homes"
                ? "Residential care home"
                : t.name === "Nursing homes"
                  ? "Nursing home"
                  : t.name}
            </span>
          ))}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
          {data.name}
        </h1>
        <p className="mt-2 text-slate-500">
          {address}
          {town ? `, ${town}` : ""}, {data.postalCode}
        </p>
      </div>

      {/* Overall rating */}
      <section className="mt-8 bg-slate-50 rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">
              Overall CQC rating
            </p>
            <div className="mt-2">
              <RatingBadge rating={ratings?.rating || null} size="lg" />
            </div>
            {ratings?.reportDate && (
              <p className="text-xs text-slate-400 mt-2">
                Rating published{" "}
                {new Date(ratings.reportDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          {data.locationId && (
            <a
              href={`https://www.cqc.org.uk/location/${data.locationId}/inspection-summary`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 underline hover:text-slate-900"
            >
              Read full inspection report
            </a>
          )}
        </div>
        {data.lastInspection?.date && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Last inspected{" "}
                  {new Date(data.lastInspection.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {ratings?.reportDate && data.lastInspection.date !== ratings.reportDate && (
                  <p className="text-xs text-slate-400 mt-1">
                    The rating above may date from an earlier inspection. CQC
                    only updates ratings when they assess the relevant quality areas.
                  </p>
                )}
              </div>
              {data.lastReport?.publicationDate && (
                <p className="text-xs text-slate-400 flex-shrink-0 ml-4">
                  Report published{" "}
                  {new Date(data.lastReport.publicationDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Ratings breakdown */}
      {keyRatings.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Ratings by quality area
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {keyRatings.map((kq) => (
              <div
                key={kq.name}
                className="flex items-center justify-between px-5 py-3.5 bg-white"
              >
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    {kq.name}
                  </span>
                  <p className="text-xs text-slate-400">
                    {qualityAreaDescription(kq.name)}
                  </p>
                </div>
                <RatingBadge rating={kq.rating} size="sm" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inspection trend */}
      {local?.trend && local.trend !== 'new' && (
        <section className="mt-6">
          <div className={`rounded-lg border p-5 ${
            local.trend === 'up'
              ? 'border-emerald-200 bg-emerald-50'
              : local.trend === 'down'
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">
                {local.trend === 'up' ? '↑' : local.trend === 'down' ? '↓' : '→'}
              </span>
              <div>
                <p className={`text-sm font-medium ${
                  local.trend === 'up'
                    ? 'text-emerald-900'
                    : local.trend === 'down'
                      ? 'text-amber-900'
                      : 'text-slate-900'
                }`}>
                  {local.trend === 'up' && `Rating improved from ${local.prev_r}`}
                  {local.trend === 'down' && `Rating declined from ${local.prev_r}`}
                  {local.trend === 'stable' && 'Rating unchanged since last inspection'}
                </p>
                {local.insp_n && (
                  <p className="text-xs text-slate-500 mt-1">
                    {local.insp_n} rated inspection{local.insp_n !== 1 ? 's' : ''} on record
                    {local.first_r && (
                      <> · First rated {new Date(local.first_r).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Local healthcare */}
      {local && (local.ae_name || local.gp_name) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Local healthcare
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
            {local.ae_name && local.ae_miles !== null && (
              <div className="px-5 py-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Nearest A&amp;E
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {local.ae_name}
                    </p>
                    {local.ae_4h != null && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {local.ae_4h}% of patients seen within 4 hours (Jan 2026)
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-slate-500 flex-shrink-0 ml-4">
                    {local.ae_miles} mi
                  </span>
                </div>
              </div>
            )}
            {local.gp_miles !== null && (
              <div className="px-5 py-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Nearest GP surgery
                    </p>
                    {local.gp_name && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {local.gp_name}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 flex-shrink-0 ml-4 text-right">
                    <p>{local.gp_miles} mi</p>
                    {local.gp_n != null && local.gp_n > 0 && (
                      <p className="text-xs text-slate-400">{local.gp_n} within 2 mi</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {local.ph_miles !== null && (
              <div className="px-5 py-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Nearest pharmacy
                    </p>
                    {local.ph_name && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {local.ph_name}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 flex-shrink-0 ml-4 text-right">
                    <p>{local.ph_miles} mi</p>
                    {local.ph_n != null && local.ph_n > 0 && (
                      <p className="text-xs text-slate-400">{local.ph_n} within 2 mi</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {local.dn_miles !== null && (
              <div className="px-5 py-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Nearest dentist
                    </p>
                  </div>
                  <div className="text-sm text-slate-500 flex-shrink-0 ml-4 text-right">
                    <p>{local.dn_miles} mi</p>
                    {local.dn_n != null && local.dn_n > 0 && (
                      <p className="text-xs text-slate-400">{local.dn_n} within 2 mi</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Healthcare locations from OpenStreetMap. Distances are approximate (straight line).
          </p>
        </section>
      )}

      {/* Area information — fees & safety */}
      {local && (local.la_res || local.crime_n != null) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Area information
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
            {(local.la_res || local.la_nurs) && (
              <div className="px-5 py-3.5">
                <p className="text-sm font-medium text-slate-900">
                  Council-funded care home fees
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Average rates paid by {data.localAuthority || "the local authority"} (2025–26)
                </p>
                <div className="flex gap-6 mt-2">
                  {local.la_res && (
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        £{local.la_res.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">per week, residential</p>
                    </div>
                  )}
                  {local.la_nurs && (
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        £{local.la_nurs.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">per week, nursing</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Self-funded residents typically pay more. These are the rates local authorities
                  pay providers on behalf of council-funded residents.
                </p>
              </div>
            )}
            {local.crime_n != null && (
              <div className="px-5 py-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Recorded crime nearby
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Street-level crimes reported in this area ({local.crime_d ? new Date(local.crime_d + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'latest month'})
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-slate-900 flex-shrink-0 ml-4">
                    {local.crime_n}
                  </span>
                </div>
                {local.crime_t && local.crime_n > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Most common: {local.crime_t.replace(/-/g, ' ')}
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Fee data from DHSC MSIF reporting. Crime data from police.uk under the Open Government Licence.
          </p>
        </section>
      )}

      {/* Key details */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Details</h2>
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
          {data.numberOfBeds && (
            <DetailRow label="Number of beds" value={String(data.numberOfBeds)} />
          )}
          {data.localAuthority && (
            <DetailRow label="Local authority" value={data.localAuthority} />
          )}
          {data.region && <DetailRow label="Region" value={data.region} />}
          {data.lastInspection?.date && (
            <DetailRow
              label="Last inspected"
              value={new Date(data.lastInspection.date).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "long", year: "numeric" }
              )}
            />
          )}
          {data.registrationDate && (
            <DetailRow
              label="Registered with CQC since"
              value={new Date(data.registrationDate).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "long", year: "numeric" }
              )}
            />
          )}
          {manager && (
            <DetailRow
              label="Registered manager"
              value={`${manager.personGivenName} ${manager.personFamilyName}`}
            />
          )}
          {data.website && (
            <DetailRow
              label="Website"
              value={
                <a
                  href={
                    data.website.startsWith("http")
                      ? data.website
                      : `https://${data.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 underline hover:text-slate-900"
                >
                  {data.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              }
            />
          )}
          <DetailRow
            label="CQC page"
            value={
              <a
                href={`https://www.cqc.org.uk/location/${data.locationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 underline hover:text-slate-900"
              >
                View on cqc.org.uk
              </a>
            }
          />
        </div>
      </section>

      {/* Specialisms */}
      {data.specialisms && data.specialisms.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Services and specialisms
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.specialisms.map((s) => (
              <span
                key={s.name}
                className="text-sm px-3 py-1 bg-slate-100 text-slate-700 rounded"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Attribution */}
      <footer className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 space-y-1">
        <p>
          Ratings and inspection data from the{" "}
          <a href="https://www.cqc.org.uk" className="underline hover:text-slate-600">
            Care Quality Commission
          </a>{" "}
          under the Open Government Licence. Hospital data from OpenStreetMap.
        </p>
        <p>
          <Link href="/methodology" className="underline hover:text-slate-600">
            Read our methodology
          </Link>
          {" · "}
          This is not medical advice. Always visit a care home in person before making a decision.
        </p>
      </footer>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 px-5 py-3">
      <span className="text-sm text-slate-500 sm:w-52 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}

function qualityAreaDescription(name: string): string {
  const descriptions: Record<string, string> = {
    Safe: "Are people protected from abuse and avoidable harm?",
    Effective: "Does the care achieve good outcomes and help maintain quality of life?",
    Caring: "Do staff involve and treat people with compassion, kindness and respect?",
    Responsive: "Are services organised so they meet people\u2019s needs?",
    "Well-led": "Does the leadership ensure high-quality, person-centred care?",
  };
  return descriptions[name] || "";
}
