import { Request, Response } from 'express';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';

interface InstagramPost {
  id: string;
  image: string;
  href: string;
}

const POST_COUNT = 6;
const CACHE_MS = 60 * 60 * 1000; // Instagram image URLs expire, so refresh hourly
const GRAPH_URL = 'https://graph.instagram.com/me/media';

let cache: { posts: InstagramPost[]; fetchedAt: number } | null = null;

async function fetchFromInstagram(): Promise<InstagramPost[]> {
  const url = `${GRAPH_URL}?fields=id,media_type,media_url,thumbnail_url,permalink&limit=20&access_token=${encodeURIComponent(env.INSTAGRAM_ACCESS_TOKEN)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Instagram API responded with ${response.status}`);
  }
  const json: any = await response.json();

  return (json.data || [])
    .map((item: any) => ({
      id: item.id as string,
      // Videos/reels expose a still frame in thumbnail_url
      image: (item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url) as string,
      href: item.permalink as string,
    }))
    .filter((post: InstagramPost) => post.image && post.href)
    .slice(0, POST_COUNT);
}

// Latest posts from the brand's Instagram account (cached for an hour).
// Returns an empty list when no token is configured or Instagram is
// unreachable, so the storefront can fall back to its static images.
export const getLatestPosts = async (_req: Request, res: Response) => {
  if (!env.INSTAGRAM_ACCESS_TOKEN) {
    return sendSuccess(res, { posts: [] });
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return sendSuccess(res, { posts: cache.posts });
  }

  try {
    const posts = await fetchFromInstagram();
    cache = { posts, fetchedAt: Date.now() };
    return sendSuccess(res, { posts });
  } catch (error) {
    // Serve the last good result rather than failing the homepage
    if (cache) return sendSuccess(res, { posts: cache.posts });
    return sendError(res, 'Failed to fetch Instagram posts', 502, error);
  }
};
