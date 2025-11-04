import { NextRequest, NextResponse } from 'next/server';
import { getInstallationById, getDecryptedToken, updateInstallation, getAccountById } from '@/lib/storage';
import { VercelAPIClient } from '@/lib/vercel-api';
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
const DeploymentSchema = z.object({
  configurationId: z.string(), // Only use Vercel's configuration ID
  config: z.object({
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
  }),
  projectName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configurationId, config, projectName } = DeploymentSchema.parse(body);

    // Get installation using Vercel's configuration ID
    const installation = await getInstallationById(configurationId);
    
    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    // Get account (to get team_id)
    const account = await getAccountById(installation.account_id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get decrypted token
    const accessToken = await getDecryptedToken(installation.account_id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token not found' }, { status: 404 });
    }

    // Update status to installing
    await updateInstallation(installation.uuid, { status: 'pending' });

    // Initialize Vercel API client with team_id if exists
    const vercelClient = new VercelAPIClient(accessToken, account.vercel_team_id || undefined);

    // Prepare environment variables
    const migrationSecretKey = uuidv4(); // Generate random v4 UUID for migration secret key
    const jwtSecret = uuidv4(); // Generate unique v4 UUID for JWT secret
    
    const envVariables = {
      // User-provided credentials
      SUPABASE_URL: config.supabase.url,
      SUPABASE_SERVICE_KEY: config.supabase.serviceRoleKey,
      SUPABASE_DB_HOST: config.database.host,
      SUPABASE_DB_NAME: config.database.name,
      SUPABASE_DB_USER: config.database.user,
      SUPABASE_DB_PASSWORD: config.database.password,
      OPENAI_API_KEY: config.openai.apiKey,
      
      // Default AI configuration
      AI_MODEL: 'gpt-4o-mini',
      AI_TEMPERATURE: '0.7',
      AI_MAX_TOKENS: '1000',
      
      // Organization settings
      ORGANIZATION_NAME: 'Vezlo',
      ASSISTANT_NAME: 'Vezlo Assistant',
      
      // Migration secret key
      MIGRATION_SECRET_KEY: migrationSecretKey,
      
      // Authentication & Admin settings
      JWT_SECRET: jwtSecret,
      DEFAULT_ADMIN_EMAIL: 'admin@vezlo.org',
      DEFAULT_ADMIN_PASSWORD: 'admin123',
    };

    // Deploy from GitHub using integration configuration
    const defaultRepo = process.env.ASSISTANT_SERVER_REPO || 'your-org/assistant-server';
    const deployment = await vercelClient.deployFromGitHub({
      configurationId: installation.installation_id, // This is the integration configuration ID
      repo: defaultRepo,
      branch: 'main',
      envVariables,
      target: 'production', // Deploy to production by default
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
        migrationSecretKey: migrationSecretKey, // Include migration secret key in response
      },
    });
  } catch (error) {
    console.error('🚨 Deployment Error:');
    
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Axios errors (Vercel API errors)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Vercel API Error:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        error: axiosError.response?.data?.error,
        message: axiosError.response?.data?.message || axiosError.response?.data?.error_description
      });
      
      const vercelError = axiosError.response?.data?.error || axiosError.response?.data?.message || 'Vercel API error';
      return NextResponse.json(
        { error: 'Deployment failed', message: vercelError },
        { status: 500 }
      );
    }

    console.error('Unknown error:', error);
    return NextResponse.json(
      { error: 'Deployment failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
