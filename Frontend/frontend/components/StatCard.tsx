interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isDarkMode?: boolean;
}

export function StatCard({ title, value, change, isDarkMode }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${
      isDarkMode
        ? "bg-zinc-700 border-zinc-600"
        : "bg-white border-zinc-200"
    }`}>
      <h3 className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
        isDarkMode ? "text-zinc-300" : "text-zinc-500"
      }`}>
        {title}
      </h3>
      <p className={`text-3xl font-black ${isDarkMode ? "text-white" : "text-zinc-900"}`}>{value}</p>
      {change && (
        <p
          className={`text-sm font-semibold mt-1 ${
            parseFloat(change) >= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {change}
        </p>
      )}
    </div>
  );
}
