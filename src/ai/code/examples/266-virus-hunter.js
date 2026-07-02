// 266-virus-hunter.js
// ウイルスハンター — 体内を漂うウイルス（トゲ付き赤）だけをタップ、丸い白血球は撃ってはいけない
// 操作: ウイルスをタップ（白血球は避ける）
// 成功: 3体退治  失敗: 白血球を3回撃つ or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、体内マクロ） ──
  var C = { bg:'#04020a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VIRUS HUNTER';
  var HOW_TO_PLAY = 'TAP SPIKY VIRUSES · SPARE ROUND CELLS';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 30 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var entities, killed, mistakes, timeLeft, done, particles, spawnTimer, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a1a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawEntity(e) {
    if (e.isVirus) {
      pc(e.x, e.y, e.r, e.flash > 0 ? C.g : C.a, 0.9);
      for (var si = 0; si < e.spikes; si++) { var a = si / e.spikes * Math.PI * 2 + e.wobble * 0.3; game.draw.rect(snap(e.x + Math.cos(a) * (e.r + 12)) - 5, snap(e.y + Math.sin(a) * (e.r + 12)) - 5, 10, 10, C.f, 0.9); }
    } else { pc(e.x, e.y, e.r, e.flash > 0 ? C.f : C.g, 0.9); pc(e.x - 8, e.y - 8, e.r * 0.3, C.e, 0.6); }
  }

  function spawnEntity() {
    var isVirus = Math.random() < 0.6, y = Math.random() < 0.5 ? TOP - 40 : H + 40;
    entities.push({ x: snap(game.random(80, W - 80)), y: y, vx: game.random(-60, 60), vy: y < TOP ? (50 + Math.random() * 50) : -(50 + Math.random() * 50), r: isVirus ? 32 : 38, isVirus: isVirus, wobble: Math.random() * Math.PI * 2, spikes: 6, flash: 0 });
  }

  function initGame() { entities = []; killed = 0; mistakes = 0; timeLeft = MAX_TIME; done = false; particles = []; spawnTimer = 0.3; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 400 + Math.ceil(timeLeft) * 60) : killed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = entities.length - 1; i >= 0; i--) {
      var e = entities[i]; if ((x - e.x) * (x - e.x) + (y - e.y) * (y - e.y) < (e.r + 12) * (e.r + 12)) {
        if (e.isVirus) { killed++; fbText = 'ELIMINATED!'; fbCol = C.b; fbTimer = 0.4; game.audio.play('se_success', 0.5); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); } entities.splice(i, 1); if (killed >= NEEDED) { finish(true); return; } }
        else { mistakes++; fbText = 'HIT A CELL!'; fbCol = C.f; fbTimer = 0.5; e.flash = 0.4; game.audio.play('se_failure', 0.5); if (mistakes >= MAX_MISS) { finish(false); return; } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawEntity({ x: W * 0.35, y: H * 0.45, r: 32, isVirus: true, wobble: game.time.elapsed * 2, spikes: 6, flash: 0 }); drawEntity({ x: W * 0.65, y: H * 0.5, r: 38, isVirus: false, flash: 0 });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#664455');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IMMUNE!' : 'INFECTED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      spawnTimer -= dt; if (spawnTimer <= 0 && entities.length < 10) { spawnEntity(); spawnTimer = 0.5 * (0.6 + Math.random() * 0.7); }
      for (var i = entities.length - 1; i >= 0; i--) { var e = entities[i]; e.wobble += dt * 2; if (e.flash > 0) e.flash -= dt; e.x += (e.vx + Math.cos(e.wobble) * 20) * dt; e.y += e.vy * dt; if (e.x < -100 || e.x > W + 100 || e.y < TOP - 100 || e.y > H + 100) entities.splice(i, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < entities.length; i2++) drawEntity(entities[i2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.a, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.86, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(killed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < mistakes ? C.f : '#1a0a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
