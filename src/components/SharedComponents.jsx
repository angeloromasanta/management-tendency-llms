import { Link } from 'react-router-dom';
import { availableLLMs } from '../config';

/**
 * Header component for all pages
 */
export const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-blue-600"
            >
              <path
                fillRule="evenodd"
                d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9zm3.75-1.5a.75.75 0 0 0-1.5 0v9a.75.75 0 0 0 1.5 0v-9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">
            Management Inclination Benchmark
          </h1>
        </Link>

        <nav className="hidden md:flex space-x-6">
          <Link
            to="/"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/leaderboard"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            to="/setup"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            New Discussion
          </Link>
        </nav>

        <Link
          to="/setup"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
};

/**
 * Footer component for all pages
 */
export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold mb-2">
              Management Inclination Benchmark
            </h3>
            <p className="text-sm text-gray-300">
              Compare how different AI models approach key management tensions
            </p>
          </div>

          <div className="flex flex-col items-end">
            <p className="text-sm text-gray-300">
              &copy; {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

/**
 * Model avatar component
 * @param {Object} props - Component props
 * @param {string} props.modelId - The model ID
 * @param {number} props.size - Avatar size in pixels
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.tooltipText - Optional tooltip text
 */
export const ModelAvatar = ({
  modelId,
  size = 36,
  className = '',
  tooltipText = null,
}) => {
  // Find the model in available LLMs
  const model = availableLLMs.find((llm) => llm.id === modelId) || {
    name: modelId,
    brandColor: '#6B7280', // Default gray
    avatarText: modelId.charAt(0).toUpperCase(),
  };

  // SVG avatar with brand color
  const avatarContent = model.avatarSrc ? (
    <div
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: model.brandColor || '#6B7280',
        padding: Math.max(4, size * 0.15) + 'px',
      }}
    >
      <img
        src={model.avatarSrc}
        alt={model.name}
        className="w-full h-full object-contain"
        style={{ filter: 'brightness(0) invert(1)' }}
      />
    </div>
  ) : (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-gray-500 text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: model.brandColor || '#6B7280',
      }}
    >
      <span style={{ fontSize: Math.max(10, size * 0.4) + 'px' }}>
        {model.avatarText || model.name.charAt(0)}
      </span>
    </div>
  );

  // Add tooltip if provided
  if (tooltipText) {
    return (
      <div className="tooltip">
        {avatarContent}
        <span className="tooltip-text">{tooltipText}</span>
      </div>
    );
  }

  return avatarContent;
};

/**
 * Loading overlay component
 * @param {Object} props - Component props
 * @param {string} props.text - Loading text
 */
export const LoadingOverlay = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Processing...
          </h3>
          <p className="text-center text-gray-500">{text}</p>
        </div>
      </div>
    </div>
  );
};
