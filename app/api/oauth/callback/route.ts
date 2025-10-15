import { NextRequest, NextResponse } from 'next/server';
import { VercelAPIClient } from '@/lib/vercel-api';
import { createAccount, createInstallation } from '@/lib/storage';

/**
 * @swagger
 * /api/oauth/callback:
 *   get:
 *     summary: OAuth callback handler
 *     description: Handles Vercel OAuth callback, exchanges code for token, creates account and installation
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth authorization code from Vercel
 *       - in: query
 *         name: next
 *         required: false
 *         schema:
 *           type: string
 *         description: URL to redirect to after completion
 *     responses:
 *       302:
 *         description: Redirects to configuration page
 *       400:
 *         description: Missing authorization code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: OAuth flow failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const next = searchParams.get('next'); // Get the next URL from Vercel

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange code for access token
    const tokenData = await VercelAPIClient.exchangeOAuthCode(code);

    // Store account and get UUID
    const account = await createAccount(tokenData);

    // Create installation record
    const installation = await createInstallation(
      tokenData.installation_id,
      account.id
    );

    // Redirect to configuration page with configurationId and next URL
    const configUrl = new URL('/configure', process.env.NEXT_PUBLIC_APP_URL || request.url);
    configUrl.searchParams.set('configurationId', tokenData.installation_id); // Use Vercel's configuration ID
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
