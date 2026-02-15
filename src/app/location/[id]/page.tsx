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
                Rated{" "}
                {new Date(ratings.reportDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          {data.reports?.[0] && (
            <a
              href={`https://www.cqc.org.uk${data.reports[0].reportUri}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 underline hover:text-slate-900"
            >
              Read full inspection report
            </a>
          )}
        </div>
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

      {/* Area insights */}
      {local && (local.ae_name || local.imd !== null) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Area insights
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {local.ae_name && local.ae_miles !== null && (
              <div className="border border-slate-200 rounded-lg p-5 bg-white">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Nearest A&amp;E
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-900">
                  {local.ae_name}
                </p>
                <p className="text-sm text-slate-500">
                  {local.ae_miles} {local.ae_miles === 1 ? "mile" : "miles"} away
                </p>
              </div>
            )}
            {local.imd !== null && local.imd_d !== null && (
              <div className="border border-slate-200 rounded-lg p-5 bg-white">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Area deprivation
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-900">
                  {imdLabel(local.imd_d)}
                </p>
                <p className="text-sm text-slate-500">
                  IMD decile {local.imd_d} of 10
                  {local.idaopi !== null && (
                    <> &middot; {local.idaopi}% older people in income deprivation</>
                  )}
                </p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Hospital data from OpenStreetMap. Deprivation from English Indices of Deprivation 2019 (MHCLG). Distance is approximate (straight line).
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

function imdLabel(decile: number): string {
  if (decile <= 2) return "Least deprived areas";
  if (decile <= 4) return "Below average deprivation";
  if (decile <= 6) return "Average deprivation";
  if (decile <= 8) return "Above average deprivation";
  return "Most deprived areas";
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
