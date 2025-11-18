import { NextRequest, NextResponse } from 'next/server';
import { getInstallationById, getDecryptedToken, updateInstallation, getAccountById } from '@/lib/storage';
import { VercelAPIClient } from '@/lib/vercel-api';
import { extractVercelErrorMessage } from '@/lib/error-utils';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * @swagger
 * /api/deploy:
 *   post:
 *     summary: Deploy assistant server
 *     description: Deploys assistant server to user's Vercel account with provided credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeploymentRequest'
 *     responses:
 *       200:
 *         description: Deployment successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeploymentResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Installation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Deployment failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const AssistantServerConfigSchema = z.object({
  supabase: z.object({
    url: z.string().url(),
    serviceRoleKey: z.string().min(1),
  }),
  database: z.object({
    host: z.string().min(1),
    name: z.string().min(1),
    user: z.string().min(1),
    password: z.string().min(1),
  }),
  openai: z.object({
    apiKey: z.string().min(1),
  }),
});

const AssistantChatConfigSchema = z.object({
  assistantServerUrl: z.string().url(),
  assistantServerApiKey: z.string().optional().nullable().transform((value) => value || ''),
});

type AssistantServerConfig = z.infer<typeof AssistantServerConfigSchema>;
type AssistantChatConfig = z.infer<typeof AssistantChatConfigSchema>;

const BaseDeploymentSchema = z.object({
  configurationId: z.string(),
  appName: z.enum(['assistant-server', 'assistant-chat']).optional(),
  config: z.unknown(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const basePayload = BaseDeploymentSchema.parse(body);
    const appName = basePayload.appName === 'assistant-chat' ? 'assistant-chat' : 'assistant-server';

    let parsedConfig: AssistantServerConfig | AssistantChatConfig;
    if (appName === 'assistant-chat') {
      parsedConfig = AssistantChatConfigSchema.parse(basePayload.config);
    } else {
      parsedConfig = AssistantServerConfigSchema.parse(basePayload.config);
    }

    // Get installation using Vercel's configuration ID
    const installation = await getInstallationById(basePayload.configurationId);
    
    if (!installation) {
      return NextResponse.json(
        { error: 'Installation not found', message: 'Installation not found. Please ensure you have completed the OAuth flow.' },
        { status: 404 }
      );
    }

    // Get account (to get team_id)
    const account = await getAccountById(installation.account_id);
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found', message: 'Account not found. Please try reinstalling the integration.' },
        { status: 404 }
      );
    }

    // Get decrypted token
    const accessToken = await getDecryptedToken(installation.account_id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not found', message: 'Access token not found. Please try reinstalling the integration.' },
        { status: 404 }
      );
    }

    // Update status to installing
    await updateInstallation(installation.uuid, { status: 'pending' });

    // Initialize Vercel API client with team_id if exists
    const vercelClient = new VercelAPIClient(accessToken, account.vercel_team_id || undefined);

    // Prepare environment variables
    let envVariables: Record<string, string>;
    let migrationSecretKey: string | null = null;
    let jwtSecret: string | null = null;

    if (appName === 'assistant-chat') {
      const chatConfig = parsedConfig as AssistantChatConfig;
      envVariables = {
        VITE_ASSISTANT_SERVER_URL: chatConfig.assistantServerUrl,
      };

      if (chatConfig.assistantServerApiKey) {
        envVariables.VITE_ASSISTANT_SERVER_API_KEY = chatConfig.assistantServerApiKey;
      }
    } else {
      const serverConfig = parsedConfig as AssistantServerConfig;
      migrationSecretKey = uuidv4();
      jwtSecret = uuidv4();

      envVariables = {
        SUPABASE_URL: serverConfig.supabase.url,
        SUPABASE_SERVICE_KEY: serverConfig.supabase.serviceRoleKey,
        SUPABASE_DB_HOST: serverConfig.database.host,
        SUPABASE_DB_NAME: serverConfig.database.name,
        SUPABASE_DB_USER: serverConfig.database.user,
        SUPABASE_DB_PASSWORD: serverConfig.database.password,
        OPENAI_API_KEY: serverConfig.openai.apiKey,
        AI_MODEL: 'gpt-4o-mini',
        AI_TEMPERATURE: '0.7',
        AI_MAX_TOKENS: '1000',
        ORGANIZATION_NAME: 'Vezlo',
        ASSISTANT_NAME: 'Vezlo Assistant',
        MIGRATION_SECRET_KEY: migrationSecretKey,
        JWT_SECRET: jwtSecret,
        DEFAULT_ADMIN_EMAIL: 'admin@vezlo.org',
        DEFAULT_ADMIN_PASSWORD: 'admin123',
      };
    }

    // Determine which repository to use based on app_name
    const installationAppName = installation.app_name || 'assistant-server';
    let repo: string;
    
    if (installationAppName === 'assistant-chat') {
      repo = process.env.ASSISTANT_CHAT_REPO || 'vezlo/assistant-chat';
    } else {
      repo = process.env.ASSISTANT_SERVER_REPO || 'your-org/assistant-server';
    }

    // Deploy from GitHub using integration configuration
    const deployment = await vercelClient.deployFromGitHub({
      configurationId: installation.installation_id, // This is the integration configuration ID
      repo: repo,
      branch: 'main',
      envVariables,
      target: 'production', // Deploy to production by default
      appName: installationAppName,
    });

    // Update installation with deployment info
    await updateInstallation(installation.uuid, {
      vercel_project_id: deployment.project.id,
      vercel_project_name: deployment.project.name,
      deployment_url: deployment.deployment.url,
      status: 'installed',
    });

    return NextResponse.json({
      success: true,
      data: {
        deploymentId: deployment.deployment.id,
        deploymentUrl: deployment.deployment.url,
        projectName: deployment.project.name,
        migrationSecretKey: migrationSecretKey || undefined,
      },
    });
  } catch (error) {
    console.error('🚨 Deployment Error:');
    
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      const validationMessages = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      }).join(', ');
      return NextResponse.json(
        { 
          error: 'Invalid request', 
          message: `Validation failed: ${validationMessages}. Please check your input and try again.`
        },
        { status: 400 }
      );
    }

    // Handle Axios errors (Vercel API errors)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      const status = axiosError.response?.status;
      
      console.error('Vercel API Error:', {
        status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
      });
      
      let errorMessage = extractVercelErrorMessage(axiosError);
      
      // Handle specific HTTP status codes with user-friendly messages
      if (status === 401) {
        errorMessage = 'Authentication failed. Please reinstall the integration and try again.';
      } else if (status === 403) {
        errorMessage = 'Permission denied. Please check your Vercel integration permissions.';
      } else if (status === 404) {
        errorMessage = 'Repository or project not found. Please check your repository configuration.';
      } else if (!errorMessage || errorMessage.includes('HTTP')) {
        errorMessage = `Vercel API returned an error (${status || 'unknown'}). ${errorMessage || 'Please try again later.'}`;
      }
      
      return NextResponse.json(
        { error: 'Deployment failed', message: errorMessage },
        { status: 500 }
      );
    }

    // Handle other errors (network errors, etc.)
    console.error('Unknown error:', error);
    let errorMessage = 'An unexpected error occurred during deployment.';
    
    if (error instanceof Error) {
      errorMessage = error.message || 'An unexpected error occurred during deployment.';
    }
    
    return NextResponse.json(
      { error: 'Deployment failed', message: errorMessage },
      { status: 500 }
    );
  }
}
