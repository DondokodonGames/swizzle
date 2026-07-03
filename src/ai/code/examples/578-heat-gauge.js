// 578-heat-gauge.js
// ヒートゲージ — タップで温度を上げ、放置で下がる。針を緑のゾーン内に一定時間キープする
// 操作: タップで加熱（連打で上昇、放置で自然冷却）ゲージを目標ゾーンに保つ
// 成功: ゾーン内 累計8秒 キープ  失敗: 18秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、溶鉱炉） ──
  var C = { bg:'#0a0404', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HEAT GAUGE';
  var HOW_TO_PLAY = 'TAP TO HEAT · IT COOLS ON ITS OWN · HOLD THE NEEDLE IN THE ZONE';
  var MAX_TIME = 18;
  var NEEDED_TIME = 8;       // 修正2: 30 → 8
  var GX = W / 2 - 44, GY = snap(H * 0.16), GW = 88, GH = snap(H * 0.52), ZMIN = 0.45, ZMAX = 0.70;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var temp, inZoneTime, timeLeft, done, particles, tapFlash, lastTap;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0000');
  }

  function tcol(t) { return t < 0.3 ? C.e : t < 0.5 ? C.b : t < 0.7 ? C.c : C.f; }

  function background() { game.draw.clear(C.bg); }

  function initGame() { temp = 0.2; inZoneTime = 0; timeLeft = MAX_TIME; done = false; particles = []; tapFlash = 0; lastTap = -10; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(inZoneTime) * 500 + Math.ceil(timeLeft) * 100) : Math.round(inZoneTime) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(GX - 4, GY - 4, GW + 8, GH + 8, '#330000', 0.9); game.draw.rect(GX, GY, GW, GH, '#1a0000', 0.95);
    var zy1 = GY + GH * (1 - ZMAX), zh = GH * (ZMAX - ZMIN), inZone = temp >= ZMIN && temp <= ZMAX;
    game.draw.rect(GX, zy1, GW, zh, C.b, 0.12 + (inZone ? Math.sin(game.time.elapsed * 4) * 0.05 : 0));
    game.draw.rect(GX - 10, zy1 - 2, GW + 20, 4, C.b, 0.9); game.draw.rect(GX - 10, zy1 + zh - 2, GW + 20, 4, C.b, 0.9);
    txt('ZONE', GX + GW + 60, zy1 + zh / 2 + 12, 28, C.b);
    var fillH = GH * temp, fillY = GY + GH - fillH, tc = tcol(temp);
    for (var gi = 0; gi < 8; gi++) { var gT = temp * (gi / 8), gH = fillH / 8, gY = fillY + fillH - (gi + 1) * gH; game.draw.rect(GX + 4, gY, GW - 8, gH + 2, tcol(gT), 0.85); }
    if (fillH > 10) game.draw.rect(GX + 4, fillY, GW - 8, 12, tc, 0.7 + Math.sin(game.time.elapsed * 8) * 0.2);
    txt(Math.round(temp * 100) + '°', GX - 90, fillY + 16, 44, tc);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    temp = Math.min(1, temp + 0.08); tapFlash = 0.15; lastTap = game.time.elapsed; game.audio.play('se_tap', 0.3);
    var fy = GY + GH * (1 - temp); for (var pi = 0; pi < 2; pi++) particles.push({ x: GX + GW / 2 + (Math.random() - 0.5) * 30, y: fy + 20, vx: (Math.random() - 0.5) * 80, vy: -80 - Math.random() * 80, life: 0.4, col: temp > 0.7 ? C.f : C.c });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (temp === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.13, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT HEAT!' : 'BURNED / FROZE', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(inZoneTime >= NEEDED_TIME); return; }
      if (tapFlash > 0) tapFlash -= dt * 5;
      var since = game.time.elapsed - lastTap; temp = Math.max(0, temp - 0.12 * dt * (1 + since * 0.3));
      if (temp >= ZMIN && temp <= ZMAX) { inZoneTime += dt; if (inZoneTime >= NEEDED_TIME) { finish(true); return; } }
      if (Math.random() < temp * 0.3) particles.push({ x: GX + Math.random() * GW, y: GY + GH * (1 - temp), vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60, life: 0.4, col: tcol(temp) });
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.4);
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, tcol(temp), tapFlash * 0.08);

    var inZone = temp >= ZMIN && temp <= ZMAX;
    txt(inZone ? 'PERFECT!' : (temp < ZMIN ? 'TOO COLD' : 'TOO HOT'), W / 2, snap(H * 0.76), 40, inZone ? C.b : tcol(temp));
    var pw = W * 0.6, px = (W - pw) / 2, py = snap(H * 0.82);
    game.draw.rect(px, py, pw, 28, '#374151', 0.4); game.draw.rect(px, py, pw * (inZoneTime / NEEDED_TIME), 28, C.b, 0.9);
    txt(Math.round(inZoneTime) + ' / ' + NEEDED_TIME + 's', W / 2, py + 62, 44, C.g);
    txt('TAP TO HEAT', W / 2, snap(H * 0.92), 40, C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
