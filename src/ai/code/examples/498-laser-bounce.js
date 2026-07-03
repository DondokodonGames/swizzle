// 498-laser-bounce.js
// レーザーバウンス — 中央ミラーの角度をスワイプ/タップで変え、反射光をターゲットに当て続ける
// 操作: 上スワイプ/上タップでミラーを反時計、下で時計に回す。ビームを的に固定して破壊
// 成功: 4基 破壊  失敗: 25秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、光学兵器） ──
  var C = { bg:'#000810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER BOUNCE';
  var HOW_TO_PLAY = 'ROTATE THE MIRROR · HOLD THE BEAM ON THE TARGET';
  var MAX_TIME = 25;
  var NEEDED   = 4;          // 修正2: 12 → 4
  var MX = snap(W / 2), MY = snap(H * 0.55), MLEN = 240, SRCX = 80, SRCY = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrorAngle, targets, destroyed, timeLeft, done, particles, laserPath, hitTarget, hitTimer, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.a : '#000a18');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, 20, H, '#1e293b', 0.9); game.draw.rect(W - 20, 0, 20, H, '#1e293b', 0.9); }

  function spawnTarget() {
    var pos = [{ x: W * 0.75, y: H * 0.30 }, { x: W * 0.82, y: H * 0.48 }, { x: W * 0.70, y: H * 0.62 }, { x: W * 0.86, y: H * 0.72 }, { x: W * 0.62, y: H * 0.40 }][Math.floor(Math.random() * 5)];
    targets = [{ x: snap(pos.x), y: snap(pos.y), r: 50, hit: false, anim: 0 }];
  }

  function traceLaser() {
    laserPath = []; hitTarget = -1;
    var mcos = Math.cos(mirrorAngle), msin = Math.sin(mirrorAngle);
    var t1 = MX - SRCX; if (t1 <= 0) { laserPath = [[SRCX, SRCY, W, SRCY]]; return; }
    var hitX = SRCX + t1, hitY = SRCY, span = Math.abs(msin * MLEN / 2);
    if (hitY < MY - span - 20 || hitY > MY + span + 20) { laserPath = [[SRCX, SRCY, W + 10, SRCY]]; return; }
    laserPath.push([SRCX, SRCY, hitX, hitY]);
    var nx = -msin, ny = mcos, dot = nx, rx = 1 - 2 * dot * nx, ry = -2 * dot * ny;
    var cx = hitX, cy = hitY, MAXL = 2500;
    for (var ti = 0; ti < targets.length; ti++) { if (targets[ti].hit) continue; var tx = targets[ti].x - cx, ty = targets[ti].y - cy, par = tx * rx + ty * ry; if (par > 0) { var perp = Math.abs(tx * ry - ty * rx); if (perp <= targets[ti].r) { laserPath.push([cx, cy, cx + rx * par, cy + ry * par]); hitTarget = ti; return; } } }
    laserPath.push([cx, cy, cx + rx * MAXL, cy + ry * MAXL]);
  }

  function initGame() { mirrorAngle = Math.PI / 4; destroyed = 0; timeLeft = MAX_TIME; done = false; particles = []; hitTimer = 0; flash = 0; spawnTarget(); traceLaser(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (destroyed * 800 + Math.ceil(timeLeft) * 100) : destroyed * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(SRCX, SRCY, 18, C.a, 0.9); pc(SRCX, SRCY, 8, C.g, 1.0);
    for (var li = 0; li < laserPath.length; li++) { var sg = laserPath[li]; pline(sg[0], sg[1], sg[2], sg[3], C.a, 0.9, 6); }
    var mcos = Math.cos(mirrorAngle), msin = Math.sin(mirrorAngle);
    pline(MX - mcos * MLEN / 2, MY - msin * MLEN / 2, MX + mcos * MLEN / 2, MY + msin * MLEN / 2, C.e, 0.9, 12); pc(MX, MY, 14, C.g, 0.9);
    for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti]; if (t.hit) { if (t.anim > 0) ring(t.x, t.y, t.r * (1 + t.anim), C.b, t.anim * 0.5); continue; } pc(t.x, t.y, t.r, C.f, 0.85); pc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.2, C.g, 0.3); if (hitTarget === ti && hitTimer > 0) ring(t.x, t.y, t.r + 16, C.b, hitTimer / 0.6 * 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    mirrorAngle += (ty < MY ? -0.1 : 0.1); mirrorAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mirrorAngle)); game.audio.play('se_tap', 0.15);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') mirrorAngle -= 0.12; else if (dir === 'down') mirrorAngle += 0.12;
    mirrorAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mirrorAngle)); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL DESTROYED!' : 'TIME UP', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      traceLaser();
      if (hitTarget >= 0 && !targets[hitTarget].hit) {
        hitTimer += dt;
        if (hitTimer > 0.6) {
          targets[hitTarget].hit = true; targets[hitTarget].anim = 1.0; destroyed++; flash = 0.3; game.audio.play('se_success', 0.7);
          var tg = targets[hitTarget]; for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tg.x, y: tg.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, col: C.c }); }
          hitTimer = 0; if (destroyed >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) spawnTarget(); }, 400);
        }
      } else if (hitTarget < 0) hitTimer = 0;
      for (var ti = 0; ti < targets.length; ti++) if (targets[ti].hit && targets[ti].anim > 0) targets[ti].anim -= dt * 3;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(destroyed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
