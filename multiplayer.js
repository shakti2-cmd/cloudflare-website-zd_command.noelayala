/**
 * Zombie Defense Command - 4-Player Co-Op Multiplayer Manager (v0.25.0)
 * $0 Zero-Config WebRTC P2P Mesh (PeerJS) + Public Live Room Directory (ntfy.sh & BroadcastChannel)
 * Pure Vanilla JavaScript - 100% Static Client Deployment (Cloudflare Free Tier Safe)
 */
(function () {
  'use strict';

  const PLAYER_COLORS = ['#00E5FF', '#00E08A', '#FFD23F', '#B833FF']; // Cyan, Emerald, Amber, Violet
  const PLAYER_COLOR_NAMES = ['Cyan', 'Emerald', 'Amber', 'Violet'];
  const CALLSIGN_KEY = 'zdc_player_callsign';
  const ACTIVE_SESSION_KEY = 'zdc_mp_active_session';
  const DIRECTORY_TOPIC = 'zdc_coop_rooms_v23';
  const NTFY_HTTP_URL = `https://ntfy.sh/${DIRECTORY_TOPIC}`;
  const NTFY_POLL_URL = `https://ntfy.sh/${DIRECTORY_TOPIC}/json?poll=1&since=45s`;
  const NTFY_WS_URL = `wss://ntfy.sh/${DIRECTORY_TOPIC}/ws?since=45s`;
  const ROOM_TTL_MS = 32000;
  const HEARTBEAT_INTERVAL_MS = 3000;
  const HOST_TIMEOUT_MS = 9500;

  function sanitizeCallsign(name) {
    const cleaned = String(name || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 18);
    return cleaned;
  }

  function defaultCallsign() {
    return `Commander-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  class MultiplayerManager {
    constructor(callbacks = {}) {
      this.cb = {
        onRoomsUpdated: callbacks.onRoomsUpdated || (() => {}),
        onLobbyUpdated: callbacks.onLobbyUpdated || (() => {}),
        onCountdownTick: callbacks.onCountdownTick || (() => {}),
        onMatchStart: callbacks.onMatchStart || (() => {}),
        onStateSnapshot: callbacks.onStateSnapshot || (() => {}),
        onRemoteAction: callbacks.onRemoteAction || (() => {}),
        onPauseStateChanged: callbacks.onPauseStateChanged || (() => {}),
        onHostMigrated: callbacks.onHostMigrated || (() => {}),
        onPlayerAbandoned: callbacks.onPlayerAbandoned || (() => {}),
        onPlayerReconnected: callbacks.onPlayerReconnected || (() => {}),
        onHostDisconnected: callbacks.onHostDisconnected || (() => {}),
        onError: callbacks.onError || (() => {})
      };

      this.role = null; // null | 'host' | 'guest'
      this.peer = null;
      this.localId = null;
      this.baseRoomId = null;
      this.roomId = null;
      this.roomName = '';
      this.roomPassword = '';
      this.hasPassword = false;
      this.difficulty = 'normal';
      this.players = []; // { id, slot, callsign, color, isHost, ready }
      this.conns = new Map(); // peerId -> DataConnection (host only)
      this.hostConn = null; // guest only
      this.inMatch = false;
      this.isCountingDown = false;
      this.intentionalLeave = false;
      this.migrationGen = 0;
      this.nextHostId = null;
      this.disconnectedPlayers = [];
      this.pauseState = null;
      this.pendingReconnectConn = null;
      this.lastSnapshot = null;

      // Live directory state
      this.rooms = new Map(); // roomId -> { roomId, roomName, hostName, difficulty, hasPassword, playerCount, maxPlayers, status, ts, seenAt }
      this.migratedRooms = new Map(); // baseRoomId -> { newRoomId, migrationGen, ts }
      this.dirWs = null;
      this.dirBc = null;
      this.pruneTimer = null;
      this.announceTimer = null;
      this.countdownTimer = null;
      this.countdownLaunchTimer = null;
      this.heartbeatTimer = null;
      this.watchdogTimer = null;
      this.lastHostHeartbeat = 0;

      this.callsign = this.getSavedCallsign();
    }

    getSavedCallsign() {
      let saved = '';
      try {
        saved = window.localStorage ? (localStorage.getItem(CALLSIGN_KEY) || '') : '';
      } catch (_) {}
      saved = sanitizeCallsign(saved);
      if (!saved) {
        saved = defaultCallsign();
        this.saveCallsign(saved);
      }
      return saved;
    }

    saveCallsign(name) {
      const clean = sanitizeCallsign(name) || defaultCallsign();
      this.callsign = clean;
      try {
        if (window.localStorage) localStorage.setItem(CALLSIGN_KEY, clean);
      } catch (_) {}
      return clean;
    }

    saveActiveSession() {
      if (!this.roomId || !this.inMatch) return;
      try {
        if (!window.localStorage) return;
        const baseId = (this.baseRoomId || this.roomId).replace(/-m\d+$/, '');
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
          baseRoomId: baseId,
          roomId: this.roomId,
          roomName: this.roomName || this.roomId,
          password: this.roomPassword || '',
          difficulty: this.difficulty || 'normal',
          callsign: this.callsign || this.getSavedCallsign(),
          migrationGen: this.migrationGen || 0,
          ts: Date.now()
        }));
      } catch (_) {}
    }

    getSavedSession() {
      try {
        if (!window.localStorage) return null;
        const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.roomId || !data.callsign) return null;
        if (Date.now() - (Number(data.ts) || 0) > 2 * 60 * 60 * 1000) {
          this.clearActiveSession();
          return null;
        }
        return data;
      } catch (_) {
        return null;
      }
    }

    clearActiveSession() {
      try {
        if (window.localStorage) localStorage.removeItem(ACTIVE_SESSION_KEY);
      } catch (_) {}
    }

    pickNextHostId() {
      const guests = this.players.filter((p) => !p.isHost);
      if (guests.length === 0) {
        this.nextHostId = null;
        return null;
      }
      if (this.nextHostId && guests.some((g) => g.id === this.nextHostId)) {
        return this.nextHostId;
      }
      const chosen = guests[Math.floor(Math.random() * guests.length)];
      this.nextHostId = chosen.id;
      return this.nextHostId;
    }

    getLobbyState() {
      return {
        roomId: this.roomId,
        roomName: this.roomName,
        hasPassword: this.hasPassword || !!this.roomPassword,
        difficulty: this.difficulty,
        localId: this.localId,
        isHost: this.role === 'host',
        inMatch: this.inMatch,
        players: this.players.map((p) => ({ ...p }))
      };
    }

    getInviteText() {
      const base = (window.location.origin && window.location.origin !== 'null')
        ? `${window.location.origin}${window.location.pathname}`
        : window.location.href.split('?')[0];
      const url = `${base}?room=${encodeURIComponent(this.roomId || '')}`;
      const diffLabel = (this.difficulty || 'normal').toUpperCase();
      const passLine = this.roomPassword
        ? `Password: ${this.roomPassword}`
        : 'Password: Open (None)';
      return [
        `Zombie Defense Command Co-Op`,
        `Room: ${this.roomName || this.roomId}`,
        `Threat: ${diffLabel}`,
        passLine,
        `Room Code: ${this.roomId}`,
        `Join Link: ${url}`
      ].join('\n');
    }

    // --- LIVE DIRECTORY (ntfy.sh + BroadcastChannel) ---
    handleDirectoryPayload(raw) {
      if (!raw || typeof raw !== 'string') return;
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        return;
      }
      if (!data) return;
      if (data.event && data.event !== 'message') return;
      if (typeof data.message === 'string') {
        try {
          data = JSON.parse(data.message);
        } catch (_) {
          return;
        }
      }
      if (!data) return;
      if (data.type === 'room_migrated' && data.baseRoomId && data.newRoomId) {
        const prev = this.migratedRooms.get(data.baseRoomId);
        const gen = Number(data.migrationGen) || 0;
        if (!prev || gen >= prev.migrationGen) {
          this.migratedRooms.set(data.baseRoomId, {
            newRoomId: String(data.newRoomId),
            migrationGen: gen,
            ts: Number(data.ts) || Date.now()
          });
        }
        return;
      }
      if (data.type !== 'room_announce' || !data.roomId) return;

      if (data.status !== 'waiting') {
        this.rooms.delete(data.roomId);
      } else {
        this.rooms.set(data.roomId, {
          roomId: String(data.roomId),
          roomName: String(data.roomName || 'Unnamed Room').slice(0, 28),
          hostName: String(data.hostName || 'Commander').slice(0, 18),
          difficulty: String(data.difficulty || 'normal'),
          hasPassword: !!data.hasPassword,
          playerCount: Math.max(1, Math.min(4, Number(data.playerCount) || 1)),
          maxPlayers: 4,
          status: 'waiting',
          ts: Number(data.ts) || Date.now(),
          seenAt: Date.now()
        });
      }
      this.emitRooms();
    }

    pruneExpiredRooms() {
      const now = Date.now();
      let changed = false;
      for (const [id, info] of this.rooms.entries()) {
        if (now - info.seenAt > ROOM_TTL_MS || info.status !== 'waiting') {
          this.rooms.delete(id);
          changed = true;
        }
      }
      if (changed) this.emitRooms();
    }

    emitRooms() {
      const list = Array.from(this.rooms.values())
        .filter((r) => r.status === 'waiting')
        .sort((a, b) => b.ts - a.ts);
      this.cb.onRoomsUpdated(list);
    }

    async refreshRooms() {
      this.pruneExpiredRooms();
      try {
        const res = await fetch(NTFY_POLL_URL, { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        if (!text) return;
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) this.handleDirectoryPayload(trimmed);
        }
      } catch (_) {}
      this.emitRooms();
    }

    startDirectoryWatch() {
      if (!this.dirBc && typeof BroadcastChannel !== 'undefined') {
        try {
          this.dirBc = new BroadcastChannel(DIRECTORY_TOPIC);
          this.dirBc.onmessage = (e) => {
            if (typeof e.data === 'string') this.handleDirectoryPayload(e.data);
          };
        } catch (_) {}
      }

      if (!this.dirWs && typeof WebSocket !== 'undefined') {
        try {
          this.dirWs = new WebSocket(NTFY_WS_URL);
          this.dirWs.onmessage = (e) => {
            if (typeof e.data === 'string') this.handleDirectoryPayload(e.data);
          };
          this.dirWs.onerror = () => {};
          this.dirWs.onclose = () => {
            this.dirWs = null;
          };
        } catch (_) {}
      }

      if (!this.pruneTimer) {
        this.pruneTimer = setInterval(() => this.pruneExpiredRooms(), 5000);
      }

      this.refreshRooms();
    }

    stopDirectoryWatch() {
      if (this.dirWs) {
        try {
          this.dirWs.close();
        } catch (_) {}
        this.dirWs = null;
      }
      if (this.dirBc) {
        try {
          this.dirBc.close();
        } catch (_) {}
        this.dirBc = null;
      }
      if (this.pruneTimer) {
        clearInterval(this.pruneTimer);
        this.pruneTimer = null;
      }
    }

    publishRoom(status = 'waiting') {
      if (this.role !== 'host' || !this.roomId) return;
      const payload = JSON.stringify({
        type: 'room_announce',
        roomId: this.roomId,
        roomName: this.roomName,
        hostName: this.callsign,
        difficulty: this.difficulty,
        hasPassword: !!this.roomPassword,
        playerCount: Math.max(1, this.players.length),
        maxPlayers: 4,
        status,
        ts: Date.now()
      });

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = this.dirBc || new BroadcastChannel(DIRECTORY_TOPIC);
          bc.postMessage(payload);
          if (!this.dirBc) setTimeout(() => { try { bc.close(); } catch (_) {} }, 150);
        } catch (_) {}
      }

      // Local cache update as well
      if (status === 'waiting') {
        this.handleDirectoryPayload(payload);
      } else {
        this.rooms.delete(this.roomId);
      }

      try {
        fetch(NTFY_HTTP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload,
          keepalive: status !== 'waiting'
        }).catch(() => {});
      } catch (_) {}
    }

    publishMigratedRoom() {
      if (this.role !== 'host' || !this.roomId) return;
      const baseId = (this.baseRoomId || this.roomId).replace(/-m\d+$/, '');
      const payload = JSON.stringify({
        type: 'room_migrated',
        baseRoomId: baseId,
        newRoomId: this.roomId,
        migrationGen: this.migrationGen || 0,
        roomName: this.roomName,
        hostName: this.callsign,
        ts: Date.now()
      });
      this.migratedRooms.set(baseId, {
        newRoomId: this.roomId,
        migrationGen: this.migrationGen || 0,
        ts: Date.now()
      });
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = this.dirBc || new BroadcastChannel(DIRECTORY_TOPIC);
          bc.postMessage(payload);
          if (!this.dirBc) setTimeout(() => { try { bc.close(); } catch (_) {} }, 150);
        } catch (_) {}
      }
      try {
        fetch(NTFY_HTTP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload
        }).catch(() => {});
      } catch (_) {}
    }

    // --- PEER LIFECYCLE HELPERS ---
    clearTimers() {
      if (this.announceTimer) {
        clearInterval(this.announceTimer);
        this.announceTimer = null;
      }
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      if (this.watchdogTimer) {
        clearInterval(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      if (this.countdownLaunchTimer) {
        clearTimeout(this.countdownLaunchTimer);
        this.countdownLaunchTimer = null;
      }
      this.isCountingDown = false;
    }

    destroyPeerResources() {
      this.clearTimers();
      for (const conn of this.conns.values()) {
        try { conn.close(); } catch (_) {}
      }
      this.conns.clear();
      if (this.hostConn) {
        try { this.hostConn.close(); } catch (_) {}
        this.hostConn = null;
      }
      if (this.peer) {
        try { this.peer.destroy(); } catch (_) {}
        this.peer = null;
      }
    }

    // --- HOST FLOW ---
    createRoom({ roomName, password = '', difficulty = 'normal', callsign } = {}) {
      if (typeof Peer === 'undefined') {
        this.cb.onError('Multiplayer requires an internet connection (PeerJS library unavailable).');
        return false;
      }
      const cleanRoom = String(roomName || '').trim().slice(0, 28);
      if (!cleanRoom) {
        this.cb.onError('Please enter a Room Name.');
        return false;
      }

      this.leaveRoom(true);
      this.saveCallsign(callsign || this.callsign);

      this.intentionalLeave = false;
      this.role = 'host';
      this.roomId = `zdc-${Math.random().toString(36).slice(2, 10)}`;
      this.baseRoomId = this.roomId;
      this.migrationGen = 0;
      this.disconnectedPlayers = [];
      this.pauseState = null;
      this.pendingReconnectConn = null;
      this.lastSnapshot = null;
      this.roomName = cleanRoom;
      this.roomPassword = String(password || '').trim().slice(0, 20);
      this.hasPassword = !!this.roomPassword;
      this.difficulty = ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal';
      this.inMatch = false;
      this.players = [];

      let peer;
      try {
        peer = new Peer(this.roomId);
      } catch (err) {
        this.role = null;
        this.cb.onError(`Failed to initialize P2P host: ${err && err.message ? err.message : 'Unknown error'}`);
        return false;
      }
      this.peer = peer;

      peer.on('open', (id) => {
        if (this.peer !== peer) return;
        this.localId = id;
        this.players = [{
          id,
          slot: 0,
          callsign: this.callsign,
          color: PLAYER_COLORS[0],
          colorName: PLAYER_COLOR_NAMES[0],
          isHost: true,
          ready: false
        }];
        this.publishRoom('waiting');
        this.announceTimer = setInterval(() => {
          if (this.role === 'host' && !this.inMatch) {
            this.publishRoom('waiting');
          }
        }, 12000);
        this.heartbeatTimer = setInterval(() => {
          if (this.role !== 'host') return;
          this.broadcastRaw({ type: 'hb', ts: Date.now() });
        }, HEARTBEAT_INTERVAL_MS);
        this.cb.onLobbyUpdated(this.getLobbyState());
      });

      peer.on('connection', (conn) => {
        if (this.role !== 'host') {
          try { conn.close(); } catch (_) {}
          return;
        }
        conn.on('data', (msg) => this.handleHostIncomingData(conn, msg));
        conn.on('close', () => this.handleGuestDisconnected(conn.peer));
        conn.on('error', () => this.handleGuestDisconnected(conn.peer));
      });

      peer.on('error', (err) => {
        if (this.peer !== peer || this.intentionalLeave) return;
        const msg = err && err.message ? err.message : 'Peer connection error.';
        this.cb.onError(`Host error: ${msg}`);
      });

      return true;
    }

    handleHostIncomingData(conn, msg) {
      if (this.role !== 'host' || !msg || typeof msg !== 'object') return;

      if (msg.type === 'join_req') {
        const pw = String(msg.password || '');
        if (this.inMatch) {
          try { conn.send({ type: 'join_err', reason: 'Match is already in progress.' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }
        if (this.players.length >= 4) {
          try { conn.send({ type: 'join_err', reason: 'Room is full (4/4 players).' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }
        if (this.roomPassword && pw !== this.roomPassword) {
          try { conn.send({ type: 'join_err', reason: 'Incorrect room password.' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }

        // Remove any stale duplicate id
        this.players = this.players.filter((p) => p.id !== conn.peer);
        const usedSlots = new Set(this.players.map((p) => p.slot));
        let slot = 0;
        while (usedSlots.has(slot) && slot < 4) slot++;
        if (slot >= 4) {
          try { conn.send({ type: 'join_err', reason: 'No open player slots.' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }

        const guestCallsign = sanitizeCallsign(msg.callsign) || defaultCallsign();
        this.conns.set(conn.peer, conn);
        this.players.push({
          id: conn.peer,
          slot,
          callsign: guestCallsign,
          color: PLAYER_COLORS[slot] || PLAYER_COLORS[0],
          colorName: PLAYER_COLOR_NAMES[slot] || 'Cyan',
          isHost: false,
          ready: false
        });
        this.players.sort((a, b) => a.slot - b.slot);

        try {
          conn.send({
            type: 'join_ok',
            localId: conn.peer,
            lobby: this.getLobbyState()
          });
        } catch (_) {}

        this.broadcastLobbyUpdate();
        this.publishRoom('waiting');
        return;
      }

      if (msg.type === 'ready_toggle') {
        const p = this.players.find((pl) => pl.id === conn.peer || (msg && pl.id === msg.playerId));
        if (!p || this.inMatch || this.isCountingDown) return;
        p.ready = !p.ready;
        this.broadcastLobbyUpdate();
        return;
      }

      if (msg.type === 'action') {
        if (!this.inMatch || this.pauseState || !msg.action) return;
        this.cb.onRemoteAction(conn.peer, msg.action);
        return;
      }

      if (msg.type === 'pause_ready_toggle') {
        if (!this.inMatch || !this.pauseState) return;
        const actorId = this.players.some((pl) => pl.id === conn.peer) ? conn.peer : msg.playerId;
        if (actorId) this.applyPauseReadyToggle(actorId);
        return;
      }

      if (msg.type === 'migration_rejoin') {
        if (!this.inMatch) return;
        const pw = String(msg.password || '');
        if (this.roomPassword && pw !== this.roomPassword) {
          try { conn.send({ type: 'join_err', reason: 'Incorrect room password.' }); } catch (_) {}
          return;
        }
        const callsignLow = sanitizeCallsign(msg.callsign).toLowerCase();
        const player = this.players.find((p) => p.id === msg.oldId || (callsignLow && p.callsign.toLowerCase() === callsignLow));
        if (!player) {
          try { conn.send({ type: 'join_err', reason: 'Commander not found in migrated session.' }); } catch (_) {}
          return;
        }
        const oldId = player.id;
        this.conns.delete(oldId);
        player.id = conn.peer;
        this.conns.set(conn.peer, conn);
        const snap = this.cb.onPlayerReconnected({ oldId, newId: conn.peer, player: { ...player } }) || this.lastSnapshot;
        try {
          conn.send({
            type: 'migration_ok',
            localId: conn.peer,
            roomId: this.roomId,
            baseRoomId: this.baseRoomId,
            migrationGen: this.migrationGen,
            players: this.players.map((p) => ({ ...p })),
            disconnectedPlayers: this.disconnectedPlayers.map((d) => ({ ...d })),
            pauseState: this.pauseState,
            snap
          });
        } catch (_) {}
        this.broadcastPauseState();
        return;
      }

      if (msg.type === 'reconnect_req') {
        if (!this.inMatch) {
          try { conn.send({ type: 'reconnect_err', reason: 'Match has not started or already ended.' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }
        const pw = String(msg.password || '');
        if (this.roomPassword && pw !== this.roomPassword) {
          try { conn.send({ type: 'reconnect_err', reason: 'Incorrect room password.' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }
        const reqName = sanitizeCallsign(msg.callsign);
        const matched = this.disconnectedPlayers.find(
          (d) => d.callsign.trim().toLowerCase() === reqName.toLowerCase()
        );
        if (!matched) {
          try {
            conn.send({
              type: 'reconnect_err',
              reason: `Commander callsign "${reqName}" does not match any disconnected player.`
            });
          } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }
        if (this.pendingReconnectConn && this.pendingReconnectConn.conn && this.pendingReconnectConn.conn !== conn) {
          try { this.pendingReconnectConn.conn.close(); } catch (_) {}
        }
        this.pendingReconnectConn = { conn, peerId: conn.peer, matchedPlayer: { ...matched } };
        this.pauseState = {
          active: true,
          reason: 'reconnect_approval',
          disconnectedCallsign: matched.callsign,
          readyIds: [],
          pendingReconnect: {
            callsign: matched.callsign,
            slot: matched.slot,
            color: matched.color,
            peerId: conn.peer
          }
        };
        try {
          conn.send({
            type: 'reconnect_waiting',
            roomName: this.roomName,
            roomId: this.roomId
          });
        } catch (_) {}
        this.broadcastPauseState();
      }
    }

    handleGuestDisconnected(peerId) {
      if (this.role !== 'host') return;
      if (this.pendingReconnectConn && this.pendingReconnectConn.peerId === peerId) {
        this.pendingReconnectConn = null;
        if (this.pauseState && this.pauseState.reason === 'reconnect_approval') {
          this.pauseState.pendingReconnect = null;
          this.pauseState.reason = 'disconnect';
          this.pauseState.readyIds = [];
          this.broadcastPauseState();
        }
        return;
      }
      this.conns.delete(peerId);
      const dropped = this.players.find((p) => p.id === peerId);
      const before = this.players.length;
      this.players = this.players.filter((p) => p.id !== peerId);
      if (this.players.length !== before) {
        if (!this.inMatch) {
          if (this.isCountingDown && this.players.length < 2) {
            this.cancelCountdown(true);
          }
          this.broadcastLobbyUpdate();
          this.publishRoom('waiting');
        } else if (dropped) {
          if (!this.disconnectedPlayers.some((d) => d.callsign.toLowerCase() === dropped.callsign.toLowerCase())) {
            this.disconnectedPlayers.push({ ...dropped });
          }
          this.pauseState = {
            active: true,
            reason: 'disconnect',
            disconnectedCallsign: dropped.callsign,
            readyIds: [],
            pendingReconnect: null
          };
          this.broadcastPauseState();
        }
      }
    }

    broadcastRaw(obj) {
      for (const [peerId, conn] of this.conns.entries()) {
        if (conn && conn.open) {
          try {
            conn.send(obj);
          } catch (_) {}
        } else if (conn && conn._closed) {
          this.conns.delete(peerId);
        }
      }
    }

    broadcastLobbyUpdate() {
      const lobby = this.getLobbyState();
      this.broadcastRaw({ type: 'lobby_update', lobby });
      this.cb.onLobbyUpdated(lobby);
    }

    cancelCountdown(notify = true) {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      if (this.countdownLaunchTimer) {
        clearTimeout(this.countdownLaunchTimer);
        this.countdownLaunchTimer = null;
      }
      const wasCounting = this.isCountingDown;
      this.isCountingDown = false;
      if (notify && wasCounting) {
        if (this.role === 'host') {
          this.broadcastRaw({ type: 'match_countdown_cancel' });
        }
        this.cb.onCountdownTick(null);
      }
    }

    hostStartMatch() {
      if (this.role !== 'host' || this.inMatch || this.isCountingDown) return false;
      if (this.players.length < 2) {
        this.cb.onError('At least 2 players are required to start a Multiplayer match.');
        return false;
      }
      if (!this.players.every((p) => p.ready)) {
        this.cb.onError('All connected players must be Ready before starting.');
        return false;
      }

      this.isCountingDown = true;
      let sec = 5;
      this.broadcastRaw({ type: 'match_countdown', seconds: sec });
      this.cb.onCountdownTick(sec);

      this.countdownTimer = setInterval(() => {
        if (this.role !== 'host' || this.inMatch || !this.isCountingDown) {
          this.cancelCountdown(false);
          return;
        }
        sec -= 1;
        if (sec > 0) {
          this.broadcastRaw({ type: 'match_countdown', seconds: sec });
          this.cb.onCountdownTick(sec);
        } else {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          this.broadcastRaw({ type: 'match_countdown', seconds: 0 });
          this.cb.onCountdownTick(0);
          this.countdownLaunchTimer = setTimeout(() => {
            this.countdownLaunchTimer = null;
            this.launchMatchNow();
          }, 350);
        }
      }, 1000);
      return true;
    }

    launchMatchNow() {
      if (this.role !== 'host' || this.inMatch) return false;
      if (this.players.length < 2) {
        this.cancelCountdown(true);
        this.cb.onError('At least 2 players are required to start a Multiplayer match.');
        return false;
      }
      this.isCountingDown = false;
      this.inMatch = true;
      this.disconnectedPlayers = [];
      this.pauseState = null;
      this.pendingReconnectConn = null;
      this.publishRoom('playing');
      this.saveActiveSession();
      const config = {
        roomId: this.roomId,
        baseRoomId: this.baseRoomId || this.roomId,
        roomName: this.roomName,
        difficulty: this.difficulty,
        players: this.players.map((p) => ({ ...p })),
        seed: Date.now()
      };
      this.broadcastRaw({ type: 'match_start', config });
      this.cb.onCountdownTick(null);
      this.cb.onMatchStart(config);
      return true;
    }

    broadcastPauseState() {
      if (this.role !== 'host') return;
      const payload = {
        type: 'pause_state',
        pauseState: this.pauseState,
        players: this.players.map((p) => ({ ...p })),
        disconnectedPlayers: this.disconnectedPlayers.map((d) => ({ ...d })),
        nextHostId: this.pickNextHostId(),
        migrationGen: this.migrationGen
      };
      this.broadcastRaw(payload);
      this.cb.onPauseStateChanged(payload);
    }

    applyPauseReadyToggle(actorId) {
      if (this.role !== 'host' || !this.pauseState) return;
      if (!this.players.some((p) => p.id === actorId)) return;
      const set = new Set(this.pauseState.readyIds || []);
      if (set.has(actorId)) set.delete(actorId);
      else set.add(actorId);
      this.pauseState.readyIds = Array.from(set);

      const allReady = this.players.length > 0 && this.players.every((p) => set.has(p.id));
      if (!allReady) {
        this.broadcastPauseState();
        return;
      }

      // Case A: All active players approved an incoming reconnecting commander
      if (this.pauseState.pendingReconnect && this.pendingReconnectConn) {
        const { conn, peerId, matchedPlayer } = this.pendingReconnectConn;
        if (conn && conn.open) {
          const oldId = matchedPlayer.id;
          const restored = { ...matchedPlayer, id: peerId, isHost: false, ready: true };
          this.disconnectedPlayers = this.disconnectedPlayers.filter(
            (d) => d.callsign.toLowerCase() !== matchedPlayer.callsign.toLowerCase()
          );
          this.players.push(restored);
          this.players.sort((a, b) => a.slot - b.slot);
          this.conns.set(peerId, conn);
          const snap = this.cb.onPlayerReconnected({ oldId, newId: peerId, player: { ...restored } }) || this.lastSnapshot;
          this.pauseState = null;
          this.pendingReconnectConn = null;
          try {
            conn.send({
              type: 'reconnect_ok',
              localId: peerId,
              roomId: this.roomId,
              baseRoomId: this.baseRoomId || this.roomId,
              roomName: this.roomName,
              difficulty: this.difficulty,
              migrationGen: this.migrationGen,
              players: this.players.map((p) => ({ ...p })),
              snap
            });
          } catch (_) {}
          this.broadcastPauseState();
          return;
        }
        // Pending reconnect connection dropped right before approval
        this.pendingReconnectConn = null;
        this.pauseState.pendingReconnect = null;
      }

      // Case B: Resuming without disconnected player(s) -> abandon & transfer assets
      if (this.disconnectedPlayers.length > 0) {
        const abandoned = [...this.disconnectedPlayers];
        this.disconnectedPlayers = [];
        this.cb.onPlayerAbandoned(abandoned, this.players.map((p) => ({ ...p })));
      }
      this.pauseState = null;
      this.pendingReconnectConn = null;
      this.broadcastPauseState();
    }

    // --- GUEST FLOW ---
    joinRoom({ roomId, password = '', callsign } = {}) {
      if (typeof Peer === 'undefined') {
        this.cb.onError('Multiplayer requires an internet connection (PeerJS library unavailable).');
        return false;
      }
      const targetId = String(roomId || '').trim();
      if (!targetId) {
        this.cb.onError('Please select a room or enter a valid Room Code.');
        return false;
      }

      this.leaveRoom(true);
      this.saveCallsign(callsign || this.callsign);

      this.intentionalLeave = false;
      this.role = 'guest';
      this.roomId = targetId;
      this.baseRoomId = targetId.replace(/-m\d+$/, '');
      this.roomPassword = String(password || '');
      this.inMatch = false;
      this.disconnectedPlayers = [];
      this.pauseState = null;
      this.migrationGen = 0;
      this.nextHostId = null;
      this.lastSnapshot = null;
      this.players = [];

      let peer;
      try {
        peer = new Peer();
      } catch (err) {
        this.role = null;
        this.cb.onError(`Failed to initialize P2P client: ${err && err.message ? err.message : 'Unknown error'}`);
        return false;
      }
      this.peer = peer;

      let joinResolved = false;
      const connectTimeout = setTimeout(() => {
        if (!joinResolved && this.role === 'guest' && !this.intentionalLeave) {
          this.leaveRoom(true);
          this.cb.onError('Connection timed out — room may no longer exist.');
        }
      }, 10000);

      peer.on('open', (id) => {
        if (this.peer !== peer) return;
        this.localId = id;
        const conn = peer.connect(targetId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          if (this.hostConn !== conn) return;
          this.lastHostHeartbeat = Date.now();
          try {
            conn.send({
              type: 'join_req',
              callsign: this.callsign,
              password: this.roomPassword
            });
          } catch (_) {}

          this.watchdogTimer = setInterval(() => {
            if (this.role !== 'guest' || this.intentionalLeave) return;
            if (Date.now() - this.lastHostHeartbeat > HOST_TIMEOUT_MS) {
              this.triggerHostDisconnect('Host disconnected — room closed.');
            }
          }, 2000);
        });

        conn.on('data', (msg) => {
          if (!msg || typeof msg !== 'object') return;
          this.lastHostHeartbeat = Date.now();

          if (msg.type === 'join_ok') {
            joinResolved = true;
            clearTimeout(connectTimeout);
            this.localId = msg.localId || this.localId;
            if (msg.lobby) {
              this.applyLobbyStateFromHost(msg.lobby);
            }
            return;
          }

          if (msg.type === 'join_err') {
            joinResolved = true;
            clearTimeout(connectTimeout);
            const reason = msg.reason || 'Unable to join room.';
            this.leaveRoom(true);
            this.cb.onError(reason);
            return;
          }

          if (msg.type === 'lobby_update' && msg.lobby) {
            this.applyLobbyStateFromHost(msg.lobby);
            return;
          }

          if (msg.type === 'match_countdown') {
            this.isCountingDown = true;
            this.cb.onCountdownTick(msg.seconds);
            return;
          }

          if (msg.type === 'match_countdown_cancel') {
            this.isCountingDown = false;
            this.cb.onCountdownTick(null);
            return;
          }

          if (msg.type === 'match_start' && msg.config) {
            this.isCountingDown = false;
            this.cb.onCountdownTick(null);
            this.inMatch = true;
            this.baseRoomId = msg.config.baseRoomId || this.baseRoomId || this.roomId;
            this.players = (msg.config.players || []).map((p) => ({ ...p }));
            this.difficulty = msg.config.difficulty || this.difficulty;
            this.roomName = msg.config.roomName || this.roomName;
            this.saveActiveSession();
            this.cb.onMatchStart(msg.config);
            return;
          }

          if (msg.type === 'pause_state') {
            this.pauseState = msg.pauseState || null;
            if (Array.isArray(msg.players)) this.players = msg.players.map((p) => ({ ...p }));
            if (Array.isArray(msg.disconnectedPlayers)) {
              this.disconnectedPlayers = msg.disconnectedPlayers.map((d) => ({ ...d }));
            }
            if (msg.nextHostId) this.nextHostId = msg.nextHostId;
            if (msg.migrationGen !== undefined) this.migrationGen = msg.migrationGen;
            this.cb.onPauseStateChanged(msg);
            return;
          }

          if (msg.type === 'state' && msg.snap) {
            this.lastSnapshot = msg.snap;
            if (msg.snap.nextHostId) this.nextHostId = msg.snap.nextHostId;
            if (msg.snap.migrationGen !== undefined) this.migrationGen = msg.snap.migrationGen;
            this.cb.onStateSnapshot(msg.snap);
          }
        });

        conn.on('close', () => {
          clearTimeout(connectTimeout);
          if (!joinResolved) {
            this.leaveRoom(true);
            this.cb.onError('Could not connect to Host (room closed or unreachable).');
          } else {
            this.triggerHostDisconnect('Host disconnected — room closed.');
          }
        });

        conn.on('error', () => {
          clearTimeout(connectTimeout);
          if (!joinResolved) {
            this.leaveRoom(true);
            this.cb.onError('Failed to connect to Host peer.');
          } else {
            this.triggerHostDisconnect('Host disconnected — room closed.');
          }
        });
      });

      peer.on('error', (err) => {
        clearTimeout(connectTimeout);
        if (this.peer !== peer || this.intentionalLeave) return;
        const reason = (err && err.type === 'peer-unavailable')
          ? 'Host room unavailable or already closed.'
          : (err && err.message ? err.message : 'Peer connection failed.');
        if (!joinResolved) {
          this.leaveRoom(true);
          this.cb.onError(reason);
        } else {
          this.triggerHostDisconnect('Host disconnected — room closed.');
        }
      });

      return true;
    }

    applyLobbyStateFromHost(lobby) {
      this.roomId = lobby.roomId || this.roomId;
      this.roomName = lobby.roomName || this.roomName;
      this.hasPassword = !!lobby.hasPassword;
      this.difficulty = lobby.difficulty || this.difficulty;
      this.inMatch = !!lobby.inMatch;
      this.players = (lobby.players || []).map((p) => ({ ...p }));
      this.cb.onLobbyUpdated(this.getLobbyState());
    }

    triggerHostDisconnect(reason = 'Host disconnected — room closed.') {
      if (this.intentionalLeave || this.role !== 'guest') return;
      const wasInMatch = this.inMatch;
      if (!wasInMatch) {
        this.intentionalLeave = true;
        this.destroyPeerResources();
        this.role = null;
        this.inMatch = false;
        this.players = [];
        this.cb.onError(reason);
        return;
      }

      // Attempt automatic Host migration mid-match
      const oldHost = this.players.find((p) => p.isHost);
      const remaining = this.players.filter((p) => !p.isHost);
      if (remaining.length === 0) {
        this.intentionalLeave = true;
        this.destroyPeerResources();
        this.role = null;
        this.inMatch = false;
        this.players = [];
        this.cb.onHostDisconnected(reason);
        return;
      }

      const electedId = (this.nextHostId && remaining.some((p) => p.id === this.nextHostId))
        ? this.nextHostId
        : remaining[0].id;
      const nextGen = (this.migrationGen || 0) + 1;
      const baseId = (this.baseRoomId || this.roomId).replace(/-m\d+$/, '');
      const newRoomId = `${baseId}-m${nextGen}`;
      const oldLocalId = this.localId;

      this.destroyPeerResources();

      if (oldHost && !this.disconnectedPlayers.some((d) => d.callsign.toLowerCase() === oldHost.callsign.toLowerCase())) {
        this.disconnectedPlayers.push({ ...oldHost, isHost: false });
      }
      this.players = remaining.map((p) => ({ ...p, isHost: p.id === electedId }));
      this.migrationGen = nextGen;
      this.baseRoomId = baseId;
      this.roomId = newRoomId;

      if (electedId === oldLocalId) {
        this.promoteSelfToMigratedHost(oldLocalId, oldHost, newRoomId);
      } else {
        this.connectGuestToMigratedHost(newRoomId, oldLocalId, oldHost);
      }
    }

    promoteSelfToMigratedHost(oldLocalId, oldHost, newRoomId) {
      this.role = 'host';
      this.inMatch = true;
      this.intentionalLeave = false;
      this.localId = newRoomId;
      this.players = this.players.map((p) =>
        p.id === oldLocalId ? { ...p, id: newRoomId, isHost: true } : p
      );

      let peer;
      try {
        peer = new Peer(newRoomId);
      } catch (err) {
        this.cb.onHostDisconnected('Failed to promote new Host peer.');
        return;
      }
      this.peer = peer;

      peer.on('open', () => {
        if (this.peer !== peer) return;
        this.saveActiveSession();
        this.publishMigratedRoom();
        this.announceTimer = setInterval(() => {
          if (this.role === 'host' && this.inMatch) {
            this.publishMigratedRoom();
          }
        }, 5000);
        this.heartbeatTimer = setInterval(() => {
          if (this.role !== 'host') return;
          this.broadcastRaw({ type: 'hb', ts: Date.now() });
        }, HEARTBEAT_INTERVAL_MS);

        this.pauseState = {
          active: true,
          reason: 'host_migration',
          disconnectedCallsign: oldHost ? oldHost.callsign : 'Host',
          readyIds: [],
          pendingReconnect: null
        };
        this.cb.onHostMigrated({
          promoted: true,
          oldLocalId,
          newLocalId: newRoomId,
          oldHostId: oldHost ? oldHost.id : null,
          pauseState: this.pauseState,
          players: this.players.map((p) => ({ ...p }))
        });
        this.broadcastPauseState();
      });

      peer.on('connection', (conn) => {
        if (this.role !== 'host') {
          try { conn.close(); } catch (_) {}
          return;
        }
        conn.on('data', (msg) => this.handleHostIncomingData(conn, msg));
        conn.on('close', () => this.handleGuestDisconnected(conn.peer));
        conn.on('error', () => this.handleGuestDisconnected(conn.peer));
      });

      peer.on('error', () => {
        if (this.peer !== peer || this.intentionalLeave) return;
        this.cb.onHostDisconnected('Host migration failed.');
      });
    }

    connectGuestToMigratedHost(newRoomId, oldLocalId, oldHost) {
      this.role = 'guest';
      this.inMatch = true;
      this.intentionalLeave = false;
      this.pauseState = {
        active: true,
        reason: 'host_migration',
        disconnectedCallsign: oldHost ? oldHost.callsign : 'Host',
        readyIds: [],
        pendingReconnect: null
      };
      this.cb.onPauseStateChanged({
        pauseState: this.pauseState,
        players: this.players.map((p) => ({ ...p })),
        disconnectedPlayers: this.disconnectedPlayers.map((d) => ({ ...d }))
      });

      let attempt = 0;
      const tryConnect = () => {
        if (this.intentionalLeave || this.role !== 'guest') return;
        attempt++;
        let peer;
        try {
          peer = new Peer();
        } catch (err) {
          this.cb.onHostDisconnected('Failed to reconnect during Host migration.');
          return;
        }
        this.peer = peer;
        let resolved = false;
        const retryOrFail = () => {
          if (resolved || this.intentionalLeave) return;
          this.destroyPeerResources();
          if (attempt < 4) {
            setTimeout(tryConnect, 1500);
          } else {
            this.role = null;
            this.inMatch = false;
            this.cb.onHostDisconnected('Could not reach migrated Host — room closed.');
          }
        };

        const connTimeout = setTimeout(retryOrFail, 4500);

        peer.on('open', (id) => {
          if (this.peer !== peer) return;
          this.localId = id;
          const conn = peer.connect(newRoomId, { reliable: true });
          this.hostConn = conn;

          conn.on('open', () => {
            if (this.hostConn !== conn) return;
            this.lastHostHeartbeat = Date.now();
            try {
              conn.send({
                type: 'migration_rejoin',
                callsign: this.callsign,
                oldId: oldLocalId,
                password: this.roomPassword
              });
            } catch (_) {}
            this.watchdogTimer = setInterval(() => {
              if (this.role !== 'guest' || this.intentionalLeave) return;
              if (Date.now() - this.lastHostHeartbeat > HOST_TIMEOUT_MS) {
                this.triggerHostDisconnect('Host disconnected — room closed.');
              }
            }, 2000);
          });

          conn.on('data', (msg) => {
            if (!msg || typeof msg !== 'object') return;
            this.lastHostHeartbeat = Date.now();
            if (msg.type === 'migration_ok') {
              resolved = true;
              clearTimeout(connTimeout);
              this.localId = msg.localId || this.localId;
              this.roomId = msg.roomId || newRoomId;
              this.migrationGen = msg.migrationGen || this.migrationGen;
              this.players = (msg.players || []).map((p) => ({ ...p }));
              this.disconnectedPlayers = (msg.disconnectedPlayers || []).map((d) => ({ ...d }));
              this.pauseState = msg.pauseState || this.pauseState;
              this.saveActiveSession();
              this.cb.onHostMigrated({
                promoted: false,
                oldLocalId,
                newLocalId: this.localId,
                pauseState: this.pauseState,
                players: this.players
              });
              this.cb.onPauseStateChanged({
                pauseState: this.pauseState,
                players: this.players,
                disconnectedPlayers: this.disconnectedPlayers
              });
              if (msg.snap) this.cb.onStateSnapshot(msg.snap);
              return;
            }
            if (msg.type === 'pause_state') {
              this.pauseState = msg.pauseState || null;
              if (Array.isArray(msg.players)) this.players = msg.players.map((p) => ({ ...p }));
              if (Array.isArray(msg.disconnectedPlayers)) {
                this.disconnectedPlayers = msg.disconnectedPlayers.map((d) => ({ ...d }));
              }
              this.cb.onPauseStateChanged(msg);
              return;
            }
            if (msg.type === 'state' && msg.snap) {
              this.lastSnapshot = msg.snap;
              if (msg.snap.nextHostId) this.nextHostId = msg.snap.nextHostId;
              if (msg.snap.migrationGen !== undefined) this.migrationGen = msg.snap.migrationGen;
              this.cb.onStateSnapshot(msg.snap);
            }
          });

          conn.on('close', () => {
            clearTimeout(connTimeout);
            if (!resolved) retryOrFail();
            else this.triggerHostDisconnect('Host disconnected — room closed.');
          });
          conn.on('error', () => {
            clearTimeout(connTimeout);
            if (!resolved) retryOrFail();
            else this.triggerHostDisconnect('Host disconnected — room closed.');
          });
        });

        peer.on('error', () => {
          clearTimeout(connTimeout);
          if (!resolved) retryOrFail();
        });
      };

      setTimeout(tryConnect, 1100);
    }

    reconnectToSavedMatch(callsignOverride) {
      if (typeof Peer === 'undefined') {
        this.cb.onError('Multiplayer requires an internet connection (PeerJS library unavailable).');
        return false;
      }
      const session = this.getSavedSession();
      if (!session) {
        this.cb.onError('No active saved match session found.');
        return false;
      }
      const cleanCallsign = sanitizeCallsign(callsignOverride || session.callsign || this.callsign);
      this.saveCallsign(cleanCallsign);

      const migrated = session.baseRoomId ? this.migratedRooms.get(session.baseRoomId) : null;
      const targetId = (migrated && migrated.migrationGen >= (session.migrationGen || 0))
        ? migrated.newRoomId
        : session.roomId;

      this.leaveRoom(true);
      this.intentionalLeave = false;
      this.role = 'guest';
      this.roomId = targetId;
      this.baseRoomId = session.baseRoomId || targetId.replace(/-m\d+$/, '');
      this.roomName = session.roomName || targetId;
      this.roomPassword = session.password || '';
      this.difficulty = session.difficulty || 'normal';
      this.inMatch = false;

      let peer;
      try {
        peer = new Peer();
      } catch (err) {
        this.role = null;
        this.cb.onError('Failed to initialize PeerJS for reconnect.');
        return false;
      }
      this.peer = peer;

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved && this.role === 'guest' && !this.intentionalLeave) {
          this.leaveRoom(true);
          this.cb.onError('Reconnect timed out — host may no longer be online.');
        }
      }, 15000);

      peer.on('open', (id) => {
        if (this.peer !== peer) return;
        this.localId = id;
        const conn = peer.connect(targetId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          if (this.hostConn !== conn) return;
          this.lastHostHeartbeat = Date.now();
          try {
            conn.send({
              type: 'reconnect_req',
              callsign: cleanCallsign,
              password: this.roomPassword
            });
          } catch (_) {}
          this.watchdogTimer = setInterval(() => {
            if (this.role !== 'guest' || this.intentionalLeave) return;
            if (Date.now() - this.lastHostHeartbeat > HOST_TIMEOUT_MS) {
              this.triggerHostDisconnect('Host disconnected — room closed.');
            }
          }, 2000);
        });

        conn.on('data', (msg) => {
          if (!msg || typeof msg !== 'object') return;
          this.lastHostHeartbeat = Date.now();
          if (msg.type === 'reconnect_waiting') {
            clearTimeout(timeout);
            resolved = true;
            this.cb.onPauseStateChanged({
              pauseState: {
                active: true,
                reason: 'reconnect_pending_guest',
                disconnectedCallsign: cleanCallsign,
                readyIds: [],
                pendingReconnect: { callsign: cleanCallsign }
              },
              players: this.players,
              disconnectedPlayers: []
            });
            return;
          }
          if (msg.type === 'reconnect_err') {
            clearTimeout(timeout);
            resolved = true;
            const reason = msg.reason || 'Reconnect rejected by Host.';
            this.leaveRoom(true);
            this.cb.onError(reason);
            return;
          }
          if (msg.type === 'reconnect_ok') {
            clearTimeout(timeout);
            resolved = true;
            this.localId = msg.localId || this.localId;
            this.roomId = msg.roomId || this.roomId;
            this.baseRoomId = msg.baseRoomId || this.baseRoomId;
            this.roomName = msg.roomName || this.roomName;
            this.difficulty = msg.difficulty || this.difficulty;
            this.migrationGen = msg.migrationGen || 0;
            this.players = (msg.players || []).map((p) => ({ ...p }));
            this.inMatch = true;
            this.pauseState = null;
            this.saveActiveSession();
            this.cb.onMatchStart({
              roomId: this.roomId,
              baseRoomId: this.baseRoomId,
              roomName: this.roomName,
              difficulty: this.difficulty,
              players: this.players,
              isReconnect: true
            });
            if (msg.snap) this.cb.onStateSnapshot(msg.snap);
            return;
          }
          if (msg.type === 'pause_state') {
            this.pauseState = msg.pauseState || null;
            if (Array.isArray(msg.players)) this.players = msg.players.map((p) => ({ ...p }));
            if (Array.isArray(msg.disconnectedPlayers)) {
              this.disconnectedPlayers = msg.disconnectedPlayers.map((d) => ({ ...d }));
            }
            this.cb.onPauseStateChanged(msg);
            return;
          }
          if (msg.type === 'state' && msg.snap) {
            this.lastSnapshot = msg.snap;
            if (msg.snap.nextHostId) this.nextHostId = msg.snap.nextHostId;
            if (msg.snap.migrationGen !== undefined) this.migrationGen = msg.snap.migrationGen;
            this.cb.onStateSnapshot(msg.snap);
          }
        });

        conn.on('close', () => {
          clearTimeout(timeout);
          if (!resolved) {
            this.leaveRoom(true);
            this.cb.onError('Could not connect to active match host.');
          } else {
            this.triggerHostDisconnect('Host disconnected — room closed.');
          }
        });
        conn.on('error', () => {
          clearTimeout(timeout);
          if (!resolved) {
            this.leaveRoom(true);
            this.cb.onError('Reconnect connection failed.');
          }
        });
      });

      peer.on('error', () => {
        clearTimeout(timeout);
        if (!resolved) {
          this.leaveRoom(true);
          this.cb.onError('Active match host unreachable.');
        }
      });

      return true;
    }

    // --- SHARED ACTIONS ---
    toggleReady() {
      if (this.inMatch || this.isCountingDown) return;
      if (this.role === 'host') {
        const me = this.players.find((p) => p.id === this.localId);
        if (!me) return;
        me.ready = !me.ready;
        this.broadcastLobbyUpdate();
      } else if (this.role === 'guest' && this.hostConn && this.hostConn.open) {
        try {
          this.hostConn.send({ type: 'ready_toggle', playerId: this.localId });
        } catch (_) {}
      }
    }

    togglePauseReady() {
      if (!this.inMatch || !this.pauseState) return;
      if (this.role === 'host') {
        this.applyPauseReadyToggle(this.localId);
      } else if (this.role === 'guest' && this.hostConn && this.hostConn.open) {
        try {
          this.hostConn.send({ type: 'pause_ready_toggle', playerId: this.localId });
        } catch (_) {}
      }
    }

    broadcastState(snap) {
      if (this.role !== 'host' || !this.inMatch) return;
      if (snap && typeof snap === 'object') {
        snap.nextHostId = this.pickNextHostId();
        snap.migrationGen = this.migrationGen || 0;
        this.lastSnapshot = snap;
      }
      this.broadcastRaw({ type: 'state', snap });
    }

    sendAction(action) {
      if (this.role !== 'guest' || !this.hostConn || !this.hostConn.open || this.pauseState) return false;
      try {
        this.hostConn.send({ type: 'action', action });
        return true;
      } catch (_) {
        return false;
      }
    }

    leaveRoom(silent = false) {
      this.intentionalLeave = true;
      if (this.role === 'host' && this.roomId) {
        this.publishRoom('closed');
      }
      if (!silent) {
        this.clearActiveSession();
      }
      this.destroyPeerResources();
      this.role = null;
      this.localId = null;
      this.baseRoomId = null;
      this.roomId = null;
      this.roomName = '';
      this.roomPassword = '';
      this.hasPassword = false;
      this.inMatch = false;
      this.disconnectedPlayers = [];
      this.pauseState = null;
      this.pendingReconnectConn = null;
      this.nextHostId = null;
      this.migrationGen = 0;
      this.lastSnapshot = null;
      this.players = [];
      if (!silent) {
        this.cb.onLobbyUpdated(null);
      }
    }
  }

  MultiplayerManager.PLAYER_COLORS = PLAYER_COLORS;
  MultiplayerManager.PLAYER_COLOR_NAMES = PLAYER_COLOR_NAMES;
  window.MultiplayerManager = MultiplayerManager;
})();
