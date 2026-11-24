(function () {
  'use strict';

  const DEV_STOPS = [0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.5, 2.0, 3.5, 6.0, 10.0];
  const COUNT_STOPS = [0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0];
  const RATIO_STOPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const TOUGH10_STOPS = [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];
  const SPEED10_STOPS = [1.0, 1.1, 1.2, 1.35, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];
  const ZOMBIE_BOUNTY_DEFAULTS = {
    walker: 1, runner: 1, tank: 10, demolisher: 9, wrecker: 7, miniboss: 45, behemoth: 80
  };

  function makeDefaults() {
    const zombies = {};
    for (const [k, bounty] of Object.entries(ZOMBIE_BOUNTY_DEFAULTS)) {
      zombies[k] = { hpMult: 1.0, speedMult: 1.0, dmgMult: 1.0, bounty, countMult: 1.0 };
    }
    return {
      version: 'v0.46.0',
      general: {
        towerStrengthMult: 1.0,
        zombieHpMult: 0.5,
        zombieScrapMult: 1.5,
        zombieSpeedMult: 1.0,
        breachCountMult: 0.75,
        safeZonesPerStructure: 3
      },
      waveMeter: {
        toughness10WaveMult: 1.0,
        speed10WaveMult: 1.0
      },
      zombies
    };
  }

  let state = makeDefaults();
  let activeTab = 'general';
  let selectedZombie = 'walker';

  const $ = (id) => document.getElementById(id);

  function stopIdx(stops, val, defIdx) {
    let best = defIdx;
    let minDiff = Infinity;
    for (let i = 0; i < stops.length; i++) {
      const d = Math.abs(stops[i] - val);
      if (d < minDiff) { minDiff = d; best = i; }
    }
    return best;
  }

  function showBanner(msg, type = 'ok', html = false) {
    const el = $('statusBanner');
    if (!el) return;
    el.className = `status-banner ${type}`;
    if (html) el.innerHTML = msg;
    else el.textContent = msg;
  }

  function isZombieModified(zt) {
    const z = state.zombies[zt];
    const defB = ZOMBIE_BOUNTY_DEFAULTS[zt];
    if (!z) return false;
    return Math.abs(z.hpMult - 1.0) > 0.001
      || Math.abs(z.speedMult - 1.0) > 0.001
      || Math.abs(z.dmgMult - 1.0) > 0.001
      || Math.abs(z.countMult - 1.0) > 0.001
      || z.bounty !== defB;
  }

  function syncUI() {
    $('metaVersion').textContent = state.version || 'v0.46.0';
    const g = state.general;
    $('sliderTowerStrength').value = stopIdx(DEV_STOPS, g.towerStrengthMult, 5);
    $('valTowerStrength').textContent = `${g.towerStrengthMult}x`;
    $('sliderZombieHp').value = stopIdx(DEV_STOPS, g.zombieHpMult, 3);
    $('valZombieHp').textContent = `${g.zombieHpMult}x`;
    $('sliderZombieScrap').value = stopIdx(DEV_STOPS, g.zombieScrapMult, 6);
    $('valZombieScrap').textContent = `${g.zombieScrapMult}x`;
    $('sliderZombieSpeed').value = stopIdx(DEV_STOPS, g.zombieSpeedMult, 5);
    $('valZombieSpeed').textContent = `${g.zombieSpeedMult}x`;
    $('sliderBreachCount').value = stopIdx(DEV_STOPS, g.breachCountMult, 4);
    $('valBreachCount').textContent = `${g.breachCountMult}x`;
    $('sliderStructRatio').value = stopIdx(RATIO_STOPS, g.safeZonesPerStructure, 3);
    $('valStructRatio').textContent = g.safeZonesPerStructure <= 0
      ? 'Off (\u221E)'
      : `${g.safeZonesPerStructure} tile${g.safeZonesPerStructure === 1 ? '' : 's'} (1:${g.safeZonesPerStructure})`;

    const anyZMod = Object.keys(ZOMBIE_BOUNTY_DEFAULTS).some(isZombieModified);
    $('zombiesDot').classList.toggle('hidden', !anyZMod);
    $('zombiePicker').querySelectorAll('[data-ztype]').forEach((btn) => {
      const zt = btn.dataset.ztype;
      btn.classList.toggle('active', zt === selectedZombie);
      btn.classList.toggle('modified', isZombieModified(zt));
    });

    const z = state.zombies[selectedZombie];
    $('sliderZTypeHp').value = stopIdx(DEV_STOPS, z.hpMult, 5);
    $('valZTypeHp').textContent = `${z.hpMult}x`;
    $('sliderZTypeSpeed').value = stopIdx(DEV_STOPS, z.speedMult, 5);
    $('valZTypeSpeed').textContent = `${z.speedMult}x`;
    $('sliderZTypeDmg').value = stopIdx(DEV_STOPS, z.dmgMult, 5);
    $('valZTypeDmg').textContent = `${z.dmgMult}x`;
    $('sliderZTypeBounty').value = z.bounty;
    $('valZTypeBounty').textContent = `$${z.bounty}`;
    $('sliderZTypeCount').value = stopIdx(COUNT_STOPS, z.countMult, 4);
    $('valZTypeCount').textContent = `${z.countMult}x`;

    const wm = state.waveMeter;
    $('slider10WaveToughness').value = stopIdx(TOUGH10_STOPS, wm.toughness10WaveMult, 0);
    $('val10WaveToughness').textContent = `${wm.toughness10WaveMult}x`;
    $('slider10WaveSpeed').value = stopIdx(SPEED10_STOPS, wm.speed10WaveMult, 0);
    $('val10WaveSpeed').textContent = `${wm.speed10WaveMult}x`;
    $('waveMeterDot').classList.toggle('hidden', Math.abs(wm.toughness10WaveMult - 1.0) <= 0.001 && Math.abs(wm.speed10WaveMult - 1.0) <= 0.001);
  }

  function setTab(tab) {
    activeTab = tab;
    $('tabGeneral').classList.toggle('active', tab === 'general');
    $('tabZombies').classList.toggle('active', tab === 'zombies');
    $('tabWaveMeter').classList.toggle('active', tab === 'wavemeter');
    $('panelGeneral').classList.toggle('hidden', tab !== 'general');
    $('panelZombies').classList.toggle('hidden', tab !== 'zombies');
    $('panelWaveMeter').classList.toggle('hidden', tab !== 'wavemeter');
  }

  async function init() {
    try {
      const res = await fetch('../tuning.json', { cache: 'no-store' });
      if (res.ok) {
        const loaded = await res.json();
        const def = makeDefaults();
        state = {
          version: loaded.version || def.version,
          general: { ...def.general, ...(loaded.general || {}) },
          waveMeter: { ...def.waveMeter, ...(loaded.waveMeter || {}) },
          zombies: { ...def.zombies }
        };
        for (const k of Object.keys(def.zombies)) {
          state.zombies[k] = { ...def.zombies[k], ...((loaded.zombies && loaded.zombies[k]) || {}) };
        }
      }
    } catch (_) {}
    syncUI();

    try {
      const statusRes = await fetch('/api/tuning-status', { cache: 'no-store' });
      if (statusRes.ok) {
        const st = await statusRes.json();
        $('metaAuth').textContent = st.authorized ? `Verified (${st.authVia})` : 'Locked / Setup Needed';
        if (st.hasAdminSecret && !st.authorized) {
          $('adminSecretWrap').classList.remove('hidden');
        }
        if (!st.hasGithubToken) {
          showBanner('Worker active, but GITHUB_TOKEN Secret is not set yet in Cloudflare Dashboard.', 'warn');
        }
      } else {
        $('metaAuth').textContent = 'Static Preview';
      }
    } catch (_) {
      $('metaAuth').textContent = 'Offline / Local';
    }
  }

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });
  $('zombiePicker').querySelectorAll('[data-ztype]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedZombie = btn.dataset.ztype;
      syncUI();
    });
  });

  $('sliderTowerStrength').addEventListener('input', (e) => { state.general.towerStrengthMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderZombieHp').addEventListener('input', (e) => { state.general.zombieHpMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderZombieScrap').addEventListener('input', (e) => { state.general.zombieScrapMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderZombieSpeed').addEventListener('input', (e) => { state.general.zombieSpeedMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderBreachCount').addEventListener('input', (e) => { state.general.breachCountMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderStructRatio').addEventListener('input', (e) => { state.general.safeZonesPerStructure = RATIO_STOPS[+e.target.value]; syncUI(); });

  $('sliderZTypeHp').addEventListener('input', (e) => { state.zombies[selectedZombie].hpMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderZTypeSpeed').addEventListener('input', (e) => { state.zombies[selectedZombie].speedMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderZTypeDmg').addEventListener('input', (e) => { state.zombies[selectedZombie].dmgMult = DEV_STOPS[+e.target.value]; syncUI(); });
  $('sliderZTypeBounty').addEventListener('input', (e) => { state.zombies[selectedZombie].bounty = Math.max(1, Math.min(100, +e.target.value || 1)); syncUI(); });
  $('sliderZTypeCount').addEventListener('input', (e) => { state.zombies[selectedZombie].countMult = COUNT_STOPS[+e.target.value]; syncUI(); });

  $('slider10WaveToughness').addEventListener('input', (e) => { state.waveMeter.toughness10WaveMult = TOUGH10_STOPS[+e.target.value]; syncUI(); });
  $('slider10WaveSpeed').addEventListener('input', (e) => { state.waveMeter.speed10WaveMult = SPEED10_STOPS[+e.target.value]; syncUI(); });

  $('btnResetTab').addEventListener('click', () => {
    const def = makeDefaults();
    if (activeTab === 'general') state.general = def.general;
    else if (activeTab === 'zombies') state.zombies = def.zombies;
    else state.waveMeter = def.waveMeter;
    syncUI();
  });

  $('btnResetAll').addEventListener('click', () => {
    const ver = state.version;
    state = makeDefaults();
    state.version = ver;
    syncUI();
  });

  $('btnPublish').addEventListener('click', async () => {
    const btn = $('btnPublish');
    btn.disabled = true;
    showBanner('Committing tuning.json & bumping version on GitHub main...', 'warn');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const sec = $('adminSecretInput').value.trim();
      if (sec) headers['X-Admin-Secret'] = sec;
      const res = await fetch('/api/publish-tuning', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          note: $('commitNoteInput').value.trim(),
          tuning: state
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 403) $('adminSecretWrap').classList.remove('hidden');
        throw new Error((data && data.error) || `HTTP ${res.status}`);
      }
      state = data.tuning || state;
      state.version = data.newVersion;
      syncUI();
      showBanner(
        `Published <strong>${data.newVersion}</strong> (<a href="${data.commitUrl}" target="_blank" rel="noopener">commit ${data.commitSha}</a>). Cloudflare is redeploying the live game now!`,
        'ok',
        true
      );
    } catch (err) {
      showBanner(`Publish failed: ${err.message}`, 'err');
    } finally {
      btn.disabled = false;
    }
  });

  init();
})();
