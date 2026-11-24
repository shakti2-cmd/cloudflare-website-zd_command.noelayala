// Cloudflare Worker for Zombie Defense Command: serves static assets + owner-only GitHub tuning publisher
const DEFAULT_REPO = 'shakti2-cmd/cloudflare-website-zd_command.noelayala';
const DEFAULT_BRANCH = 'main';
const DEFAULT_OWNER_EMAIL = 'noeljedayala@gmail.com';
const VERSION_FILES = ['index.html', 'style.css', 'game.js', 'sw.js'];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function isAuthorized(request, env) {
  const allowedEmail = String(env.ALLOWED_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  const cfEmail = String(request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
  if (cfEmail && cfEmail === allowedEmail) {
    return { ok: true, via: 'cloudflare-access', email: cfEmail };
  }
  const adminSecret = String(env.ADMIN_SECRET || '').trim();
  const providedSecret = String(request.headers.get('X-Admin-Secret') || '').trim();
  if (adminSecret && providedSecret && providedSecret === adminSecret) {
    return { ok: true, via: 'admin-secret', email: allowedEmail };
  }
  return { ok: false, hasAccessHeader: Boolean(cfEmail), hasAdminSecret: Boolean(adminSecret) };
}

function bumpPatchVersion(ver) {
  const m = String(ver || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return 'v0.46.1';
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  const patch = parseInt(m[3], 10) + 1;
  return `v${major}.${minor}.${patch}`;
}

async function ghFetch(token, path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'zd-command-tuning-worker/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const msg = (data && data.message) || text || `HTTP ${res.status}`;
    throw new Error(`GitHub API ${options.method || 'GET'} ${path} failed (${res.status}): ${msg}`);
  }
  return data;
}

function decodeBase64Utf8(b64) {
  const clean = String(b64 || '').replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function sanitizeNumber(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeTuningPayload(input, nextVersion) {
  const g = (input && input.general) || {};
  const wm = (input && input.waveMeter) || {};
  const zIn = (input && input.zombies) || {};
  const zDefaults = {
    walker: 1, runner: 1, tank: 10, demolisher: 9, wrecker: 7, miniboss: 45, behemoth: 80
  };
  const zombies = {};
  for (const [k, defBounty] of Object.entries(zDefaults)) {
    const src = zIn[k] || {};
    zombies[k] = {
      hpMult: sanitizeNumber(src.hpMult, 0.1, 10.0, 1.0),
      speedMult: sanitizeNumber(src.speedMult, 0.1, 10.0, 1.0),
      dmgMult: sanitizeNumber(src.dmgMult, 0.1, 10.0, 1.0),
      bounty: Math.round(sanitizeNumber(src.bounty, 1, 100, defBounty)),
      countMult: sanitizeNumber(src.countMult, 0, 5.0, 1.0)
    };
  }
  return {
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    general: {
      towerStrengthMult: sanitizeNumber(g.towerStrengthMult, 0.1, 10.0, 1.0),
      zombieHpMult: sanitizeNumber(g.zombieHpMult, 0.1, 10.0, 0.5),
      zombieScrapMult: sanitizeNumber(g.zombieScrapMult, 0.1, 10.0, 1.5),
      zombieSpeedMult: sanitizeNumber(g.zombieSpeedMult, 0.1, 10.0, 1.0),
      breachCountMult: sanitizeNumber(g.breachCountMult, 0.1, 10.0, 0.75),
      safeZonesPerStructure: Math.round(sanitizeNumber(g.safeZonesPerStructure, 0, 10, 3))
    },
    waveMeter: {
      toughness10WaveMult: sanitizeNumber(wm.toughness10WaveMult, 1.0, 10.0, 1.0),
      speed10WaveMult: sanitizeNumber(wm.speed10WaveMult, 1.0, 5.0, 1.0)
    },
    zombies
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/tuning-status' && request.method === 'GET') {
      const auth = isAuthorized(request, env);
      return jsonResponse({
        ok: true,
        authorized: auth.ok,
        authVia: auth.ok ? auth.via : null,
        hasGithubToken: Boolean(env.GITHUB_TOKEN),
        hasAdminSecret: Boolean(env.ADMIN_SECRET),
        repo: env.GITHUB_REPO || DEFAULT_REPO,
        branch: env.GITHUB_BRANCH || DEFAULT_BRANCH
      });
    }

    if (url.pathname === '/api/publish-tuning' && request.method === 'POST') {
      const auth = isAuthorized(request, env);
      if (!auth.ok) {
        return jsonResponse({
          ok: false,
          error: 'Unauthorized. Protect /admin and /api/* with Cloudflare Access or provide a valid Admin Secret.'
        }, 403);
      }

      const token = String(env.GITHUB_TOKEN || '').trim();
      if (!token) {
        return jsonResponse({
          ok: false,
          error: 'Missing GITHUB_TOKEN Worker Secret in Cloudflare Dashboard (Workers & Pages -> zd-command -> Settings -> Variables and Secrets).'
        }, 500);
      }

      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400);
      }

      const repo = String(env.GITHUB_REPO || DEFAULT_REPO).trim();
      const branch = String(env.GITHUB_BRANCH || DEFAULT_BRANCH).trim();
      const note = String(body.note || '').trim().slice(0, 120);

      try {
        const refData = await ghFetch(token, `/repos/${repo}/git/ref/heads/${branch}`);
        const baseCommitSha = refData.object.sha;
        const commitData = await ghFetch(token, `/repos/${repo}/git/commits/${baseCommitSha}`);
        const baseTreeSha = commitData.tree.sha;
        const treeData = await ghFetch(token, `/repos/${repo}/git/trees/${baseTreeSha}`);

        const tuningEntry = (treeData.tree || []).find((t) => t.path === 'tuning.json');
        let prevVersion = 'v0.46.0';
        if (tuningEntry) {
          const tuningBlob = await ghFetch(token, `/repos/${repo}/git/blobs/${tuningEntry.sha}`);
          const parsed = JSON.parse(decodeBase64Utf8(tuningBlob.content));
          if (parsed && parsed.version) prevVersion = parsed.version;
        }

        const nextVersion = bumpPatchVersion(prevVersion);
        const nextTuning = sanitizeTuningPayload(body.tuning, nextVersion);
        const treeUpdates = [];

        const tuningBlobRes = await ghFetch(token, `/repos/${repo}/git/blobs`, {
          method: 'POST',
          body: { content: `${JSON.stringify(nextTuning, null, 2)}\n`, encoding: 'utf-8' }
        });
        treeUpdates.push({ path: 'tuning.json', mode: '100644', type: 'blob', sha: tuningBlobRes.sha });

        const prevBare = prevVersion.replace(/^v/, '');
        const nextBare = nextVersion.replace(/^v/, '');
        const verRx = new RegExp(`v${prevBare.replace(/\./g, '\\.')}`, 'g');

        for (const filePath of VERSION_FILES) {
          const entry = (treeData.tree || []).find((t) => t.path === filePath);
          if (!entry) continue;
          const blob = await ghFetch(token, `/repos/${repo}/git/blobs/${entry.sha}`);
          const text = decodeBase64Utf8(blob.content);
          const updated = text.replace(verRx, `v${nextBare}`);
          if (updated !== text) {
            const newBlob = await ghFetch(token, `/repos/${repo}/git/blobs`, {
              method: 'POST',
              body: { content: updated, encoding: 'utf-8' }
            });
            treeUpdates.push({ path: filePath, mode: '100644', type: 'blob', sha: newBlob.sha });
          }
        }

        const newTree = await ghFetch(token, `/repos/${repo}/git/trees`, {
          method: 'POST',
          body: { base_tree: baseTreeSha, tree: treeUpdates }
        });

        const commitMsg = `Update tuning defaults & bump ${nextVersion}${note ? `: ${note}` : ''}`;
        const newCommit = await ghFetch(token, `/repos/${repo}/git/commits`, {
          method: 'POST',
          body: {
            message: commitMsg,
            tree: newTree.sha,
            parents: [baseCommitSha]
          }
        });

        await ghFetch(token, `/repos/${repo}/git/refs/heads/${branch}`, {
          method: 'PATCH',
          body: { sha: newCommit.sha, force: false }
        });

        return jsonResponse({
          ok: true,
          previousVersion: prevVersion,
          newVersion: nextVersion,
          commitSha: newCommit.sha.slice(0, 7),
          commitUrl: `https://github.com/${repo}/commit/${newCommit.sha}`,
          tuning: nextTuning
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || 'Publish failed.' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
