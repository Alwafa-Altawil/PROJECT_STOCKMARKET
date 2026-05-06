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
  isDarkMode?: boolean;
}

function StatCard({ title, value, change, isDarkMode = false }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${
      isDarkMode
        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
        : 'bg-white border-zinc-200 text-zinc-900'
    }`}>
      <h3 className={`text-xs font-semibold uppercase tracking-widest mb-2 transition-colors duration-300 ${
        isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
      }`}>
        {title}
      </h3>
      <p className={`text-3xl font-black transition-colors duration-300 ${
        isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
      }`}>{value}</p>
      {change && (
        <p className={`text-sm font-semibold mt-1 ${
          parseFloat(change) >= 0 ? "text-green-500" : "text-red-500"
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
  const [analyseLoading, setAnalyseLoading] = useState<boolean>(false);
  const [detailedChartOpen, setDetailedChartOpen] = useState<boolean>(false);
  const [detailedChartStock, setDetailedChartStock] = useState<Stock | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Fetch market state
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

  // Fetch portfolio status
  const fetchPortfolio = async () => {
    try {
      const response = await api.get("/portfolio/status/");
      setPortfolio(response.data);
    } catch (err: any) {
      console.error("Error fetching portfolio:", err);
    }
  };

  // Update market prices
  const updateMarketPrices = async () => {
    try {
      const response = await api.post("/market/tick/", {
        daily_volatility: 0.015,
        daily_drift: 0.0001,
      });
      
      // Update stocks with new prices
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

  // Open detailed chart for a stock
  const openDetailedChart = (stock: Stock) => {
    setDetailedChartStock(stock);
    setDetailedChartOpen(true);
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

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (loading && stocks.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-zinc-900 text-zinc-100' 
          : 'bg-zinc-50 text-zinc-900'
      }`}>
        <p className="text-xl">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-zinc-900 text-zinc-100' 
        : 'bg-zinc-50 text-zinc-900'
    }`}>
      {/* Navigation */}
      <nav className={`transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-zinc-800 border-zinc-700' 
          : 'bg-white border-zinc-200'
      } border-b sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4">
          {/* Theme Toggle Button - Left side */}
          <button
            onClick={toggleTheme}
            className={`py-4 px-4 text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent ${
              isDarkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-amber-400 text-zinc-900 hover:bg-amber-500'
            } rounded-lg mr-6`}
            aria-label="Toggle dark mode"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>

          {/* Navigation Tabs - Center */}
          <div className="flex justify-center flex-1">
            {["portfolio", "watchlist", "analyse", "nouvelles"].map((tab: string) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : isDarkMode
                      ? "border-transparent text-zinc-500 hover:text-zinc-300"
                      : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {tab.replace("analyse", "analyse boursière")}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {/* Notifications */}
        {successMessage && (
          <div className={`mb-4 p-4 rounded-lg transition-colors duration-300 ${
            isDarkMode
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {successMessage}
          </div>
        )}
        {error && (
          <div className={`mb-4 p-4 rounded-lg transition-colors duration-300 ${
            isDarkMode
              ? 'bg-red-900/30 border border-red-700 text-red-400'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
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
                isDarkMode={isDarkMode}
              />
              <StatCard 
                title="Mon Solde" 
                value={portfolio ? `$${portfolio.balance.toFixed(2)}` : "-"}
                isDarkMode={isDarkMode}
              />
              <StatCard 
                title="Portefeuille" 
                value={portfolio ? `$${portfolio.equity.toFixed(2)}` : "-"}
                change={portfolio ? `${portfolio.total_return_pct.toFixed(2)}%` : "-"}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Chart and Trading */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className={`lg:col-span-2 p-8 rounded-3xl shadow-sm border transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-100'
              }`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xs font-black uppercase transition-colors duration-300 ${
                    isDarkMode ? 'text-zinc-400' : 'text-zinc-400'
                  }`}>
                    Graphique en Direct - {selectedStock?.symbol || ""}
                  </h3>
                  <select
                    value={selectedStock?.id || ""}
                    onChange={(e) => {
                      const stock = stocks.find((s) => s.id === parseInt(e.target.value));
                      setSelectedStock(stock || null);
                    }}
                    className={`px-3 py-1 rounded text-sm border transition-colors duration-300 ${
                      isDarkMode
                        ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                        : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
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

                <div className={`mt-6 pt-6 border-t transition-colors duration-300 ${
                  isDarkMode ? 'border-zinc-700' : 'border-zinc-200'
                }`}>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className={`transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>Prix Actuel</p>
                      <p className={`text-2xl font-bold transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                      }`}>${selectedStock?.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className={`transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>Dernier Tick</p>
                      <p className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                      }`}>{selectedStock?.updated_at}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trading Panel */}
              <div className={`p-6 rounded-3xl shadow-sm border h-fit transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-100'
              }`}>
                <h3 className={`text-xs font-black uppercase mb-6 tracking-widest transition-colors duration-300 ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-400'
                }`}>
                  Effectuer une Transaction
                </h3>

                {selectedStock && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                      }`}>Stock</label>
                      <p className={`text-xl font-bold transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                      }`}>{selectedStock.symbol}</p>
                      <p className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>{selectedStock.name}</p>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                      }`}>Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                          isDarkMode
                            ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                            : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                      }`}>Cost</label>
                      <p className={`text-lg font-bold transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                      }`}>
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
                        className={`flex-1 py-3 rounded-lg font-bold transition-all active:scale-95 border-2 ${
                          isDarkMode
                            ? 'border-red-600 text-red-400 hover:bg-red-900/30'
                            : 'border-red-600 text-red-600 hover:bg-red-50'
                        }`}
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
              <div className={`p-8 rounded-3xl shadow-sm border transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-100'
              }`}>
                <h3 className={`text-xs font-black uppercase mb-6 tracking-widest transition-colors duration-300 ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-400'
                }`}>
                  Mes Positions
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b transition-colors duration-300 ${
                        isDarkMode ? 'border-zinc-700' : 'border-zinc-200'
                      }`}>
                        <th className={`text-left py-3 font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>Symbole</th>
                        <th className={`text-right py-3 font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>Quantité</th>
                        <th className={`text-right py-3 font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>Prix Actuel</th>
                        <th className={`text-right py-3 font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>Valeur</th>
                        <th className={`text-right py-3 font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                        }`}>Gain/Perte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((holding) => (
                        <tr key={holding.stock_id} className={`border-b transition-colors duration-300 ${
                          isDarkMode 
                            ? 'border-zinc-700 hover:bg-zinc-700/50'
                            : 'border-zinc-100 hover:bg-zinc-50'
                        }`}>
                          <td className={`py-3 font-semibold transition-colors duration-300 ${
                            isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>{holding.symbol}</td>
                          <td className={`text-right py-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>{holding.quantity}</td>
                          <td className={`text-right py-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>${holding.current_price.toFixed(2)}</td>
                          <td className={`text-right py-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>${holding.position_value.toFixed(2)}</td>
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
            <h2 className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
            }`}>Ma Liste de Surveillance</h2>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
            }`}>Ajoutez des entreprises ici pour suivre leurs performances.</p>
          </div>
        )}

        {activeTab === "analyse" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
            }`}>Analyse Boursière</h2>
            
            {stocks.length === 0 ? (
              <div className="text-center py-20">
                <p className={`transition-colors duration-300 ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                }`}>Chargement des données...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stocks.map((stock) => (
                  <div key={stock.id} className={`p-6 rounded-2xl shadow-sm border transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-700'
                      : 'bg-white border-zinc-100'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-bold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>{stock.symbol}</h3>
                        <p className={`text-sm transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>${stock.price.toFixed(2)}</p>
                        {stock.history.length > 1 && (
                          <p className={`text-sm font-semibold ${
                            stock.price >= stock.history[stock.history.length - 2]
                              ? "text-green-500"
                              : "text-red-500"
                          }`}>
                            {stock.price >= stock.history[stock.history.length - 2] ? "↑" : "↓"} 
                            {Math.abs((stock.price - stock.history[stock.history.length - 2]) / stock.history[stock.history.length - 2] * 100).toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className={`h-40 mb-4 rounded-lg p-2 transition-colors duration-300 ${
                      isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                    }`}>
                      <svg viewBox="0 0 300 120" className="w-full h-full">
                        {stock.history.length > 0 && (
                          <>
                            {/* Gradient background */}
                            <defs>
                              <linearGradient id={`grad-${stock.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            {/* Price line and area */}
                            {stock.history.length > 1 && (
                              <>
                                <polyline
                                  fill={`url(#grad-${stock.id})`}
                                  stroke="#2563eb"
                                  strokeWidth="1.5"
                                  points={stock.history
                                    .map((p: number, i: number) => {
                                      const x = (i * 290) / Math.max(stock.history.length - 1, 1) + 5;
                                      const minPrice = Math.min(...stock.history);
                                      const maxPrice = Math.max(...stock.history);
                                      const range = maxPrice - minPrice || 1;
                                      const y = 110 - ((p - minPrice) / range * 100);
                                      return `${x},${y}`;
                                    })
                                    .join(" ")}
                                />
                              </>
                            )}
                          </>
                        )}
                      </svg>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                      }`}>
                        <p className={`transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>Haut</p>
                        <p className={`font-bold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>${Math.max(...stock.history).toFixed(2)}</p>
                      </div>
                      <div className={`p-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                      }`}>
                        <p className={`transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>Bas</p>
                        <p className={`font-bold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>${Math.min(...stock.history).toFixed(2)}</p>
                      </div>
                      <div className={`p-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                      }`}>
                        <p className={`transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>Hist.</p>
                        <p className={`font-bold transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>{stock.history.length} points</p>
                      </div>
                      <div className={`p-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                      }`}>
                        <p className={`transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>Maj</p>
                        <p className={`font-bold text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                        }`}>{stock.updated_at.split('T')[1]?.substring(0, 5) || 'N/A'}</p>
                      </div>
                    </div>

                    {/* View Chart Button */}
                    <button
                      onClick={() => openDetailedChart(stock)}
                      className={`w-full mt-4 py-2 rounded-lg font-semibold text-sm transition-all active:scale-95 ${
                        isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Voir Graphique
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "nouvelles" && (
          <div className="text-center py-20">
            <h2 className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
            }`}>Nouvelles</h2>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
            }`}>Actualités boursières et analyses marché.</p>
          </div>
        )}

        {/* Detailed Chart Modal */}
        {detailedChartOpen && detailedChartStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className={`rounded-3xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto animate-in scale-95 duration-300 transition-colors ${
              isDarkMode
                ? 'bg-zinc-800'
                : 'bg-white'
            }`}>
              <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>{detailedChartStock.symbol}</h2>
                    <p className={`text-lg transition-colors duration-300 ${
                      isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>{detailedChartStock.name}</p>
                  </div>
                  <button
                    onClick={() => setDetailedChartOpen(false)}
                    className={`text-2xl w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                      isDarkMode
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    ✕
                  </button>
                </div>

                {/* Price Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={`p-4 rounded-xl transition-colors duration-300 ${
                    isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                  }`}>
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>Prix Actuel</p>
                    <p className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>${detailedChartStock.price.toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-xl transition-colors duration-300 ${
                    isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                  }`}>
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>Prix Haut (24h)</p>
                    <p className="text-3xl font-bold text-green-500">${Math.max(...detailedChartStock.history).toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-xl transition-colors duration-300 ${
                    isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                  }`}>
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>Prix Bas (24h)</p>
                    <p className="text-3xl font-bold text-red-500">${Math.min(...detailedChartStock.history).toFixed(2)}</p>
                  </div>
                </div>

                {/* Large Chart */}
                <div className={`p-6 rounded-2xl mb-6 transition-colors duration-300 ${
                  isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                }`}>
                  <h3 className={`font-semibold mb-4 text-sm uppercase transition-colors duration-300 ${
                    isDarkMode ? 'text-zinc-300' : 'text-zinc-600'
                  }`}>Historique des Prix</h3>
                  <div className="h-96 w-full">
                    <svg viewBox="0 0 600 300" className="w-full h-full">
                      {detailedChartStock.history.length > 0 && (
                        <>
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id={`detailed-grad-${detailedChartStock.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {/* Y-axis labels and gridlines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const minPrice = Math.min(...detailedChartStock.history);
                            const maxPrice = Math.max(...detailedChartStock.history);
                            const price = minPrice + (maxPrice - minPrice) * (1 - ratio);
                            const y = 20 + ratio * 260;
                            return (
                              <g key={`y-${ratio}`}>
                                <line x1="40" y1={y} x2="580" y2={y} stroke="#e4e4e7" strokeWidth="1" />
                                <text x="20" y={y + 4} fontSize="11" fill="#a1a1a1" textAnchor="end">
                                  ${price.toFixed(0)}
                                </text>
                              </g>
                            );
                          })}

                          {/* X-axis */}
                          <line x1="40" y1="280" x2="580" y2="280" stroke="#d4d4d8" strokeWidth="2" />

                          {/* Main price area and line */}
                          {detailedChartStock.history.length > 1 && (
                            <>
                              <polyline
                                fill={`url(#detailed-grad-${detailedChartStock.id})`}
                                stroke="#2563eb"
                                strokeWidth="2.5"
                                points={detailedChartStock.history
                                  .map((p: number, i: number) => {
                                    const x = 40 + (i * 540) / Math.max(detailedChartStock.history.length - 1, 1);
                                    const minPrice = Math.min(...detailedChartStock.history);
                                    const maxPrice = Math.max(...detailedChartStock.history);
                                    const range = maxPrice - minPrice || 1;
                                    const y = 280 - ((p - minPrice) / range * 260);
                                    return `${x},${y}`;
                                  })
                                  .join(" ")}
                              />

                              {/* Current price indicator */}
                              {(() => {
                                const lastIndex = detailedChartStock.history.length - 1;
                                const x = 40 + (lastIndex * 540) / Math.max(detailedChartStock.history.length - 1, 1);
                                const minPrice = Math.min(...detailedChartStock.history);
                                const maxPrice = Math.max(...detailedChartStock.history);
                                const range = maxPrice - minPrice || 1;
                                const y = 280 - ((detailedChartStock.price - minPrice) / range * 260);
                                return (
                                  <>
                                    <circle cx={x} cy={y} r="4" fill="#2563eb" />
                                    <circle cx={x} cy={y} r="7" fill="none" stroke="#2563eb" strokeWidth="2" opacity="0.5" />
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className={`p-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase transition-colors duration-300 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>Points Données</p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-blue-200' : 'text-blue-900'
                    }`}>{detailedChartStock.history.length}</p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-green-900/30' : 'bg-green-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase transition-colors duration-300 ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>Variation</p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-green-200' : 'text-green-900'
                    }`}>
                      {((detailedChartStock.price / detailedChartStock.history[0] - 1) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase transition-colors duration-300 ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>Moyenne</p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-purple-200' : 'text-purple-900'
                    }`}>
                      ${(detailedChartStock.history.reduce((a, b) => a + b, 0) / detailedChartStock.history.length).toFixed(2)}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase transition-colors duration-300 ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>Volatilité</p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-orange-200' : 'text-orange-900'
                    }`}>
                      {(() => {
                        const avg = detailedChartStock.history.reduce((a, b) => a + b, 0) / detailedChartStock.history.length;
                        const variance = detailedChartStock.history.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / detailedChartStock.history.length;
                        const stdDev = Math.sqrt(variance);
                        return ((stdDev / avg) * 100).toFixed(2);
                      })()}%
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setDetailedChartOpen(false)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all active:scale-95 ${
                    isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}