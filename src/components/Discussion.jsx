import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  getDiscussion,
  updateDiscussion,
  updateLeaderboard,
} from '../services/firebase';
import { callOpenRouter } from '../services/openrouter';
import {
  Header,
  Footer,
  ModelAvatar,
  LoadingOverlay,
} from './SharedComponents';

const Discussion = () => {
  // Get discussion ID from URL params
  const { discussionId } = useParams();
  const navigate = useNavigate();

  // State
  const [discussion, setDiscussion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading discussion...');
  const [streamingStatus, setStreamingStatus] = useState({});
  const [votingStatus, setVotingStatus] = useState({});
  const [currentStep, setCurrentStep] = useState('loading');

  // Fetch discussion data
  useEffect(() => {
    const fetchDiscussion = async () => {
      setIsLoading(true);

      try {
        const data = await getDiscussion(discussionId);

        if (!data) {
          // Discussion not found
          alert('Discussion not found');
          navigate('/');
          return;
        }

        setDiscussion(data);

        // Set current step based on discussion status
        if (data.status === 'completed') {
          setCurrentStep('results');
        } else if (
          data.discussions &&
          data.discussions.some((d) => d.round === data.currentRound)
        ) {
          // Current round already has comments
          setCurrentStep('discussion');
        } else {
          // Need to start the current round
          setCurrentStep('starting');
          startRound(data);
        }
      } catch (error) {
        console.error('Error fetching discussion:', error);
        alert('Error loading discussion');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscussion();
  }, [discussionId, navigate]);

  // Start a discussion round
  const startRound = async (discussionData) => {
    const currentRound = discussionData.currentRound;
    const participants = discussionData.participants.filter(
      (p) => !p.eliminated
    );

    // Initialize streaming status
    const initialStreamingStatus = {};
    participants.forEach((p) => {
      initialStreamingStatus[p.id] = {
        isStreaming: true,
        content: '',
      };
    });
    setStreamingStatus(initialStreamingStatus);

    // Create empty discussion structure for this round
    const roundDiscussion = {
      round: currentRound,
      comments: participants.map((p) => ({
        modelId: p.id,
        playerName: discussionData.playerMap[p.id],
        comment: '',
        timestamp: new Date(),
      })),
    };

    // Add to discussion state
    setDiscussion((prev) => ({
      ...prev,
      discussions: [...(prev.discussions || []), roundDiscussion],
    }));

    setCurrentStep('discussion');

    // Generate prompts and get responses for each participant
    for (const participant of participants) {
      const prompt = generatePrompt(participant, currentRound, discussionData);

      // Call OpenRouter API with streaming
      try {
        await callOpenRouter({
          prompt,
          modelId: participant.apiId,
          onChunk: (content) => {
            // Update streaming status
            setStreamingStatus((prev) => ({
              ...prev,
              [participant.id]: {
                isStreaming: true,
                content,
              },
            }));

            // Update discussion state
            setDiscussion((prev) => {
              const updatedDiscussions = [...(prev.discussions || [])];
              const roundIndex = updatedDiscussions.findIndex(
                (d) => d.round === currentRound
              );

              if (roundIndex !== -1) {
                const commentIndex = updatedDiscussions[
                  roundIndex
                ].comments.findIndex((c) => c.modelId === participant.id);

                if (commentIndex !== -1) {
                  updatedDiscussions[roundIndex].comments[
                    commentIndex
                  ].comment = content;
                }
              }

              return {
                ...prev,
                discussions: updatedDiscussions,
              };
            });
          },
          onComplete: () => {
            // Mark streaming as complete
            setStreamingStatus((prev) => ({
              ...prev,
              [participant.id]: {
                ...prev[participant.id],
                isStreaming: false,
              },
            }));
          },
          onError: (error) => {
            console.error(
              `Error getting comment from ${participant.id}:`,
              error
            );

            // Update with error message
            setStreamingStatus((prev) => ({
              ...prev,
              [participant.id]: {
                isStreaming: false,
                content: `[This AI assistant was unable to provide feedback due to a technical issue]`,
              },
            }));

            // Update discussion state
            setDiscussion((prev) => {
              const updatedDiscussions = [...(prev.discussions || [])];
              const roundIndex = updatedDiscussions.findIndex(
                (d) => d.round === currentRound
              );

              if (roundIndex !== -1) {
                const commentIndex = updatedDiscussions[
                  roundIndex
                ].comments.findIndex((c) => c.modelId === participant.id);

                if (commentIndex !== -1) {
                  updatedDiscussions[roundIndex].comments[
                    commentIndex
                  ].comment = `[This AI assistant was unable to provide feedback due to a technical issue]`;
                }
              }

              return {
                ...prev,
                discussions: updatedDiscussions,
              };
            });
          },
        });
      } catch (error) {
        console.error(`Error in OpenRouter call for ${participant.id}:`, error);
      }
    }

    // Update discussion in Firebase
    try {
      await updateDiscussion(discussionId, {
        discussions: [...(discussionData.discussions || []), roundDiscussion],
      });
    } catch (error) {
      console.error('Error updating discussion:', error);
    }
  };

  // Proceed to voting
  const proceedToVoting = async () => {
    if (!discussion) return;

    setCurrentStep('voting');
    await startVoting();

    // Update discussion in Firebase
    try {
      await updateDiscussion(discussionId, {
        status: 'voting',
      });
    } catch (error) {
      console.error('Error updating discussion status:', error);
    }
  };

  // Start the voting process
  const startVoting = async () => {
    const participants = discussion.participants.filter((p) => !p.eliminated);

    // Initialize voting status
    const initialVotingStatus = {};
    participants.forEach((p) => {
      initialVotingStatus[p.id] = {
        isStreaming: true,
        content: '',
        vote: null,
      };
    });
    setVotingStatus(initialVotingStatus);

    // Get all discussions for context
    const allDiscussions = discussion.discussions || [];

    // Generate voting prompts and get responses
    for (const participant of participants) {
      const votingPrompt = generateVotingPrompt(
        participant,
        allDiscussions,
        discussion
      );

      // Call OpenRouter API with streaming
      try {
        await callOpenRouter({
          prompt: votingPrompt,
          modelId: participant.apiId,
          onChunk: (content) => {
            // Update voting status
            setVotingStatus((prev) => ({
              ...prev,
              [participant.id]: {
                isStreaming: true,
                content,
                vote: parseVote(content, discussion),
              },
            }));
          },
          onComplete: () => {
            // Mark streaming as complete
            setVotingStatus((prev) => ({
              ...prev,
              [participant.id]: {
                ...prev[participant.id],
                isStreaming: false,
              },
            }));
          },
          onError: (error) => {
            console.error(`Error getting vote from ${participant.id}:`, error);

            // Update with error message
            setVotingStatus((prev) => ({
              ...prev,
              [participant.id]: {
                isStreaming: false,
                content: `[This AI assistant was unable to vote due to a technical issue]`,
                vote: null,
              },
            }));
          },
        });
      } catch (error) {
        console.error(`Error in OpenRouter call for ${participant.id}:`, error);
      }
    }
  };

  // Finalize the discussion
  const finalizeDiscussion = async () => {
    if (!discussion) return;

    setIsLoading(true);
    setLoadingText('Finalizing discussion...');

    try {
      // Collect all votes
      const results = {};

      Object.entries(votingStatus).forEach(([modelId, status]) => {
        if (status.vote) {
          results[modelId] = status.vote;
        }
      });

      // Calculate stats for leaderboard
      const dimensionId = `${discussion.conceptA.toLowerCase()}-${discussion.conceptB.toLowerCase()}`;
      const dimensionUpdate = {
        conceptA: discussion.conceptA,
        conceptB: discussion.conceptB,
        context: discussion.context,
        optionA: discussion.optionA,
        optionB: discussion.optionB,
      };

      const modelUpdates = {};

      // Calculate the balance for each model (what % they lean towards option B)
      Object.entries(results).forEach(([modelId, vote]) => {
        const baseModelId = modelId.split('-')[0];

        // 0 for A, 100 for B, 50 for Neutral
        const balance = vote === 'A' ? 0 : vote === 'B' ? 100 : 50;

        modelUpdates[modelId] = {
          modelId,
          baseModelId,
          balance,
          vote,
        };
      });

      // Update discussion in Firebase
      await updateDiscussion(discussionId, {
        status: 'completed',
        results,
        votingReasons: votingStatus,
      });

      // Update leaderboard
      await updateLeaderboard(dimensionId, dimensionUpdate, modelUpdates);

      // Update local state
      setDiscussion((prev) => ({
        ...prev,
        status: 'completed',
        results,
        votingReasons: votingStatus,
      }));

      setCurrentStep('results');
    } catch (error) {
      console.error('Error finalizing discussion:', error);
      alert('Error finalizing discussion');
    } finally {
      setIsLoading(false);
    }
  };

  // Move to next round
  const nextRound = async () => {
    if (!discussion) return;

    setIsLoading(true);
    setLoadingText('Starting next round...');

    try {
      const nextRoundNumber = discussion.currentRound + 1;

      // Update discussion in Firebase
      await updateDiscussion(discussionId, {
        currentRound: nextRoundNumber,
      });

      // Update local state
      setDiscussion((prev) => ({
        ...prev,
        currentRound: nextRoundNumber,
      }));

      // Start next round
      startRound({
        ...discussion,
        currentRound: nextRoundNumber,
      });
    } catch (error) {
      console.error('Error starting next round:', error);
      alert('Error starting next round');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate prompt for model based on round
  const generatePrompt = (participant, round, discussionData) => {
    let prompt = `You are ${
      discussionData.playerMap[participant.id]
    }, an AI assistant participating in a management discussion about "${
      discussionData.conceptA
    } vs ${discussionData.conceptB}".\n\n`;

    prompt += `Context: ${discussionData.context}\n\n`;
    prompt += `The two approaches being discussed are:\n`;
    prompt += `Option A: ${discussionData.optionA} (${discussionData.conceptA})\n`;
    prompt += `Option B: ${discussionData.optionB} (${discussionData.conceptB})\n\n`;

    if (round === 1) {
      prompt += `This is the first round of discussion. Please share your thoughts on these two approaches. Consider the strengths and weaknesses of each option. Don't explicitly state which option you prefer yet, as there will be a final voting round later.`;
    } else {
      // Include previous round comments
      const previousRound = discussionData.discussions.find(
        (d) => d.round === round - 1
      );

      if (previousRound && previousRound.comments) {
        prompt += `Previous round comments:\n\n`;

        previousRound.comments.forEach((comment) => {
          prompt += `${comment.playerName}: "${comment.comment.substring(
            0,
            250
          )}..."\n\n`;
        });

        prompt += `This is round ${round} of the discussion. Based on the previous comments, please provide your updated thoughts. You can respond to points raised by others, but don't explicitly state your final choice yet.`;
      } else {
        prompt += `This is round ${round} of the discussion. Please share your updated thoughts on the two approaches.`;
      }
    }

    return prompt;
  };

  // Generate voting prompt
  const generateVotingPrompt = (participant, discussions, discussionData) => {
    let prompt = `You are ${
      discussionData.playerMap[participant.id]
    }, an AI assistant who has participated in a discussion about "${
      discussionData.conceptA
    } vs ${discussionData.conceptB}".\n\n`;

    prompt += `Context: ${discussionData.context}\n\n`;
    prompt += `The two approaches that were discussed are:\n`;
    prompt += `Option A: ${discussionData.optionA} (${discussionData.conceptA})\n`;
    prompt += `Option B: ${discussionData.optionB} (${discussionData.conceptB})\n\n`;

    // Include all previous discussions
    prompt += `Discussion history:\n\n`;

    discussions.forEach((roundData) => {
      prompt += `Round ${roundData.round}:\n`;

      roundData.comments.forEach((comment) => {
        prompt += `${comment.playerName}: "${comment.comment.substring(
          0,
          250
        )}..."\n\n`;
      });

      prompt += `\n`;
    });

    prompt += `Based on the full discussion, you now need to make a clear decision between Option A and Option B. Start your response with one of these exact phrases:\n`;
    prompt += `- "I choose Option A" if you prefer ${discussionData.optionA}\n`;
    prompt += `- "I choose Option B" if you prefer ${discussionData.optionB}\n`;
    prompt += `- "I remain neutral" if you truly cannot decide between the options\n\n`;

    prompt += `After stating your choice, explain your reasoning in 2-3 sentences.`;

    return prompt;
  };

  // Parse vote from response
  const parseVote = (response, discussionData) => {
    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('i choose option a')) {
      return 'A';
    } else if (lowerResponse.includes('i choose option b')) {
      return 'B';
    } else if (lowerResponse.includes('i remain neutral')) {
      return 'Neutral';
    }

    // Fallback pattern matching
    if (
      lowerResponse.includes('option a') &&
      !lowerResponse.includes('option b')
    ) {
      return 'A';
    } else if (
      lowerResponse.includes('option b') &&
      !lowerResponse.includes('option a')
    ) {
      return 'B';
    } else if (
      lowerResponse.includes(discussionData.conceptA.toLowerCase()) &&
      !lowerResponse.includes(discussionData.conceptB.toLowerCase())
    ) {
      return 'A';
    } else if (
      lowerResponse.includes(discussionData.conceptB.toLowerCase()) &&
      !lowerResponse.includes(discussionData.conceptA.toLowerCase())
    ) {
      return 'B';
    }

    return 'Neutral';
  };

  // Render loading state
  if (isLoading && currentStep === 'loading') {
    return <LoadingOverlay text={loadingText} />;
  }

  // Render if discussion not found
  if (!discussion) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Discussion not found
            </h2>
            <button
              onClick={() => navigate('/')}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render discussion
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Discussion header */}
          <div className="bg-white rounded-lg shadow-xl p-6 mb-8 border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2 text-gray-800">
                  {discussion.conceptA} vs {discussion.conceptB}
                </h1>
                <p className="text-gray-700 mb-4">{discussion.context}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg concept-a-bg">
                    <h4 className="font-medium">
                      Option A: {discussion.optionA}
                    </h4>
                  </div>

                  <div className="p-3 rounded-lg concept-b-bg">
                    <h4 className="font-medium">
                      Option B: {discussion.optionB}
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {discussion.participants.map((participant) => {
                    const baseModelId = participant.id.split('-')[0];

                    return (
                      <div
                        key={participant.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                      >
                        <ModelAvatar
                          modelId={baseModelId}
                          size={24}
                          className="mr-2"
                        />
                        {discussion.playerMap[participant.id]}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-lg">
                  Round {discussion.currentRound} of {discussion.rounds}
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Back to Home
                </button>
              </div>
            </div>

            {/* Round Navigation Tabs */}
            <div className="mt-6 border-b border-gray-200">
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {Array.from(
                  { length: discussion.currentRound },
                  (_, i) => i + 1
                ).map((round) => (
                  <button
                    key={round}
                    className={`py-2 px-4 text-sm font-medium rounded-t-lg transition-colors ${
                      round === discussion.currentRound
                        ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-600'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    Round {round}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results section (if discussion is completed) */}
          {(currentStep === 'results' || discussion.status === 'completed') && (
            <div className="bg-white rounded-lg shadow-xl p-6 mb-8 border border-gray-200">
              <h2 className="text-xl font-bold mb-6 text-gray-800">Results</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Vote Distribution
                  </h3>

                  <div className="flex items-center mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      {/* Calculate percentages */}
                      {(() => {
                        const results = discussion.results || {};
                        const totalVotes = Object.keys(results).length;
                        const optionAVotes = Object.values(results).filter(
                          (v) => v === 'A'
                        ).length;
                        const optionBVotes = Object.values(results).filter(
                          (v) => v === 'B'
                        ).length;
                        const neutralVotes =
                          totalVotes - optionAVotes - optionBVotes;

                        const optionAPercent = totalVotes
                          ? (optionAVotes / totalVotes) * 100
                          : 0;
                        const optionBPercent = totalVotes
                          ? (optionBVotes / totalVotes) * 100
                          : 0;
                        const neutralPercent = totalVotes
                          ? (neutralVotes / totalVotes) * 100
                          : 0;

                        return (
                          <>
                            <div
                              className="h-4 rounded-l-full concept-a-bg"
                              style={{ width: `${optionAPercent}%` }}
                            ></div>
                            <div
                              className="h-4 neutral-bg"
                              style={{ width: `${neutralPercent}%` }}
                            ></div>
                            <div
                              className="h-4 rounded-r-full concept-b-bg"
                              style={{ width: `${optionBPercent}%` }}
                            ></div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg concept-a-bg">
                      <h4 className="font-medium">{discussion.conceptA}</h4>
                      <p className="text-2xl font-bold mt-1">
                        {
                          Object.values(discussion.results || {}).filter(
                            (v) => v === 'A'
                          ).length
                        }
                      </p>
                    </div>

                    <div className="p-3 rounded-lg neutral-bg">
                      <h4 className="font-medium">Neutral</h4>
                      <p className="text-2xl font-bold mt-1">
                        {
                          Object.values(discussion.results || {}).filter(
                            (v) => v === 'Neutral'
                          ).length
                        }
                      </p>
                    </div>

                    <div className="p-3 rounded-lg concept-b-bg">
                      <h4 className="font-medium">{discussion.conceptB}</h4>
                      <p className="text-2xl font-bold mt-1">
                        {
                          Object.values(discussion.results || {}).filter(
                            (v) => v === 'B'
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Model Decisions
                  </h3>

                  <div className="space-y-2">
                    {discussion.participants.map((participant) => {
                      const vote =
                        discussion.results?.[participant.id] || 'No vote';
                      const baseModelId = participant.id.split('-')[0];

                      let bgClass = 'bg-gray-100';
                      if (vote === 'A') bgClass = 'concept-a-bg';
                      else if (vote === 'B') bgClass = 'concept-b-bg';
                      else if (vote === 'Neutral') bgClass = 'neutral-bg';

                      return (
                        <div
                          key={participant.id}
                          className={`p-3 rounded-lg ${bgClass} flex items-center`}
                        >
                          <ModelAvatar
                            modelId={baseModelId}
                            size={32}
                            className="mr-3"
                          />
                          <div>
                            <span className="font-medium">
                              {discussion.playerMap[participant.id]}
                            </span>
                            <div className="text-sm text-gray-600">
                              Vote:{' '}
                              {vote === 'A'
                                ? discussion.conceptA
                                : vote === 'B'
                                ? discussion.conceptB
                                : vote === 'Neutral'
                                ? 'Neutral'
                                : 'No vote'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Voting Rationales</h3>
              <div className="space-y-4">
                {discussion.votingReasons &&
                  Object.entries(discussion.votingReasons).map(
                    ([modelId, data]) => {
                      const participant = discussion.participants.find(
                        (p) => p.id === modelId
                      );
                      if (!participant) return null;

                      const baseModelId = modelId.split('-')[0];
                      const vote = discussion.results?.[modelId] || 'No vote';

                      let bgClass = 'bg-gray-50';
                      if (vote === 'A') bgClass = 'concept-a-bg';
                      else if (vote === 'B') bgClass = 'concept-b-bg';
                      else if (vote === 'Neutral') bgClass = 'neutral-bg';

                      return (
                        <div
                          key={modelId}
                          className="border border-gray-200 rounded-lg shadow-sm"
                        >
                          <div className="p-4 border-b border-gray-200 flex items-center">
                            <ModelAvatar
                              modelId={baseModelId}
                              size={36}
                              className="mr-3"
                            />
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {discussion.playerMap[modelId]}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Vote:{' '}
                                {vote === 'A'
                                  ? discussion.conceptA
                                  : vote === 'B'
                                  ? discussion.conceptB
                                  : vote === 'Neutral'
                                  ? 'Neutral'
                                  : 'No vote'}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`p-4 ${bgClass} rounded-b-lg prose prose-sm max-w-none`}
                          >
                            <ReactMarkdown>{data.content}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Return to Leaderboard
                </button>
              </div>
            </div>
          )}

          {/* Current discussion */}
          {(currentStep === 'discussion' || currentStep === 'voting') && (
            <>
              {/* Render all discussions */}
              {discussion.discussions &&
                discussion.discussions.map((roundData) => (
                  <div
                    key={roundData.round}
                    className="bg-white rounded-lg shadow-xl p-6 mb-8 border border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-800">
                        Round {roundData.round} Discussion
                      </h2>

                      {currentStep === 'discussion' &&
                        roundData.round === discussion.currentRound &&
                        !Object.values(streamingStatus).some(
                          (s) => s.isStreaming
                        ) && (
                          <div className="flex space-x-4">
                            {discussion.currentRound < discussion.rounds ? (
                              <button
                                onClick={nextRound}
                                className="py-2 px-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Next Round
                              </button>
                            ) : null}

                            <button
                              onClick={proceedToVoting}
                              className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                            >
                              Proceed to Voting
                            </button>
                          </div>
                        )}

                      {currentStep === 'voting' &&
                        !Object.values(votingStatus).some(
                          (s) => s.isStreaming
                        ) && (
                          <button
                            onClick={finalizeDiscussion}
                            className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                          >
                            Finalize Discussion
                          </button>
                        )}
                    </div>

                    <div className="space-y-6">
                      {roundData.comments.map((comment, idx) => {
                        const participant = discussion.participants.find(
                          (p) => p.id === comment.modelId
                        );
                        if (!participant) return null;

                        const baseModelId = comment.modelId.split('-')[0];
                        const isStreaming =
                          streamingStatus[comment.modelId]?.isStreaming;

                        return (
                          <div
                            key={idx}
                            className="p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center mb-3">
                              <ModelAvatar
                                modelId={baseModelId}
                                size={36}
                                className="mr-3"
                              />
                              <div>
                                <div className="font-semibold text-gray-800 flex items-center">
                                  {comment.playerName}
                                  {isStreaming && (
                                    <span className="ml-2 text-xs text-gray-500 animate-pulse">
                                      typing...
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({participant.name})
                                </div>
                              </div>
                            </div>

                            <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg">
                              <ReactMarkdown>
                                {comment.comment || '...'}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Voting section */}
              {currentStep === 'voting' && (
                <div className="bg-white rounded-lg shadow-xl p-6 mb-8 border border-gray-200">
                  <h2 className="text-xl font-bold mb-6 text-gray-800">
                    Final Voting
                  </h2>

                  <div className="space-y-6">
                    {discussion.participants.map((participant) => {
                      const baseModelId = participant.id.split('-')[0];
                      const votingData = votingStatus[participant.id];
                      const isStreaming = votingData?.isStreaming;
                      const vote = votingData?.vote;

                      let voteClass = '';
                      if (vote === 'A') voteClass = 'text-blue-600';
                      else if (vote === 'B') voteClass = 'text-green-600';
                      else if (vote === 'Neutral') voteClass = 'text-gray-600';

                      return (
                        <div
                          key={participant.id}
                          className="p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center mb-3">
                            <ModelAvatar
                              modelId={baseModelId}
                              size={36}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold text-gray-800 flex items-center">
                                {discussion.playerMap[participant.id]}
                                {isStreaming && (
                                  <span className="ml-2 text-xs text-gray-500 animate-pulse">
                                    deciding...
                                  </span>
                                )}
                              </div>
                              <div className="text-xs flex items-center">
                                <span className="text-gray-500 mr-2">
                                  ({participant.name})
                                </span>
                                {vote && (
                                  <span className={`font-medium ${voteClass}`}>
                                    Vote:{' '}
                                    {vote === 'A'
                                      ? discussion.conceptA
                                      : vote === 'B'
                                      ? discussion.conceptB
                                      : 'Neutral'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg">
                            <ReactMarkdown>
                              {votingData?.content || '...'}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!Object.values(votingStatus).some((s) => s.isStreaming) && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={finalizeDiscussion}
                        className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                      >
                        Finalize Discussion
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Loading overlay */}
      {isLoading && <LoadingOverlay text={loadingText} />}
    </div>
  );
};

export default Discussion;
