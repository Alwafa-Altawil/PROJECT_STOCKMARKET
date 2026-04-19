interface StatCardProps {
  title: string;
  value: string;
  change?: string;
}

export function StatCard({ title, value, change }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
      <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
        {title}
      </h3>
      <p className="text-3xl font-black text-zinc-900">{value}</p>
      {change && (
        <p
          className={`text-sm font-semibold mt-1 ${
            parseFloat(change) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {change}
        </p>
      )}
    </div>
  );
}
