// 291-disco-lights.js
// ディスコライツ — 点滅するフロアライトの順番を覚え、タップで同じ順に再現するメモリーゲーム
// 操作: 光った順を覚えて、その順にライトをタップ
// 成功: 3ラウンドクリア  失敗: 3回間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ダンスフロア） ──
  var C = { bg:'#040106', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LIGHTS = [C.a, C.e, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DISCO LIGHTS';
  var HOW_TO_PLAY = 'WATCH THE ORDER · TAP IT BACK';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_ERR  = 3;
  var COLN = 2, LW = snap(W * 0.38), GAP = snap(W * 0.06);
  var OX = snap(W / 2 - (COLN * LW + GAP) / 2), OY = snap(H * 0.30);
  var SHOW_ON = 0.4, SHOW_GAP = 0.25;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, playerSeq, round, phase, showIdx, showTimer, litIdx, completed, errors, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100818');
  }

  function background() { game.draw.clear(C.bg); }

  function lightRect(idx) { var c = idx % COLN, r = Math.floor(idx / COLN); return { x: OX + c * (LW + GAP), y: OY + r * (LW + GAP) }; }

  function nextRound() { round++; sequence.push(Math.floor(Math.random() * 4)); playerSeq = []; phase = 'SHOW'; showIdx = 0; showTimer = 0.4; litIdx = -1; }

  function initGame() { sequence = []; playerSeq = []; round = 0; completed = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 500 + Math.ceil(timeLeft) * 80) : completed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLights() {
    for (var li = 0; li < 4; li++) {
      var p = lightRect(li), lit = litIdx === li;
      game.draw.rect(p.x, p.y, LW, LW, lit ? LIGHTS[li] : '#161028', lit ? 0.95 : 0.8);
      game.draw.rect(p.x, p.y, LW, 10, lit ? C.g : '#241a3a', 0.4);
      if (lit) game.draw.rect(p.x + 8, p.y + 8, LW - 16, LW - 16, C.g, 0.15);
      // 入力済みマーク
      var cnt = 0; for (var pi = 0; pi < playerSeq.length; pi++) if (playerSeq[pi] === li) cnt++;
      if (cnt > 0) txt(cnt + '', p.x + LW / 2, p.y + LW / 2 + 16, 52, lit ? '#000' : LIGHTS[li]);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'INPUT') return;
    for (var li = 0; li < 4; li++) {
      var p = lightRect(li);
      if (x >= p.x && x <= p.x + LW && y >= p.y && y <= p.y + LW) {
        litIdx = li; showTimer = 0.2; playerSeq.push(li); game.audio.play('se_tap', 0.3);
        if (li !== sequence[playerSeq.length - 1]) {
          errors++; game.audio.play('se_failure', 0.5);
          if (errors >= MAX_ERR) { finish(false); return; }
          playerSeq = []; phase = 'SHOW'; showIdx = 0; showTimer = 0.6; litIdx = -1; return;
        }
        if (playerSeq.length === sequence.length) {
          completed++; game.audio.play('se_success', 0.6);
          var pp = lightRect(li);
          for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: pp.x + LW / 2, y: pp.y + LW / 2, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: LIGHTS[li] }); }
          if (completed >= NEEDED) { finish(true); return; }
          phase = 'WAIT'; showTimer = 0.7;
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); litIdx = Math.floor(game.time.elapsed * 3) % 4; drawLights(); litIdx = -1;
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT!' : 'MISSED IT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (showTimer > 0) showTimer -= dt;
      if (phase === 'SHOW' && showTimer <= 0) {
        if (litIdx === -1 && showIdx < sequence.length) { litIdx = sequence[showIdx]; showTimer = SHOW_ON; game.audio.play('se_tap', 0.15); }
        else if (litIdx !== -1) { litIdx = -1; showIdx++; showTimer = SHOW_GAP; if (showIdx >= sequence.length) phase = 'INPUT'; }
      } else if (phase === 'INPUT' && showTimer <= 0 && litIdx !== -1) { litIdx = -1; }
      else if (phase === 'WAIT' && showTimer <= 0) { litIdx = -1; nextRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawLights();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);
    txt(phase === 'INPUT' ? 'YOUR TURN!' : 'WATCH...', W / 2, snap(H * 0.24), 44, phase === 'INPUT' ? C.c : '#665577');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('ROUND ' + completed + ' / ' + NEEDED, W / 2, 168, 46, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#100818');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
