import React, { useState, useEffect } from "react";

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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

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
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      isDarkMode
        ? "bg-gradient-to-br from-zinc-900 to-zinc-800"
        : "bg-gradient-to-br from-blue-50 to-indigo-100"
    }`}>
      <div className="w-full max-w-md">
        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors duration-300 ${
          isDarkMode
            ? "bg-zinc-800 border-zinc-700"
            : "bg-white border-zinc-100"
        }`}>
          {/* Logo/Title with Theme Toggle */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-5xl font-black">
                  <span className={isDarkMode ? "text-white" : "text-black"}>Trade</span>
                  <span className="text-blue-600">Xpert</span>
                </h1>
                <p className={`${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Trading Simulator</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`py-2 px-3 text-lg font-bold rounded transition-all ${
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-amber-400 text-zinc-900 hover:bg-amber-500"
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? "🌙" : "☀️"}
              </button>
            </div>
          </div>

          {/* Notifications */}
          {error && (
            <div className={`mb-4 p-4 border rounded-lg text-sm transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900 border-red-700 text-red-200"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {error}
            </div>
          )}
          {successMessage && (
            <div className={`mb-4 p-4 border rounded-lg text-sm transition-colors duration-300 ${
              isDarkMode
                ? "bg-green-900 border-green-700 text-green-200"
                : "bg-green-50 border-green-200 text-green-700"
            }`}>
              {successMessage}
            </div>
          )}

          {/* Auth Mode Tabs */}
          <div className={`flex gap-2 mb-8 p-1 rounded-lg transition-colors duration-300 ${
            isDarkMode
              ? "bg-zinc-700"
              : "bg-zinc-100"
          }`}>
            <button
              onClick={() => {
                setAuthMode("login");
                onClearError();
              }}
              className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                authMode === "login"
                  ? isDarkMode
                    ? "bg-zinc-800 text-blue-400 shadow-sm"
                    : "bg-white text-blue-600 shadow-sm"
                  : isDarkMode
                  ? "text-zinc-400 hover:text-zinc-200"
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
                  ? isDarkMode
                    ? "bg-zinc-800 text-blue-400 shadow-sm"
                    : "bg-white text-blue-600 shadow-sm"
                  : isDarkMode
                  ? "text-zinc-400 hover:text-zinc-200"
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
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  isDarkMode ? "text-zinc-200" : "text-zinc-700"
                }`}>
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDarkMode
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400"
                  }`}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  isDarkMode ? "text-zinc-200" : "text-zinc-700"
                }`}>
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDarkMode
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400"
                  }`}
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
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  isDarkMode ? "text-zinc-200" : "text-zinc-700"
                }`}>
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDarkMode
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400"
                  }`}
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  isDarkMode ? "text-zinc-200" : "text-zinc-700"
                }`}>
                  Email
                </label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDarkMode
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400"
                  }`}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  isDarkMode ? "text-zinc-200" : "text-zinc-700"
                }`}>
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDarkMode
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400"
                  }`}
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

          <p className={`text-center text-xs mt-6 transition-colors duration-300 ${
            isDarkMode ? "text-zinc-400" : "text-zinc-500"
          }`}>
            Stock Market Simulator • Demo Trading Platform
          </p>
        </div>
      </div>
    </div>
  );
}
