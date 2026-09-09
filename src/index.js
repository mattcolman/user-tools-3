import Resolver from '@forge/resolver';
import { fetch } from '@forge/api';

const resolver = new Resolver();

resolver.define('getText', (req) => {
  console.log(req);

  return 'Hello, world!';
});

/**
 * Atlassian avatar CDNs send no Access-Control-Allow-Origin header, so the
 * frontend cannot draw an avatar onto a canvas directly. Fetching the bytes
 * here and handing back a data URL keeps the canvas untainted.
 */
resolver.define('fetchAvatar', async ({ payload }) => {
  const response = await fetch(payload.url);

  if (!response.ok) {
    throw new Error(`Failed to fetch avatar (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/png';

  return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
});

export const handler = resolver.getDefinitions();
