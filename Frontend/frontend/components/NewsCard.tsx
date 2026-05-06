import React from "react";
import { News } from "@/types";

interface NewsCardProps {
  news: News;
  onClose?: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ news, onClose }) => {
  const getHintBadge = (impact: number) => {
    const intensity = Math.abs(impact);
    if (intensity >= 25) return { label: "Hint: Impact élevé", style: "bg-zinc-800 text-white" };
    if (intensity >= 10) return { label: "Hint: Impact modéré", style: "bg-zinc-200 text-zinc-800" };
    return { label: "Hint: Impact faible", style: "bg-zinc-100 text-zinc-700" };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hintBadge = getHintBadge(news.impact_percentage);

  return (
    <div className="border rounded-lg p-4 mb-3 bg-white border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900">
              {news.stock.symbol}
            </span>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${hintBadge.style}`}>
              {hintBadge.label}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">{news.headline}</h3>
          <p className="text-sm text-gray-700 mb-2">{news.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{formatDate(news.created_at)}</span>
            <span className="text-xs text-gray-500">Price: ${Number(news.stock?.price ?? 0).toFixed(2)}</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
