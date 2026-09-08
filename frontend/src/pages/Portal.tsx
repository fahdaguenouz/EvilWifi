import React, { useState } from 'react';
import { Wifi, ShieldAlert, CheckCircle2, Coffee } from 'lucide-react';
import axios from 'axios';

export default function Portal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Send credentials to backend for harvesting demonstration
      await axios.post('http://localhost:8000/api/portal/login', {
        username,
        password
      });
      setIsConnected(true);
    } catch (err: any) {
      console.error('Portal login error:', err);
      // Even if it fails, we can show a generic error or just let them retry
      // If the backend returns 400 because lab is not running, show it.
      setError(err.response?.data?.detail || 'Failed to connect. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Connected!</h2>
          <p className="text-slate-600 mb-8">
            You now have access to the Free Public Wi-Fi network. You can close this page.
          </p>
          <button 
            onClick={() => window.location.href = 'https://google.com'}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Continue to Internet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col relative" 
         style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=2000")' }}>
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

      {/* Lab Safety Banner */}
      <div className="relative z-10 bg-red-600 text-white py-3 px-4 shadow-lg flex items-center justify-center gap-3">
        <ShieldAlert className="w-6 h-6 flex-shrink-0" />
        <p className="font-bold text-center text-sm sm:text-base">
          LAB ONLY — This is a simulated Rogue Access Point. NEVER enter a real password!
        </p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          
          <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Premium Coffee Wi-Fi</h1>
            <p className="text-slate-500 mt-2">Sign in to access our high-speed guest network.</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                    placeholder="Enter training username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                    placeholder="Enter training password"
                  />
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl border border-blue-100">
                <p className="font-medium mb-1">Demo Credentials:</p>
                <ul className="list-disc list-inside opacity-80">
                  <li>Username: <span className="font-mono">training-user</span></li>
                  <li>Password: <span className="font-mono">training-token</span></li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Wifi className="w-5 h-5" />
                    Connect to Network
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-slate-400">
              <p>By connecting, you agree to our Terms of Service.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
