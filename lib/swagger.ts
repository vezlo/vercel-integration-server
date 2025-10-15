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
            properties: {
              error: {
                type: 'string',
              },
              message: {
                type: 'string',
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
              config: {
                type: 'object',
                properties: {
                  supabase: {
                    type: 'object',
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
                    properties: {
                      host: {
                        type: 'string',
                      },
                      name: {
                        type: 'string',
                      },
                      user: {
                        type: 'string',
                      },
                      password: {
                        type: 'string',
                      },
                    },
                  },
                  openai: {
                    type: 'object',
                    properties: {
                      apiKey: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
              projectName: {
                type: 'string',
                description: 'Optional project name',
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


