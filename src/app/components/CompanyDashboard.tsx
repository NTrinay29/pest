import { useState, useEffect } from 'react';
import { projectId } from '/utils/supabase/info';

export default function CompanyDashboard({
  user,
  accessToken,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('submit');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newReview, setNewReview] = useState({
    clientName: '',
    paymentBehavior: 'on-time',
    rating: 5,
    notes: ''
  });

  const [confirmAccuracy, setConfirmAccuracy] =
    useState(false);

  const [submitMessage, setSubmitMessage] =
    useState('');

  const [editingReview, setEditingReview] =
    useState(null);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab]);

  const fetchReviews = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/reviews`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!confirmAccuracy) {
      setSubmitMessage(
        'Please confirm accuracy before submitting.'
      );
      return;
    }

    try {
      const url = editingReview
        ? `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/reviews/${editingReview.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/reviews`;

      const response = await fetch(url, {
        method: editingReview ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newReview)
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage(
          `Review ${
            editingReview ? 'updated' : 'submitted'
          } successfully`
        );

        setNewReview({
          clientName: '',
          paymentBehavior: 'on-time',
          rating: 5,
          notes: ''
        });

        setEditingReview(null);
        setConfirmAccuracy(false);

        if (activeTab === 'reviews') {
          fetchReviews();
        }
      } else {
        setSubmitMessage(data.error || 'Error');
      }
    } catch (error) {
      console.error(error);
      setSubmitMessage('Error submitting review');
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);

    setNewReview({
      clientName: review.clientName,
      paymentBehavior: review.paymentBehavior,
      rating: review.rating,
      notes: review.notes
    });

    setConfirmAccuracy(true);
    setActiveTab('submit');
  };

  const handleCancelEdit = () => {
    setEditingReview(null);

    setNewReview({
      clientName: '',
      paymentBehavior: 'on-time',
      rating: 5,
      notes: ''
    });

    setConfirmAccuracy(false);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Delete this review?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7a1e5de8/reviews/${reviewId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getPaymentBehaviorColor = (behavior) => {
    const colors = {
      'on-time': 'bg-green-100 text-green-800',
      delayed: 'bg-yellow-100 text-yellow-800',
      'very-delayed': 'bg-red-100 text-red-800'
    };

    return (
      colors[behavior] ||
      'bg-gray-100 text-gray-800'
    );
  };

  const filterBySearch = (reviewsList) => {
    if (!searchQuery.trim()) return reviewsList;

    return reviewsList.filter((r) =>
      r.clientName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  };

  const myReviews = filterBySearch(
    reviews.filter(
      (r) => r.companyEmail === user.email
    )
  );

  const otherReviews = filterBySearch(
    reviews.filter(
      (r) => r.companyEmail !== user.email
    )
  );

  const allFilteredReviews =
    filterBySearch(reviews);

  const getClientSummary = () => {
    if (!searchQuery.trim()) return null;

    const matchingReviews = reviews.filter((r) =>
      r.clientName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    if (matchingReviews.length === 0)
      return null;

    const totalReviews =
      matchingReviews.length;

    const ratingAverage =
      matchingReviews.reduce(
        (sum, r) =>
          sum + Number(r.rating || 0),
        0
      ) / totalReviews;

    const delayedCount =
      matchingReviews.filter(
        (r) =>
          r.paymentBehavior === 'delayed'
      ).length;

    const veryDelayedCount =
      matchingReviews.filter(
        (r) =>
          r.paymentBehavior ===
          'very-delayed'
      ).length;

    const onTimeCount =
      matchingReviews.filter(
        (r) =>
          r.paymentBehavior === 'on-time'
      ).length;

    let trustScore =
      100 -
      delayedCount * 10 -
      veryDelayedCount * 20;

    if (trustScore < 0) trustScore = 0;

    let riskLevel = 'Low';

    let recommendation =
      'This client has many on-time payments and appears trustworthy.';

    if (trustScore < 80) {
      riskLevel = 'Medium';

      recommendation =
        'The client has some delayed payments. Exercise caution and consider partial advance payment.';
    }

    if (trustScore < 50) {
      riskLevel = 'High';

      recommendation =
        'The client has multiple delayed payments. It is recommended to require full advance payment or reconsider doing business with them.';
    }

    return {
      totalReviews,
      ratingAverage:
        ratingAverage.toFixed(1),
      delayedCount,
      veryDelayedCount,
      onTimeCount,
      trustScore,
      riskLevel,
      recommendation
    };
  };

  const clientSummary = getClientSummary();

  return (
    <div className="size-full bg-gray-50 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Karnataka Pest Control Review Portal
              </h1>

              <p className="text-gray-600 mt-1">
                {user.companyName} -
                Company Dashboard
              </p>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Logout
            </button>

          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">

          <div className="border-b border-gray-200 flex">

            <button
              onClick={() =>
                setActiveTab('submit')
              }
              className={`px-6 py-4 border-b-2 ${
                activeTab === 'submit'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Submit Review
            </button>

            <button
              onClick={() =>
                setActiveTab('reviews')
              }
              className={`px-6 py-4 border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              View Reviews
            </button>

          </div>

          <div className="p-6">

            {activeTab === 'submit' && (
              <div>

                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {editingReview
                    ? 'Edit Client Review'
                    : 'Submit Client Review'}
                </h2>

                {editingReview && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                    You are editing a review.
                  </div>
                )}

                <form
                  onSubmit={handleSubmitReview}
                  className="bg-gray-50 p-6 rounded-lg"
                >

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Name *
                      </label>

                      <input
                        type="text"
                        value={newReview.clientName}
                        onChange={(e) =>
                          setNewReview({
                            ...newReview,
                            clientName:
                              e.target.value
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Enter client name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Behavior *
                      </label>

                      <select
                        value={
                          newReview.paymentBehavior
                        }
                        onChange={(e) =>
                          setNewReview({
                            ...newReview,
                            paymentBehavior:
                              e.target.value
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="on-time">
                          On Time
                        </option>

                        <option value="delayed">
                          Delayed (1-30 days)
                        </option>

                        <option value="very-delayed">
                          Very Delayed
                          (30+ days)
                        </option>
                      </select>
                    </div>

                  </div>

                  <div className="mb-4">

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating (1-5 stars)
                    </label>

                    <div className="flex gap-2">

                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setNewReview({
                                ...newReview,
                                rating: star
                              })
                            }
                            className="text-3xl"
                          >
                            {star <=
                            newReview.rating ? (
                              <span className="text-yellow-500">
                                ★
                              </span>
                            ) : (
                              <span className="text-gray-300">
                                ☆
                              </span>
                            )}
                          </button>
                        )
                      )}

                    </div>

                  </div>

                  <div className="mb-4">

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>

                    <textarea
                      value={newReview.notes}
                      onChange={(e) =>
                        setNewReview({
                          ...newReview,
                          notes: e.target.value
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                      placeholder="Add notes..."
                    />

                  </div>

                  <div className="mb-4">

                    <label className="flex items-start">

                      <input
                        type="checkbox"
                        checked={
                          confirmAccuracy
                        }
                        onChange={(e) =>
                          setConfirmAccuracy(
                            e.target.checked
                          )
                        }
                        required
                        className="mt-1 mr-2"
                      />

                      <span className="text-sm text-gray-700">
                        I confirm that all
                        details are accurate.
                      </span>

                    </label>

                  </div>

                  <div className="flex gap-4">

                    <button
                      type="submit"
                      disabled={
                        !confirmAccuracy
                      }
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg"
                    >
                      {editingReview
                        ? 'Update Review'
                        : 'Submit Review'}
                    </button>

                    {editingReview && (
                      <button
                        type="button"
                        onClick={
                          handleCancelEdit
                        }
                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg"
                      >
                        Cancel Edit
                      </button>
                    )}

                  </div>

                  {submitMessage && (
                    <div
                      className={`mt-4 p-4 rounded-lg ${
                        submitMessage.startsWith(
                          'Review'
                        )
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {submitMessage}
                    </div>
                  )}

                </form>

              </div>
            )}

            {activeTab === 'reviews' && (
              <div>

                {searchQuery.trim() &&
                  clientSummary && (
                    <div className="bg-gradient-to-r from-green-50 to-yellow-50 border border-green-200 rounded-xl p-6 mb-6">

                      <div className="flex justify-between flex-wrap gap-4">

                        <div>
                          <h3 className="text-2xl font-bold">
                            Client Summary
                          </h3>

                          <p>
                            Search Results
                            For:
                            <span className="font-semibold ml-2">
                              {searchQuery}
                            </span>
                          </p>
                        </div>

                        <div>
  <div className="text-sm text-gray-500">
    Payment Status
  </div>

  {
    clientSummary.delayedCount +
      clientSummary.veryDelayedCount >
    0 ? (
      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-700 mt-2">
        Delayed Payments
      </div>
    ) : (
      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700 mt-2">
        On Time Payments
      </div>
    )
  }
</div>

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">

                        <div className="bg-white rounded-lg p-4 border">
                          <div className="text-sm text-gray-500">
                            Reviews
                          </div>

                          <div className="text-2xl font-bold">
                            {
                              clientSummary.totalReviews
                            }
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border">
                          <div className="text-sm text-gray-500">
                            Average Rating
                          </div>

                          <div className="text-2xl font-bold">
                            {
                              clientSummary.ratingAverage
                            }
                            /5
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border">
                          <div className="text-sm text-gray-500">
                            On-Time
                            Payments
                          </div>

                          <div className="text-2xl font-bold text-green-700">
                            {
                              clientSummary.onTimeCount
                            }
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border">
                          <div className="text-sm text-gray-500">
                            Delayed
                            Payments
                          </div>

                          <div className="text-2xl font-bold text-red-700">
                            {clientSummary.delayedCount +
                              clientSummary.veryDelayedCount}
                          </div>
                        </div>

                      </div>

                      <div className="mt-6 bg-white border-l-4 border-yellow-500 rounded-lg p-5">

                        <div className="flex justify-between items-center mb-3">

                          <h4 className="text-lg font-semibold">
                            Recommendation
                          </h4>

                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            {
                              clientSummary.riskLevel
                            }{' '}
                            Risk
                          </span>

                        </div>

                        <p className="text-gray-700">
                          {
                            clientSummary.recommendation
                          }
                        </p>

                      </div>

                    </div>
                  )}

                <div className="mb-6">

                  <label className="block text-sm font-medium mb-2">
                    Search for a client
                  </label>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(
                        e.target.value
                      )
                    }
                    placeholder="Enter client name..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />

                  {searchQuery && (
                    <p className="mt-2 text-sm text-gray-600">
                      {
                        allFilteredReviews.length
                      }{' '}
                      reviews found
                    </p>
                  )}

                </div>

                {loading ? (
                  <div>Loading...</div>
                ) : (
                  <div className="space-y-6">

                    <div>

                      <h2 className="text-xl font-semibold mb-4">
                        My Reviews
                      </h2>

                      {myReviews.length ===
                      0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          No reviews found
                        </div>
                      ) : (
                        <div className="space-y-4">

                          {myReviews.map(
                            (review) => (
                              <div
                                key={review.id}
                                className="bg-green-50 border border-green-200 rounded-lg p-4"
                              >

                                <div className="flex justify-between items-start mb-2">

                                  <div>
                                    <h3 className="font-semibold text-lg">
                                      {
                                        review.clientName
                                      }
                                    </h3>

                                    <p className="text-sm text-gray-600">
                                      Your
                                      review
                                    </p>
                                  </div>

                                  <div className="flex gap-2">

                                    <span
                                      className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentBehaviorColor(
                                        review.paymentBehavior
                                      )}`}
                                    >
                                      {
                                        review.paymentBehavior
                                      }
                                    </span>

                                    <button
                                      onClick={() =>
                                        handleEditReview(
                                          review
                                        )
                                      }
                                      className="px-3 py-1 bg-blue-600 text-white rounded-lg"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleDeleteReview(
                                          review.id
                                        )
                                      }
                                      className="px-3 py-1 bg-red-600 text-white rounded-lg"
                                    >
                                      Delete
                                    </button>

                                  </div>

                                </div>

                                {review.notes && (
                                  <p className="text-gray-700">
                                    {
                                      review.notes
                                    }
                                  </p>
                                )}

                              </div>
                            )
                          )}

                        </div>
                      )}

                    </div>

                    <div>

                      <h2 className="text-xl font-semibold mb-4">
                        Reviews From
                        Other Companies
                      </h2>

                      {otherReviews.length ===
                      0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          No reviews found
                        </div>
                      ) : (
                        <div className="space-y-4">

                          {otherReviews.map(
                            (review) => (
                              <div
                                key={review.id}
                                className="bg-white border border-gray-200 rounded-lg p-4"
                              >

                                <div className="flex justify-between items-start mb-2">

                                  <div>
                                    <h3 className="font-semibold text-lg">
                                      {
                                        review.clientName
                                      }
                                    </h3>

                                    <p className="text-sm text-gray-600">
                                      Reviewed
                                      by:{' '}
                                      {
                                        review.companyName
                                      }
                                    </p>
                                  </div>

                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentBehaviorColor(
                                      review.paymentBehavior
                                    )}`}
                                  >
                                    {
                                      review.paymentBehavior
                                    }
                                  </span>

                                </div>

                                {review.notes && (
                                  <p className="text-gray-700">
                                    {
                                      review.notes
                                    }
                                  </p>
                                )}

                              </div>
                            )
                          )}

                        </div>
                      )}

                    </div>

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