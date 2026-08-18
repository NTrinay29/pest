import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import AdminDashboard from './components/AdminDashboard';
import CompanyDashboard from './components/CompanyDashboard';
import Login from './components/Login';

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    // Initialize admin user on first load
    const initAdmin = async () => {
      try {
        // First check if server is responding
        const healthResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/health`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (!healthResponse.ok) {
          console.error('Server health check failed. Please deploy the Supabase edge function from Make settings.');
          setServerError(true);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/init`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('Admin init:', data);
        } else {
          console.error('Failed to initialize admin');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing admin:', error);
        console.error('Please deploy the Supabase edge function from the Make settings page.');
        setServerError(true);
        setLoading(false);
      }
    };

    initAdmin();
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setAccessToken(token);
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
  };

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Initializing...</div>
      </div>
    );
  }

  if (serverError) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Server Not Deployed</h2>
            <p className="text-gray-600 mb-6">
              The Supabase edge function needs to be deployed before you can use this application.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="font-semibold text-blue-900 mb-2">How to deploy:</p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Open the Make settings page</li>
                <li>Click "Deploy Supabase Function"</li>
                <li>Wait for deployment to complete</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />;
  }

  return <CompanyDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />;
}