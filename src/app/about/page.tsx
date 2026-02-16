import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About this data — Care Home Ratings",
  description:
    "How Care Home Ratings works, where the data comes from, and what CQC ratings mean.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-slate-600">
          Home
        </Link>
        {" / "}
        About this data
      </nav>

      <h1 className="text-2xl font-semibold text-slate-900">
        About this data
      </h1>

      <div className="mt-6 space-y-8 text-[15px] text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Where the data comes from
          </h2>
          <p className="mt-2">
            All ratings and inspection information on this site comes directly
            from the{" "}
            <a
              href="https://www.cqc.org.uk"
              className="underline hover:text-slate-900"
            >
              Care Quality Commission
            </a>{" "}
            (CQC), the independent regulator of health and social care in
            England. The data is published under the{" "}
            <a
              href="http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
              className="underline hover:text-slate-900"
            >
              Open Government Licence
            </a>
            .
          </p>
          <p className="mt-3">
            We access the CQC&apos;s public API, which is updated daily — the
            same data that appears on the CQC&apos;s own website.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            What CQC ratings mean
          </h2>
          <p className="mt-2">
            The CQC inspects every registered care home in England. Each
            inspection results in an overall rating and individual ratings across
            five quality areas:
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>Safe</strong> — Are people protected from abuse and
              avoidable harm?
            </li>
            <li>
              <strong>Effective</strong> — Does the care, treatment and support
              achieve good outcomes?
            </li>
            <li>
              <strong>Caring</strong> — Do staff involve and treat people with
              compassion, kindness, dignity and respect?
            </li>
            <li>
              <strong>Responsive</strong> — Are services organised so they meet
              people&apos;s needs?
            </li>
            <li>
              <strong>Well-led</strong> — Does the leadership, management and
              governance assure high-quality, person-centred care?
            </li>
          </ul>
          <p className="mt-3">
            Each area is rated independently, so a care home rated
            &ldquo;Good&rdquo; overall may still have individual areas rated
            differently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Important things to know
          </h2>
          <ul className="mt-2 space-y-2">
            <li>
              <strong>Ratings reflect a point in time.</strong> A care home may
              have improved or declined since its last inspection. Always check
              the inspection date.
            </li>
            <li>
              <strong>This site is independent.</strong> We are not affiliated
              with, endorsed by, or connected to the CQC in any way.
            </li>
            <li>
              <strong>Ratings are not the whole picture.</strong> They are an
              important starting point, but we strongly recommend visiting care
              homes in person, speaking with staff, and talking to families of
              current residents before making a decision.
            </li>
            <li>
              <strong>Always verify directly.</strong> For the most up-to-date
              information, check the{" "}
              <a
                href="https://www.cqc.org.uk"
                className="underline hover:text-slate-900"
              >
                CQC website
              </a>{" "}
              or contact the care home directly.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Coverage
          </h2>
          <p className="mt-2">
            This site covers care homes in <strong>England</strong> only. The
            CQC does not regulate care homes in Scotland, Wales or Northern
            Ireland — these are regulated by the Care Inspectorate, Care
            Inspectorate Wales, and the Regulation and Quality Improvement
            Authority respectively.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Our methodology
          </h2>
          <p className="mt-2">
            We combine CQC data with other open datasets — including hospital
            locations and inspection history — to give a fuller picture of each
            care home.{" "}
            <Link
              href="/methodology"
              className="underline hover:text-slate-900"
            >
              Read our full methodology
            </Link>
            , including what data we use, what we don&apos;t, and why.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            How this site is funded
          </h2>
          <p className="mt-2">
            Care Home Ratings is free to use. We may earn a small commission
            from recommended products and services, which are clearly marked.
            Our care home data and editorial content are entirely independent of
            any commercial relationships. No care home can pay to influence its
            position in our results.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <p className="mt-2">
            If you have questions or feedback about this site, please email{" "}
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
