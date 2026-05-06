import { useState, useCallback } from "react";
import { apiService } from "@/lib/api-service";
import { api } from "@/lib/api";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initAuth = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiService.login(username, password);
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);

        api.defaults.headers.Authorization = `Bearer ${data.access}`;
        setIsAuthenticated(true);

        return true;
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || "Login failed";
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        await apiService.register(username, email, password);

        const loginData = await apiService.login(username, password);
        localStorage.setItem("access_token", loginData.access);
        localStorage.setItem("refresh_token", loginData.refresh);

        api.defaults.headers.Authorization = `Bearer ${loginData.access}`;
        setIsAuthenticated(true);

        return true;
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.username?.[0] ||
          err.response?.data?.email?.[0] ||
          "Registration failed";
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await apiService.logout(refreshToken);
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      delete api.defaults.headers.Authorization;
      setIsAuthenticated(false);
    }
  }, []);

  return {
    isAuthenticated,
    error,
    loading,
    initAuth,
    login,
    register,
    logout,
    setError,
  };
};
