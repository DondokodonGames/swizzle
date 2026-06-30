// 017-countdown-stop.js
// カウントダウン止め — 数字が0に近づく瞬間を狙う緊張の一発勝負
// 操作: カウントが1のときにタップ
// 成功: 1回「1」でピタリと止める  失敗: 0になるか、2以上でタップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#008f11', c:'#003b00', d:'#00ff41', e:'#ffffff', f:'#ff0000', g:'#ffff00' };

  var GAME_TITLE  = 'COUNTDOWN STOP';
  var HOW_TO_PLAY = 'TAP WHEN IT HITS 1';
  var MAX_TIME = 30;
  var NEEDED = 1;            // 修正2: 5 → 1
  var CY = H * 0.45;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var count, tickRate, tickTimer, score, done, totalTime, feedback, feedbackOk, phase, waitTimer;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil((MAX_TIME - totalTime) / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#330000');
  }

  function startCount() { count = 9; tickRate = Math.max(0.4, 1.2 - score * 0.08); tickTimer = tickRate; phase = 'counting'; }
  function initGame() { score = 0; done = false; totalTime = 0; feedback = 0; feedbackOk = false; phase = 'counting'; waitTimer = 0; startCount(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.max(0, Math.floor((MAX_TIME - totalTime) * 30))) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'counting') return;
    feedback = 0.45;
    if (count === 1) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 0.9);
      if (score >= NEEDED) { finish(true); return; }
      phase = 'wait'; waitTimer = 0.5;
    } else {
      feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      finish(false);
    }
  });

  // 世界観: 時限爆弾の解除。数字が「01」になった瞬間にタップして起爆を止める。
  function background() {
    game.draw.clear('#000011');
    var bw = 760, bh = 900, bx = (W - bw) / 2, by = CY - bh / 2;
    // 上部の導線
    game.draw.line(bx + 180, by - 48, bx + 260, by, C.e, 8);
    game.draw.line(bx + bw - 180, by - 48, bx + bw - 260, by, C.a, 8);
    game.draw.line(W / 2, by - 64, W / 2, by, C.d, 8);
    // 爆弾筐体
    game.draw.rect(bx, by, bw, bh, '#1a1a30');
    game.draw.rect(bx + 16, by + 16, bw - 32, bh - 32, '#0a0a1a');
    // 四隅ボルト
    game.draw.rect(bx + 28, by + 28, 16, 16, '#8888aa'); game.draw.rect(bx + bw - 44, by + 28, 16, 16, '#8888aa');
    game.draw.rect(bx + 28, by + bh - 44, 16, 16, '#8888aa'); game.draw.rect(bx + bw - 44, by + bh - 44, 16, 16, '#8888aa');
    // 状態ランプ（カウント中=赤点滅）
    var hot = state === S.PLAYING && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W / 2 - 18, by + 52, 36, 36, hot ? C.e : '#330000');
    // LCD窓
    game.draw.rect(snap(W / 2 - 230), snap(CY - 200), 460, 400, '#001100');
    game.draw.rect(snap(W / 2 - 230), snap(CY - 200), 460, 8, C.f, 0.4);
    txt('DEFUSE', W / 2, by + 120, 44, C.e);
    txt('TAP ON 01', W / 2, by + bh - 56, 40, C.g);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demoN = 9 - (Math.floor(game.time.elapsed) % 9);
      txt(String(demoN).padStart(2, '0'), W / 2, CY, 300, demoN === 1 ? C.f : C.e);
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.g);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 42, C.a);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.e);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.e);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#446644');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.g : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.e);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.a);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { finish(false); return; }
      if (phase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) startCount(); }
      else if (phase === 'counting') {
        tickTimer -= dt;
        if (tickTimer <= 0) {
          count--; tickTimer = tickRate;
          if (count <= 0) { feedbackOk = false; finish(false); return; }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    var blink = count === 1 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    txt(String(Math.max(0, count)).padStart(2, '0'), W / 2, CY, blink ? 320 : 300, count === 1 ? C.f : C.e);
    if (feedback > 0) {
      if (feedbackOk) txt('STOP!', W / 2, CY - 380, 88, C.g);
      else txt('MISS!', W / 2, CY - 380, 80, C.f);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.e);
    txt('TAP ON 1!', W / 2, H - 100, 56, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
