export interface Stock {
  id: number;
  symbol: string;
  name: string;
  price: number;
  history: number[];
  updated_at: string;
}

export interface Holding {
  stock_id: number;
  symbol: string;
  name: string;
  quantity: number;
  current_price: number;
  average_buy_price: number;
  position_value: number;
  unrealized_gain: number;
}

export interface PortfolioStatus {
  balance: number;
  market_value: number;
  equity: number;
  starting_balance: number;
  total_gain: number;
  total_return_pct: number;
  holdings: Holding[];
  updated_at: string;
}

export interface MarketTickResponse {
  updated: Array<{
    id: number;
    symbol: string;
    name: string;
    price: number;
    history: number[];
  }>;
  count: number;
}

export interface Forecast {
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
