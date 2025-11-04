'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function ConfigurationForm() {
  const searchParams = useSearchParams();
  const configurationId = searchParams.get('configurationId'); // Only use Vercel's configuration ID
  const nextUrl = searchParams.get('next'); // Get the next URL from Vercel
  const tempSuccess = searchParams.get('success'); // Temporary flag for local testing

  const [config, setConfig] = useState({
    supabase: {
      url: '',
      serviceRoleKey: '',
    },
    database: {
      host: '',
      name: '',
      user: '',
      password: '',
    },
    openai: {
      apiKey: '',
    },
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deploymentData, setDeploymentData] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Temporary success state for local testing
  const isSuccessState = tempSuccess === 'true' || success;

  // Check if required fields are filled
  const isFormValid = config.supabase.url && config.supabase.serviceRoleKey && 
                     config.database.host && config.database.name && config.database.user && config.database.password &&
                     config.openai.apiKey;

  // Handle loading state
  useEffect(() => {
    // Simulate a brief loading period to ensure page is fully loaded
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    // Temporary: Set mock data for success state testing
    if (tempSuccess === 'true') {
      setDeploymentData({
        projectName: 'assistant-server',
        deploymentUrl: 'https://assistant-server-abc123.vercel.app',
        migrationSecretKey: '12345678-1234-1234-1234-123456789abc'
      });
    }
    
    return () => clearTimeout(timer);
  }, [tempSuccess]);

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setError(null);

      let response;
      try {
        response = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configurationId,
            config,
            projectName: 'assistant-server',
          }),
        });
      } catch (fetchError) {
        // Handle network errors (no internet, CORS, etc.)
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
      }

      // Get response text first (in case it's not JSON)
      let responseText;
      try {
        responseText = await response.text();
      } catch (textError) {
        throw new Error(`Failed to read server response (Status: ${response.status}). Please try again.`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // If response is not JSON, create a user-friendly error
        throw new Error(`Server returned an invalid response (Status: ${response.status}). ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        // Extract user-friendly error message
        let errorMessage = 'Deployment failed. Please try again.';
        
        // Prioritize message field (most user-friendly)
        if (data.message && typeof data.message === 'string') {
          errorMessage = data.message;
        } 
        // Fallback to error field if it's a string
        else if (data.error && typeof data.error === 'string') {
          errorMessage = data.error;
        }
        // If error is an object, try to extract meaningful info
        else if (data.error && typeof data.error === 'object') {
          if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.error) {
            errorMessage = String(data.error.error);
          } else {
            // Last resort: try to stringify but format it nicely
            const errorStr = JSON.stringify(data.error, null, 2);
            errorMessage = `Deployment error: ${errorStr}`;
          }
        }
        // If we have details (validation errors), include them
        else if (data.details && Array.isArray(data.details)) {
          const detailsStr = data.details.map((d: any) => 
            d.path ? `${d.path.join('.')}: ${d.message}` : d.message || String(d)
          ).join(', ');
          errorMessage = `Validation error: ${detailsStr}`;
        }
        
        throw new Error(errorMessage);
      }

      // Validate success response structure
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server. Please try again.');
      }

      // Validate required deployment data fields
      if (!data.data.deploymentUrl || !data.data.migrationSecretKey) {
        throw new Error('Deployment response missing required data. Please contact support.');
      }

      setSuccess('🎉 Assistant Server deployed successfully!');
      setDeploymentData(data.data);
    } catch (error) {
      let errorMessage = 'Deployment failed. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Deployment failed. Please try again.';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setError(errorMessage);
      console.error('Frontend deployment error:', errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleContinue = () => {
    if (nextUrl) {
      // Redirect to Vercel to complete the integration
      window.location.href = nextUrl;
    } else {
      // Fallback: redirect to Vercel dashboard
      window.location.href = 'https://vercel.com/dashboard';
    }
  };

  const copyToClipboard = async (url: string, urlId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(urlId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const truncateUrl = (url: string, maxLength: number = 60) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Check if configurationId is provided
  if (!configurationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Configuration</h1>
          <p className="mt-2 text-gray-600">No configuration ID provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          {!isSuccessState && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Configure Assistant Server
              </h1>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">Why These Parameters?</h2>
                <p className="text-blue-700 text-sm leading-relaxed">
                  The Assistant Server requires these credentials for database operations, AI processing, and secure API access. 
                  All values are securely stored as environment variables in your Vercel project.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
              <div className="flex items-start">
                <div className="text-xl mr-2 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">Deployment Failed</h3>
                  <div className="text-red-700 whitespace-pre-line leading-relaxed">{error}</div>
                </div>
              </div>
            </div>
          )}

          {isSuccessState && (
            <div className="mb-6">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Deployment Initiated Successfully!</h1>
                <p className="text-gray-600">Your Assistant Server deployment is now in progress</p>
              </div>

              <div className="space-y-6">
                {/* Deployment Status */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-semibold">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-purple-800">Deployment Status</h3>
                  </div>
                  <div className="bg-white p-4 rounded-md border">
                    <p className="text-gray-700 mb-2"><strong>Status:</strong> <span className="text-orange-600">In Progress</span></p>
                    <p className="text-gray-700 mb-3">Your deployment is currently being processed. This may take a few minutes.</p>
                    {deploymentData && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Project:</strong> {deploymentData.projectName}</p>
                        <p className="text-sm"><strong>Live URL:</strong> <a href={deploymentData.deploymentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{deploymentData.deploymentUrl}</a></p>
                        <p className="text-xs text-gray-600">You can monitor the deployment progress in your Vercel project's deployments section.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Database Setup Instructions */}
                {deploymentData?.migrationSecretKey && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 font-semibold">2</span>
                      </div>
                      <h3 className="text-lg font-semibold text-green-800">Database Setup</h3>
                    </div>
                    <div className="bg-white p-4 rounded-md border">
                      <p className="text-gray-700 mb-4">Once your deployment is complete, run these setup steps in order:</p>
                      
                      <div className="space-y-4">
                        {/* Migration URL */}
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700">1. Migration</span>
                              <div className="group relative">
                                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  Creates all necessary database tables and functions for the Assistant Server
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`${deploymentData.deploymentUrl}/api/migrate?key=${deploymentData.migrationSecretKey}`, 'migrate')}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                              title="Copy URL"
                            >
                              {copiedUrl === 'migrate' ? (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <a
                            href={`${deploymentData.deploymentUrl}/api/migrate?key=${deploymentData.migrationSecretKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline font-mono block truncate"
                            title={`${deploymentData.deploymentUrl}/api/migrate?key=${deploymentData.migrationSecretKey}`}
                          >
                            {truncateUrl(`${deploymentData.deploymentUrl}/api/migrate?key=${deploymentData.migrationSecretKey}`)}
                          </a>
                        </div>

                        {/* Seed Default Data URL */}
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700">2. Seed Default Data</span>
                              <div className="group relative">
                                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  Populates the database with default configuration data and initial settings
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`${deploymentData.deploymentUrl}/api/seed-default?key=${deploymentData.migrationSecretKey}`, 'seed')}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                              title="Copy URL"
                            >
                              {copiedUrl === 'seed' ? (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <a
                            href={`${deploymentData.deploymentUrl}/api/seed-default?key=${deploymentData.migrationSecretKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline font-mono block truncate"
                            title={`${deploymentData.deploymentUrl}/api/seed-default?key=${deploymentData.migrationSecretKey}`}
                          >
                            {truncateUrl(`${deploymentData.deploymentUrl}/api/seed-default?key=${deploymentData.migrationSecretKey}`)}
                          </a>
                        </div>

                        {/* Generate API Key URL */}
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700">3. Generate API Key</span>
                              <div className="group relative">
                                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  Creates a default API key for src-to-kb library to send content to the Assistant Server
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`${deploymentData.deploymentUrl}/api/generate-key?key=${deploymentData.migrationSecretKey}`, 'generate-key')}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                              title="Copy URL"
                            >
                              {copiedUrl === 'generate-key' ? (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <a
                            href={`${deploymentData.deploymentUrl}/api/generate-key?key=${deploymentData.migrationSecretKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline font-mono block truncate"
                            title={`${deploymentData.deploymentUrl}/api/generate-key?key=${deploymentData.migrationSecretKey}`}
                          >
                            {truncateUrl(`${deploymentData.deploymentUrl}/api/generate-key?key=${deploymentData.migrationSecretKey}`)}
                          </a>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mt-3">Run these endpoints in order after your deployment completes. Each requires the same migration key for authentication.</p>
                    </div>
                  </div>
                )}

                {/* Integration Completion */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold">3</span>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800">Complete Integration</h3>
                  </div>
                  <div className="bg-white p-4 rounded-md border">
                    <p className="text-gray-700 mb-3"><strong>Important:</strong> You must complete the integration to finalize the setup and ensure all environment variables are properly configured.</p>
                    <button
                      onClick={handleContinue}
                      className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800 font-medium shadow-sm transition-colors"
                    >
                      Complete Integration →
                    </button>
                    <p className="text-xs text-gray-600 mt-2">This will redirect you back to Vercel to complete the integration process.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isSuccessState && (
            <div className="space-y-8">
              {/* Section 1: Supabase */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-semibold">1</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Supabase Configuration</h2>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">Where to find these:</h3>
                  <p className="text-yellow-700 text-sm">
                    Go to your <strong>Supabase Dashboard</strong> → <strong>Settings</strong> → <strong>API</strong>
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supabase URL</label>
                    <input
                      type="url"
                      value={config.supabase.url}
                      onChange={(e) => setConfig({ ...config, supabase: { ...config.supabase, url: e.target.value } })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://your-project.supabase.co"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Role Key</label>
                    <input
                      type="password"
                      value={config.supabase.serviceRoleKey}
                      onChange={(e) => setConfig({ ...config, supabase: { ...config.supabase, serviceRoleKey: e.target.value } })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Database */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-semibold">2</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Database Connection</h2>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">Where to find these:</h3>
                  <p className="text-yellow-700 text-sm">
                    Go to your <strong>Supabase Dashboard</strong> → <strong>Settings</strong> → <strong>Database</strong> → <strong>Connection Info</strong>
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Database Host</label>
                    <input
                      type="text"
                      value={config.database.host}
                      onChange={(e) => setConfig({ ...config, database: { ...config.database, host: e.target.value } })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="db.your-project.supabase.co"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Database Name</label>
                    <input
                      type="text"
                      value={config.database.name}
                      onChange={(e) => setConfig({ ...config, database: { ...config.database, name: e.target.value } })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="postgres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Database User</label>
                    <input
                      type="text"
                      value={config.database.user}
                      onChange={(e) => setConfig({ ...config, database: { ...config.database, user: e.target.value } })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="postgres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Database Password</label>
                    <input
                      type="password"
                      value={config.database.password}
                      onChange={(e) => setConfig({ ...config, database: { ...config.database, password: e.target.value } })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="your-database-password"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: OpenAI */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">OpenAI Configuration</h2>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">Where to find this:</h3>
                  <p className="text-yellow-700 text-sm">
                    Go to <strong>OpenAI Platform</strong> → <strong>API Keys</strong> → <strong>Create new secret key</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
                  <input
                    type="password"
                    value={config.openai.apiKey}
                    onChange={(e) => setConfig({ ...config, openai: { ...config.openai, apiKey: e.target.value } })}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="sk-proj-..."
                  />
                </div>
              </div>

              <button
                onClick={handleDeploy}
                disabled={isDeploying || isLoading || !isFormValid}
                className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isDeploying ? 'Deploying...' : isLoading ? 'Loading...' : 'Deploy Assistant Server'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ConfigurationForm />
    </Suspense>
  );
}
