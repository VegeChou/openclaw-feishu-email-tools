import axios from 'axios';

function openApiBase(domain: 'feishu' | 'lark' = 'feishu'): string {
  return domain === 'lark' ? 'https://open.larksuite.com' : 'https://open.feishu.cn';
}

export async function getTenantAccessToken({
  appId,
  appSecret,
  domain = 'feishu'
}: {
  appId: string;
  appSecret: string;
  domain?: 'feishu' | 'lark';
}): Promise<string> {
  const base = openApiBase(domain);
  const res = await axios.post(
    `${base}/open-apis/auth/v3/tenant_access_token/internal`,
    { app_id: appId.trim(), app_secret: appSecret.trim() },
    { timeout: 10000 }
  );

  if (res?.data?.code !== 0 || !res?.data?.tenant_access_token) {
    throw new Error(`Credential check failed: code=${res?.data?.code}, msg=${res?.data?.msg || 'unknown'}`);
  }

  return res.data.tenant_access_token as string;
}

export async function validateAppCredentials({
  appId,
  appSecret,
  domain = 'feishu'
}: {
  appId: string;
  appSecret: string;
  domain?: 'feishu' | 'lark';
}): Promise<boolean> {
  if (!appId || !appSecret) return false;
  try {
    await getTenantAccessToken({ appId, appSecret, domain });
    return true;
  } catch {
    return false;
  }
}

export async function listAppScopes({
  appId,
  appSecret,
  domain = 'feishu'
}: {
  appId: string;
  appSecret: string;
  domain?: 'feishu' | 'lark';
}): Promise<Array<{ scope_name: string; grant_status: number; scope_type?: 'tenant' | 'user' }>> {
  const base = openApiBase(domain);
  const token = await getTenantAccessToken({ appId, appSecret, domain });
  const res = await axios.get(`${base}/open-apis/application/v6/scopes`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000
  });

  if (res?.data?.code !== 0) {
    throw new Error(`List scopes failed: code=${res?.data?.code}, msg=${res?.data?.msg || 'unknown'}`);
  }

  return res?.data?.data?.scopes || [];
}
