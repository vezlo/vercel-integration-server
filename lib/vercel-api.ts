import axios, { AxiosInstance } from 'axios';
import { VercelDeployment, VercelProject, VercelIntegrationConfiguration } from '@/types';
import { extractVercelErrorMessage, isConflictError } from './error-utils';

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

    // Set each environment variable
    const promises = envs.map(async (env) => {
      try {
        await this.client.post(`/v10/projects/${projectId}/env`, env);
        return { success: true, key: env.key };
      } catch (error: any) {
        if (isConflictError(error)) {
          return {
            success: false,
            key: env.key,
            error: error,
            isConflict: true,
            conflictMessage: extractVercelErrorMessage(error),
          };
        }
        return { success: false, key: env.key, error: error };
      }
    });

    const results = await Promise.allSettled(promises);
    
    // Process results and collect failures
    const failures = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason;
          const isConflict = isConflictError(error);
          const errorMessage = extractVercelErrorMessage(error);
          return {
            key: envs[index]?.key || 'unknown',
            error: errorMessage,
            isConflict,
            conflictMessage: isConflict ? errorMessage : undefined,
          };
        }
        if (result.value && !result.value.success) {
          return {
            key: result.value.key,
            error: result.value.conflictMessage || extractVercelErrorMessage(result.value.error),
            isConflict: result.value.isConflict || false,
            conflictMessage: result.value.conflictMessage,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ key: string; error: string; isConflict: boolean; conflictMessage?: string }>;
    
    if (failures.length === 0) {
      return;
    }
    
    // Separate conflicts from other errors
    const conflicts = failures.filter((f) => f.isConflict);
    const otherErrors = failures.filter((f) => !f.isConflict);
    
    // Handle conflicts
    if (conflicts.length > 0) {
      const conflictKeys = conflicts.map((f) => f.key);
      console.error(`❌ Environment variable conflicts (${conflicts.length}):`, conflictKeys.join(', '));
      
      const errorMessage = `Cannot set environment variables: ${conflictKeys.length} variable(s) already exist in your Vercel project:\n\n${conflictKeys.join(', ')}\n\nPlease remove these existing environment variables from your Vercel project settings before deploying, or use different variable names.`;
      throw new Error(errorMessage);
    }
    
    // Handle other errors
    if (otherErrors.length > 0) {
      const errorKeys = otherErrors.map((f) => f.key);
      const uniqueErrors = [...new Set(otherErrors.map((f) => f.error))];
      
      console.error(`❌ Failed to set ${otherErrors.length} environment variable(s):`, errorKeys.join(', '));
      
      let errorMessage = `Failed to set ${otherErrors.length} of ${envs.length} environment variable(s):\n\n${errorKeys.join(', ')}`;
      
      if (uniqueErrors.length > 0 && uniqueErrors.length <= 3) {
        errorMessage += `\n\nErrors:\n${uniqueErrors.map((e) => `- ${e}`).join('\n')}`;
      } else if (uniqueErrors.length > 0) {
        errorMessage += `\n\nMost common error: ${uniqueErrors[0]}`;
      }
      
      throw new Error(errorMessage);
    }
  }
}

