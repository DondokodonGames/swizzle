// K-X-0023-rotating-stage-turn.js
// ローテイティングステージターン — 回り舞台の奏者たちに続き、自分の出番の一瞬だけ演奏する
// 操作: ゲージが手前の光る区間に入った瞬間だけタップする。それ以外のタップは効かない
// 終わり: 規定回数(6回)出番を合わせられれば成功。3回逃せば失敗
// @mechanic: cooldown_tap
// @theme: rotating_stage_turn
// 世界観: 円形の回り舞台。奏者たちが順番に一節ずつ音を重ねていく合奏で、自分の出番は一巡につき一瞬だけ。我慢して待ち、その一瞬だけ音を重ねる
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた出番数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 奥行きのある擬似遠近の床、水平帯のグラデーションで奥行きを出す
  var C = {
    bg: '#0d1630', bg2: '#050912', floor: '#1a2a55', floorLine: '#2f4788',
    spot: '#ffd23f', accent: '#7fd4ff', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffe066', white: '#eef4ff', ink: '#03050c',
  };

  var GAME_TITLE = 'STAGE TURN';
  var TOTAL = 6;
  var STRIKE_LIMIT = 3;
  var CX = W * 0.5;
  var BAR_Y = H * 0.80, BAR_X0 = W * 0.18, BAR_X1 = W * 0.82;
  var WIN0 = 0.70, WIN1 = 0.90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, strikes, cycleT, cycleLen, resolved, score;
  var done, endWait, finished, ready, hitStop, shake, flashSpot;
  var back1, back2, back3;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['.##.', '####', '.##.', '####', '#..#'];
  var BACKUP = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) {
      var yy = H * 0.34 + i * i * 6;
      game.draw.rect(0, yy, W, 3, C.floorLine, 0.3);
    }
    game.draw.rect(0, H * 0.34, W, H * 0.5, C.floor, 0.12);
  }

  function phaseOf(t, len) { return (t % len) / len; }

  function drawBackups() {
    var p1 = phaseOf(cycleT, cycleLen);
    var lit1 = p1 > 0.02 && p1 < 0.16;
    var lit2 = p1 > 0.26 && p1 < 0.40;
    var lit3 = p1 > 0.50 && p1 < 0.64;
    game.draw.sprite(BACKUP, { '#': lit1 ? C.spot : C.accent }, W * 0.22, H * 0.42 + Math.sin(game.time.elapsed * 2.3) * 6, lit1 ? 15 : 11, { anchor: 'center', alpha: lit1 ? 1 : 0.5 });
    game.draw.sprite(BACKUP, { '#': lit2 ? C.spot : C.accent }, W * 0.78, H * 0.42 + Math.cos(game.time.elapsed * 2.1) * 6, lit2 ? 15 : 11, { anchor: 'center', alpha: lit2 ? 1 : 0.5 });
    game.draw.sprite(BACKUP, { '#': lit3 ? C.spot : C.accent }, W * 0.5, H * 0.34 + Math.sin(game.time.elapsed * 1.9) * 5, lit3 ? 15 : 11, { anchor: 'center', alpha: lit3 ? 1 : 0.5 });
  }

  function drawBar(hot) {
    game.draw.rect(BAR_X0, BAR_Y - 14, BAR_X1 - BAR_X0, 28, C.ink, 0.5);
    game.draw.rect(BAR_X0 + (BAR_X1 - BAR_X0) * WIN0, BAR_Y - 14, (BAR_X1 - BAR_X0) * (WIN1 - WIN0), 28, hot ? C.white : C.gold, hot ? 1 : 0.7);
    var p = phaseOf(cycleT, cycleLen);
    game.draw.circle(BAR_X0 + (BAR_X1 - BAR_X0) * p, BAR_Y, 16, C.accent);
  }

  function drawPlayer(hot) {
    game.draw.sprite(PLAYER, { '#': hot ? C.spot : C.accent }, CX, H * 0.90, 22, { anchor: 'center' });
  }

  function initGame() {
    hits = 0; strikes = 0; cycleT = 0; cycleLen = 1.7; resolved = false; score = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashSpot = 0;
  }

  function resolveTap() {
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    var p = phaseOf(cycleT, cycleLen);
    if (p < WIN0) {
      game.feedback.bad(CX, H * 0.90, { text: null, sound: 'se_bad', volume: 0.15, shake: 4, flashColor: '#552222' });
      return;
    }
    resolved = true;
    if (p <= WIN1) {
      hits++; score += 100;
      flashSpot = 0.2; hitStop = 0.1;
      game.feedback.good(CX, H * 0.90, { text: p < WIN0 + (WIN1 - WIN0) * 0.4 ? 'GOOD' : 'PERFECT', color: C.gold });
      if (hits === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', CX, H * 0.6, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
    } else {
      strikes++;
      hitStop = 0.2; shake = 0.2;
      game.feedback.bad(CX, H * 0.90, { text: 'MISS' });
    }
    advance();
  }

  function advance() {
    if (strikes >= STRIKE_LIMIT) { ok = false; finished = true; finish(); return; }
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    cycleT = 0; resolved = false; cycleLen = Math.max(1.3, cycleLen - 0.06);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); resolveTap(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.90, press: false, did: false, ct: 0, cl: 1.8 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % demo.cl;
    if (cyc < dt || demo.t <= dt) demo.did = false;
    demo.ct = cyc; cycleT = cyc; cycleLen = demo.cl;
    demo.gx = CX + Math.sin(game.time.elapsed * 2.4) * 12;
    demo.gy = H * 0.90 + Math.cos(game.time.elapsed * 2.0) * 8;
    var p = phaseOf(cyc, demo.cl);
    demo.press = p > WIN0 && p < WIN1;
    if (demo.press && !demo.did) {
      demo.did = true;
      game.feedback.good(CX, H * 0.90, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.2 });
      flashSpot = 0.2;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cycleT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBackups();
      drawBar(flashSpot > 0);
      drawPlayer(flashSpot > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBackups();
      drawBar(false);
      drawPlayer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cycleT += dt;
      var p = phaseOf(cycleT, cycleLen);
      if (cycleT >= cycleLen && p < 0.1 && !resolved) {
        resolved = true;
        strikes++;
        hitStop = 0.2; shake = 0.2;
        game.feedback.bad(CX, H * 0.90, { text: 'MISS' });
        advance();
      }
    }
    if (flashSpot > 0) flashSpot -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawBackups();
    drawBar(flashSpot > 0);
    drawPlayer(flashSpot > 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['B3', 0.2], ['D4', 0.2], ['G4', 0.4]], { tempo: 138, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
