import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export default function AdminDashboard({ user, accessToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newCompany, setNewCompany] = useState({
    email: '',
    password: '',
    companyName: ''
  });
  const [createMessage, setCreateMessage] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (activeTab === 'companies') {
      fetchCompanies();
    } else if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/companies`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      if (response.ok) {
        setCompanies(data.companies || []);
      } else {
        console.error('Error fetching companies:', data.error);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/reviews`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews || []);
      } else {
        console.error('Error fetching reviews:', data.error);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setCreateMessage('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/signup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newCompany)
        }
      );

      const data = await response.json();

      if (response.ok) {
        setCreateMessage(`Success! Company "${data.companyName}" created with email: ${data.email}`);
        setNewCompany({ email: '', password: '', companyName: '' });
        fetchCompanies();
      } else {
        setCreateMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating company:', error);
      setCreateMessage('Error creating company');
    }
  };

  const handleChangePassword = async (company) => {
    const password = prompt(`Enter new password for ${company.companyName}:`);
    if (!password) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/companies/${encodeURIComponent(company.email)}/password`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newPassword: password })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`Password updated successfully for ${company.companyName}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password');
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!confirm(`Are you sure you want to delete ${company.companyName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/companies/${encodeURIComponent(company.email)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`Company ${company.companyName} deleted successfully`);
        fetchCompanies();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Error deleting company');
    }
  };

  const getPaymentBehaviorColor = (behavior) => {
    const colors = {
      'on-time': 'bg-green-100 text-green-800',
      'delayed': 'bg-yellow-100 text-yellow-800',
      'very-delayed': 'bg-red-100 text-red-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[behavior] || colors['default'];
  };

  return (
    <div className="size-full bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Karnataka Pest Control Review Portal</h1>
              <p className="text-gray-600 mt-1">Admin Dashboard - Welcome, {user.companyName}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'companies'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage Companies
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Reviews
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'companies' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Company</h2>
                <form onSubmit={handleCreateCompany} className="bg-gray-50 p-6 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={newCompany.companyName}
                        onChange={(e) => setNewCompany({ ...newCompany, companyName: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="ABC Fertilizers"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newCompany.email}
                        onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="company@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <input
                        type="text"
                        value={newCompany.password}
                        onChange={(e) => setNewCompany({ ...newCompany, password: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Password"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create Company
                  </button>
                  {createMessage && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      createMessage.startsWith('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {createMessage}
                    </div>
                  )}
                </form>

                <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Companies</h2>
                {loading ? (
                  <div className="text-center py-8 text-gray-600">Loading...</div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No companies yet</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.map((company, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{company.companyName}</h3>
                        <p className="text-sm text-gray-600 mb-3">{company.email}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleChangePassword(company)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Change Password
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company)}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search for a client
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter client name to search reviews..."
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <svg
                      className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="mt-2 text-sm text-gray-600">
                      Showing results for "{searchQuery}" ({reviews.filter(r => r.clientName.toLowerCase().includes(searchQuery.toLowerCase())).length} review{reviews.filter(r => r.clientName.toLowerCase().includes(searchQuery.toLowerCase())).length !== 1 ? 's' : ''} found)
                    </p>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-4">All Client Reviews</h2>
                {loading ? (
                  <div className="text-center py-8 text-gray-600">Loading...</div>
                ) : reviews.filter(r => !searchQuery || r.clientName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? `No reviews found for "${searchQuery}"` : "No reviews yet"}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.filter(r => !searchQuery || r.clientName.toLowerCase().includes(searchQuery.toLowerCase())).map((review) => (
                      <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">{review.clientName}</h3>
                            <p className="text-sm text-gray-600">Reviewed by: {review.companyName}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentBehaviorColor(review.paymentBehavior)}`}>
                            {review.paymentBehavior.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                        {review.rating > 0 && (
                          <div className="flex items-center mb-2">
                            <span className="text-yellow-500 mr-2">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                            <span className="text-sm text-gray-600">{review.rating}/5</span>
                          </div>
                        )}
                        {review.notes && (
                          <p className="text-gray-700 mt-2">{review.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(review.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
