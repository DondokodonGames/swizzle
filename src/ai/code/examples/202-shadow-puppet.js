// 202-shadow-puppet.js
// 影絵パズル — 影絵劇場のシルエットに合わせて、散らばったパーツを正しい枠に置く
// 操作: タップでパーツを選択、枠をタップで配置
// 成功: 3パーツを揃える  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵劇場） ──
  var C = { bg:'#06040c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW PUPPET';
  var HOW_TO_PLAY = 'PICK A PART · TAP ITS SLOT';
  var MAX_TIME = 15;
  var NEEDED   = 3;             // 修正2: 5 → 3（易化）
  var PIECE_R = 72;
  var STAGE_X = snap(W / 2), STAGE_Y = snap(H * 0.34);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // 3パーツで作る簡単なシルエット（頭・胴・脚）
  var targetPositions = [
    { x: STAGE_X, y: STAGE_Y - 130 },
    { x: STAGE_X, y: STAGE_Y },
    { x: STAGE_X, y: STAGE_Y + 130 }
  ];

  // ── ゲーム変数 ──
  var pieces, selected, correctCount, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.35) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a2e');
  }

  function background() {
    game.draw.clear(C.bg);
    // 影絵スクリーン
    game.draw.rect(snap(W * 0.12), STAGE_Y - 230, snap(W * 0.76), 480, C.d, 0.18);
    game.draw.rect(snap(W * 0.12), STAGE_Y - 230, snap(W * 0.76), 10, C.c, 0.5);
    // 舞台の幕
    game.draw.rect(0, STAGE_Y + 260, W, 8, C.a, 0.5);
  }

  function drawPiece(x, y, color, alpha) { pc(x, y, PIECE_R, color, alpha); pc(x - 18, y - 18, 12, C.g, 0.6); }

  function initPieces() {
    var offsets = [
      { x: snap(W * 0.22), y: snap(H * 0.70) },
      { x: snap(W * 0.5),  y: snap(H * 0.76) },
      { x: snap(W * 0.78), y: snap(H * 0.70) }
    ];
    for (var i = offsets.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = offsets[i]; offsets[i] = offsets[j]; offsets[j] = tmp; }
    pieces = [];
    for (var pi = 0; pi < NEEDED; pi++) pieces.push({ x: offsets[pi].x, y: offsets[pi].y, targetIdx: pi, placed: false });
  }

  function initGame() { initPieces(); selected = -1; correctCount = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 80) : correctCount * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;

    if (selected >= 0) {
      var piece = pieces[selected], tgt = targetPositions[piece.targetIdx];
      if (Math.hypot(x - tgt.x, y - tgt.y) < PIECE_R + 40) {
        piece.placed = true; piece.x = tgt.x; piece.y = tgt.y; selected = -1; correctCount++;
        feedbackOk = true; feedback = 0.3; game.audio.play('se_success', 0.6);
        if (correctCount >= NEEDED) { finish(true); return; }
        return;
      }
      // 別のパーツを選び直す or ドロップ
      var hit = -1;
      for (var pi2 = 0; pi2 < pieces.length; pi2++) { if (pieces[pi2].placed) continue; if (Math.hypot(x - pieces[pi2].x, y - pieces[pi2].y) < PIECE_R) { hit = pi2; break; } }
      if (hit >= 0) { selected = hit; game.audio.play('se_tap', 0.3); }
      else { selected = -1; feedbackOk = false; feedback = 0.2; game.audio.play('se_failure', 0.2); }
    } else {
      for (var pi3 = 0; pi3 < pieces.length; pi3++) { if (pieces[pi3].placed) continue; if (Math.hypot(x - pieces[pi3].x, y - pieces[pi3].y) < PIECE_R) { selected = pi3; game.audio.play('se_tap', 0.4); break; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var ti = 0; ti < targetPositions.length; ti++) { var tp = targetPositions[ti]; drawPiece(tp.x, tp.y, C.d, 0.6 + 0.3 * (Math.floor(game.time.elapsed * 3 + ti) % 2)); }
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.60, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#665577');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COMPLETE!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } if (feedback > 0) feedback -= dt; }

    // ---- 描画 ----
    background();
    // 枠（シルエット）
    for (var ti2 = 0; ti2 < targetPositions.length; ti2++) { var tp2 = targetPositions[ti2]; if (!pieces[ti2].placed) ring(tp2.x, tp2.y, PIECE_R, C.d, 0.6); }
    // 配置済み
    for (var p = 0; p < pieces.length; p++) if (pieces[p].placed) drawPiece(pieces[p].x, pieces[p].y, C.b, 0.9);
    // 未配置
    for (var p2 = 0; p2 < pieces.length; p2++) {
      if (pieces[p2].placed) continue;
      var isSel = p2 === selected, bob = isSel ? Math.floor(game.time.elapsed * 6) % 2 * 12 : 0;
      if (isSel) ring(pieces[p2].x, pieces[p2].y - bob, PIECE_R + 16, C.c, 0.6);
      drawPiece(pieces[p2].x, pieces[p2].y - bob, isSel ? C.c : C.a, 0.9);
    }
    // 選択中の置き場ハイライト
    if (selected >= 0) { var st = targetPositions[pieces[selected].targetIdx]; ring(st.x, st.y, PIECE_R + 8, C.c, 0.4 + 0.3 * (Math.floor(game.time.elapsed * 6) % 2)); }
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correctCount + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt(selected >= 0 ? 'TAP THE SLOT' : 'PICK A PART', W / 2, H - 120, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
