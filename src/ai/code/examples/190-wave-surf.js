// 190-wave-surf.js
// 波乗り — うねるチョコの波の頂点にキャンディを乗せ続けるバランス感覚
// 操作: 画面の上半分/下半分をタップして上下に寄せる
// 成功: 制限時間内にゲージを 6 回満タンにする  失敗: 時間切れ
// @mechanic: balance
// @theme: candy
// 世界観: お菓子工場の検品キャンディが、うねるチョコの波の頂点から落ちないよう均衡を取る
// variation: 物量型(進むほど波が激しくうねる)
// spice: フィーバータイム(2回満タンで数秒だけ得点2倍)
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP(キャンディ)
  var C = {
    grape: '#3a1a5c', pink: '#ff5db1', mint: '#4dffd0', lemon: '#ffe14d',
    cream: '#fff6fb', choco: '#5a2d16', chocoLt: '#8a4a24', red: '#ff4d6d', purple: '#a24bff',
  };

  var GAME_TITLE = 'WAVE SURF';
  var MAX_TIME = 18;
  var NEEDED = 6;
  var SAFE = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var candyY, vy, crestY, waveT, meter, fills, score, timeLeft, done;
  var ready, fever, hitStop, feedback, feedbackOk, chop;

  // キャンディ(顔つき)
  var CANDY = [
    '..PPPP..',
    '.PWWWWP.',
    'PWEWWEWP',
    'PWWWWWWP',
    'PWWMMWWP',
    'PWWWWWWP',
    '.PWWWWP.',
    '..PPPP..',
  ];
  var CANDY_COL = { P: C.pink, W: C.cream, E: C.grape, M: C.red };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#1a0a24', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  function candyBg() {
    game.draw.gradient(0, H, [[0, '#4a1f6e'], [0.5, '#7a2f8c'], [1, '#3a1552']]);
    // 水玉の遠景
    for (var i = 0; i < 12; i++) {
      var dx = (i * 173 + game.time.elapsed * 12) % W, dy = 120 + (i % 4) * 220;
      game.draw.circle(dx, dy, 26, C.lemon, 0.1);
    }
  }

  function drawWave(tt) {
    // うねるチョコの波(頂点ライン=crest)
    var prevx = 0, prevTop = 0;
    for (var x = 0; x <= W; x += 24) {
      var top = crestY + Math.sin(x * 0.006 + tt * 2) * (60 + chop * 90);
      game.draw.rect(x, top, 24, H - top, C.choco);
      game.draw.rect(x, top, 24, 12, C.chocoLt);
      if (x > 0) game.draw.line(prevx, prevTop, x, top, C.cream, 3);
      prevx = x; prevTop = top;
    }
  }
  function crestAt() { return crestY + Math.sin(W / 2 * 0.006 + waveT * 2) * (60 + chop * 90); }

  function initGame() {
    crestY = H * 0.55; candyY = crestY - 120; vy = 0; waveT = 0; meter = 0; fills = 0;
    score = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; hitStop = 0; feedback = 0; feedbackOk = false; chop = 0.2;
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

  function onFill() {
    fills++;
    var gain = fever > 0 ? 200 : 100;
    score += gain; feedback = 0.4; feedbackOk = true;
    game.feedback.good(W / 2, candyY, { text: '+' + gain, color: C.mint });
    if (fills === 2) { fever = 3.5; game.audio.play('se_milestone'); }
    if (fills >= NEEDED) { finish(true); return; }
    meter = 0; chop = Math.min(1, 0.2 + fills * 0.16); // 物量型: 波が激しく
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    vy += y < H / 2 ? -420 : 420; // 上半分=上へ、下半分=下へ
    game.audio.play('se_tap', 0.5);
  });

  // ATTRACT ゴースト実演
  var d = { y: 0, vy: 0, t: 0, gx: W / 2, gy: 0, press: false, meter: 0 };
  function stepDemo(dt) {
    d.t += dt;
    var crest = crestY + Math.sin(W / 2 * 0.006 + d.t * 2) * 80;
    if (d.y === 0) d.y = crest - 100;
    // ゴースト: crest より上なら下タップ、下なら上タップ
    var diff = d.y - crest;
    d.vy += (diff < 0 ? 420 : -420) * dt * 3;
    d.vy *= 0.9; d.y += d.vy * dt;
    d.gx = W / 2 + Math.sin(d.t * 4) * 40;
    d.gy = d.y + (diff < 0 ? 140 : -140);
    d.press = Math.floor(d.t * 4) % 2 === 0;
    if (Math.abs(diff) < SAFE) { d.meter += dt; if (d.meter > 1) { d.meter = 0; game.feedback.good(W / 2, d.y, { text: '+100', color: C.mint }); } }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      candyBg(); chop = 0.2; waveT = game.time.elapsed; stepDemo(dt);
      drawWave(d.t);
      game.draw.sprite(CANDY, CANDY_COL, W / 2, d.y, 12, { anchor: 'center' });
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.lemon);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.18, 40, C.mint);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.pink);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.cream);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      candyBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(CANDY, CANDY_COL, W / 2, H * 0.32, 18, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.5, 92, resultSuccess ? C.mint : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.6, 58, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.66, 42, C.lemon);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.73, 54, C.pink);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.77, 46, C.mint);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt; waveT += dt;
        if (fever > 0) fever -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        // バランス物理
        var crest = crestAt();
        vy += (candyY < crest ? 300 : -60) * dt; // 波に押し戻される非対称力
        vy *= 0.96; candyY += vy * dt;
        var diff = Math.abs(candyY - crest);
        if (diff < SAFE) {
          meter += dt * (fever > 0 ? 1.6 : 1.2);
          if (meter >= 1) onFill();
        } else {
          meter = Math.max(0, meter - dt * 0.5);
          if (candyY < crest - H * 0.4 || candyY > crest + H * 0.4) { // 大きく外れたらミス演出(即死せず戻す)
            feedback = 0.3; feedbackOk = false; hitStop = 0.25;
            game.feedback.bad(W / 2, candyY, { text: 'MISS' });
            candyY = crest - 100; vy = 0;
          }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    candyBg();
    drawWave(waveT);
    // 安全帯ガイド(crest 付近)
    var cr = crestAt();
    game.draw.rect(0, cr - SAFE, W, SAFE * 2, C.mint, 0.08);
    game.draw.line(0, cr, W, cr, C.mint, 2);
    game.draw.sprite(CANDY, CANDY_COL, W / 2, candyY, 12, { anchor: 'center' });

    // HUD
    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.pink : C.mint);
    game.draw.rect(60, 40, W - 120, 26, C.grape, 0.5);
    // 蓄積メーター
    game.draw.rect(W / 2 - 200, 96, 400 * Math.min(1, meter), 22, C.lemon);
    game.draw.rect(W / 2 - 200, 96, 400, 22, C.grape, 0.5);
    txt(fills + ' / ' + NEEDED, W / 2, 168, 46, C.mint);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.32, 54, C.pink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 92, C.lemon);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 1],
       ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1]],
      { tempo: 138, wave: 'square', volume: 0.08, loop: true,
        bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1], ['C3', 1], ['C3', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
