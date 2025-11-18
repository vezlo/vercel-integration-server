import { NextRequest } from 'next/server';
import { handleOAuthCallback } from '../handler';

/**
 * @swagger
 * /api/oauth/chat-callback:
 *   get:
 *     summary: Assistant Chat OAuth callback handler
 *     description: Handles OAuth callback for the Assistant Chat integration, exchanges code for token, creates account and installation
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
 *         description: Redirects to assistant-chat configuration page
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
  return handleOAuthCallback(request, 'assistant-chat');
}

