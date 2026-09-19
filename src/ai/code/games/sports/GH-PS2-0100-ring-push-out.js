// GH-PS2-0100-ring-push-out.js
// ドヒョウプッシュ — 土俵の上で連打して力士を押し出す。相手のタメには連打で対抗
// 操作: 画面下の手形を連打して押す。相手が光って身構えたら、光っている間だけ連打を強めて耐える
// 終わり: 相手を土俵の外まで押し出せば勝ち。押し出されれば負け
// @mechanic: push_out
// @theme: dohyo_sumo
// 世界観: 丸い土俵の上、大きな力士どうしが組み合う。連打した分だけ押せるが、相手はときどき光って渾身の突っ張りを溜め、そこで押し負けると大きく押し戻される
// 残るもの: 勝敗(CLEAR/GAME OVER) + 最大パワー + 押し返された回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ。床に楕円影。間合いと構えで見せる
  var C = {
    sky1: '#ffdca0', sky2: '#ff9a5a', ring: '#e0b060', ringEdge: '#8a5a2a', ringOut: '#c94a3a',
    p1: '#4a7ae8', p2: '#e8544a', p1d: '#2a55b0', p2d: '#b0362a',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff6e6', ink: '#2a1808',
  };

  var GAME_TITLE = 'RING PUSH OUT';
  var CX = W / 2, RY = H * 0.46, RR = 300;
  var CHARGE_INTERVAL_MIN = 2.6, CHARGE_INTERVAL_MAX = 4.2, CHARGE_WARN = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var pos, power, maxPower, pushbacks, mashN, mashWindow, mashDecay;
  var oppCharge, oppChargeT, oppChargeState; // 'idle'|'warn'|'strike'
  var done, endWait, finished;
  var ready, hitStop, shake, p1Squash, p2Squash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function ringBg() {
    game.draw.gradient(0, H * 0.55, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, H * 0.55, W, H * 0.45, '#c9875a');
    game.draw.circle(CX, H * 0.14, 50, '#fff2c8', 0.6);
    for (var i = 0; i < 5; i++) game.draw.rect(i * 220 + 20, H * 0.20, 16, H * 0.16, '#a86a3a', 0.4);
    game.draw.circle(CX, RY + 40, RR, C.ringOut);
    game.draw.circle(CX, RY + 40, RR - 22, C.ring);
    for (var a = 0; a < 20; a++) {
      var ang = (a / 20) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(ang) * (RR - 10), RY + 40 + Math.sin(ang) * (RR - 10) * 0.72, 6, C.ringEdge, 0.7);
    }
  }

  var P_SPRITE = ['.####.', '######', '.#.##.', '######', '##..##'];
  var P_SPRITE_STRAIN = ['.####.', '######', '.#**#.', '######', '##..##'];

  function drawWrestler(x, y, sz, pal, squash, strained) {
    var s = 1 - squash * 0.12;
    game.draw.circle(x, y + sz * 0.62, sz * 0.5, '#00000030');
    game.draw.sprite(strained ? P_SPRITE_STRAIN : P_SPRITE, pal, x, y, (sz / 6) * s, { anchor: 'center' });
  }

  function initGame() {
    pos = 0; power = 0; maxPower = 0; pushbacks = 0;
    mashN = 0; mashWindow = 0; mashDecay = 0;
    oppCharge = 0; oppChargeT = CHARGE_INTERVAL_MIN + game.random(0, CHARGE_INTERVAL_MAX - CHARGE_INTERVAL_MIN); oppChargeState = 'idle';
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; p1Squash = 0; p2Squash = 0;
  }

  function tapPush() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    mashN++;
    mashWindow = 0.5;
    p1Squash = 1;
    var gain = oppChargeState === 'strike' ? 0.010 : 0.024; // 相手の突っ張り中は押しにくい
    pos += gain;
    power = Math.min(1, power + 0.14);
    maxPower = Math.max(maxPower, mashN);
    game.audio.play('se_tap', 0.12);
    if (oppChargeState === 'strike' && pos > -0.85) {
      // 連打で耐えきれた分だけ相手の突っ張りを打ち消す
      oppCharge -= 0.09;
    }
    if (pos >= 1) resolve(true);
  }

  function resolveStrike() {
    // 突っ張りタイム終了時、耐えきれていなければ大きく押し戻される
    if (oppCharge > 0.25) {
      pushbacks++;
      hitStop = 0.3;
      pos -= 0.30;
      p2Squash = 1;
      game.feedback.bad(CX, RY, { text: 'MISS' });
      shake = 0.28;
      game.fx.burst(CX, RY, { color: C.bad, count: 16, speed: 360 });
      game.audio.play('se_bad', 0.4);
      if (pos <= -1) { resolve(false); return; }
    } else {
      game.feedback.good(CX, RY - 90, { text: 'NICE', color: C.good });
      game.fx.popup('NICE', CX, RY - 130, { color: C.good, size: 34 });
      game.audio.play('se_milestone', 0.35);
    }
  }

  function resolve(win) {
    ok = win; finished = true;
    hitStop = Math.max(hitStop, 0.2);
    if (win) { game.fx.burst(CX, RY, { color: C.gold, count: 22, speed: 420 }); game.audio.play('se_success', 0.5); }
    else { shake = 0.35; game.audio.play('se_failure', 0.5); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    if (y < H * 0.60) return;
    tapPush();
  });

  function stepOpponent(dt) {
    if (oppChargeState === 'idle') {
      oppChargeT -= dt;
      if (oppChargeT <= CHARGE_WARN && oppChargeT > 0) oppChargeState = 'warn';
    } else if (oppChargeState === 'warn') {
      oppChargeT -= dt;
      if (oppChargeT <= 0) { oppChargeState = 'strike'; oppChargeT = 0.9; oppCharge = 1; game.audio.tone(140, 0.25, { wave: 'sawtooth', volume: 0.22, slide: -40 }); }
    } else if (oppChargeState === 'strike') {
      oppChargeT -= dt;
      p2Squash = Math.min(1, p2Squash + dt * 2);
      if (oppChargeT <= 0) {
        resolveStrike();
        oppChargeState = 'idle';
        oppChargeT = CHARGE_INTERVAL_MIN + game.random(0, CHARGE_INTERVAL_MAX - CHARGE_INTERVAL_MIN);
      }
    }
    // 連打が止まるとじわじわ押される(自然圧)
    mashWindow -= dt;
    if (mashWindow <= 0 && oppChargeState !== 'strike') pos -= 0.03 * dt;
    pos = Math.max(-1, Math.min(1, pos));
    if (pos <= -1 && !finished) resolve(false);
  }

  function drawArena() {
    var barX = CX + pos * 260;
    var p1x = CX - 140 + pos * 90, p2x = CX + 140 + pos * 90;
    drawWrestler(p1x, RY, 260, { '#': C.p1, '*': C.gold }, p1Squash, false);
    drawWrestler(p2x, RY - 20, 280, { '#': C.p2, '*': C.white }, p2Squash, oppChargeState !== 'idle');
    if (oppChargeState === 'warn') {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(p2x, RY - 20, 190, C.bad, 0.35);
    } else if (oppChargeState === 'strike') {
      game.draw.circle(p2x, RY - 20, 210, C.gold, 0.28);
    }
    game.draw.line(CX - 280, RY + 200, CX + 280, RY + 200, C.ringEdge, 6);
    game.draw.circle(barX, RY + 200, 20, C.gold);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (pos === undefined) initGame();
    if (!finished) {
      stepOpponent(dt);
      var mashing = oppChargeState === 'strike' || Math.floor(demo.t * 6) % 2 === 0;
      demo.press = mashing;
      if (mashing && Math.floor(demo.t * 12) % 2 === 0) tapPush();
    }
    demo.gx = CX; demo.gy = H * 0.86;
    if (finished || pos <= -1 || pos >= 1) { var t = demo.t; initGame(); demo.t = t; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      ringBg();
      stepDemo(dt);
      drawArena();
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 12, demo.gy + Math.cos(game.time.elapsed * 1.7) * 12, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      ringBg();
      drawArena();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt('MAX ' + maxPower, W / 2, H * 0.11, 30, C.gold);
      txt('HIT ' + pushbacks, W / 2, H * 0.155, 26, C.white);
      if (maxPower > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.20, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { maxPower: maxPower, pushbacks: pushbacks };
        if (ok) game.end.success(maxPower, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepOpponent(dt);
    }
    if (shake > 0) shake -= dt;
    if (p1Squash > 0) p1Squash = Math.max(0, p1Squash - dt * 4);
    if (p2Squash > 0) p2Squash = Math.max(0, p2Squash - dt * 3);

    ringBg();
    drawArena();

    var progress = (pos + 1) / 2; // 土俵際ゲージの進捗(0=自分際, 1=相手際)
    game.draw.rect(60, 40, W - 120, 22, C.ink, 0.45);
    game.draw.rect(60, 40, (W - 120) * progress, 22, oppChargeState === 'strike' ? C.bad : C.gold);
    txt('POWER ' + mashN, W / 2, 108, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 70, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['C3', 0.2], ['R', 0.1], ['C3', 0.2], ['R', 0.1], ['G3', 0.2], ['R', 0.1], ['C3', 0.2], ['R', 0.1]],
      { tempo: 108, wave: 'square', volume: 0.08, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
