"use client";

import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/core";

// API instance for authenticated endpoints
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// API instance for public endpoints (no auth header)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh/`,
            { refresh: refreshToken }
          );
          
          localStorage.setItem("access_token", response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          
          return api(originalRequest);
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    }
    
    return Promise.reject(error);
  }
);

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

interface Forecast {
  id: number;
  stock: {
    id: number;
    symbol: string;
    name: string;
    price: number;
  };
  horizon_days: number;
  paths: number;
  drift: number;
  volatility: number;
  percentile_5: number;
  median: number;
  percentile_95: number;
  probability_up: number;
  created_at: string;
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [credentials, setCredentials] = useState({ username: "", password: "", email: "" });
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastHorizonDays, setForecastHorizonDays] = useState<number>(30);
  const [forecastPaths, setForecastPaths] = useState<number>(5000);
  
  
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // Set the token in the API headers
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  // Load market data (public endpoint)
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        await fetchMarketState();
      } catch (err) {
        console.error("Error loading market state:", err);
      }
    };
    loadMarketData();
  }, []);

  // Load authenticated user data
  useEffect(() => {
    if (isAuthenticated) {
      const initialize = async () => {
        setLoading(true);
        try {
          await fetchPortfolio();
          await fetchForecasts();
        } catch (err) {
          console.error("Error loading user data:", err);
        } finally {
          setLoading(false);
        }
      };

      initialize();

      const marketInterval = setInterval(updateMarketPrices, 1500);
      const portfolioInterval = setInterval(fetchPortfolio, 5000);

      return () => {
        clearInterval(marketInterval);
        clearInterval(portfolioInterval);
      };
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login/`,
        {
          username: credentials.username,
          password: credentials.password,
        }
      );

      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);
      
      api.defaults.headers.Authorization = `Bearer ${response.data.access}`;
      
      setIsAuthenticated(true);
      setCredentials({ username: "", password: "", email: "" });
      setLoading(true); 
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register/`,
        {
          username: credentials.username,
          email: credentials.email,
          password: credentials.password,
        }
      );

      setSuccessMessage("Registration successful! Logging you in...");
      
      
      const loginResponse = await axios.post(
        `${API_BASE_URL}/auth/login/`,
        {
          username: credentials.username,
          password: credentials.password,
        }
      );

      localStorage.setItem("access_token", loginResponse.data.access);
      localStorage.setItem("refresh_token", loginResponse.data.refresh);
      
      api.defaults.headers.Authorization = `Bearer ${loginResponse.data.access}`;
      
      setIsAuthenticated(true);
      setCredentials({ username: "", password: "", email: "" });
      setLoading(true); 
    } catch (err: any) {
      setError(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || "Registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  
  const handleLogout = async () => {
    try {
      const refresh_token = localStorage.getItem("refresh_token");
      if (refresh_token) {
        await api.post("/auth/logout/", { refresh: refresh_token });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setIsAuthenticated(false);
      setPortfolio(null);
      setStocks([]);
    }
  };

  const fetchMarketState = async () => {
    try {
      const response = await publicApi.get("/market/state/");
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
      console.error("Error fetching portfolio:", err.response?.status, err.response?.data);
    }
  };

  
  const updateMarketPrices = async () => {
    try {
      const response = await publicApi.post("/market/tick/", {
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

  const fetchForecasts = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setForecasts([]);
        return;
      }
      const response = await api.get("/forecast/history/");
      setForecasts(response.data);
    } catch (err: any) {
      // Silently fail if forecasts can't be loaded
      console.error("Error fetching forecasts:", err);
      setForecasts([]);
    }
  };

  const createForecast = async (stockId: number) => {
    try {
      setForecastLoading(true);
      const response = await api.post("/forecast/monte-carlo/", {
        stock_id: stockId,
        horizon_days: forecastHorizonDays,
        paths: forecastPaths,
      });
      
      setSuccessMessage(`Forecast created for ${response.data.stock.symbol}`);
      await fetchForecasts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error creating forecast");
      setTimeout(() => setError(null), 3000);
    } finally {
      setForecastLoading(false);
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



  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-zinc-100">
            {/* Logo/Title */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-black text-blue-600 mb-2">StockMarket</h1>
              <p className="text-zinc-600">Trading Simulator</p>
            </div>

            {/* Notifications */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {successMessage}
              </div>
            )}

            {/* Auth Mode Tabs */}
            <div className="flex gap-2 mb-8 bg-zinc-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                  authMode === "login"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthMode("register");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                  authMode === "register"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Register
              </button>
            </div>

            {/* Login Form */}
            {authMode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials({ ...credentials, username: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? "Logging in..." : "Login"}
                </button>
              </form>
            )}

            {/* Register Form */}
            {authMode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials({ ...credentials, username: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Choose a username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) =>
                      setCredentials({ ...credentials, email: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Create a password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? "Creating account..." : "Register"}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-zinc-500 mt-6">
              Stock Market Simulator • Demo Trading Platform
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex justify-around flex-1">
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
          <button
            onClick={handleLogout}
            className="px-4 py-4 text-sm font-bold text-red-600 hover:text-red-700 transition-all"
          >
            Logout
          </button>
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
                value={selectedStock ? `$${Number(selectedStock.price).toFixed(2)}` : "-"}
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
                    {selectedStock && selectedStock.history && selectedStock.history.length > 0 && (
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
                      <p className="text-2xl font-bold">${Number(selectedStock?.price).toFixed(2)}</p>
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
                        ${(quantity * Number(selectedStock.price)).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={buy}
                        disabled={loading || !portfolio || quantity * Number(selectedStock.price) > portfolio.balance}
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
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
              <h2 className="text-zinc-400 text-xs font-black uppercase mb-6 tracking-widest">
                Tous les Titres Disponibles
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-4 font-semibold text-zinc-700">Symbole</th>
                      <th className="text-left py-4 font-semibold text-zinc-700">Nom</th>
                      <th className="text-right py-4 font-semibold text-zinc-700">Prix Actuel</th>
                      <th className="text-center py-4 font-semibold text-zinc-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((stock) => (
                      <tr key={stock.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="py-4 font-bold text-blue-600">{stock.symbol}</td>
                        <td className="py-4 text-zinc-700">{stock.name}</td>
                        <td className="py-4 text-right font-semibold">${stock.price.toFixed(2)}</td>
                        <td className="py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <input
                              type="number"
                              min="1"
                              defaultValue="1"
                              id={`qty-${stock.id}`}
                              className="w-16 px-2 py-1 border border-zinc-300 rounded text-xs"
                            />
                            <button
                              onClick={() => {
                                const qty = parseInt(
                                  (document.getElementById(`qty-${stock.id}`) as HTMLInputElement)?.value || "1"
                                );
                                setSelectedStock(stock);
                                setQuantity(qty);
                                setActiveTab("portfolio");
                              }}
                              className="px-4 py-2 bg-green-600 text-white text-xs rounded-lg font-bold hover:bg-green-700 transition-all"
                            >
                              Acheter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analyse" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Create Forecast */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
              <h2 className="text-zinc-400 text-xs font-black uppercase mb-6 tracking-widest">
                Créer une Prédiction (Monte Carlo)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Action</label>
                  <select
                    value={selectedStock?.id || ""}
                    onChange={(e) => {
                      const stock = stocks.find((s) => s.id === parseInt(e.target.value));
                      setSelectedStock(stock || null);
                    }}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une action</option>
                    {stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Horizon (jours)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={forecastHorizonDays}
                    onChange={(e) => setForecastHorizonDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Simulations</label>
                  <select
                    value={forecastPaths}
                    onChange={(e) => setForecastPaths(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1000">1,000</option>
                    <option value="5000">5,000</option>
                    <option value="10000">10,000</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => selectedStock && createForecast(selectedStock.id)}
                    disabled={forecastLoading || !selectedStock}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forecastLoading ? "Calcul..." : "Générer"}
                  </button>
                </div>
              </div>
            </div>

            {/* Forecasts History */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
              <h2 className="text-zinc-400 text-xs font-black uppercase mb-6 tracking-widest">
                Mes Prédictions
              </h2>
              
              {forecasts.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Aucune prédiction. Créez-en une pour commencer!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {forecasts.map((forecast) => (
                    <div key={forecast.id} className="border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-blue-600">{forecast.stock.symbol}</h3>
                          <p className="text-sm text-zinc-500">{forecast.stock.name}</p>
                        </div>
                        <p className="text-xs text-zinc-400">{new Date(forecast.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">RÉSUMÉ</p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="font-bold text-red-600">${Number(forecast.percentile_5).toFixed(2)}</p>
                              <p className="text-xs text-zinc-500">5e %ile</p>
                            </div>
                            <div>
                              <p className="font-bold text-blue-600">${Number(forecast.median).toFixed(2)}</p>
                              <p className="text-xs text-zinc-500">Médiane</p>
                            </div>
                            <div>
                              <p className="font-bold text-green-600">${Number(forecast.percentile_95).toFixed(2)}</p>
                              <p className="text-xs text-zinc-500">95e %ile</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 mb-1">PRIX ACTUEL</p>
                          <p className="font-bold">${Number(forecast.stock.price).toFixed(2)}</p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 mb-1">PROBABILITÉ À LA HAUSSE</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  forecast.probability_up > 0.5 ? "bg-green-600" : "bg-red-600"
                                }`}
                                style={{ width: `${forecast.probability_up * 100}%` }}
                              />
                            </div>
                            <p className="font-bold text-sm">{(forecast.probability_up * 100).toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-200 text-xs text-zinc-500">
                          <p>Horizon: {forecast.horizon_days}j • Simulations: {forecast.paths.toLocaleString()}</p>
                          <p>Volatilité: {(forecast.volatility * 100).toFixed(2)}% • Drift: {(forecast.drift * 100).toFixed(2)}%</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const fullStock = stocks.find((s) => s.id === forecast.stock.id);
                          if (fullStock) {
                            setSelectedStock(fullStock);
                          }
                          setActiveTab("portfolio");
                        }}
                        className="w-full py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all text-sm"
                      >
                        Acheter {forecast.stock.symbol}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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