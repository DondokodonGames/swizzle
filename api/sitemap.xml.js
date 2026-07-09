// Vercel serverless function: dynamic sitemap for published games.
// Runs at request time so newly published games show up without a rebuild.

const { createClient } = require('@supabase/supabase-js');

const SITE_URL = 'https://playswizzle.com';

const STATIC_PATHS = ['/', '/about', '/terms', '/privacy', '/feed'];

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  const urls = STATIC_PATHS.map((path) => ({ loc: `${SITE_URL}${path}` }));

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('user_games')
        .select('id, updated_at')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(5000);

      for (const game of data || []) {
        urls.push({ loc: `${SITE_URL}/play/${game.id}`, lastmod: game.updated_at });
      }
    } catch (err) {
      console.error('[sitemap] failed to fetch published games', err);
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(body);
};
