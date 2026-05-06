import React, { useState, useEffect } from "react";
import { useNews } from "@/hooks/useNews";
import { NewsCard } from "./NewsCard";
import { Stock } from "@/types";

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
}

export const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, stocks }) => {
  const { news, loading, error, fetchLatestNews } = useNews();
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);

  const selectedStock = selectedStockId
    ? stocks.find((item) => item.id === selectedStockId) || null
    : null;

  useEffect(() => {
    if (isOpen) {
      fetchLatestNews(selectedStockId || undefined, 20);
    }
  }, [isOpen, selectedStockId, fetchLatestNews]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedStock ? `${selectedStock.symbol} News` : "Market News"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filtrer par stock
            </label>
            <select
              value={selectedStockId ?? ""}
              onChange={(e) =>
                setSelectedStockId(e.target.value ? Number.parseInt(e.target.value, 10) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Tous les stocks</option>
              {stocks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.symbol} - {item.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading news...</div>
          ) : news.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No news available</div>
          ) : (
            <div className="space-y-3">
              {news.map((newsItem) => (
                <NewsCard key={newsItem.id} news={newsItem} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex-1 px-4 py-2 text-sm text-gray-600 flex items-center justify-center">
            {loading ? "Refreshing..." : "Auto-generation every 60s"}
          </div>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
