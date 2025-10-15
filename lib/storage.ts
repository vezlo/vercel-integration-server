import { getSupabaseClient } from './supabase';
import { Account, Installation, VercelOAuthToken } from '@/types';
import { encrypt, decrypt } from './encryption';

// Account Storage
export async function createAccount(tokenData: VercelOAuthToken): Promise<Account> {
  const encryptedToken = encrypt(tokenData.access_token);
  
  const { data, error } = await getSupabaseClient()
    .from('accounts')
    .upsert({
      vercel_user_id: tokenData.user_id,
      vercel_team_id: tokenData.team_id || null,
      access_token: encryptedToken,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'vercel_user_id'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAccountByVercelUserId(vercelUserId: string): Promise<Account | null> {
  const { data, error } = await getSupabaseClient()
    .from('accounts')
    .select('*')
    .eq('vercel_user_id', vercelUserId)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function getAccountByUuid(uuid: string): Promise<Account | null> {
  const { data, error } = await getSupabaseClient()
    .from('accounts')
    .select('*')
    .eq('uuid', uuid)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function getAccountById(id: number): Promise<Account | null> {
  const { data, error } = await getSupabaseClient()
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function getDecryptedToken(accountId: number): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from('accounts')
    .select('access_token')
    .eq('id', accountId)
    .single();
  
  if (error || !data) return null;
  
  try {
    return decrypt(data.access_token);
  } catch {
    return null;
  }
}

// Installation Storage
export async function createInstallation(
  installationId: string,
  accountId: number,
  appName: string = 'assistant-server'
): Promise<Installation> {
  const { data, error } = await getSupabaseClient()
    .from('installations')
    .insert({
      installation_id: installationId,
      account_id: accountId,
      app_name: appName,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getInstallationByUuid(uuid: string): Promise<Installation | null> {
  const { data, error } = await getSupabaseClient()
    .from('installations')
    .select('*')
    .eq('uuid', uuid)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function getInstallationById(installationId: string): Promise<Installation | null> {
  const { data, error } = await getSupabaseClient()
    .from('installations')
    .select('*')
    .eq('installation_id', installationId)
    .single();
  
  if (error || !data) return null;
  return data;
}

export async function updateInstallation(
  uuid: string,
  updates: Partial<Installation>
): Promise<Installation | null> {
  const { data, error } = await getSupabaseClient()
    .from('installations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('uuid', uuid)
    .select()
    .single();
  
  if (error || !data) return null;
  return data;
}
