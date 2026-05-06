import { useState, useCallback } from "react";
import { apiService } from "@/lib/api-service";
import { Stock, PortfolioStatus, Forecast, MarketTickResponse } from "@/types";

const getApiErrorMessage = (err: any, fallback: string) => {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.message) return err.message;
  return fallback;
};

export const useMarket = () => {
  const [marketSource, setMarketSource] = useState<"INTERNAL" | "ALPHA_VANTAGE">("INTERNAL");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioStatus | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketState = useCallback(async (source = marketSource) => {
    try {
      const data = await apiService.fetchMarketState(source);
      setStocks(data.stocks);
      return data.stocks;
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Error loading market data");
      console.error("Error fetching market state:", message);
      setError(message);
      return [];
    }
  }, [marketSource]);

  const updateMarketPrices = useCallback(async (source = marketSource) => {
    try {
      const data: MarketTickResponse = await apiService.updateMarketPrices(0.0008, 0.0, source);

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
      const message = getApiErrorMessage(err, "Network error while updating market");
      console.error("Error updating market:", message);
    }
  }, [marketSource]);

  const switchMarketSource = useCallback(
    async (source: "INTERNAL" | "ALPHA_VANTAGE") => {
      try {
        setLoading(true);
        setError(null);
        if (source === "ALPHA_VANTAGE") {
          await apiService.seedAlphaVantageStocks();
        }
        setMarketSource(source);
        const data = await apiService.fetchMarketState(source);
        setStocks(data.stocks);
        return data.stocks;
      } catch (err: any) {
        const message = getApiErrorMessage(
          err,
          "Error switching market source"
        );
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchPortfolio = useCallback(async () => {
    try {
      const data = await apiService.fetchPortfolio();
      setPortfolio(data);
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Network error while fetching portfolio");
      console.error("Error fetching portfolio:", message);
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
    marketSource,
    switchMarketSource,
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
