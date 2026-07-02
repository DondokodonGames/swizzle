// 224-laser-dodge.js
// レーザードッジ — 中心から伸びて回転するレーザーを、内外の軌道を切り替えてかいくぐる瞬発反射
// 操作: タップで内側↔外側の軌道を切り替え
// 成功: 8秒生き残る  失敗: レーザーに当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、レーザー装置） ──
  var C = { bg:'#040408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER DODGE';
  var HOW_TO_PLAY = 'TAP TO SWITCH BETWEEN INNER AND OUTER RING';
  var NEEDED   = 8;           // 修正2: 25 → 8（サバイバル短縮）
  var CX = snap(W / 2), CY = snap(H * 0.46), INNER_R = 170, OUTER_R = 330, PLAYER_R = 30;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pAngle, pOrbit, pRadius, jumping, jumpFrom, jumpTo, jumpAnim, survived, timeLeft, done, lasers, laserPhase;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ringDots(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function beam(ang, color, wide) {
    for (var r = 0; r < OUTER_R + 40; r += 8) {
      game.draw.rect(snap(CX + Math.cos(ang) * r) - wide, snap(CY + Math.sin(ang) * r) - wide, wide * 2, wide * 2, color, 0.85);
      game.draw.rect(snap(CX + Math.cos(ang + Math.PI) * r) - wide, snap(CY + Math.sin(ang + Math.PI) * r) - wide, wide * 2, wide * 2, color, 0.85);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a14');
  }

  function background() { game.draw.clear(C.bg); ringDots(CX, CY, INNER_R, C.d, 0.4); ringDots(CX, CY, OUTER_R, C.d, 0.4); pc(CX, CY, 28, C.d, 0.8); }

  function numLasers() { return laserPhase === 0 ? 1 : laserPhase === 1 ? 2 : 3; }

  function initGame() {
    pAngle = 0; pOrbit = 0; pRadius = INNER_R; jumping = false; jumpFrom = INNER_R; jumpTo = OUTER_R; jumpAnim = 0;
    survived = 0; timeLeft = NEEDED; done = false; laserPhase = 0;
    lasers = [{ angle: 0, speed: 1.2, w: 6 }, { angle: Math.PI, speed: -0.9, w: 6 }, { angle: Math.PI / 2, speed: 0.7, w: 5 }];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 120) : Math.round(survived * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function collides() {
    var px = CX + Math.cos(pAngle) * pRadius, py = CY + Math.sin(pAngle) * pRadius, n = numLasers();
    for (var li = 0; li < n; li++) {
      var l = lasers[li], dx = px - CX, dy = py - CY;
      var dirX = Math.cos(l.angle), dirY = Math.sin(l.angle);
      var cross = Math.abs(dx * dirY - dy * dirX), proj = dx * dirX + dy * dirY;
      var cross2 = Math.abs(dx * -dirY - dy * -dirX), proj2 = dx * -dirX + dy * -dirY;
      if ((cross < PLAYER_R + l.w && proj > 0 && proj < OUTER_R + 40) || (cross2 < PLAYER_R + l.w && proj2 > 0 && proj2 < OUTER_R + 40)) return true;
    }
    return false;
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || jumping) return;
    pOrbit = 1 - pOrbit; jumpFrom = pRadius; jumpTo = pOrbit === 0 ? INNER_R : OUTER_R; jumpAnim = 0; jumping = true; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); pc(CX + Math.cos(game.time.elapsed) * INNER_R, CY + Math.sin(game.time.elapsed) * INNER_R, PLAYER_R, C.b, 0.9); beam(game.time.elapsed * 0.5, C.a, 6);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'ZAPPED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      laserPhase = survived < 3 ? 0 : survived < 5.5 ? 1 : 2;
      pAngle += (0.9 + survived * 0.03) * dt;
      if (jumping) { jumpAnim += dt * 5; if (jumpAnim >= 1) { jumpAnim = 1; jumping = false; pRadius = jumpTo; } else pRadius = jumpFrom + (jumpTo - jumpFrom) * jumpAnim; }
      for (var li = 0; li < lasers.length; li++) lasers[li].angle += lasers[li].speed * dt;
      if (collides()) { finish(false); return; }
    }

    // ---- 描画 ----
    background();
    var n = numLasers();
    for (var li2 = 0; li2 < n; li2++) beam(lasers[li2].angle, li2 === 0 ? C.a : li2 === 1 ? C.d : C.e, lasers[li2].w);
    var px = CX + Math.cos(pAngle) * pRadius, py = CY + Math.sin(pAngle) * pRadius;
    pc(px, py, PLAYER_R, C.b, 0.95); game.draw.rect(snap(px) - 4, snap(py) - 4, 8, 8, C.g);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(pOrbit === 0 ? 'INNER RING' : 'OUTER RING', W / 2, H - 100, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
