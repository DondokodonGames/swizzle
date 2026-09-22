// K-X-0031-comet-arc-trace.js
// コメットアークトレース — 円周に沿って伸びる彗星の光の尾を、指でなぞって追う
// 操作: 円周上を伸びていく光の帯からはみ出さないよう、指でなぞり続ける
// 終わり: 光の帯が一周し終われば成功。帯の外に指がはみ出せば失敗
// @mechanic: trace
// @theme: comet_arc_tracer
// 世界観: 丸いドームの天井を見上げる観測者。彗星が弧を描いて空を横切り、その光跡を指でなぞって記録する
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞり切った進行度%
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光ラインのみ。塗りは使わずワイヤーフレーム的に
  var C = {
    bg: '#000000', bg2: '#050014', line: '#00ffcc', lineDim: '#0a4a44',
    band: '#00ffcc', bandEdge: '#00ffff', good: '#39ff6a', bad: '#ff4455',
    gold: '#ffe066', white: '#ffffff', ink: '#000000',
  };

  var GAME_TITLE = 'COMET ARC';
  var CX = W * 0.5, CY = H * 0.46;
  var RADIUS = 380;
  var HALF = 70;
  var START_ANGLE = -Math.PI / 2;
  var TOTAL_ARC = Math.PI * 2 - 0.001;
  var ARC_DUR = 8.5; // 総所要(秒)。方向反転で緩急をつける

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var progress, cursorAngle, done, endWait, finished, dir;
  var ready, hitStop, shake, segMarks;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COMET = ['..#..', '.###.', '#####', '.###.', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 40; i++) {
      var sx = (i * 137) % W, sy = (i * 89) % H;
      game.draw.rect(sx, sy, 2, 2, '#ffffff22');
    }
    game.draw.circle(CX, CY, RADIUS + HALF + 20, C.lineDim, 0.15);
  }

  // 目標角度: 0-1で往復せず、方向転換を含む累積角配列で「フェイント」を作る
  var TURNS = [
    { end: 0.42, dir: 1 },
    { end: 0.58, dir: -1 },
    { end: 1.0, dir: 1 },
  ];

  function targetAngle(p) {
    var a = START_ANGLE;
    var prevEnd = 0, curDir = 1;
    var acc = 0;
    for (var i = 0; i < TURNS.length; i++) {
      var seg = TURNS[i];
      var segLen = seg.end - prevEnd;
      if (p <= seg.end || i === TURNS.length - 1) {
        var local = Math.max(0, Math.min(segLen, p - prevEnd));
        acc += local * seg.dir;
        break;
      } else {
        acc += segLen * seg.dir;
      }
      prevEnd = seg.end;
    }
    return START_ANGLE + acc * TOTAL_ARC;
  }

  function ptAt(angle) { return { x: CX + Math.cos(angle) * RADIUS, y: CY + Math.sin(angle) * RADIUS }; }

  function initGame() {
    progress = 0; cursorAngle = START_ANGLE; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; segMarks = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var dx = x - CX, dy = y - CY;
    var dist = Math.hypot(dx, dy);
    if (Math.abs(dist - RADIUS) > HALF) {
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    var touchAngle = Math.atan2(dy, dx);
    // 目標角に対する最短弧距離で進捗を近似
    var target = targetAngle(Math.min(1, progress + 0.4));
    var diff = Math.atan2(Math.sin(touchAngle - target), Math.cos(touchAngle - target));
    if (Math.abs(diff) < 0.5) {
      var newP = Math.min(1, progress + game.time.delta / ARC_DUR);
      if (newP > progress) {
        var beforeQ = Math.floor(progress * 4);
        progress = newP;
        var afterQ = Math.floor(progress * 4);
        if (afterQ > beforeQ) { segMarks++; game.fx.popup(Math.round(progress * 100) + '%', x, y - 60, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.3); }
      }
    }
    cursorAngle = touchAngle;
    if (progress >= 0.995) {
      finished = true; ok = true; hitStop = 0.1;
      var p2 = ptAt(targetAngle(1));
      game.feedback.good(p2.x, p2.y, { text: 'CLEAR', color: C.good });
      game.fx.burst(p2.x, p2.y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawArc(headP) {
    var steps = 60;
    var prevA = null;
    for (var i = 0; i <= steps; i++) {
      var p = (i / steps) * Math.min(1, headP);
      var a = targetAngle(p);
      if (prevA !== null) {
        var p1 = ptAt(prevA), p2 = ptAt(a);
        game.draw.line(p1.x, p1.y, p2.x, p2.y, C.bandEdge, HALF * 2 + 8);
        game.draw.line(p1.x, p1.y, p2.x, p2.y, C.band, HALF * 2 - 10);
      }
      prevA = a;
    }
    var start = ptAt(START_ANGLE);
    game.draw.circle(start.x, start.y, 20, C.gold);
    if (headP < 1) {
      var head = ptAt(targetAngle(headP));
      game.draw.sprite(COMET, { '#': C.white }, head.x, head.y, 8, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(1, (cyc / 3.8));
    progress = Math.max(progress || 0, target);
    var a = targetAngle(target);
    var p = ptAt(a);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.8;
    cursorAngle = a;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawArc(progress);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawArc(progress);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(progress * 100) + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - Math.round(progress * 100)) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(progress * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawArc(progress);
    if (!finished) {
      var c = ptAt(cursorAngle);
      game.draw.circle(c.x, c.y, 16, C.white);
    }

    txt(Math.round(progress * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.85, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
