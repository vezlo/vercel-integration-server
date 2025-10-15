# Vercel Integration Server

A Next.js TypeScript application that serves as a Vercel integration server for deploying AI Assistant applications. This server handles OAuth token exchange, stores Vercel account tokens securely, and deploys the `assistant-server` application to users' Vercel accounts with environment parameters.

## 🎯 Purpose

This integration server enables users to:
- Install the AI Assistant Server integration from the [Vercel Marketplace](https://vercel.com/marketplace/vezlo-assistant-server)
- Authenticate via OAuth with their Vercel account
- Configure their Supabase and OpenAI credentials
- Automatically deploy the AI Assistant Server to their Vercel project
- Complete the integration setup seamlessly

## 🏗️ Architecture

### 📋 Integration Flow

```
User          Vercel Marketplace    Integration Server
  │                    │                    │
  │ 1. Install         │                    │
  ├───────────────────►│                    │
  │                    │                    │
  │ 2. OAuth Redirect  │                    │
  │◄───────────────────┤                    │
  │                    │                    │
  │ 3. Authorize       │                    │
  ├───────────────────►│                    │
  │                    │                    │
  │ 4. Redirect with Code                   │
  │◄───────────────────────────────────────┤
  │                    │                    │
  │ 5. Configure Credentials                │
  ├───────────────────────────────────────►│
  │                    │                    │
  │ 6. Deploy Assistant Server              │
  ├───────────────────────────────────────►│
  │                    │                    │
  │ 7. Success & Complete                  │
  │◄───────────────────────────────────────┤
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account
- Vercel account
- GitHub repository with your assistant-server code

### 1. Clone and Install

```bash
git clone https://github.com/vezlo/vercel-integration-server.git
cd vercel-integration-server
npm install
```

### 2. Setup Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to **SQL Editor**
4. Copy and paste the content from `supabase/schema.sql`
5. Click **Run**
6. Go to **Settings** → **API** and copy:
   - Project URL
   - Service Role Key (secret)

### 3. Create Vercel Integration

1. Go to [Vercel Integrations Console](https://vercel.com/dashboard/integrations/console)
2. Click **Create Integration**
3. Fill in the details:
   - **Name**: "AI Assistant Deployer"
   - **Redirect URL**: `http://localhost:3000/api/oauth/callback`
   - **Configuration URL**: `http://localhost:3000/configure`
4. Enable the following permissions:
   - ✅ Installation (Read)
   - ✅ Projects (Read)
   - ✅ Deployments (Read/Write)
   - ✅ Integration-owned Project Environment Variables (Read/Write)
5. Save and copy the **Client ID** & **Client Secret**

### 4. Environment Configuration

Create `.env.local` file:

```env
# Vercel Integration Credentials
VERCEL_CLIENT_ID=oac_[your_client_id]
VERCEL_CLIENT_SECRET=[your_client_secret]
VERCEL_REDIRECT_URI=http://localhost:3000/api/oauth/callback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=[32_character_random_string]

# Supabase Configuration
SUPABASE_URL=[your_supabase_url]
SUPABASE_SERVICE_ROLE_KEY=[your_supabase_service_role_key]

# Assistant Server Repository
ASSISTANT_SERVER_REPO=your-org/assistant-server
ASSISTANT_SERVER_REPO_ID=[github_repo_id]
```

### 5. Run Locally

```bash
npm run dev
```

### 6. Test with ngrok (Required for OAuth)

Since OAuth requires HTTPS, use ngrok for local testing:

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Update .env.local with ngrok URL:
NEXT_PUBLIC_APP_URL=https://[your-ngrok-id].ngrok.io
VERCEL_REDIRECT_URI=https://[your-ngrok-id].ngrok.io/api/oauth/callback

# Update your Vercel integration redirect URL to the ngrok URL
```

## 🔄 How It Works

### 1. OAuth Flow
- User clicks "Install" on the [Vercel Marketplace](https://vercel.com/marketplace/vezlo-assistant-server)
- Vercel redirects to OAuth authorization
- User authorizes the integration
- Vercel redirects back with authorization code

### 2. Token Exchange & Storage
- Integration server exchanges code for access token
- Encrypts and stores the token in Supabase
- Creates installation record linked to the account

### 3. Configuration
- User is redirected to the configure page
- User enters Supabase and OpenAI credentials
- Credentials are validated and prepared for deployment

### 4. Deployment Process
- Server retrieves integration configuration from Vercel
- Determines target project (first selected project)
- Deploys assistant-server from GitHub repository
- Sets environment variables on the project
- Updates installation status

### 5. Completion
- User sees success page with deployment details
- Migration URL is provided for database setup
- User completes integration by returning to Vercel

## 📁 Project Structure

```
vercel-integration-server/
├── app/
│   ├── api/
│   │   ├── oauth/callback/     # OAuth token exchange
│   │   ├── deploy/            # Deployment API
│   │   ├── health/            # Health check endpoint
│   │   └── docs/              # Swagger documentation
│   ├── configure/             # Configuration page
│   └── api-docs/              # API documentation UI
├── lib/
│   ├── encryption.ts          # AES-256 encryption utilities
│   ├── storage.ts             # Supabase database operations
│   ├── vercel-api.ts          # Vercel API client
│   └── swagger.ts             # Swagger documentation
├── types/
│   └── index.ts               # TypeScript interfaces
└── supabase/
    └── schema.sql             # Database schema
```

## 🔧 API Endpoints

### OAuth Callback
- **GET** `/api/oauth/callback`
- Handles OAuth token exchange and account creation

### Deployment
- **POST** `/api/deploy`
- Triggers assistant-server deployment to user's Vercel account

### Health Check
- **GET** `/api/health`
- Returns server status

### API Documentation
- **GET** `/api/docs`
- Swagger JSON documentation
- **GET** `/api-docs`
- Interactive Swagger UI

## 🗄️ Database Schema

### Accounts Table
Stores encrypted Vercel access tokens and user information:
- `id`: Primary key
- `uuid`: Unique identifier for external API exposure
- `vercel_user_id`: Vercel user ID
- `vercel_team_id`: Vercel team ID (if applicable)
- `access_token`: Encrypted Vercel access token
- `created_at`, `updated_at`: Timestamps

### Installations Table
Tracks deployment instances:
- `id`: Primary key
- `uuid`: Unique identifier for external API exposure
- `installation_id`: Vercel's integration configuration ID
- `account_id`: Foreign key to accounts table
- `app_name`: Application name (default: 'assistant-server')
- `vercel_project_id`: Deployed project ID
- `vercel_project_name`: Deployed project name
- `deployment_url`: Live deployment URL
- `status`: Installation status ('pending', 'installed', 'failed')
- `created_at`, `updated_at`: Timestamps

## 🔒 Security Features

- **AES-256 Encryption**: All Vercel tokens are encrypted before storage
- **No Credential Storage**: User credentials (Supabase, OpenAI) are never stored
- **Environment Variables**: Sensitive data passed as environment variables to deployments
- **Row Level Security**: Supabase RLS enabled for additional security
- **HTTPS Only**: OAuth flow requires HTTPS (use ngrok for local testing)

## 🧪 Testing

### Local Testing Mode
Add `?success=true` to the configure page URL to test the success page UI:
```
http://localhost:3000/configure?configurationId=test&success=true
```

### Production Testing
1. Deploy the integration server to Vercel
2. Update Vercel integration URLs to production URLs
3. Test the complete OAuth and deployment flow

## 🚀 Deployment

### Deploy to Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
Set these in your Vercel project settings:
- `VERCEL_CLIENT_ID`
- `VERCEL_CLIENT_SECRET`
- `VERCEL_REDIRECT_URI`
- `NEXT_PUBLIC_APP_URL`
- `ENCRYPTION_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASSISTANT_SERVER_REPO`
- `ASSISTANT_SERVER_REPO_ID`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write clear commit messages
- Test your changes thoroughly
- Update documentation as needed
- Ensure all tests pass

### Code Style

- Use ESLint configuration provided
- Follow Next.js conventions
- Use meaningful variable names
- Add comments for complex logic

## 📄 License

This project is dual-licensed:

- **Non-Commercial Use**: Free under AGPL-3.0 license
- **Commercial Use**: Requires a commercial license - contact us for details

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join our GitHub Discussions for questions and ideas

## 🔗 Links

- **Vercel Integration**: [https://vercel.com/marketplace/vezlo-assistant-server](https://vercel.com/marketplace/vezlo-assistant-server)
- **Vezlo Website**: [https://vezlo.org](https://vezlo.org)
- **GitHub Repository**: [https://github.com/vezlo/vercel-integration-server](https://github.com/vezlo/vercel-integration-server)

---

Made with ❤️ by [Vezlo](https://vezlo.org)