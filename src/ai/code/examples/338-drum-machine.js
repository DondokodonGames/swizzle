// 338-drum-machine.js
// ドラムマシン — 中央から4つのパッドへ流れるノートが到達した瞬間に、その方向をタップして叩く
// 操作: ノートがパッドに来たら上下左右の該当ゾーンをタップ
// 成功: 8ヒット  失敗: 3ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムマシン） ──
  var C = { bg:'#080410', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DRUM MACHINE';
  var HOW_TO_PLAY = 'TAP THE ZONE WHEN A NOTE HITS ITS PAD';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 40 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = snap(W / 2), CY = snap(H * 0.52), BEAT = 0.6, PATTERN = ['up', 'down', 'left', 'right', 'up', 'up', 'down', 'right'];
  var SYM = { up: '^', down: 'v', left: '<', right: '>' };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pads, notes, beatTimer, patIdx, hits, misses, combo, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(CX - 1, CY - 320, 2, 640, C.d, 0.3); game.draw.rect(CX - 320, CY - 1, 640, 2, C.d, 0.3); }

  function padByZone(z) { for (var i = 0; i < pads.length; i++) if (pads[i].zone === z) return pads[i]; return null; }

  function getZone(x, y) { var dx = x - CX, dy = y - CY; if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'; return dy > 0 ? 'down' : 'up'; }

  function initGame() {
    pads = [{ zone: 'up', x: CX, y: CY - 280, lit: 0, col: C.e }, { zone: 'down', x: CX, y: CY + 280, lit: 0, col: C.b }, { zone: 'left', x: CX - 280, y: CY, lit: 0, col: C.c }, { zone: 'right', x: CX + 280, y: CY, lit: 0, col: C.a }];
    notes = []; beatTimer = 0.5; patIdx = 0; hits = 0; misses = 0; combo = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 400 + combo * 60 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPad(p) { var lit = p.lit > 0; ring(p.x, p.y, 100, lit ? p.col : C.d, lit ? 0.9 : 0.5); pc(p.x, p.y, 80, lit ? p.col : '#161028', lit ? 0.9 : 0.6); txt(SYM[p.zone], p.x, p.y + 22, 64, lit ? '#000' : p.col); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var zone = getZone(x, y), pad = padByZone(zone); if (pad) pad.lit = 0.4;
    var best = -1, bd = 999; for (var ni = 0; ni < notes.length; ni++) if (notes[ni].zone === zone && !notes[ni].hit) { var d = Math.abs(notes[ni].progress - 1.0); if (d < bd) { bd = d; best = ni; } }
    if (best >= 0 && bd < 0.25) {
      notes[best].hit = true; hits++; combo++; fbText = bd < 0.1 ? 'PERFECT!' : 'GREAT!'; fbCol = bd < 0.1 ? C.c : C.b; fbTimer = 0.4; game.audio.play('se_tap', 0.5);
      for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: pad.x, y: pad.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: pad.col }); }
      if (hits >= NEEDED) { finish(true); return; }
    } else { misses++; combo = 0; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pads) initGame(); background(); for (var i = 0; i < pads.length; i++) drawPad(pads[i]);
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON BEAT!' : 'OFF RHYTHM', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      beatTimer -= dt; if (beatTimer <= 0) { notes.push({ zone: PATTERN[patIdx % PATTERN.length], progress: 0, hit: false }); patIdx++; beatTimer = BEAT * (Math.random() < 0.3 ? 0.6 : 1); }
      var spd = 1.0 / (BEAT * 3);
      for (var ni = notes.length - 1; ni >= 0; ni--) { var n = notes[ni]; n.progress += spd * dt; if (n.progress > 1.3 && !n.hit) { misses++; combo = 0; game.audio.play('se_failure', 0.2); notes.splice(ni, 1); if (misses >= MAX_MISS) { finish(false); return; } } else if (n.progress > 1.5) notes.splice(ni, 1); }
      for (var pi = 0; pi < pads.length; pi++) if (pads[pi].lit > 0) pads[pi].lit -= dt * 4;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi3 = 0; pi3 < pads.length; pi3++) drawPad(pads[pi3]);
    for (var ni2 = 0; ni2 < notes.length; ni2++) { var n2 = notes[ni2]; if (n2.hit) continue; var pad2 = padByZone(n2.zone), t = Math.min(1, n2.progress), nx = CX + (pad2.x - CX) * t, ny = CY + (pad2.y - CY) * t, at = t > 0.85; pc(nx, ny, at ? 26 : 18, at ? pad2.col : C.g, at ? 0.9 : 0.7); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, CX, CY + 6, 52, fbCol);
    else if (combo > 2) txt(combo + ' COMBO', CX, CY + 6, 40, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
