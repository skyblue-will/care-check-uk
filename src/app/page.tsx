import { Suspense } from "react";
import SearchHero from "@/components/SearchHero";

export default function Home() {
  return (
    <>
      <Suspense>
        <SearchHero />
      </Suspense>

      {/* What you'll find */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-10">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Official CQC ratings
            </h3>
            <p className="mt-2 text-slate-600 text-[15px] leading-relaxed">
              Every care home in England is inspected and rated by the Care
              Quality Commission across five areas: Safe, Effective, Caring,
              Responsive, and Well-led.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Compare side by side
            </h3>
            <p className="mt-2 text-slate-600 text-[15px] leading-relaxed">
              See how care homes near you compare on each quality area. Filter
              by residential or nursing care, specialist services, and number of
              beds.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Updated regularly
            </h3>
            <p className="mt-2 text-slate-600 text-[15px] leading-relaxed">
              Ratings are sourced directly from the CQC and updated as new
              inspections are published. Check when each home was last
              inspected.
            </p>
          </div>
        </div>
      </section>

      {/* Understanding ratings */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-xl font-semibold text-slate-900">
            Understanding CQC ratings
          </h2>
          <p className="mt-3 text-slate-600 max-w-3xl text-[15px] leading-relaxed">
            The CQC inspects every care home in England and gives each one an
            overall rating. They also rate five specific quality areas
            independently, so a home rated &ldquo;Good&rdquo; overall might
            still have areas that need improvement.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RatingExplainer
              rating="Outstanding"
              color="bg-emerald-50 border-emerald-200 text-emerald-800"
              description="The service is performing exceptionally well."
            />
            <RatingExplainer
              rating="Good"
              color="bg-sky-50 border-sky-200 text-sky-800"
              description="The service is performing well and meeting expectations."
            />
            <RatingExplainer
              rating="Requires Improvement"
              color="bg-amber-50 border-amber-200 text-amber-800"
              description="The service isn't performing as well as it should."
            />
            <RatingExplainer
              rating="Inadequate"
              color="bg-red-50 border-red-200 text-red-800"
              description="The service is performing badly and action has been taken."
            />
          </div>
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              The five quality areas
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                { name: "Safe", desc: "Are people protected from abuse and avoidable harm?" },
                { name: "Effective", desc: "Does the care achieve good outcomes?" },
                { name: "Caring", desc: "Do staff treat people with compassion and kindness?" },
                { name: "Responsive", desc: "Are services organised to meet people's needs?" },
                { name: "Well-led", desc: "Does the leadership ensure high-quality care?" },
              ].map((area) => (
                <div
                  key={area.name}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex-1 min-w-[180px]"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    {area.name}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{area.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Practical guidance */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-xl font-semibold text-slate-900">
          Choosing a care home
        </h2>
        <p className="mt-3 text-slate-600 max-w-3xl text-[15px] leading-relaxed">
          CQC ratings are an important starting point, but they&apos;re not the
          whole picture. When you&apos;ve shortlisted homes based on their
          ratings, consider:
        </p>
        <ul className="mt-4 space-y-2 text-[15px] text-slate-600 max-w-3xl">
          <li className="flex gap-2">
            <span className="text-slate-400 flex-shrink-0">—</span>
            <span>
              Visit in person at different times of day. Ask to stay for a meal.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 flex-shrink-0">—</span>
            <span>
              Ask about staff turnover and how many permanent staff they have.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 flex-shrink-0">—</span>
            <span>
              Check what&apos;s included in the fees and what costs extra.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 flex-shrink-0">—</span>
            <span>
              Read the full CQC inspection report, not just the headline rating.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 flex-shrink-0">—</span>
            <span>
              Talk to families of current residents if you can.
            </span>
          </li>
        </ul>
      </section>
    </>
  );
}

function RatingExplainer({
  rating,
  color,
  description,
}: {
  rating: string;
  color: string;
  description: string;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${color}`}>
      <span className="text-sm font-semibold">{rating}</span>
      <p className="text-xs mt-1 opacity-80">{description}</p>
    </div>
  );
}
