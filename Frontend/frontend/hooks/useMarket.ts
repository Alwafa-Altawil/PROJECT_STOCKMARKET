import { useState, useCallback } from "react";
import { apiService } from "@/lib/api-service";
import { Stock, PortfolioStatus, Forecast, MarketTickResponse } from "@/types";

export const useMarket = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioStatus | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketState = useCallback(async () => {
    try {
      const data = await apiService.fetchMarketState();
      setStocks(data.stocks);
      return data.stocks;
    } catch (err: any) {
      console.error("Error fetching market state:", err);
      setError(err.response?.data?.error || "Error loading market data");
      return [];
    }
  }, []);

  const updateMarketPrices = useCallback(async () => {
    try {
      const data: MarketTickResponse = await apiService.updateMarketPrices(0.015, 0.0001);

      setStocks((prevStocks) => {
        const stockMap = new Map(data.updated.map((s) => [s.id, s]));
        return prevStocks.map((stock) => {
          const updated = stockMap.get(stock.id);
          if (updated) {
            return {
              ...stock,
              price: updated.price,
              history: updated.history,
            };
          }
          return stock;
        });
      });
    } catch (err: any) {
      console.error("Error updating market:", err);
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    try {
      const data = await apiService.fetchPortfolio();
      setPortfolio(data);
    } catch (err: any) {
      console.error("Error fetching portfolio:", err.response?.status, err.response?.data);
    }
  }, []);

  const fetchForecasts = useCallback(async () => {
    const data = await apiService.fetchForecasts();
    setForecasts(data);
  }, []);

  const createForecast = useCallback(
    async (stockId: number, horizonDays: number, paths: number) => {
      try {
        setLoading(true);
        const forecast = await apiService.createForecast(stockId, horizonDays, paths);
        setForecasts((prev) => [forecast, ...prev]);
        return forecast;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || "Error creating forecast";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const buyStock = useCallback(
    async (stockId: number, quantity: number) => {
      try {
        setLoading(true);
        const result = await apiService.buyStock(stockId, quantity);
        await fetchPortfolio();
        return result;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || "Error buying stock";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchPortfolio]
  );

  const sellStock = useCallback(
    async (stockId: number, quantity: number) => {
      try {
        setLoading(true);
        const result = await apiService.sellStock(stockId, quantity);
        await fetchPortfolio();
        return result;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || "Error selling stock";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchPortfolio]
  );

  return {
    stocks,
    setStocks,
    portfolio,
    setPortfolio,
    forecasts,
    setForecasts,
    loading,
    error,
    setError,
    fetchMarketState,
    updateMarketPrices,
    fetchPortfolio,
    fetchForecasts,
    createForecast,
    buyStock,
    sellStock,
  };
};
