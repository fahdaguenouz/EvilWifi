import { useState } from 'react';
import { api } from '../services/api';

export default function Settings() {
  const [testUsername, setTestUsername] = useState('student');
  const [testPassword, setTestPassword] = useState('training-password');
  const [testResult, setTestResult] = useState<{status: string, message: string} | null>(null);
  
  const handlePortalTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/portal/login', {
        username: testUsername,
        password: testPassword
      });
      setTestResult({ status: 'success', message: res.data.message });
    } catch (err: any) {
      setTestResult({ 
        status: 'error', 
        message: err.response?.data?.detail || "Failed to submit. Is the lab running?" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text">Settings & Demonstrations</h1>
        <p className="text-muted mt-2">Global configuration and mock interactions for the simulator.</p>
      </header>

      <div className="bg-surface p-8 rounded-xl border border-border max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Captive Portal Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border bg-background text-primary" />
              <span>Enable captive portal interception</span>
            </label>
            <div className="pl-8">
              <label className="block text-sm font-medium text-muted mb-1">Portal Template</label>
              <select className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary">
                <option>Coffee Shop Login</option>
                <option>Hotel Guest Wi-Fi</option>
                <option>Enterprise Authentication</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <h2 className="text-xl font-semibold mb-4">Test Captive Portal Submission</h2>
          <p className="text-sm text-muted mb-4">
            Use this form to test how the backend handles credential submissions. 
            The laboratory MUST be running.
          </p>
          
          <form onSubmit={handlePortalTest} className="space-y-4 bg-background p-6 rounded-lg border border-border">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Username</label>
              <input 
                type="text" 
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Password</label>
              <input 
                type="text" 
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
              />
            </div>
            <button 
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Simulate Login
            </button>

            {testResult && (
              <div className={`mt-4 p-3 rounded-lg border ${
                testResult.status === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-accent/10 border-accent/30 text-accent'
              }`}>
                {testResult.message}
              </div>
            )}
          </form>
        </div>

        <hr className="border-border" />

        <div>
          <h2 className="text-xl font-semibold mb-4">Mode Information</h2>
          <div className="space-y-4 text-muted">
            <p>
              The application is running. Connections to the external internet are blackholed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
