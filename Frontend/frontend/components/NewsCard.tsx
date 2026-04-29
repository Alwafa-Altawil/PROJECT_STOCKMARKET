import React from "react";
import { News } from "@/types";

interface NewsCardProps {
  news: News;
  onClose?: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ news, onClose }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return "bg-green-50 border-green-200";
      case "NEGATIVE":
        return "bg-red-50 border-red-200";
      case "NEUTRAL":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  const getSentimentBadgeColor = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return "bg-green-200 text-green-800";
      case "NEGATIVE":
        return "bg-red-200 text-red-800";
      case "NEUTRAL":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0) return "text-green-600";
    if (impact < 0) return "text-red-600";
    return "text-gray-600";
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

  return (
    <div className={`border rounded-lg p-4 mb-3 ${getSentimentColor(news.sentiment)}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900">
              {news.stock.symbol}
            </span>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getSentimentBadgeColor(news.sentiment)}`}>
              {news.sentiment}
            </span>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getImpactColor(news.impact_percentage)}`}>
              {news.impact_percentage > 0 ? "+" : ""}{news.impact_percentage.toFixed(2)}%
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
