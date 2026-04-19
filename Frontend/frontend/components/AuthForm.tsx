import React, { useState } from "react";

interface AuthFormProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, email: string, password: string) => Promise<boolean>;
  error: string | null;
  successMessage: string | null;
  loading: boolean;
  onClearError: () => void;
}

export function AuthForm({
  onLogin,
  onRegister,
  error,
  successMessage,
  loading,
  onClearError,
}: AuthFormProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [credentials, setCredentials] = useState({ username: "", password: "", email: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onLogin(credentials.username, credentials.password);
    if (success) {
      setCredentials({ username: "", password: "", email: "" });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onRegister(credentials.username, credentials.email, credentials.password);
    if (success) {
      setCredentials({ username: "", password: "", email: "" });
    }
  };

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
                onClearError();
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
                onClearError();
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
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
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
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
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
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Email</label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
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
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Create a password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Register"}
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
