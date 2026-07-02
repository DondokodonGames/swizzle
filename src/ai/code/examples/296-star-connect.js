// 296-star-connect.js
// 星座を結べ — 光る星をスワイプでなぞり、点線ガイドに沿って星座を完成させる夜空パズル
// 操作: 星から星へスワイプして線を引く（ガイドの通りに）
// 成功: 3つの星座を完成  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、星空） ──
  var C = { bg:'#020310', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // 星座パターン（正規化座標）と接続順
  var PATTERNS = [
    [[0.5,0.1],[0.2,0.8],[0.8,0.8]],
    [[0.2,0.2],[0.8,0.2],[0.8,0.8],[0.2,0.8]],
    [[0.5,0.1],[0.85,0.5],[0.5,0.9],[0.15,0.5]],
    [[0.2,0.3],[0.5,0.2],[0.8,0.3],[0.65,0.7],[0.35,0.7]],
    [[0.1,0.5],[0.5,0.5],[0.7,0.2],[0.7,0.8]]
  ];
  var CONNECTIONS = [
    [[0,1],[1,2],[2,0]],
    [[0,1],[1,2],[2,3],[3,0]],
    [[0,1],[1,2],[2,3],[3,0]],
    [[0,1],[1,2],[2,3],[3,4],[4,0]],
    [[0,1],[1,2],[1,3]]
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STAR CONNECT';
  var HOW_TO_PLAY = 'SWIPE STAR TO STAR ALONG THE DOTTED GUIDE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_ERR  = 3;
  var ZX = snap(W * 0.12), ZY = snap(H * 0.28), ZW = snap(W * 0.76), ZH = snap(H * 0.46);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var patIdx, stars, reqConns, madeConns, completed, errors, timeLeft, done, particles, bgStars, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, dashed) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); for (var i = 0; i <= n; i++) { if (dashed && Math.floor(i / 2) % 2) continue; game.draw.rect(snap(x1 + dx * i / n) - 4, snap(y1 + dy * i / n) - 4, 8, 8, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a20');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < bgStars.length; i++) { var bsi = bgStars[i]; game.draw.rect(bsi.x, bsi.y, bsi.s, bsi.s, C.g, Math.floor(game.time.elapsed * 4 + i) % 3 === 0 ? 0.7 : 0.25); }
  }

  function loadConstellation() {
    var idx = patIdx % PATTERNS.length, pat = PATTERNS[idx], con = CONNECTIONS[idx];
    stars = pat.map(function(p) { return { x: snap(ZX + p[0] * ZW), y: snap(ZY + p[1] * ZH) }; });
    reqConns = con.map(function(c) { return { a: c[0], b: c[1] }; });
    madeConns = [];
  }

  function findStar(x, y) { for (var i = 0; i < stars.length; i++) { var dx = x - stars[i].x, dy = y - stars[i].y; if (dx * dx + dy * dy < 70 * 70) return i; } return -1; }

  function initGame() { patIdx = 0; completed = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; bgStars = []; for (var i = 0; i < 70; i++) bgStars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 }); loadConstellation(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 500 + Math.ceil(timeLeft) * 80) : completed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawConstellation() {
    for (var ci = 0; ci < reqConns.length; ci++) { if (madeConns.indexOf(ci) !== -1) continue; var c = reqConns[ci]; pline(stars[c.a].x, stars[c.a].y, stars[c.b].x, stars[c.b].y, C.d, 0.5, true); }
    for (var mi = 0; mi < madeConns.length; mi++) { var mc = reqConns[madeConns[mi]]; pline(stars[mc.a].x, stars[mc.a].y, stars[mc.b].x, stars[mc.b].y, C.e, 0.9); }
    for (var si = 0; si < stars.length; si++) { var st = stars[si]; pc(st.x, st.y, 18 + 4 * (Math.floor(game.time.elapsed * 6 + si) % 2), C.c, 0.9); pc(st.x, st.y, 8, C.g, 0.9); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var s1 = findStar(x1, y1), s2 = findStar(x2, y2);
    if (s1 === -1 || s2 === -1 || s1 === s2) return;
    var found = -1;
    for (var ci = 0; ci < reqConns.length; ci++) { var c = reqConns[ci]; if ((c.a === s1 && c.b === s2) || (c.a === s2 && c.b === s1)) { found = ci; break; } }
    if (found === -1) { errors++; game.audio.play('se_failure', 0.4); if (errors >= MAX_ERR) finish(false); return; }
    if (madeConns.indexOf(found) !== -1) return;
    madeConns.push(found); game.audio.play('se_tap', 0.3);
    var mx = (stars[s1].x + stars[s2].x) / 2, my = (stars[s1].y + stars[s2].y) / 2;
    for (var pk = 0; pk < 5; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: mx, y: my, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.5, col: C.e }); }
    if (madeConns.length === reqConns.length) {
      completed++; game.audio.play('se_success', 0.6); flash = 0.6; patIdx++;
      if (completed >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) loadConstellation(); }, 600);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bgStars) initGame(); background(); drawConstellation();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY MAPPED!' : 'LOST STARS', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(ZX, ZY, ZW, ZH, C.b, flash * 0.3);
    drawConstellation();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);
    txt('LINES LEFT ' + (reqConns.length - madeConns.length), W / 2, snap(H * 0.82), 40, C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
