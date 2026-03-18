"use client";
 
import { useState, useEffect } from "react";

import Link from "next/link";

import axios from "axios";
 
interface Stock {

  id: number;

  symbol: string;

  price: number;

}
 
interface PortfolioItem {

  id: number;

  stock: Stock;

  quantity: number;

}
 
export default function StockSimulation() {

  // State

  const [stocks, setStocks] = useState<Stock[]>([]);

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
 
  // For mini chart

  const [history, setHistory] = useState<number[]>([]);
 
  // Balance & shares of selected stock

  const [balance, setBalance] = useState(0);

  const [shares, setShares] = useState(0);
 
  // JWT or session token (replace with your auth method)

  const token = "YOUR_JWT_TOKEN"; 

  const headers = { Authorization: `Bearer ${token}` };
 
  // Fetch stocks and portfolio from Django

  useEffect(() => {

    axios

      .get("http://localhost:8000/api/stocks/", { headers })

      .then((res) => {

        setStocks(res.data);

        if (res.data.length > 0) {

          setSelectedStockId(res.data[0].id);

          setHistory([res.data[0].price]);

        }

      })

      .catch((err) => console.error(err));
 
    axios

      .get("http://localhost:8000/api/get_portfolio/", { headers })

      .then((res) => {

        setPortfolio(res.data);

        if (res.data.length > 0) {

          setBalance(res.data[0].user.profile?.balance ?? 10000);

          setShares(res.data[0].quantity);

        }

      })

      .catch((err) => console.error(err));

  }, []);
 
  // Get selected stock price

  const selectedStock = stocks.find((s) => s.id === selectedStockId);

  const price = selectedStock?.price ?? 0;
 
  // Buy stock

  const buy = () => {

    if (!selectedStockId) return;

    if (balance < price) return alert("Not enough balance");
 
    axios

      .post(

        "http://localhost:8000/api/buy_stock/",

        { stock_id: selectedStockId, quantity: 1 },

        { headers }

      )

      .then(() => {

        setBalance(balance - price);

        setShares(shares + 1);

        setPortfolio((prev) =>

          prev.map((p) =>

            p.stock.id === selectedStockId

              ? { ...p, quantity: p.quantity + 1 }

              : p

          )

        );

        setHistory((h) => [...h.slice(-40), price]);

      })

      .catch((err) => alert(err.response?.data.error || "Error buying stock"));

  };
 
  // Sell stock

  const sell = () => {

    if (!selectedStockId || shares <= 0) return alert("No shares to sell");
 
    axios

      .post(

        "http://localhost:8000/api/sell_stock/",

        { stock_id: selectedStockId, quantity: 1 },

        { headers }

      )

      .then(() => {

        setBalance(balance + price);

        setShares(shares - 1);

        setPortfolio((prev) =>

          prev.map((p) =>

            p.stock.id === selectedStockId

              ? { ...p, quantity: p.quantity - 1 }

              : p

          )

        );

        setHistory((h) => [...h.slice(-40), price]);

      })

      .catch((err) => alert(err.response?.data.error || "Error selling stock"));

  };
 
  const total = Math.round(balance + shares * price);
 
  return (
<div className="flex flex-col items-center gap-10 py-10 w-full">

      {/* NAVIGATION */}
<nav className="w-full max-w-4xl bg-white shadow-md rounded-xl p-4 flex justify-around text-lg font-semibold">
<Link href="/portfolio" className="hover:text-blue-600 transition">

          PortFolio
</Link>
<Link href="/nouvelles" className="hover:text-blue-600 transition">

          Nouvelles
</Link>
<Link href="/watchlist" className="hover:text-blue-600 transition">

          Watchlist
</Link>
<Link href="/analyse" className="hover:text-blue-600 transition">

          Analyse Boursière
</Link>
</nav>
 
      <h1 className="text-4xl font-bold mt-6">Simulation Boursière </h1>
 
      {/* Stock selector */}
<div className="flex flex-col items-center gap-4">
<select

          value={selectedStockId ?? ""}

          onChange={(e) => setSelectedStockId(Number(e.target.value))}

          className="p-2 border rounded-lg"
>

          {stocks.map((s) => (
<option key={s.id} value={s.id}>

              {s.symbol} - ${s.price.toFixed(2)}
</option>

          ))}
</select>
</div>
 
      {/* Infos principales */}
<div className="grid grid-cols-3 gap-8 text-center">
<div className="p-6 bg-white shadow rounded-xl">
<h2 className="text-sm text-zinc-500">Prix de l'action</h2>
<p className="text-3xl font-bold">{price.toFixed(2)} $</p>
</div>
 
        <div className="p-6 bg-white shadow rounded-xl">
<h2 className="text-sm text-zinc-500">Solde</h2>
<p className="text-3xl font-bold">{balance.toFixed(2)} $</p>
</div>
 
        <div className="p-6 bg-white shadow rounded-xl">
<h2 className="text-sm text-zinc-500">Actions détenues</h2>
<p className="text-3xl font-bold">{shares}</p>
</div>
</div>
 
      {/* Boutons */}
<div className="flex gap-6">
<button

          onClick={buy}

          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
>

          Acheter
</button>
 
        <button

          onClick={sell}

          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
>

          Vendre
</button>
</div>
 
      {/* Valeur totale */}
<div className="text-xl font-semibold">

        Valeur totale : <span className="text-blue-600">{total} $</span>
</div>
 
      {/* Mini graphique */}
<div className="w-full max-w-2xl h-40 bg-white rounded-xl shadow relative p-4">
<h3 className="text-sm text-zinc-500 mb-2">Évolution du prix</h3>
 
        <svg width="100%" height="100%">

          {history.map((p, i) => {

            if (i === 0) return null;
 
            const x1 = ((i - 1) / history.length) * 300;

            const y1 = 100 - (history[i - 1] / Math.max(...history)) * 100;
 
            const x2 = (i / history.length) * 300;

            const y2 = 100 - (p / Math.max(...history)) * 100;
 
            return (
<line

                key={i}

                x1={x1}

                y1={y1}

                x2={x2}

                y2={y2}

                stroke="#00a838ff"

                strokeWidth="3"

              />

            );

          })}
</svg>
</div>
</div>

  );

}
 