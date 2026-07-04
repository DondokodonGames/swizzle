// 696-thermostat.js
// サーモスタット — 上下に揺れる温度を目標ゾーン内に保ち続ける
// 操作: タップで加熱（温度上昇）。放っておくと自然に冷える。緑ゾーンをキープ
// 成功: 累計8秒 ゾーン内で過ごす  失敗: 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、温度計） ──
  var C = { bg:'#080310', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'THERMOSTAT';
  var HOW_TO_PLAY = 'TAP TO HEAT · IT COOLS ON ITS OWN · KEEP THE TEMP IN THE GREEN ZONE';
  var MAX_TIME = 22;
  var NEEDED_TIME = 8;       // 修正2: 15 → 8
  var THERMO_X = W / 2, THERMO_TOP = snap(H * 0.14), THERMO_BOT = snap(H * 0.82), THERMO_H = THERMO_BOT - THERMO_TOP, BAR_W = 88;
  var MIN_TEMP = 0, MAX_TEMP = 100, TARGET_LO = 40, TARGET_HI = 65;
  var COOL_RATE = 12, HEAT_RATE = 28, DRIFT_AMP = 8, DRIFT_FREQ = 0.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var temp, pressing, inZoneTime, timeLeft, done, elapsed, flash, particles, driftPhase;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a0514');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { temp = 50; pressing = false; inZoneTime = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; particles = []; driftPhase = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(inZoneTime * 300) + Math.ceil(timeLeft) * 100) : Math.floor(inZoneTime * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(THERMO_X - BAR_W / 2, THERMO_TOP, BAR_W, THERMO_H, '#1e293b', 0.9);
    var zoneBotY = THERMO_BOT - (TARGET_LO / MAX_TEMP) * THERMO_H, zoneTopY = THERMO_BOT - (TARGET_HI / MAX_TEMP) * THERMO_H;
    game.draw.rect(THERMO_X - BAR_W / 2, zoneTopY, BAR_W, zoneBotY - zoneTopY, C.b, 0.18);
    game.draw.line(THERMO_X - BAR_W / 2 - 20, zoneTopY, THERMO_X + BAR_W / 2 + 20, zoneTopY, C.b, 3);
    game.draw.line(THERMO_X - BAR_W / 2 - 20, zoneBotY, THERMO_X + BAR_W / 2 + 20, zoneBotY, C.b, 3);
    var inZone = temp >= TARGET_LO && temp <= TARGET_HI;
    var fillH = (temp / MAX_TEMP) * THERMO_H, fillY = THERMO_BOT - fillH, fillCol = temp < TARGET_LO ? C.e : (temp <= TARGET_HI ? C.b : C.a);
    game.draw.rect(THERMO_X - BAR_W / 2, fillY, BAR_W, fillH, fillCol, 0.85);
    if (inZone) game.draw.rect(THERMO_X - BAR_W / 2 - 10, fillY - 10, BAR_W + 20, 20, C.g, 0.25);
    for (var mk = 0; mk <= 10; mk++) { var my = THERMO_BOT - (mk / 10) * THERMO_H, mw = mk % 5 === 0 ? 30 : 16; game.draw.line(THERMO_X - BAR_W / 2 - mw, my, THERMO_X - BAR_W / 2, my, '#ffffff22', 2); }
    var tempY = THERMO_BOT - (temp / MAX_TEMP) * THERMO_H;
    txt(Math.round(temp) + '', THERMO_X + BAR_W / 2 + 70, tempY + 12, 48, fillCol);
    txt('ZONE', THERMO_X - BAR_W / 2 - 130, snap((zoneTopY + zoneBotY) / 2) + 10, 32, C.b);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    pressing = true; game.audio.play('se_tap', 0.06);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (temp === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.07, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.105, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT BALANCE!' : 'OUT OF RANGE', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(inZoneTime >= NEEDED_TIME); return; }
      if (flash > 0) flash -= dt * 3;
      if (pressing) { temp += HEAT_RATE * dt; pressing = false; }
      driftPhase += dt;
      temp += Math.sin(driftPhase * DRIFT_FREQ * Math.PI * 2) * DRIFT_AMP * dt;
      temp += (30 - temp) * COOL_RATE * dt * 0.035;
      if (temp < MIN_TEMP) temp = MIN_TEMP; if (temp > MAX_TEMP) temp = MAX_TEMP;
      var inZone = temp >= TARGET_LO && temp <= TARGET_HI;
      if (inZone) {
        inZoneTime += dt;
        if (Math.random() < dt * 3) particles.push({ x: THERMO_X + (Math.random() - 0.5) * 120, y: THERMO_BOT - (temp / MAX_TEMP) * THERMO_H, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 80, life: 0.7, col: C.b });
        if (inZoneTime >= NEEDED_TIME) { finish(true); return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.06);

    // Progress ring
    var progRatio = Math.min(1, inZoneTime / NEEDED_TIME), rcx = W / 2, rcy = snap(H * 0.72), progR = 100;
    for (var seg = 0; seg < 24; seg++) { if (seg / 24 > progRatio) break; var a1 = -Math.PI / 2 + seg * Math.PI * 2 / 24, a2 = -Math.PI / 2 + (seg + 1) * Math.PI * 2 / 24; pc(rcx + Math.cos((a1 + a2) / 2) * progR, rcy + Math.sin((a1 + a2) / 2) * progR, 11, C.b, 0.85); }
    txt(Math.floor(inZoneTime) + 's', rcx, rcy + 14, 52, C.b);
    txt('/ ' + NEEDED_TIME + 's', rcx, rcy + 72, 36, '#ffffff44');
    txt('TAP TO HEAT!', W / 2, snap(H * 0.90), 40, '#ffffff55');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
