// I-Switch-0009-corridor-flip-hopper.js
// コリドー・フリップ・ホッパー — 左右の壁からせり出す針を見て、閉まる直前の窓の間にタップして跳ね返る方向を反転する
// 操作: 画面をタップするたびに、跳ねている機械仕掛けの相棒が反転して逆向きに跳ねる。針が出る壁に向かう前にタップする
// 終わり: 規定回数(5回)針を避ければ成功。針が出た壁に当たれば失敗
// @mechanic: timing_window
// @theme: mechanical_corridor_hopper
// 世界観: 歯車仕掛けの細い通路を跳ね回るぜんまい仕掛けの相棒。左右の壁からせり出す針を見切り、タップで跳ねる向きを反転してかわす
// 残るもの: 正誤(CLEAR/GAME OVER) + 反転に成功した回数
// スタイル: TOON SHADE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭線+平坦な塗り、影は濃い単色ブロック
  var C = {
    bg: '#2a2238', bg2: '#1a1424', wallL: '#4a3c60', wallR: '#4a3c60',
    spike: '#ff5c6e', spikeDark: '#8a1c2a', hopper: '#ffd24d', hopperDark: '#b8892a',
    good: '#5cffb0', bad: '#ff5c6e', gold: '#ffd24d', white: '#ffffff', ink: '#0a0710',
  };

  var GAME_TITLE = 'CORRIDOR FLIP';
  var TOTAL = 5;
  var CY = H * 0.5;
  var LEFT_X = W * 0.16, RIGHT_X = W * 0.84;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HOPPER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(LEFT_X - 90, 0, 30, H, C.wallL);
    game.draw.rect(RIGHT_X + 60, 0, 30, H, C.wallR);
    for (var i = 0; i < 10; i++) game.draw.line(LEFT_X - 60, i * 210, RIGHT_X + 60, i * 210, '#ffffff05', 2);
  }

  function drawHopper(x, y, sq) {
    game.draw.sprite(HOPPER, { '#': C.hopper }, x, y - sq, 20, { anchor: 'center' });
  }

  // 1ラウンド: dir=1(左→右へ跳ぶ、右壁の針を警戒)/-1(右→左、左壁の針を警戒)。round0は安全な導入
  function newHop(rnd, dir) {
    return { dir: dir, t: 0, dur: Math.max(0.8, 1.3 - rnd * 0.07), hazard: rnd > 0, telegraphed: false, resolved: false };
  }

  var round, hop, hopX, hopY, squash;
  var saved, done, endWait, finished, hitStop, shake, ready;

  function initGame() {
    saved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; hopX = LEFT_X; hopY = CY; squash = 0;
    hop = newHop(0, 1);
  }

  function windowOpen(h) {
    var p = h.t / h.dur;
    return h.hazard && p > 0.5 && p < 0.9;
  }

  function nextWall(h) { return h.dir === 1 ? RIGHT_X : LEFT_X; }

  function doTap() {
    if (!hop || ready > 0 || done || finished) return;
    if (hop.hazard && !hop.resolved) {
      if (windowOpen(hop)) {
        hop.resolved = true;
        saved++;
        squash = 10;
        game.feedback.good(hopX, hopY, { text: 'SAVE', color: C.good });
        game.fx.burst(hopX, hopY, { color: C.gold, count: 14, speed: 300 });
        game.audio.play('se_good', 0.4);
        if (saved === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', hopX, hopY - 180, { color: C.gold, size: 40 });
        if (saved >= TOTAL) { ok = true; finished = true; finish(); return; }
        round++;
        hop = newHop(round, -hop.dir);
        return;
      }
      // 窓が開く前の早すぎるタップ: 針が出る前に反転して安全に離れる(ニュートラル受理)
      game.audio.play('se_tap', 0.15);
      hop = newHop(round, -hop.dir);
      hop.hazard = false;
      return;
    }
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) doTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawWall(side, h) {
    var isTarget = h && h.hazard && !h.resolved && nextWall(h) === (side === 'left' ? LEFT_X : RIGHT_X);
    var x = side === 'left' ? LEFT_X - 75 : RIGHT_X + 75;
    if (isTarget) {
      var p = h.t / h.dur;
      var blink = p > 0.3 && Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.line(x, CY - 260, x, CY + 260, C.spike, 10);
      if (p > 0.5) {
        var ext = Math.min(1, (p - 0.5) / 0.4) * 70;
        game.draw.rect(side === 'left' ? x - 10 : x - ext - 10, CY - 30, ext + 20, 60, C.spikeDark);
        game.draw.circle(side === 'left' ? x + ext : x - ext, CY, 18, C.spike);
      }
    }
  }

  function advancePos(h) {
    var p = h.t / h.dur;
    var fromX = h.dir === 1 ? LEFT_X : RIGHT_X;
    var toX = h.dir === 1 ? RIGHT_X : LEFT_X;
    hopX = fromX + (toX - fromX) * Math.min(1, p);
    hopY = CY - Math.sin(Math.min(1, p) * Math.PI) * 110;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    demo.press = false;
    hop.t += dt;
    advancePos(hop);
    squash *= 0.85;
    if (hop.hazard && windowOpen(hop) && !hop.resolved && hop.t / hop.dur > 0.62 && hop.t / hop.dur < 0.78) {
      hop.resolved = true; squash = 10; demo.press = true;
      game.feedback.good(hopX, hopY, { text: 'SAVE', color: C.good });
      game.audio.play('se_good', 0.25);
      saved = Math.min(TOTAL, saved + 1);
      round++;
      hop = newHop(round % 3, -hop.dir);
    } else if (hop.t / hop.dur >= 1) {
      round++;
      hop = newHop(round % 3, -hop.dir);
    }
    demo.gx = hopX; demo.gy = hopY + 160;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawWall('left', hop); drawWall('right', hop);
      drawHopper(hopX, hopY, squash);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWall('left', null); drawWall('right', null);
      drawHopper(hopX, hopY, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(saved + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - saved) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(saved, { saved: saved, total: TOTAL }); else game.end.failure({ saved: saved, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      hop.t += dt;
      advancePos(hop);
      squash *= 0.85;
      if (hop.t / hop.dur >= 1 && !hop.resolved) {
        if (hop.hazard) {
          hop.resolved = true;
          hitStop = 0.35;
          game.feedback.bad(hopX, hopY, { text: 'HIT' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        } else {
          round++;
          hop = newHop(round, -hop.dir);
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) { drawWall('left', hop); drawWall('right', hop); }
    drawHopper(hopX, hopY, squash);

    txt(saved + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (saved / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
