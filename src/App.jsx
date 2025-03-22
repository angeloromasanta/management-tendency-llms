import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getLeaderboardData, getRecentDiscussions } from './services/firebase';
import { Header, Footer, ModelAvatar } from './components/SharedComponents';

function App() {
  const [leaderboardData, setLeaderboardData] = useState({
    dimensions: {},
    discussions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getLeaderboardData();
        const discussions = await getRecentDiscussions(5);
        setLeaderboardData({
          dimensions: data.dimensions || {},
          discussions: discussions || [],
        });
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateNew = () => {
    navigate('/setup');
  };

  const handleDiscussionClick = (id) => {
    navigate(`/discussion/${id}`);
  };

  const renderLeaderboardPreview = () => {
    // Just render the first 3 dimensions as a preview
    const dimensions = Object.entries(leaderboardData.dimensions).slice(0, 3);

    if (dimensions.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">
            No management inclination data available yet.
          </p>
          <p className="mt-2">
            Create your first discussion to start building the benchmark!
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {dimensions.map(([dimensionId, dimension]) => (
          <div key={dimensionId} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800 flex justify-between">
              <span>
                {dimension.conceptA} vs {dimension.conceptB}
              </span>
              <span className="text-sm font-normal text-gray-500">
                {Object.keys(dimension.models || {}).length} model(s)
              </span>
            </h3>

            <div className="relative h-12 bg-gray-100 rounded-full mb-4">
              <div className="absolute left-0 top-0 w-full px-4 flex justify-between">
                <div className="pt-3 text-sm font-medium text-blue-600">
                  {dimension.conceptA}
                </div>
                <div className="pt-3 text-sm font-medium text-green-600">
                  {dimension.conceptB}
                </div>
              </div>

              <div className="absolute top-0 left-0 w-full h-full flex items-center px-2">
                {Object.entries(dimension.models || {}).map(
                  ([modelId, data]) => {
                    // Calculate position based on balance (0-100 scale)
                    const position = `${data.balance}%`;
                    return (
                      <div
                        key={modelId}
                        className="absolute transform -translate-y-1/2"
                        style={{ left: position }}
                      >
                        <ModelAvatar modelId={modelId} size={32} />
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="text-center mt-2">
          <Link
            to="/leaderboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View full leaderboard →
          </Link>
        </div>
      </div>
    );
  };

  const renderRecentDiscussions = () => {
    if (leaderboardData.discussions.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">No discussions have been created yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {leaderboardData.discussions.map((discussion) => (
          <div
            key={discussion.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleDiscussionClick(discussion.id)}
          >
            <h3 className="font-bold text-lg mb-2">
              {discussion.conceptA} vs {discussion.conceptB}
            </h3>
            <p className="text-gray-600 mb-3">{discussion.context}</p>

            <div className="flex justify-between items-center">
              <div className="flex space-x-1">
                {discussion.participants &&
                  discussion.participants
                    .slice(0, 5)
                    .map((participant) => (
                      <ModelAvatar
                        key={participant.id}
                        modelId={participant.id.split('-')[0]}
                        size={28}
                      />
                    ))}
                {discussion.participants &&
                  discussion.participants.length > 5 && (
                    <div className="rounded-full bg-gray-200 w-7 h-7 flex items-center justify-center text-xs text-gray-600">
                      +{discussion.participants.length - 5}
                    </div>
                  )}
              </div>

              <div className="text-sm text-gray-500">
                {new Date(
                  discussion.timestamp?.seconds * 1000
                ).toLocaleDateString()}
              </div>
            </div>

            <div className="mt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <div>Option A: {discussion.optionA}</div>
                <div>Option B: {discussion.optionB}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 mb-8 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">
                Management Inclination Benchmark
              </h1>
              <button
                onClick={handleCreateNew}
                className="py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Create New Discussion
              </button>
            </div>

            <p className="text-gray-600 mb-8">
              Benchmark how different AI models approach key management tensions
              such as explore vs. exploit, compete vs. collaborate, and more.
            </p>

            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'leaderboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Leaderboard Preview
                </button>
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'recent'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Recent Discussions
                </button>
              </nav>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : activeTab === 'leaderboard' ? (
              renderLeaderboardPreview()
            ) : (
              renderRecentDiscussions()
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
