import React, { useEffect, useState } from "react";
import { useNews } from "@/hooks/useNews";
import { NewsCard } from "./NewsCard";
import { News } from "@/types";

interface NewsStreamProps {
  stockId?: number;
  title?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const NewsStream: React.FC<NewsStreamProps> = ({
  stockId,
  title = "Market News",
  autoRefresh = true,
  refreshInterval = 60000, // 60 seconds
}) => {
  const { news, loading, error, fetchLatestNews, generateNews } = useNews();
  const [displayedNews, setDisplayedNews] = useState<News[]>([]);
  const [animatingNews, setAnimatingNews] = useState<number | null>(null);

  // Initial load
  useEffect(() => {
    fetchLatestNews(stockId, 10);
  }, [stockId, fetchLatestNews]);

  // Auto-generate news
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const newNewsItem = await generateNews(stockId);
        if (newNewsItem) {
          // Add animation class for new items
          setAnimatingNews(newNewsItem.id);
          setTimeout(() => setAnimatingNews(null), 500);
          
          // Refresh the news feed
          await fetchLatestNews(stockId, 10);
        }
      } catch (err) {
        console.error("Error in auto-refresh:", err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, stockId, generateNews, fetchLatestNews]);

  // Update displayed news when news changes
  useEffect(() => {
    setDisplayedNews(news);
  }, [news]);

  const handleManualRefresh = async () => {
    try {
      const newNewsItem = await generateNews(stockId);
      if (newNewsItem) {
        setAnimatingNews(newNewsItem.id);
        setTimeout(() => setAnimatingNews(null), 500);
        await fetchLatestNews(stockId, 10);
      }
    } catch (err) {
      console.error("Error refreshing news:", err);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-semibold transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      {displayedNews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {loading ? "Loading news..." : "No news available"}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {displayedNews.map((newsItem) => (
            <div
              key={newsItem.id}
              className={`transition-all duration-500 ${
                animatingNews === newsItem.id
                  ? "animate-pulse scale-105 opacity-100"
                  : "opacity-100 scale-100"
              }`}
            >
              <NewsCard news={newsItem} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
        <span>{displayedNews.length} news items</span>
        {autoRefresh && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Auto-refresh every {Math.floor(refreshInterval / 1000)}s
          </span>
        )}
      </div>
    </div>
  );
};
