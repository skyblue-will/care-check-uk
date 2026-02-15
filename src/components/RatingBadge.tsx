const ratingConfig: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  Outstanding: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    label: "Outstanding",
  },
  Good: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    label: "Good",
  },
  "Requires improvement": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    label: "Requires Improvement",
  },
  Inadequate: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    label: "Inadequate",
  },
};

export default function RatingBadge({
  rating,
  size = "md",
}: {
  rating: string | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!rating || rating === "No published rating") {
    return (
      <div className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50">
        <span className="text-xs text-slate-400 font-medium">Not rated</span>
      </div>
    );
  }

  const config = ratingConfig[rating] || {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    label: rating,
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <div
      className={`inline-flex items-center rounded border ${config.bg} ${config.border} ${sizeClasses[size]}`}
    >
      <span className={`font-semibold ${config.text}`}>{config.label}</span>
    </div>
  );
}
