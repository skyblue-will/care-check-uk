import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our methodology — Care Home Ratings",
  description:
    "How we collect, process and present care home data. Our sources, what we show, what we don't, and why.",
};

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-slate-600">
          Home
        </Link>
        {" / "}
        <Link href="/about" className="hover:text-slate-600">
          About
        </Link>
        {" / "}
        Methodology
      </nav>

      <h1 className="text-2xl font-semibold text-slate-900">
        Our methodology
      </h1>
      <p className="mt-3 text-slate-500">
        We combine multiple open datasets to give families a fuller picture of
        each care home and its surroundings. This page explains exactly what we
        use, how we use it, and the editorial decisions we&apos;ve made.
      </p>

      <div className="mt-8 space-y-10 text-[15px] text-slate-600 leading-relaxed">
        {/* CQC Ratings */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            CQC ratings and inspection data
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Source</dt>
              <dd>
                <a
                  href="https://www.cqc.org.uk"
                  className="underline hover:text-slate-900"
                >
                  Care Quality Commission
                </a>{" "}
                public API
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Licence</dt>
              <dd>Open Government Licence v3.0</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Coverage</dt>
              <dd>14,796 care homes in England</dd>
            </div>
          </dl>
          <p className="mt-3">
            Every care home listed on this site is CQC-registered. We pull
            current ratings, the five quality area ratings (Safe, Effective,
            Caring, Responsive, Well-led), bed count, service types, specialisms,
            and inspection dates directly from the CQC&apos;s API — the same
            source that feeds the CQC&apos;s own website.
          </p>
        </section>

        {/* Inspection Trend */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Inspection trend
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Source</dt>
              <dd>CQC API — historic inspection ratings</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Coverage</dt>
              <dd>10,746 care homes with rated inspections</dd>
            </div>
          </dl>
          <p className="mt-3">
            A CQC rating is a snapshot. We think families also deserve to know
            the direction of travel. For each care home with more than one rated
            inspection, we compare the two most recent ratings to show whether
            the home is <strong>improving</strong>, <strong>stable</strong>, or{" "}
            <strong>declining</strong>.
          </p>
          <p className="mt-3">
            Inspections marked &ldquo;Inspected but not rated&rdquo; are
            excluded from this calculation. We only compare full rated
            inspections.
          </p>
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-slate-900">Current distribution:</p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li>Improving — 2,878 care homes (27%)</li>
              <li>Stable — 5,996 care homes (56%)</li>
              <li>Declining — 812 care homes (7.5%)</li>
              <li>Only one inspection on record — 1,060 care homes (10%)</li>
            </ul>
          </div>
        </section>

        {/* Nearest A&E */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Nearest A&amp;E hospital
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Source</dt>
              <dd>
                <a
                  href="https://www.openstreetmap.org"
                  className="underline hover:text-slate-900"
                >
                  OpenStreetMap
                </a>{" "}
                via Overpass API
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Licence</dt>
              <dd>Open Database Licence (ODbL)</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-20 flex-shrink-0">Coverage</dt>
              <dd>202 hospitals with A&amp;E in England</dd>
            </div>
          </dl>
          <p className="mt-3">
            For each care home, we calculate the straight-line distance to the
            nearest hospital with an Accident &amp; Emergency department. This is{" "}
            <strong>not driving distance</strong> — actual travel time will
            depend on roads and traffic. We state this on the site.
          </p>
          <p className="mt-3">
            The median distance from a care home to the nearest A&amp;E is 4.6
            miles. 78% of care homes are within 10 miles.
          </p>
        </section>

        {/* What we don't show */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            What we don&apos;t show (and why)
          </h2>
          <p className="mt-3">
            We hold additional datasets that we&apos;ve chosen not to display to
            families, because we don&apos;t believe they help with the decision
            at hand.
          </p>
          <p className="mt-3">
            <strong>Area deprivation data</strong> (from the English Indices of
            Deprivation 2019) tells us about the socioeconomic profile of the
            neighbourhood around each care home. Academic research shows a modest
            link between area deprivation and care quality, driven primarily by
            differences in how care is funded. However, we decided this
            information is not actionable for families — the CQC rating and
            inspection trend already capture quality directly — and presenting
            areas as &ldquo;deprived&rdquo; risks stigmatising homes that
            provide perfectly good care.
          </p>
        </section>

        {/* Limitations */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Limitations
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>CQC ratings reflect a point in time.</strong> A home may
              have changed since its last inspection. The inspection trend helps,
              but it&apos;s still based on the last two inspections — there could
              be more recent changes.
            </li>
            <li>
              <strong>We cover England only.</strong> Scotland, Wales and
              Northern Ireland have separate regulators and are not included.
            </li>
            <li>
              <strong>Hospital distances are approximate.</strong> Straight-line
              calculations do not account for roads, traffic or public transport.
            </li>
            <li>
              <strong>We don&apos;t have pricing.</strong> Care home fees vary
              significantly and are not published in any open dataset. We
              recommend contacting homes directly for current fees.
            </li>
            <li>
              <strong>This is a starting point, not a decision.</strong> We
              strongly recommend visiting homes in person, speaking with staff,
              and talking to families of current residents.
            </li>
          </ul>
        </section>

        {/* How we make money */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            How this site is funded
          </h2>
          <p className="mt-3">
            Care Home Ratings is free to use. We may earn a small commission if
            you click through to a recommended product or service (such as
            mobility aids, legal services, or insurance) and make a purchase.
            These links are clearly marked.
          </p>
          <p className="mt-3">
            Our editorial content and care home data are completely independent
            of any commercial relationships. We only recommend products from
            companies with a Trustpilot rating of 4.0 or above, and we always
            include non-commercial alternatives. No care home can pay to
            influence its rating or position in our search results.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Questions about our data?
          </h2>
          <p className="mt-3">
            If you spot an error, have a question about our methodology, or want
            to discuss using our data, email{" "}
            <a
              href="mailto:hello@carehomeratings.co.uk"
              className="underline hover:text-slate-900"
            >
              hello@carehomeratings.co.uk
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
