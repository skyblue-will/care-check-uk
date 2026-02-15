export default function HowItWorks() {
  const steps = [
    {
      icon: "🔍",
      title: "Search by postcode",
      desc: "Enter any postcode in England to find nearby care homes.",
    },
    {
      icon: "⭐",
      title: "Compare ratings",
      desc: "See CQC ratings at a glance — Outstanding, Good, Requires Improvement, or Inadequate.",
    },
    {
      icon: "📋",
      title: "Read the details",
      desc: "Dive into inspection results across all five quality areas: Safe, Effective, Caring, Responsive, and Well-led.",
    },
  ];

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center text-stone-900">
          How it works
        </h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.title} className="text-center">
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-lg font-semibold text-stone-900">
                {step.title}
              </h3>
              <p className="mt-2 text-stone-600 text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
