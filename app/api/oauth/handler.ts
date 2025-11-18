import { NextRequest, NextResponse } from 'next/server';
import { VercelAPIClient } from '@/lib/vercel-api';
import { createAccount, createInstallation } from '@/lib/storage';

type AppName = 'assistant-server' | 'assistant-chat';

export async function handleOAuthCallback(request: NextRequest, appOverride?: AppName) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const next = searchParams.get('next');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    const appParam = searchParams.get('app');
    const appName: AppName =
      appOverride || (appParam === 'assistant-chat' ? 'assistant-chat' : 'assistant-server');

    // Exchange code for access token using app-specific credentials
    const tokenData = await VercelAPIClient.exchangeOAuthCode(code, appName);

    // Store account and get UUID
    const account = await createAccount(tokenData);

    // Create installation record with determined app name
    await createInstallation(tokenData.installation_id, account.id, appName);

    // Redirect to configuration page with configurationId and next URL
    const configPath = appName === 'assistant-chat' ? '/configure/assistant-chat' : '/configure';
    const configUrl = new URL(configPath, process.env.NEXT_PUBLIC_APP_URL || request.url);
    configUrl.searchParams.set('configurationId', tokenData.installation_id);
    if (next) {
      configUrl.searchParams.set('next', next);
    }

    return NextResponse.redirect(configUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}

