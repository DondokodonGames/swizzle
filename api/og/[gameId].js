// Vercel serverless function: crawler-only OGP HTML for /play/:gameId.
//
// vercel.json rewrites requests here only when the User-Agent matches a known
// social-media crawler; regular browsers keep hitting the SPA. Without this,
// every shared game link rendered the same static playswizzle.com card
// (index.html's OG tags), so shared links were indistinguishable from each other.

const { createClient } = require('@supabase/supabase-js');

const SITE_URL = 'https://playswizzle.com';
const FALLBACK_IMAGE = `${SITE_URL}/logo-large.png`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml({ url, title, description, image }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="${escapeHtml(url)}" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body></body>
</html>
`;
}

module.exports = async function handler(req, res) {
  const gameId = req.query.gameId;
  const url = `${SITE_URL}/play/${gameId}`;

  let game = null;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && gameId) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('user_games')
        .select('title, description, thumbnail_url')
        .eq('id', gameId)
        .eq('is_published', true)
        .maybeSingle();
      game = data;
    } catch (err) {
      console.error('[og] failed to fetch game', err);
    }
  }

  const html = renderHtml({
    url,
    title: game?.title ? `${game.title} - Swizzle` : 'Swizzle - Short Game Platform',
    description: game?.description || 'Create and play short games in seconds. The ultimate platform for bite-sized gaming experiences.',
    image: game?.thumbnail_url || FALLBACK_IMAGE,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
  res.status(200).send(html);
};
