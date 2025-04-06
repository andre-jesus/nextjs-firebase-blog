import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from '../lib/ThemeContext';

export default function CodeBlock({ language, code }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  
  // Reset copy state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  
  return (
    <div className="relative group my-6 rounded-md overflow-hidden">
      <div className="flex justify-between items-center bg-gray-800 dark:bg-gray-900 px-4 py-2 text-xs text-white">
        <span>{language}</span>
        <button
          onClick={copyToClipboard}
          className="text-gray-300 hover:text-white transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied!
            </span>
          ) : (
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy
            </span>
          )}
        </button>
      </div>
      
      <SyntaxHighlighter
        language={language || 'text'}
        style={theme === 'dark' ? tomorrow : prism}
        customStyle={{
          margin: 0,
          padding: '1rem',
          borderRadius: '0 0 0.375rem 0.375rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}