import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'templates', 'resend');
const MANIFEST_PATH = path.join(TEMPLATES_DIR, 'templates.json');
const RESEND_API_BASE = 'https://api.resend.com';

function parseEnvLocal(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

async function loadResendApiKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const envLocalPath = path.join(ROOT, '.env.local');
  const envContent = await fs.readFile(envLocalPath, 'utf8');
  const vars = parseEnvLocal(envContent);
  if (!vars.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing in .env.local');
  }
  return vars.RESEND_API_KEY;
}

async function resendRequest(apiKey, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API ${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

async function main() {
  const apiKey = await loadResendApiKey();
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const templateDefs = manifest.templates || [];

  if (templateDefs.length === 0) {
    console.log('No templates in manifest.');
    return;
  }

  const existing = await resendRequest(apiKey, `${RESEND_API_BASE}/templates`, { method: 'GET' });
  const byAlias = new Map((existing.data || []).map((item) => [item.alias, item]));

  const results = [];

  for (const def of templateDefs) {
    const htmlPath = path.join(TEMPLATES_DIR, def.htmlFile);
    const html = await fs.readFile(htmlPath, 'utf8');
    const payload = {
      name: def.name,
      alias: def.alias,
      subject: def.subject,
      html,
      variables: def.variables || [],
    };

    const found = byAlias.get(def.alias);
    if (found) {
      const updated = await resendRequest(apiKey, `${RESEND_API_BASE}/templates/${found.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      results.push({ alias: def.alias, action: 'updated', id: updated.id || found.id });
    } else {
      const created = await resendRequest(apiKey, `${RESEND_API_BASE}/templates`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      results.push({ alias: def.alias, action: 'created', id: created.id });
    }
  }

  console.log('Resend template sync complete:');
  for (const item of results) {
    console.log(`- ${item.action.toUpperCase()} ${item.alias} (${item.id})`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
