import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Vercel Integration Server API',
        version: '1.0.0',
        description: 'API documentation for Vercel Integration Server - handles OAuth, configuration, and deployment of assistant servers',
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          description: 'API Server',
        },
      ],
      components: {
        schemas: {
          Error: {
            type: 'object',
            required: ['error', 'message'],
            properties: {
              error: {
                type: 'string',
                description: 'Error type or category',
                example: 'Deployment failed',
              },
              message: {
                type: 'string',
                description: 'User-friendly error message explaining what went wrong',
                example: 'Vercel API error: Authentication failed. Please reinstall the integration and try again.',
              },
            },
          },
          DeploymentRequest: {
            type: 'object',
            required: ['configurationId', 'config'],
            properties: {
              configurationId: {
                type: 'string',
                description: 'Vercel integration configuration ID',
              },
              appName: {
                type: 'string',
                enum: ['assistant-server', 'assistant-chat'],
                description: 'Defaults to assistant-server when omitted',
              },
              config: {
                oneOf: [
                  { $ref: '#/components/schemas/AssistantServerConfig' },
                  { $ref: '#/components/schemas/AssistantChatConfig' },
                ],
              },
              projectName: {
                type: 'string',
                description: 'Optional project name',
              },
            },
          },
          AssistantServerConfig: {
            type: 'object',
            required: ['supabase', 'database', 'openai'],
            properties: {
              supabase: {
                type: 'object',
                required: ['url', 'serviceRoleKey'],
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                  },
                  serviceRoleKey: {
                    type: 'string',
                  },
                },
              },
              database: {
                type: 'object',
                required: ['host', 'name', 'user', 'password'],
                properties: {
                  host: { type: 'string' },
                  name: { type: 'string' },
                  user: { type: 'string' },
                  password: { type: 'string' },
                },
              },
              openai: {
                type: 'object',
                required: ['apiKey'],
                properties: {
                  apiKey: { type: 'string' },
                },
              },
            },
          },
          AssistantChatConfig: {
            type: 'object',
            required: ['assistantServerUrl'],
            properties: {
              assistantServerUrl: {
                type: 'string',
                format: 'uri',
                description: 'Base URL of the Assistant Server instance',
              },
              assistantServerApiKey: {
                type: 'string',
                description: 'Optional API key if the Assistant Server requires authentication',
              },
            },
          },
          DeploymentResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
              },
              data: {
                type: 'object',
                properties: {
                  deploymentId: {
                    type: 'string',
                  },
                  deploymentUrl: {
                    type: 'string',
                    format: 'uri',
                  },
                  projectName: {
                    type: 'string',
                  },
                  migrationSecretKey: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
            },
          },
          HealthResponse: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'ok',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
    },
  });

  return spec;
};


