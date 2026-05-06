"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMarket } from "@/hooks/useMarket";
import { useNews } from "@/hooks/useNews";
import { AuthForm } from "@/components/AuthForm";
import { StatCard } from "@/components/StatCard";
import { ChartComponent } from "@/components/ChartComponent";
import { ForecastModalOptimized } from "@/components/ForecastModalOptimized";
import { NewsModal } from "@/components/NewsModal";
import { Stock, Forecast, News } from "@/types";


export default function StockApp() {
  const [activeTab, setActiveTab] = useState<string>("portfolio");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forecastHorizonDays, setForecastHorizonDays] = useState<number>(30);
  const [forecastPaths, setForecastPaths] = useState<number>(5000);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsNotification, setNewsNotification] = useState<News | null>(null);

  const auth = useAuth();
  const market = useMarket();
  const news = useNews();

  // Initialize auth on mount
  useEffect(() => {
    auth.initAuth();
  }, []);

  // Load market data (public)
  useEffect(() => {
    market.fetchMarketState(market.marketSource).then((stocks) => {
      if (stocks.length > 0) {
        setSelectedStock(stocks[0]);
      }
    });
  }, [market.marketSource]);

  // Keep selectedStock in sync with market updates (real-time chart updates)
  useEffect(() => {
    if (selectedStock && market.stocks.length > 0) {
      const updatedStock = market.stocks.find((s) => s.id === selectedStock.id);
      if (updatedStock) {
        setSelectedStock(updatedStock);
      }
    }
  }, [market.stocks]);

  // Load authenticated data when logged in
  useEffect(() => {
    if (auth.isAuthenticated) {
      market.fetchPortfolio();
      market.fetchForecasts();

      const marketInterval = setInterval(
        () => market.updateMarketPrices(market.marketSource),
        15000
      );
      const portfolioInterval = setInterval(() => market.fetchPortfolio(), 5000);

      return () => {
        clearInterval(marketInterval);
        clearInterval(portfolioInterval);
      };
    }
  }, [auth.isAuthenticated, market.marketSource]);

  // Generate one strong market news automatically every 60 seconds and notify user.
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const newsInterval = setInterval(async () => {
      try {
        const createdNews = await news.triggerAutoNews();
        if (createdNews) {
          setNewsNotification(createdNews);
          setTimeout(() => setNewsNotification(null), 5000);
        }
      } catch (err) {
        console.error("Error auto-generating market news:", err);
      }
    }, 60000);

    return () => clearInterval(newsInterval);
  }, [auth.isAuthenticated, news.triggerAutoNews]);

  // Handle buy
  const handleBuy = async () => {
    if (!selectedStock || quantity <= 0) return;

    try {
      await market.buyStock(selectedStock.id, quantity);
      setSuccessMessage(
        `${quantity} ${selectedStock.symbol} bought at $${Number(selectedStock.price).toFixed(2)}`
      );
      setQuantity(1);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setTimeout(() => market.setError(null), 3000);
    }
  };

  // Handle sell
  const handleSell = async () => {
    if (!selectedStock || quantity <= 0) return;

    try {
      await market.sellStock(selectedStock.id, quantity);
      setSuccessMessage(
        `${quantity} ${selectedStock.symbol} sold at $${Number(selectedStock.price).toFixed(2)}`
      );
      setQuantity(1);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setTimeout(() => market.setError(null), 3000);
    }
  };

  // Handle forecast creation
  const handleCreateForecast = async () => {
    if (!selectedStock) return;

    try {
      await market.createForecast(selectedStock.id, forecastHorizonDays, forecastPaths);
      setSuccessMessage(`Forecast created for ${selectedStock.symbol}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setTimeout(() => market.setError(null), 3000);
    }
  };

  // Not authenticated - show auth form
  if (!auth.isAuthenticated) {
    return (
      <AuthForm
        onLogin={async (username, password) => {
          const success = await auth.login(username, password);
          return success;
        }}
        onRegister={async (username, email, password) => {
          const success = await auth.register(username, email, password);
          return success;
        }}
        error={auth.error}
        successMessage={successMessage}
        loading={auth.loading}
        onClearError={() => auth.setError(null)}
      />
    );
  }

  // Loading market data
  if (market.stocks.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-xl text-zinc-600">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {newsNotification && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-zinc-200 shadow-lg rounded-lg p-4 max-w-sm">
          <p className="text-xs font-bold uppercase text-blue-600 mb-1">Breaking news</p>
          <p className="text-sm font-semibold text-zinc-900">{newsNotification.stock.symbol}</p>
          <p className="text-sm text-zinc-700">{newsNotification.headline}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex justify-around flex-1">
            {["portfolio", "watchlist", "analyse"].map((tab: string) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {tab === "analyse" ? "Analyse Boursière" : tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center border border-zinc-200 rounded-lg p-1 bg-zinc-50">
              <button
                onClick={async () => {
                  try {
                    await market.switchMarketSource("INTERNAL");
                  } catch (_err) {
                    // Error is already surfaced through market.error state.
                  }
                }}
                className={`px-3 py-1 text-xs font-bold rounded ${
                  market.marketSource === "INTERNAL"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:text-zinc-800"
                }`}
              >
                Local
              </button>
              <button
                onClick={async () => {
                  try {
                    await market.switchMarketSource("ALPHA_VANTAGE");
                  } catch (_err) {
                    // Error is already surfaced through market.error state.
                  }
                }}
                className={`px-3 py-1 text-xs font-bold rounded ${
                  market.marketSource === "ALPHA_VANTAGE"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:text-zinc-800"
                }`}
              >
                Alpha
              </button>
            </div>
            <button
              onClick={() => setNewsModalOpen(true)}
              className="px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-all hover:bg-blue-50 rounded"
            >
              News
            </button>
            <button
              onClick={() => auth.logout()}
              className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-700 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {/* Notifications */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}
        {market.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {market.error}
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
                value={market.portfolio ? `$${market.portfolio.balance.toFixed(2)}` : "-"}
              />
              <StatCard
                title="Portefeuille"
                value={market.portfolio ? `$${market.portfolio.equity.toFixed(2)}` : "-"}
                change={
                  market.portfolio
                    ? `${market.portfolio.total_return_pct.toFixed(2)}%`
                    : "-"
                }
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
                      const stock = market.stocks.find((s) => s.id === parseInt(e.target.value));
                      setSelectedStock(stock || null);
                    }}
                    className="px-3 py-1 border border-zinc-300 rounded text-sm"
                  >
                    {market.stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStock && selectedStock.history && selectedStock.history.length > 0 ? (
                  <ChartComponent data={selectedStock.history} symbol={selectedStock.symbol} height={256} />
                ) : (
                  <div className="h-64 flex items-center justify-center text-zinc-400">
                    No data available
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-zinc-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Prix Actuel</p>
                      <p className="text-2xl font-bold">
                        ${Number(selectedStock?.price).toFixed(2)}
                      </p>
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
                      <label className="block text-sm font-semibold text-zinc-700 mb-2">
                        Stock
                      </label>
                      <p className="text-xl font-bold">{selectedStock.symbol}</p>
                      <p className="text-sm text-zinc-500">{selectedStock.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 mb-2">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 mb-2">
                        Cost
                      </label>
                      <p className="text-lg font-bold">
                        ${(quantity * Number(selectedStock.price)).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleBuy}
                        disabled={
                          market.loading ||
                          !market.portfolio ||
                          quantity * Number(selectedStock.price) > market.portfolio.balance
                        }
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ACHETER
                      </button>
                      <button
                        onClick={handleSell}
                        disabled={market.loading}
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
            {market.portfolio && market.portfolio.holdings.length > 0 && (
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
                        <th className="text-right py-3 font-semibold text-zinc-700">
                          Prix Actuel
                        </th>
                        <th className="text-right py-3 font-semibold text-zinc-700">Valeur</th>
                        <th className="text-right py-3 font-semibold text-zinc-700">Gain/Perte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.portfolio.holdings.map((holding) => (
                        <tr
                          key={holding.stock_id}
                          className="border-b border-zinc-100 hover:bg-zinc-50"
                        >
                          <td className="py-3 font-semibold">{holding.symbol}</td>
                          <td className="text-right py-3">{holding.quantity}</td>
                          <td className="text-right py-3">
                            ${holding.current_price.toFixed(2)}
                          </td>
                          <td className="text-right py-3">
                            ${holding.position_value.toFixed(2)}
                          </td>
                          <td
                            className={`text-right py-3 font-semibold ${
                              holding.unrealized_gain >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
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

        {/* Watchlist Tab */}
        {activeTab === "watchlist" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
              <h2 className="text-zinc-400 text-xs font-black uppercase mb-8 tracking-widest">
                My Watchlist
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                        Ticker
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                        Last Price
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                        Last 24 hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {market.stocks.map((stock) => {
                      const priceChange = stock.history && stock.history.length > 1
                        ? stock.history[stock.history.length - 1] - stock.history[0]
                        : 0;
                      const percentChange = stock.history && stock.history.length > 1
                        ? ((priceChange / stock.history[0]) * 100).toFixed(2)
                        : "0.00";
                      const isPositive = parseFloat(percentChange) >= 0;

                      return (
                        <tr
                          key={stock.id}
                          className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedStock(stock);
                            setActiveTab("portfolio");
                          }}
                        >
                          <td className="py-5 px-6 font-bold text-zinc-900">{stock.symbol}</td>
                          <td className="py-5 px-6 text-zinc-600">{stock.name}</td>
                          <td className="py-5 px-6 font-semibold text-zinc-900">
                            ${Number(stock.price).toFixed(2)}
                          </td>
                          <td className={`py-5 px-6 font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                            {isPositive ? "+" : ""}{percentChange}%
                          </td>
                          <td className="py-5 px-6 text-right">
                            {stock.history && stock.history.length > 0 && (
                              <svg
                                className="w-16 h-10 mx-auto"
                                viewBox="0 0 64 40"
                                preserveAspectRatio="none"
                              >
                                <polyline
                                  points={stock.history
                                    .map((price, idx) => {
                                      const x = (idx / Math.max(stock.history!.length - 1, 1)) * 64;
                                      const minPrice = Math.min(...stock.history!);
                                      const maxPrice = Math.max(...stock.history!);
                                      const range = maxPrice - minPrice || 1;
                                      const y = 40 - ((price - minPrice) / range) * 40;
                                      return `${x},${y}`;
                                    })
                                    .join(" ")}
                                  fill="none"
                                  stroke={isPositive ? "#22c55e" : "#ef4444"}
                                  strokeWidth="1.5"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analyse Tab */}
        {activeTab === "analyse" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Monte Carlo Forecast */}
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
                      const stock = market.stocks.find((s) => s.id === parseInt(e.target.value));
                      setSelectedStock(stock || null);
                    }}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une action</option>
                    {market.stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Horizon (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={forecastHorizonDays}
                    onChange={(e) =>
                      setForecastHorizonDays(
                        Math.max(1, Math.min(365, parseInt(e.target.value) || 30))
                      )
                    }
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Simulations
                  </label>
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
                    onClick={handleCreateForecast}
                    disabled={market.loading || !selectedStock}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {market.loading ? "Calcul..." : "Générer"}
                  </button>
                </div>
              </div>
            </div>

            {/* Forecasts History */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
              <h2 className="text-zinc-400 text-xs font-black uppercase mb-6 tracking-widest">
                Mes Prédictions
              </h2>

              {market.forecasts.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">
                  Aucune prédiction. Créez-en une pour commencer!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {market.forecasts.map((forecast: Forecast) => (
                    <div
                      key={forecast.id}
                      className="border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-blue-600">
                            {forecast.stock.symbol}
                          </h3>
                          <p className="text-sm text-zinc-500">{forecast.stock.name}</p>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {new Date(forecast.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">RÉSUMÉ</p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="font-bold text-red-600">
                                ${Number(forecast.percentile_5).toFixed(2)}
                              </p>
                              <p className="text-xs text-zinc-500">5e %ile</p>
                            </div>
                            <div>
                              <p className="font-bold text-blue-600">
                                ${Number(forecast.median).toFixed(2)}
                              </p>
                              <p className="text-xs text-zinc-500">Médiane</p>
                            </div>
                            <div>
                              <p className="font-bold text-green-600">
                                ${Number(forecast.percentile_95).toFixed(2)}
                              </p>
                              <p className="text-xs text-zinc-500">95e %ile</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 mb-1">PRIX ACTUEL</p>
                          <p className="font-bold">
                            ${Number(forecast.stock.price).toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 mb-1">PROBABILITÉ À LA HAUSSE</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  forecast.probability_up > 0.5
                                    ? "bg-green-600"
                                    : "bg-red-600"
                                }`}
                                style={{ width: `${forecast.probability_up * 100}%` }}
                              />
                            </div>
                            <p className="font-bold text-sm">
                              {(forecast.probability_up * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-200 text-xs text-zinc-500">
                          <p>
                            Horizon: {forecast.horizon_days}j • Simulations:{" "}
                            {forecast.paths.toLocaleString()}
                          </p>
                          <p>
                            Volatilité: {(forecast.volatility * 100).toFixed(2)}% • Drift:{" "}
                            {(forecast.drift * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedForecast(forecast);
                          setForecastModalOpen(true);
                        }}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm mb-2"
                      >
                        Voir le Graphique
                      </button>

                      <button
                        onClick={() => {
                          const fullStock = market.stocks.find(
                            (s) => s.id === forecast.stock.id
                          );
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
      </main>

      <ForecastModalOptimized
        forecast={selectedForecast}
        isOpen={forecastModalOpen}
        onClose={() => {
          setForecastModalOpen(false);
          setSelectedForecast(null);
        }}
      />

      <NewsModal
        isOpen={newsModalOpen}
        onClose={() => setNewsModalOpen(false)}
        stocks={market.stocks}
      />
    </div>
  );
}