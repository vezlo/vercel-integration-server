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
      const responseData = axiosError.response?.data;
      const status = axiosError.response?.status;
      
      console.error('Vercel API Error:', {
        status,
        statusText: axiosError.response?.statusText,
        data: responseData,
      });
      
      // Extract user-friendly error message from Vercel API response
      // Try multiple possible locations for error messages
      let errorMessage = 'Deployment failed due to a Vercel API error.';
      
      // Check for error message in various possible locations
      if (responseData) {
        // Direct string error
        if (typeof responseData === 'string') {
          errorMessage = `Vercel API error: ${responseData}`;
        }
        // Error object with message
        else if (responseData.message && typeof responseData.message === 'string') {
          errorMessage = `Vercel API error: ${responseData.message}`;
        }
        // Error field (could be string or object)
        else if (responseData.error) {
          if (typeof responseData.error === 'string') {
            errorMessage = `Vercel API error: ${responseData.error}`;
          } else if (typeof responseData.error === 'object') {
            // Vercel nested error structure: error.error.message
            if (responseData.error.message && typeof responseData.error.message === 'string') {
              errorMessage = responseData.error.message;
            } else if (responseData.error.error && typeof responseData.error.error === 'object' && responseData.error.error.message) {
              errorMessage = responseData.error.error.message;
            } else if (responseData.error.error && typeof responseData.error.error === 'string') {
              errorMessage = responseData.error.error;
            } else if (responseData.error.code) {
              // If we have a code but no message, use the code
              errorMessage = `Vercel API error (${responseData.error.code}): ${responseData.error.message || 'Unknown error'}`;
            }
          }
        }
        // Error description
        else if (responseData.error_description) {
          errorMessage = `Vercel API error: ${responseData.error_description}`;
        }
        // Error details array
        else if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          const errorTexts = responseData.errors.map((e: any) => 
            e.message || e.error || String(e)
          ).filter(Boolean);
          errorMessage = `Vercel API error: ${errorTexts.join(', ')}`;
        }
        // Fallback: try to stringify the entire response data if it's an object
        else if (typeof responseData === 'object' && Object.keys(responseData).length > 0) {
          // Try to extract any meaningful error text from the object
          const errorText = JSON.stringify(responseData);
          if (errorText.length < 500) {
            errorMessage = `Vercel API error: ${errorText}`;
          }
        }
      }
      
      // Handle specific HTTP status codes
      if (status === 401) {
        errorMessage = 'Authentication failed. Please reinstall the integration and try again.';
      } else if (status === 403) {
        errorMessage = 'Permission denied. Please check your Vercel integration permissions.';
      } else if (status === 404) {
        errorMessage = 'Repository or project not found. Please check your repository configuration.';
      } else if (status === 409 || (status === 400 && responseData?.error?.code === 'ENV_CONFLICT')) {
        // Conflict error - typically for environment variable conflicts
        // If we already extracted a message about "already exists", use it
        // Otherwise provide a generic message
        if (!errorMessage.includes('already') && !errorMessage.includes('exists') && !errorMessage.includes('ENV_CONFLICT')) {
          errorMessage = 'A resource already exists (conflict). This may be due to an existing environment variable. The system will attempt to update it.';
        }
      } else if (status && errorMessage === 'Deployment failed due to a Vercel API error.') {
        errorMessage = `Vercel API returned an error (${status}). Please try again later.`;
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
