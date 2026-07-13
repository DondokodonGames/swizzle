// 017-countdown-stop.js
// カウントダウン止め — 起爆カウンタが「01」になる刹那に赤線を断つ一発勝負
// 操作: カウンタが 1 の瞬間にタップ
// 成功: 制限時間内に 4 本断つ  失敗: 時間切れ
// @mechanic: timing_one_shot
// @theme: custom
// 世界観: 爆弾処理班員が、起爆カウンタが01になる刹那に導線を断って解体する
// variation: 加速型(単一カウントダウンに物量型は馴染まないため、ラウンドごとに加速へ変更)
// spice: フィーバータイム(2本断つと数秒だけ得点2倍)
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s NEON パレット
  var C = {
    cyan: '#00e5ff', magenta: '#ff3df0', yellow: '#ffe600',
    green: '#39ff14', red: '#ff2d55', white: '#ffffff', dim: '#3a2a55',
  };

  var GAME_TITLE = 'COUNTDOWN STOP';
  var MAX_TIME = 10;
  var NEEDED = 4;
  var CY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var count, tickRate, tickTimer, score, cuts, done, totalTime;
  var phase, waitTimer, feedback, feedbackOk, hitStop, ready, fever, shakeBomb;

  // 起爆装置スプライト(顔つき)
  var BOMB = [
    '..KKKKKK..',
    '.KRRRRRRK.',
    'KRRWWWWRRK',
    'KRWEWWEWRK',
    'KRWWWWWWRK',
    'KRWWMMWWRK',
    'KRRWWWWRRK',
    '.KRRRRRRK.',
    '..KKKKKK..',
  ];
  var BOMB_COL = { K: '#1a1030', R: '#ff2d55', W: '#2a1030', E: C.cyan, M: C.magenta };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#12001f', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.16); }

  function neonBg() {
    game.draw.gradient(0, H, [[0, '#12002a'], [0.5, '#1c0038'], [1, '#05010f']]);
    // 遠景: ネオングリッドの地平
    for (var i = 0; i <= 10; i++) game.draw.line(0, H * 0.62 + i * i * 3.2, W, H * 0.62 + i * i * 3.2, C.dim, 2);
    for (var gx = 0; gx <= 12; gx++) game.draw.line(gx / 12 * W, H * 0.62, (gx - 5.5) * 260 + W / 2, H, C.dim, 2);
  }

  function bombFrame(cx, cy, scale, danger) {
    var dx = shakeBomb > 0 ? (Math.random() * 2 - 1) * 10 : 0;
    game.draw.sprite(BOMB, BOMB_COL, cx + dx, cy, scale, { anchor: 'center' });
    // 導火線の火花(危険が近いほど明るい)
    var sparkY = cy - BOMB.length * scale / 2 - 18;
    game.draw.circle(cx + dx, sparkY, danger ? 16 : 10, danger ? C.yellow : C.red, 0.9);
  }

  // カウンタ窓(LCD)+ 数字。1 のとき赤く明滅して「今だ」を予告(telegraph)
  function counterWindow(n, big) {
    game.draw.rect(W / 2 - 250, CY - 210, 500, 420, '#0a0018');
    game.draw.rect(W / 2 - 250, CY - 210, 500, 8, C.magenta, 0.5);
    game.draw.rect(W / 2 - 250, CY + 202, 500, 8, C.cyan, 0.5);
    var isOne = n === 1;
    var blink = isOne && Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (isOne) game.draw.circle(W / 2, CY, 250, C.red, blink ? 0.28 : 0.12);
    txt(String(Math.max(0, n)).padStart(2, '0'), W / 2, CY, big ? 330 : 300, isOne ? C.red : C.cyan);
  }

  function startCount() {
    // 加速型: 断った本数に応じてテンポが上がる
    count = 5;
    tickRate = Math.max(0.28, 0.7 - cuts * 0.09);
    tickTimer = tickRate;
    phase = 'counting';
  }
  function initGame() {
    score = 0; cuts = 0; done = false; totalTime = 0; feedback = 0; feedbackOk = false;
    hitStop = 0; ready = 0.8; fever = 0; shakeBomb = 0; phase = 'ready';
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = score;
    game.audio.stopBgm();
    if (success) {
      game.audio.play('se_success');
    } else {
      game.audio.play('se_failure');
      hitStop = 0.5; shakeBomb = 0.5; // 失敗の因果: 爆弾が爆ぜる
      game.fx.flash(C.red, 0.3);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function onCut(good, x, y) {
    if (good) {
      cuts++;
      var gain = fever > 0 ? 200 : 100;
      score += gain;
      feedback = 0.4; feedbackOk = true;
      game.feedback.good(x, y, { text: '+' + gain, color: C.green });
      if (cuts === 2) { fever = 3.5; game.audio.play('se_milestone'); } // spice: フィーバー突入
      if (cuts >= NEEDED) { finish(true); return; }
      phase = 'wait'; waitTimer = 0.45;
    } else {
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.35; shakeBomb = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      phase = 'wait'; waitTimer = 0.55; // ミスは時間を浪費するが即死ではない
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0 || phase !== 'counting') return;
    onCut(count === 1, x, y);
  });

  // ── ATTRACT ゴースト実演: 手がカウンタに寄り、1 の瞬間に断つ ──
  var demo = { n: 5, t: 0, gx: W / 2, gy: H * 0.8, press: false, cut: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t >= 0.5) { demo.t = 0; demo.n = demo.n <= 1 ? 5 : demo.n - 1; }
    var targetY = demo.n === 1 ? CY : H * 0.8;
    demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3);
    demo.gy += (targetY - demo.gy) * Math.min(1, dt * 5);
    demo.press = demo.n === 1 && demo.gy < CY + 120;
    if (demo.press && demo.cut <= 0) {
      demo.cut = 0.5;
      game.feedback.good(W / 2, CY, { text: '+100', color: C.green });
    }
    if (demo.cut > 0) demo.cut -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      neonBg();
      stepDemo(dt);
      bombFrame(W / 2, H * 0.24, 12, demo.n === 1);
      counterWindow(demo.n, demo.n === 1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.11, 78, C.yellow);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.17, 40, C.green);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 66, C.magenta);
        txt('TAP TO START', W / 2, H * 0.88, 50, C.white);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 38, '#7a5aa0');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      neonBg();
      if (hitStop > 0) hitStop -= dt;
      if (shakeBomb > 0) shakeBomb -= dt;
      bombFrame(W / 2, H * 0.3, 16, !resultSuccess);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.52, 96, resultSuccess ? C.green : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.62, 60, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.68, 44, C.yellow);
      if (finalScore > game.best && game.best > 0 && resultSuccess) {
        if (Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.75, 56, C.magenta);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.8, 48, C.cyan);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt; // ヒットストップ中は時間を止めて因果を見せる
      } else {
        if (ready > 0) {
          ready -= dt;
          if (ready <= 0) { game.audio.play('se_tap'); startCount(); }
        } else {
          totalTime += dt;
          if (fever > 0) fever -= dt;
          if (totalTime >= MAX_TIME) { finish(false); return; }
          if (phase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) startCount(); }
          else if (phase === 'counting') {
            tickTimer -= dt;
            if (tickTimer <= 0) {
              count--; tickTimer = tickRate;
              if (count <= 0) { onCut(false, W / 2, CY); } // 見送り=ミス
            }
          }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shakeBomb > 0) shakeBomb -= dt;
    }

    // draw
    neonBg();
    bombFrame(W / 2, H * 0.2, 12, count === 1 && phase === 'counting');
    counterWindow(ready > 0 ? 5 : (phase === 'counting' ? count : 5), count === 1 && phase === 'counting');

    // HUD(上部): 残時間リング + スコア
    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.magenta : C.cyan);
    game.draw.rect(60, 40, W - 120, 26, C.dim, 0.4);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 110, 48, C.white);
    // 進捗: 残りの導線アイコン + カウンタ
    for (var i = 0; i < NEEDED; i++) game.draw.rect(W / 2 - NEEDED * 34 + i * 68, 156, 52, 16, i < cuts ? C.green : C.dim);
    txt(cuts + ' / ' + NEEDED, W / 2, 210, 40, C.green);

    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.34, 60, C.magenta);

    // READY? -> GO!
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 96, C.yellow);

    // ニアミス/フィードバック語(ホワイトリスト内)
    if (feedback > 0 && !feedbackOk) txt('あと' + (NEEDED - cuts) + '本', W / 2, H * 0.72, 52, C.yellow);

    scanlines();
  });

  game.onStart(function() {
    // 80s NEON の緊迫メロディ(固有BGM)
    game.audio.melody(
      [['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
       ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['A4', 1], ['E4', 1]],
      { tempo: 150, wave: 'square', volume: 0.09, loop: true,
        bass: [['E2', 1], ['E2', 1], ['A2', 1], ['G2', 1], ['C3', 1], ['E2', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
