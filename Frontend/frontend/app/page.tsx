"use client";

import { useState, useEffect } from "react";

export default function StockApp() {
  const [activeTab, setActiveTab] = useState("portfolio");
  const [price, setPrice] = useState(100);
  const [balance, setBalance] = useState(0);
  const [shares, setShares] = useState(0);

  // Charger les données initiales du backend
  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    const response = await fetch("/api/portfolio/", {
      headers: { "Authorization": `Token ${localStorage.getItem("token")}` }
    });
    const data = await response.json();
    // On suppose que l'API renvoie le solde et les actions
    setBalance(data.profile.balance);
    setShares(data.stocks[0]?.quantity || 0); 
  };

  // Logique d'achat via le Backend
  const buyStock = async (quantity: number) => {
    const response = await fetch("/api/buy_stock/", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        stock_id: 1, // ID de l'action à acheter
        quantity: quantity
      })
    });

    const result = await response.json();
    if (result.success) {
      fetchPortfolio(); // Rafraîchir les données après l'achat
    } else {
      alert(result.error);
    }
  };

  return (
    // ... Garder le même JSX que précédemment ...
    // Modifier le bouton :
    <button onClick={() => buyStock(1)} className="...">ACHETER</button>
  );
}