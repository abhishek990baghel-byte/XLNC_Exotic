import React, { useState } from "react";
import XLNCLogo from "../components/XLNCLogo";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsAuthenticating(true);
    try {
      await login(email, password);
    } catch (err) {
      // Error handling is managed by AuthContext via toast
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <XLNCLogo className="w-24 h-24 text-zinc-900" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-900 tracking-tight">
          XLNC Exotic Homes
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Enterprise Inventory Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-10 shadow-xl sm:rounded-2xl border border-zinc-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Email Address</label>
              <div className="mt-1">
                <input
                  aria-label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 transition-colors sm:text-sm"
                  placeholder="admin@xlncexotic.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Password</label>
              <div className="mt-1">
                <input
                  aria-label="Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 transition-colors sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              aria-label="Sign In"
              type="submit"
              disabled={isAuthenticating || !email || !password}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50"
            >
              {isAuthenticating ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="text-xs text-center text-zinc-500 mt-6 leading-relaxed">
            Authorized personnel only.<br/>
            All access attempts are logged and monitored.
          </div>
        </div>
      </div>
    </div>
  );
}
