"use client";

import React from "react";
import { useState, useEffect } from "react";

export default function StockApp() {
  const [activeTab, setActiveTab] = useState("portfolio");
  
  // États partagés (Prix et Portefeuille)
  const [price, setPrice] = useState<number>(100);
  const [history, setHistory] = useState<number[]>(new Array(40).fill(100));
  const [balance, setBalance] = useState<number>(10000);
  const [shares, setShares] = useState<number>(0);

  // Simulation du flux boursier en arrière-plan
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.49) * 8;
      setPrice((prev: number) => {
        const newPrice = Math.max(1, prev + change);
        setHistory((prevH: number[]) => [...prevH.slice(1), newPrice]);
        return newPrice;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Actions
  const buy = () => { if (balance >= price) { setShares((s: number) => s + 1); setBalance((b: number) => b - price); } };
  const sell = () => { if (shares > 0) { setShares((s: number) => s - 1); setBalance((b: number) => b + price); } };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      
      
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-around">
          {["portfolio", "watchlist", "analyse", "nouvelles"].map((tab) => (
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
        
        
        {activeTab === "portfolio" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Prix par Action" value={`${price.toFixed(2)} $`} />
              <StatCard title="Mon Solde" value={`${balance.toFixed(2)} $`} />
              <StatCard title="Actions" value={shares.toString()} />
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-center">
              <h3 className="text-zinc-400 text-xs font-black uppercase mb-6">Graphique en direct</h3>
              <div className="w-full h-40">
                <svg viewBox="0 0 400 100" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    points={history.map((p: number, i: number) => `${i * (400/39)},${100 - (p / (Math.max(...history) * 1.2) * 100)}`).join(" ")}
                  />
                </svg>
              </div>
              
              <div className="flex gap-4 mt-8 w-full">
                <button onClick={buy} className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-transform active:scale-95">ACHETER</button>
                <button onClick={sell} className="flex-1 py-4 border-2 border-zinc-900 rounded-2xl font-bold hover:bg-zinc-50 transition-transform active:scale-95">VENDRE</button>
              </div>
            </div>
          </div>
        )}

        
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Dernières Nouvelles</h2>
            {[1, 2, 3].map(n => (
              <div key={n} className="p-4 bg-white rounded-xl border border-zinc-100">
                <div className="h-2 w-20 bg-blue-100 rounded mb-2"></div>
                <div className="h-4 w-full bg-zinc-100 rounded"></div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}