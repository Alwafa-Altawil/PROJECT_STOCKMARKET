import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { News } from "@/types";

export const useNews = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestNews = useCallback(async (stockId?: number, limit: number = 20) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (stockId) params.append("stock_id", stockId.toString());
      params.append("limit", limit.toString());

      const response = await api.get(`/news/latest/?${params.toString()}`);
      setNews(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Failed to fetch news";
      setError(message);
      console.error("Error fetching news:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAutoNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/news/trigger-big/");
      setNews((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Failed to auto-generate news";
      setError(message);
      console.error("Error auto-generating news:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNews = useCallback(async (stockId?: number) => {
    return fetchLatestNews(stockId);
  }, [fetchLatestNews]);

  return {
    news,
    loading,
    error,
    fetchLatestNews,
    triggerAutoNews,
    refreshNews,
  };
};
