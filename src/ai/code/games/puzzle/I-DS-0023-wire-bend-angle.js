// I-DS-0023-wire-bend-angle.js
// ワイヤーベンド — 台に固定された針金の先端を指でつまんで倒し、示された角度に曲げて合わせる
// 操作: 針金の先端(丸い持ち手)を指で押さえたままドラッグすると根元を軸に倒れる。3本連続で角度マークに合わせて指を離す
// 終わり: 3本とも許容角度内で離せば成功。角度がずれたまま離す/範囲を大きく超えると失敗
// @mechanic: drag_follow
// @theme: wire_bending_bench
// 世界観: 街角の金属加工台。見習い職人が師匠の指す角度に合わせて、一本の針金を根元から曲げて仕上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 規定角度に合わせた本数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目/フェルト/革の質感をgradient+細線、ボタンは上明下暗グラデ+白ハイライト
  var C = {
    bg: '#5a4326', bg2: '#3c2c18', bench: '#7a5c34', benchEdge: '#43310f',
    wire: '#c7cdd6', wireDark: '#8a919c', ring: '#ffd27a', ringOk: '#5fd67a',
    good: '#5fd67a', bad: '#ff6f6f', gold: '#ffd27a', white: '#fff6e6', ink: '#241708',
  };

  var GAME_TITLE = 'WIRE BEND';
  var PX = W * 0.5, PY = H * 0.56; // 針金の根元(軸)
  var LEN = 300;
  var ROUNDS = 3;
  var TOL = 9; // 度

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, targetAng, curAng, holding, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VISE = ['####', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    // 木目ストリップ
    for (var y = 0; y < H; y += 24) {
      game.draw.rect(0, y, W, 3, '#ffffff05');
    }
    game.draw.rect(0, PY - 20, W, 40, C.bench);
    game.draw.rect(0, PY - 24, W, 6, C.benchEdge);
    game.draw.sprite(VISE, { '#': '#8f8f92' }, PX, PY, 20, { anchor: 'center' });
  }

  function angToXY(ang, len) {
    var rad = (ang - 90) * Math.PI / 180;
    return { x: PX + Math.cos(rad) * len, y: PY + Math.sin(rad) * len };
  }

  function drawWire(ang, color) {
    var tip = angToXY(ang, LEN);
    game.draw.line(PX, PY, tip.x, tip.y, C.wireDark, 16);
    game.draw.line(PX, PY, tip.x, tip.y, color, 10);
    game.draw.circle(tip.x, tip.y, 22, color);
    return tip;
  }

  function drawTargetMark(ang) {
    var p1 = angToXY(ang - TOL, LEN + 30);
    var p2 = angToXY(ang + TOL, LEN + 30);
    var mid = angToXY(ang, LEN + 40);
    game.draw.line(PX, PY, p1.x, p1.y, '#ffffff20', 3);
    game.draw.line(PX, PY, p2.x, p2.y, '#ffffff20', 3);
    game.draw.circle(mid.x, mid.y, 14, C.ring, 0.6);
  }

  function newTarget(r) {
    var opts = [-60, -30, 20, 50, 70, -75];
    return opts[r % opts.length];
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false; holding = false;
    ready = 0.8; hitStop = 0; shake = 0;
    targetAng = newTarget(0); curAng = 0;
  }

  function xyToAng(x, y) {
    var rad = Math.atan2(y - PY, x - PX);
    return rad * 180 / Math.PI + 90;
  }

  function evalRelease(x, y) {
    if (done || ready > 0 || finished) return;
    var diff = Math.abs(curAng - targetAng);
    if (diff <= TOL) {
      cleared++;
      game.feedback.good(x, y, { text: 'PERFECT', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (cleared === 2) game.fx.popup('あと1本!', PX, PY - 260, { color: C.gold, size: 34 });
      hitStop = 0.12;
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      targetAng = newTarget(round); curAng = 0; holding = false;
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    holding = true;
    curAng = Math.max(-88, Math.min(88, xyToAng(x, y)));
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !holding || done || finished) return;
    curAng = Math.max(-88, Math.min(88, xyToAng(x, y)));
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding) return;
    holding = false;
    evalRelease(x, y);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PX, gy: PY - LEN, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { curAng = 0; targetAng = 45; }
    if (cyc < 1.8) {
      var p = cyc / 1.8;
      curAng = 0 + (targetAng - 0) * p;
      demo.press = true;
    } else {
      demo.press = false;
    }
    var tip = angToXY(curAng, LEN);
    demo.gx = tip.x; demo.gy = tip.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTargetMark(targetAng);
      drawWire(curAng, C.wire);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.93, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWire(curAng, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '本!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTargetMark(targetAng);
    if (!finished) drawWire(curAng, C.wire);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.6]], { tempo: 108, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
