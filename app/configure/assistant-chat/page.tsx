'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AssistantChatConfigurationForm() {
  const searchParams = useSearchParams();
  const configurationId = searchParams.get('configurationId');
  const nextUrl = searchParams.get('next');
  const tempSuccess = searchParams.get('success');

  const [config, setConfig] = useState({
    assistantServerUrl: '',
    assistantServerApiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deploymentData, setDeploymentData] = useState<any>(null);

  const isSuccessState = tempSuccess === 'true' || success;
  const isFormValid = Boolean(config.assistantServerUrl);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    if (tempSuccess === 'true') {
      setDeploymentData({
        projectName: 'assistant-chat',
        deploymentUrl: 'https://assistant-chat-abc123.vercel.app',
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
            appName: 'assistant-chat',
            config: {
              assistantServerUrl: config.assistantServerUrl,
              assistantServerApiKey: config.assistantServerApiKey,
              supabaseUrl: config.supabaseUrl,
              supabaseAnonKey: config.supabaseAnonKey,
            },
          }),
        });
      } catch (fetchError) {
        throw new Error(
          'Network error: Unable to connect to the server. Please check your internet connection and try again.'
        );
      }

      let responseText;
      try {
        responseText = await response.text();
      } catch (textError) {
        throw new Error(`Failed to read server response (Status: ${response.status}). Please try again.`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned an invalid response (Status: ${response.status}). ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        let errorMessage = 'Deployment failed. Please try again.';

        if (data.message && typeof data.message === 'string') {
          errorMessage = data.message;
        } else if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          }
        }

        throw new Error(errorMessage);
      }

      if (!data.success || !data.data) {
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!data.data.deploymentUrl) {
        throw new Error('Deployment response missing required data. Please contact support.');
      }

      setSuccess('🎉 Assistant Chat deployed successfully!');
      setDeploymentData(data.data);
    } catch (error) {
      let errorMessage = 'Deployment failed. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message || 'Deployment failed. Please try again.';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setError(errorMessage);
      console.error('Assistant Chat deployment error:', errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleContinue = () => {
    if (nextUrl) {
      window.location.href = nextUrl;
    } else {
      window.location.href = 'https://vercel.com/dashboard';
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Configure Assistant Chat</h1>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">Why These Parameters?</h2>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Assistant Chat connects directly to your Assistant Server for all chatbot APIs. We need the base URL (required) and an optional API key if your server requires authentication.
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

          {isSuccessState ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Assistant Chat Deployment Started</h1>
                <p className="text-gray-600">Your Assistant Chat widget is being deployed to Vercel.</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-semibold">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-800">Deployment Status</h3>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <p className="text-gray-700 mb-2">
                    <strong>Status:</strong> <span className="text-orange-600">In Progress</span>
                  </p>
                  <p className="text-gray-700 mb-3">Vercel is provisioning your Assistant Chat application.</p>
                  {deploymentData && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Project:</strong> {deploymentData.projectName}
                      </p>
                      <p className="text-sm">
                        <strong>Live URL:</strong>{' '}
                        <a
                          href={deploymentData.deploymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {deploymentData.deploymentUrl}
                        </a>
                      </p>
                      <p className="text-xs text-gray-600">You can monitor progress in your Vercel dashboard.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800">Complete Integration</h3>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <p className="text-gray-700 mb-3">
                    <strong>Almost done!</strong> Click below to return to Vercel and finalize the installation.
                  </p>
                  <button
                    onClick={handleContinue}
                    className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800 font-medium shadow-sm transition-colors"
                  >
                    Complete Integration →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-semibold">1</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Assistant Server Connection</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assistant Server URL</label>
                    <input
                      type="url"
                      value={config.assistantServerUrl}
                      onChange={(e) => setConfig({ ...config, assistantServerUrl: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://assistant-server.your-company.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">This URL will be used for all widget API calls.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assistant Server API Key (optional)</label>
                    <input
                      type="password"
                      value={config.assistantServerApiKey}
                      onChange={(e) => setConfig({ ...config, assistantServerApiKey: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="sk-live-..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Provide this only if your Assistant Server requires authentication.</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Supabase Credentials (Optional)</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">These credentials are needed for realtime updates.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supabase URL (optional)</label>
                    <input
                      type="url"
                      value={config.supabaseUrl}
                      onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://your-project.supabase.co"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your Supabase project URL.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supabase Anon Key (optional)</label>
                    <input
                      type="password"
                      value={config.supabaseAnonKey}
                      onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Your Supabase anonymous key.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDeploy}
                disabled={isDeploying || isLoading || !isFormValid}
                className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isDeploying ? 'Deploying...' : isLoading ? 'Loading...' : 'Deploy Assistant Chat'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssistantChatConfigurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AssistantChatConfigurationForm />
    </Suspense>
  );
}

