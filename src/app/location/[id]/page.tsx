import { cqcFetch } from "@/lib/cqc";
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
  onspdLatitude?: number;
  onspdLongitude?: number;
  gacServiceTypes?: { name: string; description: string }[];
  specialisms?: { name: string }[];
  regulatedActivities?: {
    name: string;
    contacts?: { personGivenName: string; personFamilyName: string; personRoles: string[] }[];
  }[];
  currentRatings?: {
    overall?: {
      rating?: string;
      reportDate?: string;
      keyQuestionRatings?: { name: string; rating: string; reportDate: string }[];
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
  return {
    title: `${data.name} - CQC Rating: ${rating || "Not Rated"} | Care Check UK`,
    description: `${data.name} in ${data.postalAddressTownCity || data.localAuthority}. CQC rating: ${rating || "Not yet rated"}. ${data.numberOfBeds ? `${data.numberOfBeds} beds.` : ""} View full inspection details and ratings breakdown.`,
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-stone-500 mb-6">
        <Link href="/" className="hover:text-teal-700">
          Home
        </Link>{" "}
        ›{" "}
        <Link
          href={`/search?postcode=${encodeURIComponent(data.postalCode)}`}
          className="hover:text-teal-700"
        >
          Search
        </Link>{" "}
        › {data.name}
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
            {data.name}
          </h1>
          <p className="mt-2 text-stone-600">
            {address}
            {data.postalAddressTownCity
              ? `, ${data.postalAddressTownCity}`
              : ""}
            , {data.postalCode}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {(data.gacServiceTypes || []).map((t) => (
              <span
                key={t.name}
                className="text-sm px-3 py-1 bg-stone-100 text-stone-700 rounded-full"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          <RatingBadge rating={ratings?.rating || null} size="lg" />
        </div>
      </div>

      {/* Key info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {data.numberOfBeds && (
          <InfoCard label="Beds" value={String(data.numberOfBeds)} />
        )}
        {data.localAuthority && (
          <InfoCard label="Local Authority" value={data.localAuthority} />
        )}
        {data.region && <InfoCard label="Region" value={data.region} />}
        {data.lastInspection?.date && (
          <InfoCard
            label="Last Inspected"
            value={new Date(data.lastInspection.date).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" }
            )}
          />
        )}
      </div>

      {/* Ratings breakdown */}
      {keyRatings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            Ratings Breakdown
          </h2>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {keyRatings.map((kq) => (
              <div
                key={kq.name}
                className="flex items-center justify-between px-5 py-4 border-b border-stone-100 last:border-b-0"
              >
                <div>
                  <span className="font-medium text-stone-900">{kq.name}</span>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {kq.reportDate &&
                      `Rated ${new Date(kq.reportDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
                  </p>
                </div>
                <RatingBadge rating={kq.rating} size="sm" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Specialisms */}
      {data.specialisms && data.specialisms.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            Specialisms & Services
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.specialisms.map((s) => (
              <span
                key={s.name}
                className="text-sm px-3 py-1.5 bg-teal-50 text-teal-800 rounded-full"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Contact & Links */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-stone-900 mb-4">
          Contact & Details
        </h2>
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
          {manager && (
            <DetailRow
              label="Registered Manager"
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
                  className="text-teal-700 hover:underline"
                >
                  {data.website}
                </a>
              }
            />
          )}
          {data.registrationDate && (
            <DetailRow
              label="Registered Since"
              value={new Date(data.registrationDate).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "long", year: "numeric" }
              )}
            />
          )}
          <DetailRow
            label="CQC Page"
            value={
              <a
                href={`https://www.cqc.org.uk/location/${data.locationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:underline"
              >
                View on CQC website →
              </a>
            }
          />
          {data.reports?.[0] && (
            <DetailRow
              label="Latest Report"
              value={
                <a
                  href={`https://www.cqc.org.uk${data.reports[0].reportUri}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:underline"
                >
                  Read full inspection report →
                </a>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 text-center">
      <div className="text-lg font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <span className="text-sm font-medium text-stone-500 sm:w-40 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-stone-900">{value}</span>
    </div>
  );
}
