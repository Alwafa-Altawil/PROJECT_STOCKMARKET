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

  const generateNews = useCallback(async (stockId?: number) => {
    setLoading(true);
    setError(null);
    try {
      if (stockId) {
        const response = await api.post("/news/generate-stock/", { stock_id: stockId });
        return response.data;
      } else {
        const response = await api.post("/news/generate/");
        setNews(response.data.news);
        return response.data.news;
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Failed to generate news";
      setError(message);
      console.error("Error generating news:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNews = useCallback(async (stockId?: number) => {
    return fetchLatestNews(stockId);
  }, [fetchLatestNews]);

  const triggerBigNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/news/trigger-big/");
      // Prepend the created news to the list
      setNews((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Failed to trigger big news";
      setError(message);
      console.error("Error triggering big news:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    news,
    loading,
    error,
    fetchLatestNews,
    generateNews,
    refreshNews,
    triggerBigNews,
  };
};
