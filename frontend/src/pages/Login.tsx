import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async (response: any) => {
    setError('');
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

      const res = await fetch(`${apiBase}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Google authentication failed');
      }

      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message || 'Failed to authenticate via Google.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogleSignIn = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

        const res = await fetch(`${apiBase}/auth/google-config`);
        const configData = await res.json();
        if (configData.clientId) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if ((window as any).google) {
              (window as any).google.accounts.id.initialize({
                client_id: configData.clientId,
                callback: handleGoogleLogin,
              });
              (window as any).google.accounts.id.renderButton(
                document.getElementById('google-signin-btn'),
                { 
                  theme: 'outline', 
                  size: 'large', 
                  width: '380', 
                  shape: 'rectangular', 
                  logo_alignment: 'center' 
                }
              );
            }
          };
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error('Failed to configure Google Sign-In:', err);
      }
    };

    initGoogleSignIn();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Save token and user context
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#1e40af] via-[#312e81] to-[#581c87] px-4 overflow-hidden font-sans">
      {/* Dynamic blurred ambient light */}
      <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-blue-500/20 blur-[90px] animate-blob-1 pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] rounded-full bg-violet-500/25 blur-[100px] animate-blob-2 pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-indigo-500/15 blur-[90px] animate-blob-3 pointer-events-none"></div>

      {/* Floating geometric glass objects (visible moving objects) */}
      <div className="absolute top-[15%] left-[10%] w-24 h-24 rounded-full border border-white/15 bg-white/5 backdrop-blur-xs animate-blob-1 pointer-events-none flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-white/5 bg-white/5"></div>
      </div>
      <div className="absolute bottom-[20%] left-[15%] w-16 h-16 rounded-full border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 backdrop-blur-xs animate-blob-2 pointer-events-none"></div>
      <div className="absolute top-[25%] right-[12%] w-32 h-32 rounded-full border border-violet-400/15 bg-white/5 backdrop-blur-xs animate-blob-3 pointer-events-none flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border border-white/5 bg-transparent"></div>
      </div>
      <div className="absolute bottom-[15%] right-[20%] w-20 h-20 rounded-full border border-white/15 bg-white/5 backdrop-blur-xs animate-blob-1 pointer-events-none"></div>
      <div className="absolute top-[45%] left-[22%] w-8 h-8 rounded-full bg-blue-400/20 animate-blob-3 pointer-events-none"></div>
      <div className="absolute bottom-[40%] right-[25%] w-10 h-10 rounded-full bg-violet-400/20 animate-blob-2 pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/90 p-8 md:p-10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] relative z-10 border border-white/20 backdrop-blur-xl">
        {/* Title / Logo Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-16 h-16 flex items-center justify-center transition-transform hover:scale-105 duration-300 mb-1">
            <img src="/logo-transparent-2.png" alt="Setu AI Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-widest mt-2 leading-none uppercase bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">SETU AI</h1>
          <p className="text-[10px] text-indigo-650 font-extrabold uppercase tracking-widest mt-1.5 leading-none">by DotnLott</p>
          <p className="text-xs text-slate-500 font-semibold mt-5">Welcome Back! Sign in to manage operations</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Please type ID..."
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Please type Password..."
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-655 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6 text-slate-200">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Or sign in with</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center w-full">
          <div id="google-signin-btn" className="w-full flex justify-center"></div>
        </div>
      </div>
    </div>
  );
};
export default Login;
