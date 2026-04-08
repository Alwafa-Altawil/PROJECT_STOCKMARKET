"use client";

import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/core";
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Type definitions
interface Stock {
  id: number;
  symbol: string;
  name: string;
  price: number;
  history: number[];
  updated_at: string;
}

interface Holding {
  stock_id: number;
  symbol: string;
  name: string;
  quantity: number;
  current_price: number;
  average_buy_price: number;
  position_value: number;
  unrealized_gain: number;
}

interface PortfolioStatus {
  balance: number;
  market_value: number;
  equity: number;
  starting_balance: number;
  total_gain: number;
  total_return_pct: number;
  holdings: Holding[];
  updated_at: string;
}

interface MarketTickResponse {
  updated: Array<{
    id: number;
    symbol: string;
    name: string;
    price: number;
    history: number[];
  }>;
  count: number;
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
}

function StatCard({ title, value, change }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
      <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
        {title}
      </h3>
      <p className="text-3xl font-black text-zinc-900">{value}</p>
      {change && (
        <p className={`text-sm font-semibold mt-1 ${
          parseFloat(change) >= 0 ? "text-green-600" : "text-red-600"
        }`}>
          {change}
        </p>
      )}
    </div>
  );
}

export default function StockApp() {
  const [activeTab, setActiveTab] = useState<string>("portfolio");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioStatus | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  
  const fetchMarketState = async () => {
    try {
      const response = await api.get("/market/state/");
      setStocks(response.data.stocks);
      if (response.data.stocks.length > 0) {
        setSelectedStock(response.data.stocks[0]);
      }
    } catch (err: any) {
      console.error("Error fetching market state:", err);
      setError(err.response?.data?.error || "Error loading market data");
    }
  };

  
  const fetchPortfolio = async () => {
    try {
      const response = await api.get("/portfolio/status/");
      setPortfolio(response.data);
    } catch (err: any) {
      console.error("Error fetching portfolio:", err);
    }
  };

  
  const updateMarketPrices = async () => {
    try {
      const response = await api.post("/market/tick/", {
        daily_volatility: 0.015,
        daily_drift: 0.0001,
      });
      
      
      const tickData: MarketTickResponse = response.data;
      setStocks((prevStocks) => {
        const stockMap = new Map(tickData.updated.map((s) => [s.id, s]));
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
  };

  // Buy stock
  const buy = async () => {
    if (!selectedStock || quantity <= 0) return;

    try {
      setLoading(true);
      const response = await api.post("/trade/buy/", {
        stock_id: selectedStock.id,
        quantity: quantity,
      });

      if (response.data.success) {
        setSuccessMessage(`${quantity} ${selectedStock.symbol} bought at $${response.data.transaction.price}`);
        await fetchPortfolio();
        setQuantity(1);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error buying stock");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Sell stock
  const sell = async () => {
    if (!selectedStock || quantity <= 0) return;

    try {
      setLoading(true);
      const response = await api.post("/trade/sell/", {
        stock_id: selectedStock.id,
        quantity: quantity,
      });

      if (response.data.success) {
        setSuccessMessage(`${quantity} ${selectedStock.symbol} sold at $${response.data.transaction.price}`);
        await fetchPortfolio();
        setQuantity(1);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error selling stock");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and set up polling
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchMarketState();
      await fetchPortfolio();
      setLoading(false);
    };

    initialize();

    // Market update interval (every 1.5 seconds like the original)
    const marketInterval = setInterval(updateMarketPrices, 1500);

    // Portfolio refresh interval (every 5 seconds)
    const portfolioInterval = setInterval(fetchPortfolio, 5000);

    return () => {
      clearInterval(marketInterval);
      clearInterval(portfolioInterval);
    };
  }, []);

  if (loading && stocks.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-xl text-zinc-600">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Navigation */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-around">
          {["portfolio", "watchlist", "analyse", "nouvelles"].map((tab: string) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab.replace("analyse", "analyse boursière")}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {/* Notifications */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                title="Prix Sélectionné" 
                value={selectedStock ? `$${selectedStock.price.toFixed(2)}` : "-"}
              />
              <StatCard 
                title="Mon Solde" 
                value={portfolio ? `$${portfolio.balance.toFixed(2)}` : "-"}
              />
              <StatCard 
                title="Portefeuille" 
                value={portfolio ? `$${portfolio.equity.toFixed(2)}` : "-"}
                change={portfolio ? `${portfolio.total_return_pct.toFixed(2)}%` : "-"}
              />
            </div>

            {/* Chart and Trading */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-zinc-400 text-xs font-black uppercase">
                    Graphique en Direct - {selectedStock?.symbol || ""}
                  </h3>
                  <select
                    value={selectedStock?.id || ""}
                    onChange={(e) => {
                      const stock = stocks.find((s) => s.id === parseInt(e.target.value));
                      setSelectedStock(stock || null);
                    }}
                    className="px-3 py-1 border border-zinc-300 rounded text-sm"
                  >
                    {stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="h-64">
                  <svg viewBox="0 0 400 150" className="w-full h-full">
                    {selectedStock && selectedStock.history.length > 0 && (
                      <>
                        {/* Y-axis labels */}
                        <text x="0" y="20" fontSize="12" fill="#a1a1a1">
                          ${Math.max(...selectedStock.history).toFixed(0)}
                        </text>
                        <text x="0" y="150" fontSize="12" fill="#a1a1a1">
                          ${Math.min(...selectedStock.history).toFixed(0)}
                        </text>

                        {/* Price line */}
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2"
                          points={selectedStock.history
                            .map((p: number, i: number) => {
                              const x = (i * 380) / Math.max(selectedStock.history.length - 1, 1) + 10;
                              const minPrice = Math.min(...selectedStock.history);
                              const maxPrice = Math.max(...selectedStock.history);
                              const range = maxPrice - minPrice || 1;
                              const y = 130 - ((p - minPrice) / range * 120);
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Prix Actuel</p>
                      <p className="text-2xl font-bold">${selectedStock?.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Dernier Tick</p>
                      <p className="text-sm">{selectedStock?.updated_at}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trading Panel */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 h-fit">
                <h3 className="text-zinc-400 text-xs font-black uppercase mb-6 tracking-widest">
                  Effectuer une Transaction
                </h3>

                {selectedStock && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 mb-2">Stock</label>
                      <p className="text-xl font-bold">{selectedStock.symbol}</p>
                      <p className="text-sm text-zinc-500">{selectedStock.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 mb-2">Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 mb-2">Cost</label>
                      <p className="text-lg font-bold">
                        ${(quantity * selectedStock.price).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={buy}
                        disabled={loading || !portfolio || quantity * selectedStock.price > portfolio.balance}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ACHETER
                      </button>
                      <button
                        onClick={sell}
                        disabled={loading}
                        className="flex-1 py-3 border-2 border-red-600 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-all active:scale-95"
                      >
                        VENDRE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Holdings */}
            {portfolio && portfolio.holdings.length > 0 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                <h3 className="text-zinc-400 text-xs font-black uppercase mb-6 tracking-widest">
                  Mes Positions
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left py-3 font-semibold text-zinc-700">Symbole</th>
                        <th className="text-right py-3 font-semibold text-zinc-700">Quantité</th>
                        <th className="text-right py-3 font-semibold text-zinc-700">Prix Actuel</th>
                        <th className="text-right py-3 font-semibold text-zinc-700">Valeur</th>
                        <th className="text-right py-3 font-semibold text-zinc-700">Gain/Perte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((holding) => (
                        <tr key={holding.stock_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="py-3 font-semibold">{holding.symbol}</td>
                          <td className="text-right py-3">{holding.quantity}</td>
                          <td className="text-right py-3">${holding.current_price.toFixed(2)}</td>
                          <td className="text-right py-3">${holding.position_value.toFixed(2)}</td>
                          <td className={`text-right py-3 font-semibold ${
                            holding.unrealized_gain >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            ${holding.unrealized_gain.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === "watchlist" && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Ma Liste de Surveillance</h2>
            <p className="text-zinc-500">Ajoutez des entreprises ici pour suivre leurs performances.</p>
          </div>
        )}

        {activeTab === "analyse" && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Analyse Boursière</h2>
            <p className="text-zinc-500">Indicateurs techniques et prédictions IA.</p>
          </div>
        )}

        {activeTab === "nouvelles" && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Nouvelles</h2>
            <p className="text-zinc-500">Actualités boursières et analyses marché.</p>
          </div>
        )}
      </main>
    </div>
  );
}