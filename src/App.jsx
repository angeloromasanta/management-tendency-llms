import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboardData, getDiscussions } from './services/firebase';
import { Header, Footer, ModelAvatar } from './components/SharedComponents';

const App = () => {
  const [leaderboardData, setLeaderboardData] = useState({
    dimensions: {},
    models: []
  });
  const [discussions, setDiscussions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dimensions');
  const [selectedDimension, setSelectedDimension] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getLeaderboardData();
        
        // Extract unique models from all dimensions
        const allModels = new Set();
        
        Object.values(data.dimensions || {}).forEach(dimension => {
          Object.keys(dimension.models || {}).forEach(modelId => {
            allModels.add(modelId);
          });
        });
        
        // Convert to array with model details
        const modelDetails = Array.from(allModels).map(modelId => {
          // Get the base model ID (e.g., "claude" from "claude-neutral-1")
          const baseModelId = modelId.split('-')[0];
          
          // Find model in the LLMs list
          const modelInfo = availableLLMs.find(llm => llm.id === baseModelId) || {
            name: baseModelId,
            brandColor: '#808080'
          };
          
          return {
            id: modelId,
            baseId: baseModelId,
            name: modelInfo.name,
            brandColor: modelInfo.brandColor,
            avatarSrc: modelInfo.avatarSrc
          };
        });
        
        // If no dimension is selected yet, select the first one
        if (!selectedDimension && Object.keys(data.dimensions || {}).length > 0) {
          setSelectedDimension(Object.keys(data.dimensions)[0]);
        }
        
        setLeaderboardData({
          dimensions: data.dimensions || {},
          models: modelDetails
        });
        
        // Fetch all discussions
        const discussionsData = await getDiscussions();
        setDiscussions(discussionsData);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDimension]);

  const handleCreateNew = () => {
    navigate('/setup');
  };

  const handleDiscussionClick = (id) => {
    navigate(`/discussion/${id}`);
  };

  const renderDimensionsTab = () => {
    const dimensions = Object.entries(leaderboardData.dimensions);
    
    if (dimensions.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">No management inclination data available yet.</p>
          <button 
            onClick={handleCreateNew}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Create your first discussion
          </button>
        </div>
      );
    }

    return (
      <div className="grid gap-8">
        {dimensions.map(([dimensionId, dimension]) => (
          <div 
            key={dimensionId} 
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-bold mb-2 text-gray-800 flex justify-between">
              <span>{dimension.conceptA} vs {dimension.conceptB}</span>
              <span className="text-sm font-normal text-gray-500">
                {Object.keys(dimension.models || {}).length} model(s)
              </span>
            </h3>
            
            <p className="text-gray-600 mb-6">{dimension.context}</p>
            
<div className="spectrum-container mb-8 relative h-16">
  <div className="spectrum-label-a absolute -left-2 top-1/2 transform -translate-y-1/2 text-sm font-medium">{dimension.conceptA}</div>
  <div className="spectrum-bg w-full h-12 bg-gradient-to-r from-blue-100 to-green-100 rounded-full relative"></div>
  <div className="spectrum-label-b absolute -right-2 top-1/2 transform -translate-y-1/2 text-sm font-medium">{dimension.conceptB}</div>
          
{(() => {
  // Group models by their balance value to handle overlaps
  const modelsByBalance = {};
  Object.entries(dimension.models || {}).forEach(([modelId, data]) => {
    // Create balance ranges (round to nearest 10%) to reduce overlaps
    const balanceKey = Math.round(data.balance / 10) * 10;
    if (!modelsByBalance[balanceKey]) {
      modelsByBalance[balanceKey] = [];
    }
    modelsByBalance[balanceKey].push({ modelId, data });
  });
  
  // Render models with improved spacing
  return Object.entries(modelsByBalance).flatMap(([balanceKey, models]) => {
    return models.map((model, index) => {
      const { modelId, data } = model;
      const baseModelId = modelId.split('-')[0];
      const modelInfo = leaderboardData.models.find(m => m.baseId === baseModelId);
      
      // Calculate vertical position based on index within this balance group
      const verticalPosition = 50 + (index % 3 - 1) * 30; // -30%, 0%, or +30% from center
      
      return (
        <div 
          key={modelId}
          className="model-dot absolute"
          style={{ 
            left: `${data.balance}%`, 
            top: `${verticalPosition}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ModelAvatar 
            modelId={baseModelId} 
            size={36} 
            tooltipText={`${modelInfo?.name || baseModelId}: ${data.balance}% ${dimension.conceptB}`} 
          />
        </div>
      );
    });
  });
})()}
            </div>
            
            
          </div>
        ))}
      </div>
    );
  };
  
  const renderModelsTab = () => {
    if (leaderboardData.models.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">No model data available yet.</p>
        </div>
      );
    }
    
    // Group models by base model
    const modelsByBase = leaderboardData.models.reduce((acc, model) => {
      if (!acc[model.baseId]) {
        acc[model.baseId] = [];
      }
      acc[model.baseId].push(model);
      return acc;
    }, {});
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(modelsByBase).map(([baseId, models]) => {
          const modelInfo = models[0]; // Just take info from the first instance
          
          // Calculate statistics across all dimensions
          const modelStats = {};
          
          Object.entries(leaderboardData.dimensions).forEach(([dimensionId, dimension]) => {
            // Find all instances of this model in the dimension
            const instances = Object.entries(dimension.models || {})
              .filter(([modelId]) => modelId.startsWith(baseId + '-'))
              .map(([, data]) => data);
            
            if (instances.length > 0) {
              // Calculate the average balance for this dimension
              const avgBalance = instances.reduce((sum, data) => sum + data.balance, 0) / instances.length;
              
              modelStats[dimensionId] = {
                dimension,
                avgBalance,
                instances: instances.length
              };
            }
          });
          
          return (
            <div key={baseId} className="bg-white rounded-lg shadow-md p-6 model-card">
              <div className="flex items-center mb-4">
                <ModelAvatar modelId={baseId} size={40} />
                <h3 className="text-lg font-bold ml-3 text-gray-800">{modelInfo.name}</h3>
              </div>
              
              <div className="space-y-4">
                {Object.entries(modelStats).map(([dimensionId, stat]) => (
                  <div key={dimensionId} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{stat.dimension.conceptA} vs {stat.dimension.conceptB}</span>
                      <span className="text-gray-500">{stat.instances} discussion(s)</span>
                    </div>
                    
                    <div className="relative h-2 bg-gray-100 rounded-full">
                      <div 
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ 
                          width: `${stat.avgBalance}%`,
                          backgroundColor: modelInfo.brandColor || '#6B7280',
                          opacity: 0.7
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{stat.dimension.conceptA}</span>
                      <span className="font-medium">{Math.round(stat.avgBalance)}%</span>
                      <span>{stat.dimension.conceptB}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderDiscussionsTab = () => {
    if (discussions.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">No discussions have been created yet.</p>
          <button 
            onClick={handleCreateNew}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Create your first discussion
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {discussions.map(discussion => (
          <div 
            key={discussion.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleDiscussionClick(discussion.id)}
          >
            <h3 className="font-bold text-lg mb-2">{discussion.conceptA} vs {discussion.conceptB}</h3>
            <p className="text-gray-600 mb-3">{discussion.context}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg concept-a-bg">
                <h4 className="font-medium text-sm">{discussion.optionA}</h4>
                <div className="text-xs text-gray-600 mt-1">
                  {discussion.results && Object.entries(discussion.results)
                    .filter(([, vote]) => vote === 'A')
                    .length} vote(s)
                </div>
              </div>
              
              <div className="p-3 rounded-lg concept-b-bg">
                <h4 className="font-medium text-sm">{discussion.optionB}</h4>
                <div className="text-xs text-gray-600 mt-1">
                  {discussion.results && Object.entries(discussion.results)
                    .filter(([, vote]) => vote === 'B')
                    .length} vote(s)
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex space-x-1">
                {discussion.participants && discussion.participants.slice(0, 5).map(participant => {
                  const baseModelId = participant.id.split('-')[0];
                  return (
                    <ModelAvatar key={participant.id} modelId={baseModelId} size={28} />
                  );
                })}
                {discussion.participants && discussion.participants.length > 5 && (
                  <div className="rounded-full bg-gray-200 w-7 h-7 flex items-center justify-center text-xs text-gray-600">
                    +{discussion.participants.length - 5}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                {new Date(discussion.timestamp?.seconds * 1000).toLocaleDateString()}
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
              <h1 className="text-3xl font-bold text-gray-800">Management Inclination Benchmark</h1>
              <button
                onClick={handleCreateNew}
                className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Create New Discussion
              </button>
            </div>
            
            
            {isLoading ? (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
) : (
  <div className="space-y-12">
    {renderDimensionsTab()}
    {renderModelsTab()}
    {renderDiscussionsTab()}
  </div>
)}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Import the available LLMs from shared configuration
import { availableLLMs } from './config';

export default App;