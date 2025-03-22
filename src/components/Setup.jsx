import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDiscussion } from '../services/firebase';
import { Header, Footer, ModelAvatar } from './SharedComponents';
import { availableLLMs } from '../config';

const Setup = () => {
  const [formData, setFormData] = useState({
    conceptA: '',
    conceptB: '',
    context: '',
    optionA: '',
    optionB: '',
    rounds: 3,
  });

  const [selectedLLMs, setSelectedLLMs] = useState(
    availableLLMs.map((llm) => ({
      ...llm,
      selected: true,
      count: 1,
    }))
  );

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleModelCountChange = (id, increment) => {
    setSelectedLLMs((prev) =>
      prev.map((llm) => {
        if (llm.id === id) {
          const currentCount = llm.count;
          // Ensure count is between 0 and 3
          const newCount = increment
            ? Math.min(currentCount + 1, 3)
            : Math.max(currentCount - 1, 0);
          return {
            ...llm,
            count: newCount,
            selected: newCount > 0,
          };
        }
        return llm;
      })
    );
  };

  const validateForm = () => {
    // Check required fields
    if (
      !formData.conceptA ||
      !formData.conceptB ||
      !formData.context ||
      !formData.optionA ||
      !formData.optionB
    ) {
      alert('Please fill in all required fields');
      return false;
    }

    // Ensure at least 2 models are selected
    const totalModels = selectedLLMs.reduce((sum, llm) => sum + llm.count, 0);
    if (totalModels < 2) {
      alert('Please include at least 2 LLM instances');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setLoadingText('Creating discussion...');

    try {
      // Create participants array
      const participants = [];

      selectedLLMs.forEach((llm) => {
        if (llm.count > 0) {
          for (let i = 0; i < llm.count; i++) {
            participants.push({
              id: `${llm.id}-${i}`,
              name: llm.name,
              apiId: llm.apiId,
              avatarSrc: llm.avatarSrc,
              brandColor: llm.brandColor,
            });
          }
        }
      });

      // Generate player mapping
      const playerMap = {};
      participants.forEach((participant, index) => {
        playerMap[participant.id] = `Player ${index + 1}`;
      });

      // Create discussion
      const discussionId = await createDiscussion({
        conceptA: formData.conceptA,
        conceptB: formData.conceptB,
        context: formData.context,
        optionA: formData.optionA,
        optionB: formData.optionB,
        rounds: parseInt(formData.rounds),
        participants,
        playerMap,
        currentRound: 1,
        discussions: [],
        results: {},
        status: 'in-progress',
        timestamp: new Date(),
      });

      // Navigate to the discussion page
      navigate(`/discussion/${discussionId}`);
    } catch (error) {
      console.error('Error creating discussion:', error);
      alert('Error creating discussion. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 mb-8 border border-gray-200">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
              Create New Discussion
            </h1>

            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                  1. Define the Management Tension
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Concept A:
                    </label>
                    <input
                      type="text"
                      name="conceptA"
                      value={formData.conceptA}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      placeholder="e.g., Explore"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Concept B:
                    </label>
                    <input
                      type="text"
                      name="conceptB"
                      value={formData.conceptB}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      placeholder="e.g., Exploit"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Context:
                  </label>
                  <textarea
                    name="context"
                    value={formData.context}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    placeholder="e.g., You are assessing where to invest money"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option A:
                    </label>
                    <input
                      type="text"
                      name="optionA"
                      value={formData.optionA}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      placeholder="e.g., Explore new options"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option B:
                    </label>
                    <input
                      type="text"
                      name="optionB"
                      value={formData.optionB}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      placeholder="e.g., Expand current options"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                  2. Configure Discussion
                </h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Rounds:
                  </label>
                  <select
                    name="rounds"
                    value={formData.rounds}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Each round allows models to respond to previous comments.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                  3. Select AI Models
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedLLMs.map((llm) => (
                    <div
                      key={llm.id}
                      className="border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center mb-4">
                        <div className="mr-3">
                          {llm.avatarSrc ? (
                            <div
                              className="inline-flex items-center justify-center rounded-full"
                              style={{
                                width: 40,
                                height: 40,
                                backgroundColor: llm.brandColor || '#6B7280',
                                padding: '6px',
                              }}
                            >
                              <img
                                src={llm.avatarSrc}
                                alt={llm.name}
                                className="w-full h-full object-contain"
                                style={{ filter: 'brightness(0) invert(1)' }}
                              />
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-500 text-md font-medium text-white">
                              {llm.avatarText || llm.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-lg">
                          {llm.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Instances:
                        </span>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleModelCountChange(llm.id, false)
                            }
                            disabled={llm.count <= 0}
                            className={`flex items-center justify-center h-8 w-8 rounded-l-md ${
                              llm.count > 0
                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 12h14"
                              />
                            </svg>
                          </button>
                          <div className="h-8 w-8 flex items-center justify-center border-t border-b border-gray-300 bg-white text-sm font-medium">
                            {llm.count}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleModelCountChange(llm.id, true)}
                            disabled={llm.count >= 3}
                            className={`flex items-center justify-center h-8 w-8 rounded-r-md ${
                              llm.count < 3
                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`py-3 px-8 rounded-lg font-medium text-white transition-colors ${
                    isLoading
                      ? 'bg-gray-400'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isLoading ? loadingText : 'Start Discussion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing...
              </h3>
              <p className="text-center text-gray-500">{loadingText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setup;
