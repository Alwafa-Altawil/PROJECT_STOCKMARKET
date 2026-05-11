import React, { useState, useEffect } from "react";
import { useNews } from "@/hooks/useNews";
import { NewsCard } from "./NewsCard";
import { Stock } from "@/types";

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  isDarkMode?: boolean;
}

export const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, stocks, isDarkMode }) => {
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
      <div className={`rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode
          ? "bg-zinc-800 border border-zinc-700"
          : "bg-white"
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b transition-colors duration-300 ${
          isDarkMode
            ? "border-zinc-700"
            : "border-gray-200"
        }`}>
          <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {selectedStock ? `${selectedStock.symbol} News` : "Market News"}
          </h2>
          <button
            onClick={onClose}
            className={`text-2xl transition-colors duration-300 ${
              isDarkMode
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <label className={`block text-sm font-semibold mb-2 ${
              isDarkMode
                ? "text-zinc-200"
                : "text-gray-700"
            }`}>
              Filtrer par stock
            </label>
            <select
              value={selectedStockId ?? ""}
              onChange={(e) =>
                setSelectedStockId(e.target.value ? Number.parseInt(e.target.value, 10) : null)
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors duration-300 ${
                isDarkMode
                  ? "bg-zinc-700 border-zinc-600 text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
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
            <div className={`p-3 mb-4 border rounded text-sm transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900 border-red-700 text-red-200"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className={`text-center py-8 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>Loading news...</div>
          ) : news.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>No news available</div>
          ) : (
            <div className="space-y-3">
              {news.map((newsItem) => (
                <NewsCard key={newsItem.id} news={newsItem} isDarkMode={isDarkMode} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-6 border-t transition-colors duration-300 ${
          isDarkMode
            ? "border-zinc-700 bg-zinc-900"
            : "border-gray-200 bg-gray-50"
        }`}>
          <div className={`flex-1 px-4 py-2 text-sm flex items-center justify-center ${
            isDarkMode
              ? "text-zinc-400"
              : "text-gray-600"
          }`}>
            {loading ? "Refreshing..." : "Auto-generation every 60s"}
          </div>
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded hover:transition-colors duration-300 font-semibold ${
              isDarkMode
                ? "bg-zinc-700 text-white hover:bg-zinc-600"
                : "bg-gray-300 text-gray-900 hover:bg-gray-400"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
