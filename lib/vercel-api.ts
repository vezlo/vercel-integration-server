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
        console.log(`🔵 VERCEL API REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
        console.log('📤 Request Headers:', config.headers);
        console.log('📤 Request Params:', config.params);
        if (config.data) {
          console.log('📤 Request Body:', JSON.stringify(config.data, null, 2));
        }
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
        console.log(`🟢 VERCEL API RESPONSE: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        console.log('📥 Response Headers:', response.headers);
        console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
        return response;
      },
      (error) => {
        console.log(`🔴 VERCEL API ERROR: ${error.response?.status || 'NO_STATUS'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        if (error.response) {
          console.log('📥 Error Response Headers:', error.response.headers);
          console.log('📥 Error Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('📥 Error Message:', error.message);
        }
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
    console.log('🔍 Getting integration configuration:', configurationId);
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

    console.log('🔍 Getting GitHub repo ID from API for:', repoPath);
    
    try {
      // Use GitHub API to get repository ID
      const response = await axios.get(`https://api.github.com/repos/${repoPath}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Integration-Server',
        },
      });
      
      const repoId = response.data.id.toString();
      console.log('✅ GitHub repo ID found via API:', repoId);
      return repoId;
    } catch (error) {
      console.error('❌ Failed to get GitHub repo ID:', error);
      throw new Error(`Failed to get GitHub repository ID for ${repoPath}`);
    }
  }

  // Import GitHub repository to Vercel
  async importGitHubRepo(repoPath: string, projectName: string) {
    console.log('📥 Importing GitHub repo:', repoPath);
    
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
    console.log('📋 Integration configuration:', {
      projectSelection: config.projectSelection,
      projects: config.projects,
      scopes: config.scopes
    });

    // Use the first project (simplified logic)
    let projectId: string;
    if (config.projects && config.projects.length > 0) {
      // Use the first selected project
      projectId = config.projects[0];
      console.log('📦 Using first selected project:', projectId);
    } else {
      // If no specific projects, get all projects and use the first one
      const projects = await this.getProjects();
      if (projects.length === 0) {
        throw new Error('No projects found in the account');
      }
      projectId = projects[0].id;
      console.log('📦 Using first available project:', projects[0].name);
    }

    // Set environment variables on the project
    if (Object.keys(envVariables).length > 0) {
      console.log('🔧 Setting environment variables...');
      await this.setEnvironmentVariables(projectId, envVariables);
    }

    // Deploy using repoId-based gitSource
    console.log('🚀 Triggering Git-based deployment (repoId)...');
    console.log('🔄 Getting GitHub repo ID and deploying...');
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

    console.log('✅ Deployment created with GitHub repo ID:', deployment.data.id);
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

  // Set environment variables
  async setEnvironmentVariables(projectId: string, variables: Record<string, string>) {
    const envs = Object.entries(variables).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    }));

    const promises = envs.map(env =>
      this.client.post(`/v10/projects/${projectId}/env`, env)
    );

    await Promise.all(promises);
  }
}

