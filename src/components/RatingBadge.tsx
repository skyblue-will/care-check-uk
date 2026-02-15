const ratingConfig: Record<string, { bg: string; text: string; label: string }> = {
  Outstanding: { bg: "bg-blue-100", text: "text-blue-800", label: "Outstanding" },
  Good: { bg: "bg-green-100", text: "text-green-800", label: "Good" },
  "Requires improvement": { bg: "bg-amber-100", text: "text-amber-800", label: "Requires Improvement" },
  Inadequate: { bg: "bg-red-100", text: "text-red-800", label: "Inadequate" },
};

export default function RatingBadge({
  rating,
  size = "md",
}: {
  rating: string | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!rating) {
    return (
      <div className="flex flex-col items-center justify-center px-3 py-2 bg-stone-100 rounded-lg">
        <span className="text-xs text-stone-400 font-medium">Not yet rated</span>
      </div>
    );
  }

  const config = ratingConfig[rating] || {
    bg: "bg-stone-100",
    text: "text-stone-700",
    label: rating,
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg ${config.bg} ${sizeClasses[size]}`}
    >
      <span className={`font-bold ${config.text} leading-tight text-center`}>
        {config.label}
      </span>
      <span className="text-[10px] text-stone-400 mt-0.5">CQC Rating</span>
    </div>
  );
}
