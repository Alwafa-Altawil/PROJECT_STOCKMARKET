import axios, { AxiosInstance } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/core";

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/";
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem("access_token", access);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${access}`;
        originalRequest.headers.Authorization = `Bearer ${access}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // Authentication
  async login(username: string, password: string) {
    const response = await axiosInstance.post("/auth/login/", {
      username,
      password,
    });
    return response.data;
  },

  async register(username: string, email: string, password: string) {
    const response = await axiosInstance.post("/auth/register/", {
      username,
      email,
      password,
    });
    return response.data;
  },

  async logout(refreshToken: string) {
    const response = await axiosInstance.post("/auth/logout/", {
      refresh: refreshToken,
    });
    return response.data;
  },

  // Market data
  async fetchMarketState(source: "INTERNAL" | "ALPHA_VANTAGE" = "INTERNAL") {
    const response = await axiosInstance.get("/market/state/", { params: { source } });
    return response.data;
  },

  async updateMarketPrices(
    dailyVolatility: number,
    dailyDrift: number,
    source: "INTERNAL" | "ALPHA_VANTAGE" = "INTERNAL"
  ) {
    const response = await axiosInstance.post("/market/tick/", {
      daily_volatility: dailyVolatility,
      daily_drift: dailyDrift,
      source,
    });
    return response.data;
  },

  async seedAlphaVantageStocks() {
    const response = await axiosInstance.post("/seed/stocks/alpha-vantage/");
    return response.data;
  },

  // Portfolio operations
  async fetchPortfolio() {
    const response = await axiosInstance.get("/portfolio/status/");
    return response.data;
  },

  async buyStock(stockId: number, quantity: number) {
    const response = await axiosInstance.post("/trade/buy/", {
      stock_id: stockId,
      quantity,
    });
    return response.data;
  },

  async sellStock(stockId: number, quantity: number) {
    const response = await axiosInstance.post("/trade/sell/", {
      stock_id: stockId,
      quantity,
    });
    return response.data;
  },

  // Forecasts
  async fetchForecasts() {
    const response = await axiosInstance.get("/forecast/history/");
    return response.data;
  },

  async createForecast(stockId: number, horizonDays: number, paths: number) {
    const response = await axiosInstance.post("/forecast/monte-carlo/", {
      stock_id: stockId,
      horizon_days: horizonDays,
      paths,
    });
    return response.data;
  },

  async fetchForecastPaths(forecastId: number) {
    const response = await axiosInstance.get(`/forecast/${forecastId}/paths/`);
    return response.data;
  },
};

export { axiosInstance };
