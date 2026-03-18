"use client";
 
import { useState, useEffect } from "react";
 
export default function StockSimulation() {
  // Prix de l'action
  const [price, setPrice] = useState(100);
 
  // Historique du prix pour le graphique
  const [history, setHistory] = useState<number[]>([100]);
 
  // Données du joueur
  const [balance, setBalance] = useState(10000);
  const [shares, setShares] = useState(0);
 
  // Mise à jour du prix toutes les 2 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((prev) => {
        const change = (Math.random() - 0.5) * 4; // Variation aléatoire
        const newPrice = Math.max(1, prev + change);
 
        setHistory((h) => [...h.slice(-40), newPrice]); // Limite 40 points
        return newPrice;
      });
    }, 1500);
 
    return () => clearInterval(interval);
  }, []);
 
  // Achat
  function buy() {
    if (balance >= price) {
      setShares(shares + 1);
      setBalance(balance - price);
    }
  }
 
  // Vente
  function sell() {
    if (shares > 0) {
      setShares(shares - 1);
      setBalance(balance + price);
    }
  }
 
  // Valeur totale
  const total = Math.round(balance + shares * price);
 
  return (
    <div className="flex flex-col items-center gap-10 py-10">
 
      <h1 className="text-4xl font-bold">Simulation Boursière 📈</h1>
 
      {/* Infos principales */}
      <div className="grid grid-cols-3 gap-8 text-center">
        <div className="p-6 bg-white shadow rounded-xl">
          <h2 className="text-sm text-zinc-500">Prix de l'action</h2>
          <p className="text-3xl font-bold">{price.toFixed(2)} $</p>
        </div>
 
        <div className="p-6 bg-white shadow rounded-xl">
          <h2 className="text-sm text-zinc-500">Votre solde</h2>
          <p className="text-3xl font-bold">{balance.toFixed(2)} $</p>
        </div>
 
        <div className="p-6 bg-white shadow rounded-xl">
          <h2 className="text-sm text-zinc-500">Vos actions</h2>
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
 
            const x1 = (i - 1) * (300 / history.length);
            const y1 = 100 - (history[i - 1] / Math.max(...history)) * 100;
 
            const x2 = i * (300 / history.length);
            const y2 = 100 - (p / Math.max(...history)) * 100;
 
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#0ea5e9"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}