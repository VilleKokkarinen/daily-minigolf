export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Basic CORS headers
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // === GET leaderboard for a given date ===
    if (url.pathname === '/scores' && req.method === 'GET') {
      const date = url.searchParams.get('date');
      if (!date) {
        return new Response(JSON.stringify({ error: 'missing date' }), {
          status: 400,
          headers: { 'content-type': 'application/json', ...cors }
        });
      }
      const key = `scores:${date}`;
      const json = (await env.GOLF.get(key)) || '[]';
      return new Response(json, {
        headers: { 'content-type': 'application/json', ...cors }
      });
    }

    // === POST new score ===
    if (url.pathname === '/scores' && req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: 'invalid JSON' }), {
          status: 400,
          headers: { 'content-type': 'application/json', ...cors }
        });
      }

      const { date, name, strokes, time_ms, pid } = body || {};
      if (!date || !name || strokes == null || time_ms == null || !pid) {
        return new Response(JSON.stringify({ error: 'bad request' }), {
          status: 400,
          headers: { 'content-type': 'application/json', ...cors }
        });
      }

      const key = `scores:${date}`;
      const ip = req.headers.get('CF-Connecting-IP') || '0.0.0.0';

      // === Simple per-IP rate limit: 1 write / 5 seconds ===
      const rlKey = `rl:${ip}`;
      const last = await env.GOLF.get(rlKey);
      if (last) {
        return new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          headers: { 'content-type': 'application/json', ...cors }
        });
      }
      await env.GOLF.put(rlKey, '1', { expirationTtl: 5 });

      // === Load, update, and store leaderboard ===
      const arr = JSON.parse((await env.GOLF.get(key)) || '[]');

      // Keep best per pid (fewest strokes, then fastest time)
      const existingIdx = arr.findIndex(s => s.pid === pid);
      const entry = {
        name: String(name).slice(0, 12),
        strokes: Number(strokes),
        time_ms: Number(time_ms),
        pid
      };

      const better = (a, b) =>
        (a.strokes - b.strokes) || (a.time_ms - b.time_ms);

      if (existingIdx >= 0) {
        if (better(entry, arr[existingIdx]) < 0) {
          arr[existingIdx] = entry; // replace if better
        }
      } else {
        arr.push(entry);
      }

      arr.sort(better);
      const trimmed = arr.slice(0, 100); // top 100 only

      await env.GOLF.put(key, JSON.stringify(trimmed), {
        expirationTtl: 60 * 60 * 24 * 3 // keep for 3 days
      });

      return new Response(JSON.stringify(trimmed), {
        headers: { 'content-type': 'application/json', ...cors }
      });
    }

    // === Fallback ===
    return new Response('not found', { status: 404, headers: cors });
  }
};
