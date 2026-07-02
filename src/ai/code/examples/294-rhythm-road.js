// 294-rhythm-road.js
// リズムロード — ビートで降ってくるコインと障害物を、スワイプでレーン変更して捌く走行ゲーム
// 操作: 左右スワイプでレーン変更（コインを取り、障害物を避ける）
// 成功: コインを6枚集める  失敗: 障害物に3回ぶつかる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイトドライブ） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', road:'#0c1424' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RHYTHM ROAD';
  var HOW_TO_PLAY = 'SWIPE TO CHANGE LANE · GRAB COINS · DODGE BLOCKS';
  var MAX_TIME = 20;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_HIT  = 3;
  var LANES = 3, LANE_W = snap(W / LANES);
  var CAR_W = 96, CAR_H = 140, CAR_Y = snap(H * 0.76), TOP = snap(H * 0.16);
  var BEAT = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, carX, targetX, objs, coins, hits, timeLeft, done, beatTimer, roadOff, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, TOP, W, H - TOP, C.road, 0.9);
    for (var li = 1; li < LANES; li++) for (var seg = -1; seg < Math.ceil(H / 96) + 1; seg++) game.draw.rect(li * LANE_W - 4, TOP + snap(seg * 96 + roadOff), 8, 56, C.d, 0.5);
    game.draw.rect(0, TOP, 8, H, C.e, 0.5); game.draw.rect(W - 8, TOP, 8, H, C.e, 0.5);
  }

  function laneX(l) { return snap(LANE_W * (l + 0.5)); }

  function spawnBeat() {
    var pat = Math.floor(Math.random() * 4);
    if (pat === 0) objs.push({ lane: Math.floor(Math.random() * LANES), y: TOP - 60, type: 'coin' });
    else if (pat === 1) { var l = Math.floor(Math.random() * LANES); objs.push({ lane: l, y: TOP - 60, type: 'coin' }); objs.push({ lane: (l + 1) % LANES, y: TOP - 60, type: 'coin' }); }
    else if (pat === 2) { var ol = Math.floor(Math.random() * LANES); objs.push({ lane: ol, y: TOP - 60, type: 'obs' }); for (var l2 = 0; l2 < LANES; l2++) if (l2 !== ol && Math.random() < 0.6) objs.push({ lane: l2, y: TOP - 60, type: 'coin' }); }
    else { var o1 = Math.floor(Math.random() * LANES); objs.push({ lane: o1, y: TOP - 60, type: 'obs' }); }
  }

  function initGame() { lane = 1; carX = laneX(1); targetX = carX; objs = []; coins = 0; hits = 0; timeLeft = MAX_TIME; done = false; beatTimer = 0; roadOff = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (coins * 300 + Math.ceil(timeLeft) * 80) : coins * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCar(cx) {
    game.draw.rect(cx - CAR_W / 2, CAR_Y - CAR_H / 2, CAR_W, CAR_H, C.b, 0.95);
    game.draw.rect(cx - CAR_W / 2, CAR_Y - CAR_H / 2, CAR_W, 14, C.g, 0.5);
    game.draw.rect(cx - CAR_W / 2 + 12, CAR_Y - CAR_H / 2 + 26, CAR_W - 24, 40, C.e, 0.6);
    game.draw.rect(cx - CAR_W / 2 - 8, CAR_Y - 44, 12, 40, '#111', 0.9); game.draw.rect(cx + CAR_W / 2 - 4, CAR_Y - 44, 12, 40, '#111', 0.9);
    game.draw.rect(cx - CAR_W / 2 - 8, CAR_Y + 8, 12, 40, '#111', 0.9); game.draw.rect(cx + CAR_W / 2 - 4, CAR_Y + 8, 12, 40, '#111', 0.9);
  }

  function drawObj(o) {
    var ox = laneX(o.lane), oy = snap(o.y);
    if (o.type === 'coin') { pc(ox, oy, 30, C.c, 0.95); pc(ox - 8, oy - 8, 8, C.g, 0.7); txt('$', ox, oy + 12, 34, '#000'); }
    else { game.draw.rect(ox - 44, oy - 44, 88, 88, C.a, 0.95); game.draw.rect(ox - 44, oy - 44, 88, 12, C.g, 0.4); txt('!', ox, oy + 16, 48, C.g); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left' && lane > 0) { lane--; targetX = laneX(lane); game.audio.play('se_tap', 0.25); }
    else if (d === 'right' && lane < LANES - 1) { lane++; targetX = laneX(lane); game.audio.play('se_tap', 0.25); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      roadOff = (roadOff + 300 * dt) % 96; background(); drawCar(laneX(1));
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.37, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CASH RUN!' : 'CRASHED', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var scroll = 340 + coins * 8;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      carX += (targetX - carX) * Math.min(1, 12 * dt);
      roadOff = (roadOff + scroll * dt) % 96;
      beatTimer += dt; if (beatTimer >= BEAT) { beatTimer -= BEAT; spawnBeat(); }
      for (var oi = objs.length - 1; oi >= 0; oi--) {
        var o = objs[oi]; o.y += scroll * dt;
        var ox = laneX(o.lane);
        if (o.y + 40 > CAR_Y - CAR_H / 2 && o.y - 40 < CAR_Y + CAR_H / 2 && Math.abs(ox - carX) < LANE_W * 0.5) {
          if (o.type === 'coin') { coins++; for (var pk = 0; pk < 6; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ox, y: o.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.c }); } game.audio.play('se_success', 0.35); objs.splice(oi, 1); if (coins >= NEEDED) { finish(true); return; } continue; }
          else { hits++; for (var pk2 = 0; pk2 < 8; pk2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: carX, y: CAR_Y, vx: Math.cos(a2) * 220, vy: Math.sin(a2) * 220, life: 0.5, col: C.a }); } game.audio.play('se_failure', 0.5); objs.splice(oi, 1); if (hits >= MAX_HIT) { finish(false); return; } continue; }
        }
        if (o.y > H + 60) objs.splice(oi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var oi2 = 0; oi2 < objs.length; oi2++) drawObj(objs[oi2]);
    drawCar(carX);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(coins + ' / ' + NEEDED, W / 2, 168, 48, C.c);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1424');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
