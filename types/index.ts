// OAuth and Token Types
export interface VercelOAuthToken {
  access_token: string;
  token_type: string;
  installation_id: string;
  user_id: string;
  team_id?: string;
}

// Database Models
export interface Account {
  id: number;
  uuid: string;
  vercel_user_id: string;
  vercel_team_id?: string;
  name?: string;
  email?: string;
  access_token: string; // Encrypted
  created_at: string;
  updated_at: string;
}

export interface Installation {
  id: number;
  uuid: string;
  installation_id: string;
  account_id: number;
  app_name: string;
  vercel_project_id?: string;
  vercel_project_name?: string;
  deployment_url?: string;
  status: 'pending' | 'installed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Configuration Types (not stored, used only during deployment)
export interface DeploymentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  openai: {
    apiKey: string;
  };
}

// Vercel API Types
export interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: string;
  ready: boolean;
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string;
}

export interface VercelIntegrationConfiguration {
  id: string;
  projectSelection: 'all' | 'selected';
  projects?: string[];
  scopes: string[];
  integrationId: string;
  ownerId: string;
  teamId?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  source: 'marketplace' | 'deploy-button' | 'external' | 'v0' | 'resource-claims';
  installationType: 'marketplace' | 'external';
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Deployment Request
export interface DeploymentRequest {
  installationUuid: string;
  config: DeploymentConfig;
  projectName?: string;
}
