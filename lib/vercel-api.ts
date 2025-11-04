import axios, { AxiosInstance } from 'axios';
import { VercelDeployment, VercelProject, VercelIntegrationConfiguration } from '@/types';

const VERCEL_API_BASE = 'https://api.vercel.com';

export class VercelAPIClient {
  private client: AxiosInstance;

  constructor(accessToken: string, teamId?: string) {
    this.client = axios.create({
      baseURL: VERCEL_API_BASE,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: teamId ? { teamId } : {},
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔵 API CALL: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`🟢 API SUCCESS: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.log(`🔴 API ERROR: ${error.response?.status || 'NO_STATUS'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        return Promise.reject(error);
      }
    );
  }

  // Exchange OAuth code for access token
  static async exchangeOAuthCode(code: string): Promise<any> {
    const params = new URLSearchParams({
      client_id: process.env.VERCEL_CLIENT_ID!,
      client_secret: process.env.VERCEL_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.VERCEL_REDIRECT_URI!,
    });

    console.log('🔵 VERCEL OAUTH REQUEST: POST /v2/oauth/access_token');
    console.log('📤 OAuth Params:', Object.fromEntries(params.entries()));

    const response = await axios.post(
      `${VERCEL_API_BASE}/v2/oauth/access_token`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    console.log('🟢 VERCEL OAUTH RESPONSE:', response.status);
    console.log('📥 OAuth Response Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  }


  // Get integration configuration (to retrieve selected projects)
  async getIntegrationConfiguration(configurationId: string): Promise<VercelIntegrationConfiguration> {
    console.log('🔵 API CALL: GET /v1/integrations/configuration');
    const response = await this.client.get(`/v1/integrations/configuration/${configurationId}`);
    return response.data;
  }

  // Get projects
  async getProjects(): Promise<VercelProject[]> {
    const response = await this.client.get('/v9/projects');
    return response.data.projects;
  }


  // Create deployment
  async createDeployment(params: {
    name: string;
    gitSource?: {
      type: string;
      repo: string;
      ref?: string;
    };
    env?: Record<string, string>;
    buildCommand?: string;
    outputDirectory?: string;
  }): Promise<VercelDeployment> {
    const response = await this.client.post('/v13/deployments', params);
    return response.data;
  }

  // Get GitHub repository ID (from env or API)
  async getGitHubRepoId(repoPath: string): Promise<string> {
    // First try to get from environment variable
    const envRepoId = process.env.ASSISTANT_SERVER_REPO_ID;
    if (envRepoId) {
      console.log('✅ Using GitHub repo ID from env:', envRepoId);
      return envRepoId;
    }

    console.log('🔵 API CALL: GET GitHub API for repo ID');
    
    try {
      // Use GitHub API to get repository ID
      const response = await axios.get(`https://api.github.com/repos/${repoPath}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Integration-Server',
        },
      });
      
      const repoId = response.data.id.toString();
      console.log('✅ GitHub repo ID found:', repoId);
      return repoId;
    } catch (error) {
      console.error('❌ Failed to get GitHub repo ID:', error);
      throw new Error(`Failed to get GitHub repository ID for ${repoPath}`);
    }
  }

  // Import GitHub repository to Vercel
  async importGitHubRepo(repoPath: string, projectName: string) {
    console.log('🔵 API CALL: POST /v10/projects/import');
    
    const response = await this.client.post('/v10/projects/import', {
      name: projectName,
      gitRepository: {
        type: 'github',
        repo: repoPath,
      },
    });
    
    return response.data;
  }

  // Deploy from GitHub using integration configuration
  async deployFromGitHub(params: {
    configurationId: string;
    repo: string;
    branch?: string;
    envVariables?: Record<string, string>;
    target?: 'preview' | 'production';
  }) {
    const { configurationId, repo, branch = 'main', envVariables = {}, target = 'production' } = params;

    // Convert full GitHub URL to owner/repo format
    let repoPath = repo;
    if (repo.startsWith('https://github.com/')) {
      repoPath = repo.replace('https://github.com/', '');
    }

    console.log('🚀 Starting deployment:', { configurationId, repoPath, branch, target });

    // Get integration configuration to retrieve selected projects
    const config = await this.getIntegrationConfiguration(configurationId);

    // Use the first project (simplified logic)
    let projectId: string;
    if (config.projects && config.projects.length > 0) {
      // Use the first selected project
      projectId = config.projects[0];
    } else {
      // If no specific projects, get all projects and use the first one
      const projects = await this.getProjects();
      if (projects.length === 0) {
        throw new Error('No projects found in the account');
      }
      projectId = projects[0].id;
    }

    // Set environment variables on the project
    if (Object.keys(envVariables).length > 0) {
      console.log('🔧 Setting environment variables...');
      await this.setEnvironmentVariables(projectId, envVariables);
    }

    // Deploy using repoId-based gitSource
    console.log('🔵 API CALL: POST /v13/deployments');
    const repoId = await this.getGitHubRepoId(repoPath);

    const deployment = await this.client.post('/v13/deployments', {
      name: 'assistant-server',
      project: projectId,
      target, // 'production' by default
      gitSource: {
        type: 'github',
        repoId: repoId,
        ref: `refs/heads/${branch}`,
      },
    });

    console.log('✅ Deployment created:', deployment.data.id);
    return {
      project: { id: projectId, name: 'assistant-server' },
      deployment: deployment.data,
    };
  }

  // Get deployment
  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    const response = await this.client.get(`/v13/deployments/${deploymentId}`);
    return response.data;
  }

  // Set environment variables (creates or updates existing ones)
  async setEnvironmentVariables(projectId: string, variables: Record<string, string>) {
    const envs = Object.entries(variables).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    }));

    // Helper function to extract error message from various error formats
    const extractErrorMessage = (error: any): string => {
      if (!error) return 'Unknown error';
      
      // Vercel API error structure: error.response.data.error.message (nested object)
      if (error.response?.data?.error) {
        const errorObj = error.response.data.error;
        // Check if error is an object with message property
        if (typeof errorObj === 'object' && errorObj.message) {
          return errorObj.message;
        }
        // Check if error is a string
        if (typeof errorObj === 'string') {
          return errorObj;
        }
      }
      
      // Try response.data.error.message (alternative path)
      if (error.response?.data?.error?.message && typeof error.response.data.error.message === 'string') {
        return error.response.data.error.message;
      }
      
      // Try response.data.message (string)
      if (error.response?.data?.message && typeof error.response.data.message === 'string') {
        return error.response.data.message;
      }
      
      // Try error.message (Axios error message)
      if (error.message && typeof error.message === 'string' && !error.message.includes('Request failed')) {
        return error.message;
      }
      
      // Last resort: try to convert to string with status
      const status = error.response?.status;
      if (status) {
        return `HTTP ${status} error`;
      }
      
      return String(error);
    };

    // Set each environment variable, handling conflicts by reporting them
    // Use Promise.allSettled to handle partial failures gracefully
    const promises = envs.map(async (env) => {
      try {
        // Try to create the environment variable
        await this.client.post(`/v10/projects/${projectId}/env`, env);
        console.log(`✅ Created environment variable ${env.key}`);
        return { success: true, key: env.key };
      } catch (error: any) {
        // Check if this is a conflict error (409 Conflict or 400 with ENV_CONFLICT)
        const isConflict = error.response?.status === 409 || 
                          (error.response?.status === 400 && 
                           (error.response?.data?.error?.code === 'ENV_CONFLICT' || 
                            error.response?.data?.error?.message?.includes('already exists')));
        
        if (isConflict) {
          // Don't try to update - just report the conflict
          const conflictMessage = extractErrorMessage(error);
          console.error(`⚠️ Environment variable ${env.key} already exists (conflict): ${conflictMessage}`);
          return { 
            success: false, 
            key: env.key, 
            error: error,
            isConflict: true,
            conflictMessage: conflictMessage
          };
        } else {
          // Non-409 errors are real failures - return failure status instead of throwing
          // so Promise.allSettled can collect all failures
          const errorMessage = error?.response?.data?.error || 
                              error?.response?.data?.message || 
                              error?.message || 
                              `Unknown error (Status: ${error?.response?.status || 'unknown'})`;
          console.error(`❌ Failed to create environment variable ${env.key}:`, errorMessage);
          return { success: false, key: env.key, error: error };
        }
      }
    });

    const results = await Promise.allSettled(promises);
    
    // Debug: Log all results to understand what's happening
    console.log(`📊 Environment variable setting results: ${results.length} total`);
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        console.log(`  ✓ ${result.value.key}: ${result.value.success ? 'SUCCESS' : 'FAILED'}`);
      } else if (result.status === 'rejected') {
        console.log(`  ✗ ${envs[index]?.key}: REJECTED - ${result.reason?.message || String(result.reason)}`);
      }
    });
    
    // Check for any failures and log them with detailed error information
    const failures = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason;
          const errorMessage = extractErrorMessage(error);
          const status = error?.response?.status;
          const isConflict = status === 409 || 
                            (status === 400 && 
                             (error?.response?.data?.error?.code === 'ENV_CONFLICT' || 
                              error?.response?.data?.error?.message?.includes('already exists')));
          return { 
            key: envs[index]?.key || 'unknown', 
            error: errorMessage,
            status: status,
            fullError: error,
            isConflict: isConflict,
            conflictMessage: isConflict ? errorMessage : undefined
          };
        } else if (result.value && result.value.success === false) {
          const error = result.value.error;
          const errorMessage = extractErrorMessage(error);
          const status = error?.response?.status;
          return { 
            key: result.value.key, 
            error: errorMessage,
            status: status,
            fullError: error,
            isConflict: result.value.isConflict || false,
            conflictMessage: result.value.conflictMessage
          };
        }
        return null;
      })
      .filter(Boolean);
    
    if (failures.length > 0) {
      // Separate conflicts from other errors
      const conflicts = failures.filter((f: any) => f.isConflict);
      const otherErrors = failures.filter((f: any) => !f.isConflict);
      
      // If there are conflicts, prioritize showing them with a clear message
      if (conflicts.length > 0) {
        const conflictKeys = conflicts.map((f: any) => f.key);
        const conflictMessages = conflicts.map((f: any) => f.conflictMessage || f.error).filter(Boolean);
        const uniqueConflictMessages = [...new Set(conflictMessages)];
        
        console.error(`❌ Environment variable conflicts detected (${conflicts.length} variable(s)):`);
        conflicts.forEach((f: any) => {
          console.error(`  - ${f.key}: ${f.conflictMessage || f.error}`);
        });
        
        // Build a user-friendly error message with clear formatting
        let errorMessage = `Cannot set environment variables: ${conflictKeys.length} variable(s) already exist in your Vercel project:\n\n${conflictKeys.join(', ')}\n\nPlease remove these existing environment variables from your Vercel project settings before deploying, or use different variable names.`;
        
        throw new Error(errorMessage);
      }
      
      // Handle other (non-conflict) errors
      if (otherErrors.length > 0) {
        console.error(`❌ Failed to set ${otherErrors.length} environment variable(s) out of ${envs.length}:`);
        otherErrors.forEach((f: any) => {
          const statusInfo = f.status ? ` (HTTP ${f.status})` : '';
          console.error(`  - ${f.key}${statusInfo}: ${f.error}`);
          // Log full error details for debugging
          if (f.fullError?.response?.data) {
            console.error(`    Full error data:`, JSON.stringify(f.fullError.response.data, null, 2));
          }
        });
        
        // Extract unique error messages to provide better context
        const errorMessages = otherErrors.map((f: any) => f.error).filter(Boolean);
        const uniqueErrors = [...new Set(errorMessages)];
        
        // Build a detailed error message with clear formatting
        let errorMessage = `Failed to set ${otherErrors.length} of ${envs.length} environment variable(s):\n\n${otherErrors.map((f: any) => f.key).join(', ')}\n\n`;
        
        if (uniqueErrors.length > 0 && uniqueErrors.length <= 3) {
          // If there are few unique errors, show them all
          errorMessage += `Errors:\n${uniqueErrors.map(e => `- ${e}`).join('\n')}`;
        } else if (uniqueErrors.length > 0) {
          // If many errors, show the most common one
          const mostCommonError = uniqueErrors[0];
          errorMessage += `Most common error: ${mostCommonError}`;
        }
        
        throw new Error(errorMessage);
      }
    }
    
    console.log(`✅ Successfully set all ${envs.length} environment variables`);
  }
}

