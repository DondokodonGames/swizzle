// 722-conveyor-sort.js
// コンベアソート — ベルトを流れる木箱の焼印を見分け、上下スワイプで正しい荷降し場へ
// 操作: 丸印の箱は上スワイプ、×印の箱は下スワイプ
// 成功: 制限時間内に 12 個仕分ける  失敗: 時間切れ
// @mechanic: swipe_direction
// @theme: western
// 世界観: 西部の荒野の貨物駅で、駅員が木箱の焼印を読んで上下の荷降し場へ振り分ける
// variation: 精度型(進むほどベルトが速くなる)
// spice: 黄金ターゲット(稀に金塊の箱=得点2倍が出る)
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO(琥珀フォスファ・単色)
  var C = {
    black: '#0a0600', amber: '#ffb000', amberDim: '#8a5c00', amberLo: '#2e2000',
    white: '#fff0cc', red: '#ff5a2a', glow: '#ffe08a',
  };

  var GAME_TITLE = 'CONVEYOR SORT';
  var MAX_TIME = 13;
  var NEEDED = 12;
  var BELT_Y = H * 0.5;
  var BOX_W = 200;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var box, sent, beltSpd, score, sorted, timeLeft, done;
  var ready, hitStop, feedback, feedbackOk;

  // 焼印: 0=丸(上へ) / 1=×(下へ)
  var BRAND = [
    ['.AAAA.', 'A....A', 'A....A', 'A....A', 'A....A', '.AAAA.'],
    ['A....A', '.A..A.', '..AA..', '..AA..', '.A..A.', 'A....A'],
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 6) game.draw.rect(0, sy, W, 2, '#000000', 0.28); }

  function depotBg() {
    game.draw.gradient(0, H, [[0, '#141000'], [1, '#050300']]);
    // 上下の荷降し場(レーン)
    game.draw.rect(0, BELT_Y - 300, W, 120, C.amberLo, 0.5);
    game.draw.rect(0, BELT_Y + 180, W, 120, C.amberLo, 0.5);
    // 上=丸 / 下=× のラベル記号
    game.draw.sprite(BRAND[0], { A: C.amber }, W - 100, BELT_Y - 240, 12, { anchor: 'center' });
    game.draw.sprite(BRAND[1], { A: C.amber }, W - 100, BELT_Y + 240, 12, { anchor: 'center' });
    // ベルト
    game.draw.rect(0, BELT_Y - 70, W, 140, C.amberLo);
    var off = (game.time.elapsed * 200) % 60;
    for (var x = -60; x < W; x += 60) game.draw.line(x + off, BELT_Y - 70, x + off, BELT_Y + 70, C.amberDim, 3);
  }

  function drawBox(b, yoff) {
    var y = b.y + (yoff || 0);
    var col = b.gold ? C.white : C.amber;
    game.draw.rect(b.x - BOX_W / 2, y - 70, BOX_W, 140, C.black);
    game.draw.rect(b.x - BOX_W / 2, y - 70, BOX_W, 140, col, 0.18);
    // 枠
    game.draw.rect(b.x - BOX_W / 2, y - 70, BOX_W, 8, col);
    game.draw.rect(b.x - BOX_W / 2, y + 62, BOX_W, 8, col);
    game.draw.sprite(BRAND[b.brand], { A: col }, b.x, y, 16, { anchor: 'center' });
  }

  function spawnBox() {
    box = { brand: Math.random() < 0.5 ? 0 : 1, x: -BOX_W / 2, y: BELT_Y, gold: Math.random() < 0.12 };
    sent = null;
  }
  function initGame() {
    score = 0; sorted = 0; timeLeft = MAX_TIME; done = false; beltSpd = 340;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false;
    spawnBox();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function sort(dir) {
    if (!box || sent) return;
    var want = box.brand === 0 ? 'up' : 'down';
    if (dir === want) {
      sorted++;
      var gain = box.gold ? 200 : 100; score += gain;
      feedback = 0.3; feedbackOk = true;
      game.feedback.good(box.x, box.y, { text: box.gold ? 'GOLD +200' : '+100', color: box.gold ? C.white : C.amber });
      if (box.gold) game.audio.play('se_milestone');
      sent = { dir: dir, t: 0 };
      beltSpd = Math.min(760, 340 + sorted * 34); // 精度型: 速くなる
      if (sorted >= NEEDED) { finish(true); return; }
    } else {
      feedback = 0.3; feedbackOk = false; hitStop = 0.3;
      game.feedback.bad(box.x, box.y, { text: 'WRONG' });
      sent = { dir: dir, t: 0, wrong: true };
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (dir === 'up' || dir === 'down') sort(dir);
  });

  // ATTRACT ゴースト実演: 手が焼印に合わせて上下フリック
  var d = { box: null, t: 0, gx: W / 2, gy: BELT_Y + 40, press: false, sent: null };
  function stepDemo(dt) {
    if (!d.box) d.box = { brand: 0, x: -BOX_W / 2, gold: false };
    d.t += dt;
    if (!d.sent) {
      d.box.x += 300 * dt;
      d.gx = d.box.x; d.gy = BELT_Y + 40;
      d.press = d.box.x > W * 0.42;
      if (d.box.x >= W / 2) {
        d.sent = { dir: d.box.brand === 0 ? 'up' : 'down', t: 0 };
        game.feedback.good(d.box.x, BELT_Y, { text: '+100', color: C.amber });
      }
    } else {
      d.sent.t += dt;
      d.box.y = BELT_Y + (d.sent.dir === 'up' ? -1 : 1) * d.sent.t * 700;
      d.gy = BELT_Y + (d.sent.dir === 'up' ? -1 : 1) * 120;
      if (d.sent.t > 0.4) { d.box = { brand: 1 - d.box.brand, x: -BOX_W / 2, y: BELT_Y, gold: false }; d.sent = null; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      depotBg(); stepDemo(dt);
      drawBox(d.box.y !== undefined && d.sent ? d.box : { x: d.box.x, y: BELT_Y, brand: d.box.brand, gold: false });
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.12, 74, C.amber);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.18, 40, C.glow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.amber);
        txt('TAP TO START', W / 2, H * 0.9, 46, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      depotBg();
      if (hitStop > 0) hitStop -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 86, resultSuccess ? C.amber : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.56, 42, C.amber);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.63, 54, C.glow);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.67, 46, C.amber);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        if (sent) {
          sent.t += dt;
          box.y = BELT_Y + (sent.dir === 'up' ? -1 : 1) * sent.t * 800;
          if (sent.t > 0.35) spawnBox();
        } else if (box) {
          box.x += beltSpd * dt;
          if (box.x > W + BOX_W) { // 見送り=ミス扱い(仕分けそこね)
            game.feedback.bad(W - 40, BELT_Y, { text: 'MISS' });
            hitStop = 0.2; spawnBox();
          }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    depotBg();
    if (box) drawBox(box);

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, C.amber);
    game.draw.rect(60, 40, W - 120, 26, C.amberLo, 0.6);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.white);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 44, C.amber);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 92, C.amber);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['E4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5], ['E4', 1],
       ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['E4', 1], ['A3', 1]],
      { tempo: 126, wave: 'square', volume: 0.08, loop: true,
        bass: [['A1', 1], ['A1', 1], ['E1', 1], ['G1', 1], ['A1', 1], ['A1', 1]], bassWave: 'triangle', bassVolume: 0.07 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
