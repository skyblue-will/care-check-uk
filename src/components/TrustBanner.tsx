export default function TrustBanner() {
  const stats = [
    { label: "Care homes rated", value: "15,000+" },
    { label: "Rating categories", value: "5" },
    { label: "Updated", value: "Daily" },
  ];

  return (
    <section className="py-10 bg-white border-y border-stone-200">
      <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-8 sm:gap-16">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-bold text-teal-700">{s.value}</div>
            <div className="text-sm text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
