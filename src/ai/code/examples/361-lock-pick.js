// 361-lock-pick.js
// ロックピック — 揺れる鍵のテンション針が緑ゾーンに来た瞬間にタップしてピンを固定
// 操作: 針が緑ゾーンに重なった瞬間にタップ
// 成功: 制限時間内に 4 つ開ける  失敗: 時間切れ
// @mechanic: timing_one_shot
// @theme: ghost
// 世界観: おばけ屋敷に忍び込む霊媒探偵が、呪われた錠前の針を読んでピンを外す
// variation: 精度型(開けるほど緑ゾーンが狭くなる)
// spice: 黄金ターゲット(稀に金の錠前=得点2倍が出る)
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON(おばけ屋敷)
  var C = {
    murk: '#0d0322', violet: '#7a2fff', green: '#39ff9a', ghost: '#c9b8ff',
    gold: '#ffd23f', red: '#ff3b6b', white: '#f2ecff', dim: '#331a5a', pink: '#ff5db1',
  };

  var GAME_TITLE = 'LOCK PICK';
  var MAX_TIME = 13;
  var NEEDED = 4;
  var DIAL_X = W / 2, DIAL_Y = H * 0.42, DIAL_R = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var needle, ndir, nspeed, zoneA, zoneW, gold;
  var score, locks, timeLeft, done, ready, hitStop, feedback, feedbackOk, openFlash;

  // 錠前(顔つきスカルロック)
  var LOCK = [
    '..VVVV..',
    '.VWWWWV.',
    'VWKWWKWV',
    'VWWWWWWV',
    'VWKKKKWV',
    'VWWWWWWV',
    '.VWWWWV.',
    '..VGGV..',
  ];
  var LOCK_COL = { V: '#3a1a6a', W: C.ghost, K: '#1a0730', G: C.gold };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#050014', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.16); }

  function murkBg() {
    game.draw.gradient(0, H, [[0, '#1a0640'], [0.5, '#0d0322'], [1, '#04010f']]);
    // 漂う霊気
    for (var i = 0; i < 8; i++) {
      var gx = (i * 191 + Math.sin(game.time.elapsed + i) * 60) % W;
      var gy = (H - ((game.time.elapsed * 30 + i * 240) % (H + 120)));
      game.draw.circle(gx, gy, 30 + (i % 3) * 12, C.violet, 0.08);
    }
  }

  // ダイヤル + 緑ゾーン + 針
  function drawDial(a, za, zw, isGold) {
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 16, C.dim, 0.6);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.murk, 1);
    // 緑ゾーン(円弧を短い線分で)
    for (var t = -zw; t <= zw; t += 0.04) {
      var ang = za + t;
      var x1 = DIAL_X + Math.cos(ang) * (DIAL_R - 40), y1 = DIAL_Y + Math.sin(ang) * (DIAL_R - 40);
      var x2 = DIAL_X + Math.cos(ang) * DIAL_R, y2 = DIAL_Y + Math.sin(ang) * DIAL_R;
      game.draw.line(x1, y1, x2, y2, isGold ? C.gold : C.green, 6);
    }
    // 針
    var nx = DIAL_X + Math.cos(a) * (DIAL_R - 8), ny = DIAL_Y + Math.sin(a) * (DIAL_R - 8);
    game.draw.line(DIAL_X, DIAL_Y, nx, ny, C.white, 10);
    game.draw.circle(nx, ny, 18, C.pink, 1);
    game.draw.circle(DIAL_X, DIAL_Y, 30, C.violet, 1);
  }

  function setupLock() {
    zoneA = -Math.PI / 2 + game.random(-1.2, 1.2);
    zoneW = Math.max(0.14, 0.42 - locks * 0.05); // 精度型: 狭くなる
    nspeed = 2.0 + locks * 0.35;
    ndir = Math.random() > 0.5 ? 1 : -1;
    needle = zoneA + Math.PI + game.random(-0.6, 0.6);
    gold = Math.random() < 0.25; // 黄金ターゲット
  }
  function initGame() {
    score = 0; locks = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false; openFlash = 0;
    setupLock();
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

  function angDiff(a, b) { var d = ((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return Math.abs(d); }

  function attempt() {
    if (angDiff(needle, zoneA) <= zoneW) {
      locks++;
      var gain = (gold ? 300 : 100);
      score += gain;
      feedback = 0.4; feedbackOk = true; openFlash = 0.5;
      game.feedback.good(DIAL_X, DIAL_Y, { text: gold ? 'GOLD +300' : '+100', color: gold ? C.gold : C.green });
      if (gold) game.audio.play('se_milestone');
      if (locks >= NEEDED) { finish(true); return; }
      setupLock();
    } else {
      feedback = 0.4; feedbackOk = false; hitStop = 0.32;
      game.feedback.bad(needle && DIAL_X + Math.cos(needle) * DIAL_R, DIAL_Y + Math.sin(needle) * DIAL_R, { text: 'MISS' });
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    attempt();
  });

  // ATTRACT ゴースト実演: 針が緑に来たら手がタップ
  var d = { a: 0, dir: 1, za: -Math.PI / 2, t: 0, gx: DIAL_X, gy: DIAL_Y + DIAL_R + 120, press: false };
  function stepDemo(dt) {
    d.t += dt;
    d.a += d.dir * 2.2 * dt;
    var near = angDiff(d.a, d.za) <= 0.3;
    d.gx += (DIAL_X + Math.cos(d.za) * DIAL_R - d.gx) * Math.min(1, dt * 3);
    d.gy += (DIAL_Y + Math.sin(d.za) * DIAL_R + 40 - d.gy) * Math.min(1, dt * 3);
    d.press = near;
    if (near && d.press && Math.floor(d.t * 3) % 2 === 0) {
      game.feedback.good(DIAL_X + Math.cos(d.za) * DIAL_R, DIAL_Y + Math.sin(d.za) * DIAL_R, { text: '+100', color: C.green });
      d.za = -Math.PI / 2 + (Math.random() - 0.5) * 2; d.dir = -d.dir;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      murkBg(); stepDemo(dt);
      drawDial(d.a, d.za, 0.3, false);
      game.draw.sprite(LOCK, LOCK_COL, DIAL_X, DIAL_Y, 14, { anchor: 'center' });
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.18, 40, C.green);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.pink);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      murkBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(LOCK, LOCK_COL, W / 2, H * 0.32, 18, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.52, 92, resultSuccess ? C.green : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.62, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.68, 42, C.gold);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.75, 54, C.pink);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.79, 46, C.green);
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
        needle += ndir * nspeed * dt;
      }
      if (feedback > 0) feedback -= dt;
      if (openFlash > 0) openFlash -= dt;
    }

    // draw
    murkBg();
    var near = angDiff(needle, zoneA) <= zoneW;
    drawDial(needle, zoneA, zoneW, gold); // 緑ゾーン=telegraph(針が近いほど「今だ」)
    game.draw.sprite(LOCK, LOCK_COL, DIAL_X, DIAL_Y, 14 + (openFlash > 0 ? 2 : 0), { anchor: 'center' });
    if (near) game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 24, C.green, 0.12);

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, gold ? C.gold : C.violet);
    game.draw.rect(60, 40, W - 120, 26, C.dim, 0.6);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.white);
    txt(locks + ' / ' + NEEDED, W / 2, 168, 44, C.green);
    if (gold && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('GOLD', W / 2, H * 0.72, 52, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.76, 92, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['A3', 0.5], ['C4', 0.5], ['B3', 0.5], ['D4', 0.5], ['C4', 0.5], ['E4', 0.5], ['A3', 1],
       ['G3', 0.5], ['Bb3', 0.5], ['A3', 0.5], ['C4', 0.5], ['E4', 1], ['A3', 1]],
      { tempo: 116, wave: 'square', volume: 0.08, loop: true,
        bass: [['A1', 1], ['A1', 1], ['F1', 1], ['G1', 1], ['E1', 1], ['A1', 1]], bassWave: 'triangle', bassVolume: 0.07 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
