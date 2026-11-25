// I-Switch2-0011v2-seaside-putt-flick.js
// 海辺のパター弾き — 弾く指の速さで強さを加減し、坂で曲がる玉を池をよけてカップまで転がす
// 操作: 下の画面のどこからでも、打ちたい向きへ指を払う。払う速さ=玉の勢い(距離は関係ない)。グリーンには坂(流れる矢印)があり玉が横へ曲がる。止まったらそこから打ち直せる。強すぎると奥の崖から海へ落ちる(社内メモ。画面には出さない)
// 終わり: 4ホールすべてカップに入れればCLEAR。池か海に落とすと玉を1個失い、3個失うか20秒切れでGAME OVER
// @mechanic: flick_launch
// @theme: seaside_putting_course_flick
// 世界観: 海沿いの崖の上のパターゴルフ場で、休日の会社員が坂のある芝の上で玉を弾き、池をよけながら4つのカップに順に沈めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 入れたホール数・合計打数・ホールインワン数・スコア
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var STYLE = { bg: ['#fdf6ff', '#cfeeff', '#bfe8c8'], main: ['#7ccf8a', '#7ab8ff', '#ff9ab8'], accent: ['#ffffff', '#ffd86a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var INK = '#5a5a7a';

  var GAME_TITLE = 'SEASIDE PUTT';
  var TIME_LIMIT = 20;
  var NEEDED = 4;
  var BALLS = 3;
  var TOP = H * 0.36, BOT = H * 0.74, L = 110, R = 970;
  var BR = 18, CUP_R = 30, CAP_V = 520, FRIC = 240, DRAG = 0.5, STEP = 1 / 120;
  var PAD = { x: W * 0.5, y: H * 0.87 };
  var MAN = { x: W * 0.25, y: H * 0.205 };

  // ホール設計(固定ステップの物理で、どれも直接ねらう筋とクッションの筋がある)
  var HOLES = [
    { tee: [636, 1340], cup: [549, 828], ponds: [[435, 1049, 99]], slope: 0, demo: [-9, 675] },
    { tee: [446, 1340], cup: [706, 790], ponds: [[672, 1061, 108]], slope: 100, demo: [18, 775] },
    { tee: [601, 1340], cup: [580, 794], ponds: [[501, 1078, 93], [791, 1163, 105]], slope: -130, demo: [3, 975] },
    { tee: [762, 1340], cup: [780, 779], ponds: [[663, 1003, 99], [328, 1140, 91]], slope: 160, demo: [37.5, 975] },
  ];

  var MAN_A = ['..cccccc..', '.cccccccc.', '..kssssk..', '..sgsgss..', '..ssssss..', '...smms...', '..pppppp..', '.pppwwppp.', 'sppppppps.', 's.pppppp..', '..nnnnnn..', '..nn..nn..', '..nn..nn..', '.kkk..kkk.'];
  var MAN_B = ['..cccccc..', '.cccccccc.', '..kssssk..', '..sgsgss..', '..ssssss..', '...smms...', 's.pppppp.s', 'sppppwwpps', '.pppppppp.', '..pppppp..', '..nnnnnn..', '..nn..nn..', '.nn....nn.', 'kkk....kkk'];
  var MAN_SAD = ['..........', '..cccccc..', '.cccccccc.', '..kssssk..', '..sksksk..', '..ssssss..', '...skks...', '..pppppp..', '.pppwwppp.', 's.pppppp.s', '..nnnnnn..', '..nn..nn..', '.kkk..kkk.', '..........'];
  var MAN_PAL = { c: '#ff9ab8', k: '#5a5a7a', s: '#ffd8c0', g: '#5a5a7a', m: '#ff7a8a', p: '#ffffff', w: '#7ab8ff', n: '#7a8aa8' };
  var GULL_A = ['k.....k', '.kk.kk.', '...k...'];
  var GULL_B = ['.......', 'kkk.kkk', '...k...'];
  var FLAG = ['kff.', 'kfff', 'kff.', 'k...', 'k...', 'k...'];
  var BALL_ICON = ['.www.', 'wwwww', 'wwbww', 'wwwww', '.www.'];

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var hi = 0, hole = HOLES[0];
  var ball = { x: 0, y: 0, vx: 0, vy: 0, moving: false, rx: 0, ry: 0, sink: 0 }, acc = 0;
  var drag = null, aim = null, warned = false, warnT = 0, lipT = 0;
  var holed = 0, strokes = 0, holeStrokes = 0, aces = 0, balls = BALLS, score = 0;
  var left = TIME_LIMIT, count = 0, stopT = 0, stopKind = '', holdT = 0, fadeT = 0, celebT = 0, cheer = 0, sad = 0;
  var on = false, cleared = false, bestAtStart = 0, splash = null;

  function write(str, x, y, size, color) {
    game.draw.text(str, x - 3, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x + 3, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x, y + 3, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function setHole(i) {
    hi = i; hole = HOLES[i];
    ball.x = hole.tee[0]; ball.y = hole.tee[1]; ball.vx = 0; ball.vy = 0; ball.moving = false; ball.sink = 0;
    ball.rx = ball.x; ball.ry = ball.y; acc = 0; holeStrokes = 0; splash = null;
  }

  // 実ロジック: 固定ステップの転がり。戻り値 'sea' | 'water' | 'cup' | 'rest' | null
  function physStep(b) {
    b.vx += hole.slope * STEP;
    var sp = Math.hypot(b.vx, b.vy), dec = (FRIC + DRAG * sp) * STEP;
    if (sp <= dec) { b.vx = 0; b.vy = 0; return 'rest'; }
    b.vx -= b.vx / sp * dec; b.vy -= b.vy / sp * dec;
    b.x += b.vx * STEP; b.y += b.vy * STEP;
    if (b.x < L + BR) { b.x = L + BR; b.vx = -b.vx * 0.7; }
    if (b.x > R - BR) { b.x = R - BR; b.vx = -b.vx * 0.7; }
    if (b.y > BOT - BR) { b.y = BOT - BR; b.vy = -b.vy * 0.7; }
    if (b.y < TOP - BR) return 'sea';
    for (var i = 0; i < hole.ponds.length; i++) {
      var p = hole.ponds[i];
      if (Math.hypot(b.x - p[0], b.y - p[1]) < p[2]) return 'water';
    }
    if (Math.hypot(b.x - hole.cup[0], b.y - hole.cup[1]) < CUP_R) {
      if (Math.hypot(b.vx, b.vy) < CAP_V) return 'cup';
      b.lip = true;
    }
    return null;
  }

  // telegraph: 0.6秒先まで転がしてみて、池か海に落ちるなら予告する
  function hazardAhead() {
    var b = { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
    for (var i = 0; i < 72; i++) {
      var r = physStep(b);
      if (r === 'sea' || r === 'water') return r;
      if (r) return null;
    }
    return null;
  }

  function launch(angDeg, spd, live) {
    var a = angDeg * Math.PI / 180;
    ball.rx = ball.x; ball.ry = ball.y;
    ball.vx = Math.sin(a) * spd; ball.vy = -Math.cos(a) * spd; ball.moving = true; acc = 0;
    warned = false; holeStrokes++;
    if (live) strokes++;
    var pitch = 300 + spd * 0.6;
    game.audio.tone(pitch, 0.08, { wave: 'triangle', volume: live ? 0.16 : 0.06, slide: 120 });
  }

  function onBall(r, live) {
    ball.moving = false;
    if (r === 'rest') {
      game.audio.tone('E5', 0.05, { wave: 'sine', volume: live ? 0.08 : 0.03 });
      return;
    }
    if (r === 'cup') {
      var ace = holeStrokes === 1;
      ball.sink = 0.45; stopT = 0.6; stopKind = 'cup'; cheer = 0.8;
      ball.x = hole.cup[0]; ball.y = hole.cup[1];
      game.feedback.good(hole.cup[0], hole.cup[1] - 60, { text: ace ? 'PERFECT' : 'NICE', color: ace ? STYLE.main[2] : STYLE.main[0], count: ace ? 20 : 12, volume: live ? 1 : 0.4 });
      if (!live) return;
      holed++;
      if (ace) { aces++; game.audio.play('se_powerup', 0.45); }
      score += ace ? 300 : holeStrokes === 2 ? 180 : 100;
      if (holed === 2) { game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.42, { color: STYLE.main[1], size: 60 }); game.audio.play('se_milestone', 0.5); }
      if (holed >= NEEDED) { cleared = true; finishRun(); }
      return;
    }
    // 池 / 海: 落ちた所を見せてから元の位置へ
    splash = { x: ball.x, y: Math.max(TOP - 20, ball.y), kind: r };
    stopT = 0.55; stopKind = 'lost'; sad = 0.9;
    game.feedback.bad(splash.x, splash.y, { text: 'MISS', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    game.fx.burst(splash.x, splash.y, { color: STYLE.main[1], count: 14, speed: 260 });
    if (!live) return;
    balls--;
    if (balls <= 0) { cleared = false; finishRun(); }
  }

  // 実ロジック: 1フレーム分。玉の転がり・予告・止まった後の処理
  function stepPlay(dt, live) {
    if (lipT > 0) lipT -= dt;
    if (warnT > 0) warnT -= dt;
    if (ball.sink > 0) ball.sink -= dt;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'cup') return 'holed';
        ball.x = ball.rx; ball.y = ball.ry; ball.vx = 0; ball.vy = 0; splash = null;
      }
      return null;
    }
    if (!ball.moving) return null;
    if (!warned) {
      var hz = hazardAhead();
      if (hz) { warned = true; warnT = 0.7; game.audio.tone('A3', 0.12, { wave: 'square', volume: live ? 0.1 : 0.04 }); }
    }
    acc += dt;
    while (acc >= STEP && ball.moving) {
      acc -= STEP;
      ball.lip = false;
      var r = physStep(ball);
      if (ball.lip && lipT <= 0) { lipT = 0.4; game.audio.tone('C6', 0.04, { wave: 'square', volume: live ? 0.08 : 0.03 }); }
      if (r) onBall(r, live);
    }
    return null;
  }

  function finishRun() {
    on = false; holdT = 0.55; celebT = 0;
    game.audio.stopBgm();
    if (cleared) { score += Math.round(left * 30) + Math.max(0, 8 - strokes) * 40; game.audio.play('se_success', 0.5); }
    else game.audio.play('se_failure', 0.45);
  }

  function startBgm() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['C6', 1], ['B5', 0.5], ['G5', 0.5], ['A5', 1],
      ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1],
    ], { tempo: 112, wave: 'sine', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
  }

  function initGame() {
    holed = 0; strokes = 0; aces = 0; balls = BALLS; score = 0;
    left = TIME_LIMIT; count = 0.8; stopT = 0; stopKind = ''; holdT = 0; fadeT = 0; celebT = 0; cheer = 0; sad = 0;
    on = false; cleared = false; drag = null; aim = null; warnT = 0;
    bestAtStart = game.best || 0;
    setHole(0);
  }

  // ── 入力: 払う速さ=勢い。押した位置は問わない ──
  function canShoot() { return state === STATE.PLAYING && on && !ball.moving && stopT <= 0; }
  game.onPress(function(x, y) {
    if (!canShoot() || y < H * 0.34) { drag = null; return; }
    drag = { pts: [{ x: x, y: y, t: Date.now() }] };
    game.audio.play('se_tap', 0.12);
  });
  game.onMove(function(x, y) {
    if (!drag) return;
    drag.pts.push({ x: x, y: y, t: Date.now() });
    if (drag.pts.length > 12) drag.pts.shift();
    aim = flickOf(drag.pts);
    if (aim && Math.random() < 0.2) game.audio.tone(300 + aim.spd * 0.5, 0.03, { wave: 'sine', volume: 0.04 });
  });
  game.onRelease(function(x, y) {
    if (!drag) return;
    drag.pts.push({ x: x, y: y, t: Date.now() });
    var f = flickOf(drag.pts);
    drag = null; aim = null;
    if (!canShoot()) return;
    if (!f || f.dy > -20) { game.audio.tone('C4', 0.05, { wave: 'square', volume: 0.06 }); game.fx.burst(x, y, { color: STYLE.main[2], count: 4, speed: 90 }); return; }
    launch(f.ang, f.spd, true);
    game.fx.burst(ball.x, ball.y, { color: STYLE.accent[0], count: 6, speed: 160 });
  });

  function flickOf(pts) {
    if (pts.length < 2) return null;
    var last = pts[pts.length - 1], first = pts[0];
    for (var i = pts.length - 2; i >= 0; i--) { first = pts[i]; if (last.t - pts[i].t >= 70) break; }
    var dx = last.x - first.x, dy = last.y - first.y;
    var ms = Math.max(16, last.t - first.t);
    var fv = Math.hypot(dx, dy) / (ms / 1000);
    var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    ang = Math.max(-80, Math.min(80, ang));
    return { ang: ang, spd: Math.max(250, Math.min(1700, fv * 0.4)), dy: dy };
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (canShoot()) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 70 }); }
  });

  // ── ATTRACT ゴースト実演: 各ホールの正解ショットを本番の物理で打つ。2回に1回は強すぎて海へ ──
  var demo = { t: 0, gx: PAD.x, gy: PAD.y + 80, press: false, n: 0, wait: 0, shot: false, over: false, flickT: 0 };
  function demoHole() {
    setHole(demo.n % NEEDED);
    demo.over = demo.n % 2 === 1;
    demo.n++; demo.wait = 0; demo.shot = false; demo.flickT = 0;
    stopT = 0; stopKind = '';
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { demo.n = 0; demoHole(); }
    var ev = stepPlay(dt, false);
    if (ev === 'holed') { demoHole(); return; }
    if (!demo.shot) {
      demo.wait += dt;
      var a = hole.demo[0] * Math.PI / 180;
      if (demo.wait > 0.7) {
        demo.flickT = Math.min(1, demo.flickT + dt / 0.2);
        demo.gx = PAD.x + Math.sin(a) * 260 * demo.flickT; demo.gy = PAD.y + 80 - Math.cos(a) * 260 * demo.flickT; demo.press = true;
        if (demo.flickT >= 1) { demo.shot = true; launch(hole.demo[0], hole.demo[1] * (demo.over ? 1.5 : 1), false); }
      } else { demo.gx = PAD.x; demo.gy = PAD.y + 80; demo.press = demo.wait > 0.4; }
    } else {
      demo.press = false;
      if (!ball.moving && stopT <= 0) { demo.wait += dt; if (demo.wait > 2.2) demoHole(); }
    }
  }

  // ── 描画(上画面=情報と景色 / 下画面=コース) ──
  function frame(x, y, w, h) {
    game.draw.rect(x - 14, y - 14, w + 28, h + 28, '#ffffff');
    game.draw.circle(x - 2, y - 2, 18, '#ffffff'); game.draw.circle(x + w + 2, y - 2, 18, '#ffffff');
    game.draw.circle(x - 2, y + h + 2, 18, '#ffffff'); game.draw.circle(x + w + 2, y + h + 2, 18, '#ffffff');
  }

  function drawTop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#e8dcff'], [0.5, '#f4eaff'], [1, '#e0f0ff']]);
    frame(40, 30, W - 80, H * 0.285 - 30);
    game.draw.gradient(30, H * 0.285, [[0, '#ffe8f4'], [0.45, STYLE.bg[1]], [0.7, '#9ad4ff'], [1, '#7ab8ff']]);
    game.draw.rect(0, 0, 40, H * 0.3, '#f4eaff'); game.draw.rect(W - 40, 0, 40, H * 0.3, '#f4eaff');
    game.draw.circle(W * 0.78, H * 0.17, 60, '#fff2b0', 0.9);
    for (var i = 0; i < 6; i++) game.draw.rect(60 + ((i * 173 + t * 30) % (W - 160)), H * 0.205 + i * 12, 120, 4, '#ffffff', 0.5);
    game.draw.sprite(Math.floor(t * 3) % 2 ? GULL_A : GULL_B, { k: INK }, 200 + ((t * 70) % (W - 300)), H * 0.14 + Math.sin(t * 2) * 10, 8, { anchor: 'center' });
    game.draw.rect(40, H * 0.245, W - 80, H * 0.04, STYLE.main[0]);
    var man = sad > 0 ? MAN_SAD : (cheer > 0 || Math.floor(t * 2) % 2) ? MAN_B : MAN_A;
    game.draw.sprite(man, MAN_PAL, MAN.x, MAN.y - (cheer > 0 ? 20 * Math.abs(Math.sin(t * 14)) : 0), 9, { anchor: 'center' });
    game.draw.line(MAN.x + 46, MAN.y + 10, MAN.x + 70, MAN.y + 70, '#c0c0d0', 6);
    // ヒンジ
    game.draw.rect(0, H * 0.3, W, H * 0.03, '#d8cce8');
    game.draw.rect(W * 0.3, H * 0.307, W * 0.4, H * 0.016, '#c4b6d8');
  }

  function drawCourse(hl) {
    var t = game.time.elapsed;
    // 奥の海と崖
    game.draw.gradient(H * 0.33, TOP, [[0, '#9ad4ff'], [1, '#6aaaf0']]);
    for (var w = 0; w < 5; w++) game.draw.rect(((w * 233 + t * 50) % (W + 100)) - 100, H * 0.335 + (w % 3) * 14, 90, 5, '#ffffff', 0.6);
    var seaWarn = warnT > 0 && Math.floor(t * 12) % 2 === 0;
    game.draw.rect(L - 30, TOP - 12, R - L + 60, 12, seaWarn ? '#ff6a7a' : '#e8d8b8');
    for (var s = 0; s < 9; s++) game.draw.sprite(['.r.', 'rrr', '.w.', '.w.'], { r: '#ff7a8a', w: '#ffffff' }, L + 20 + s * 105, TOP - 26, 6, { anchor: 'center' });
    // 芝(帯で明暗)
    frame(L - 16, TOP, R - L + 32, BOT - TOP);
    for (var y = TOP; y < BOT; y += 46) game.draw.rect(L - 16, y, R - L + 32, 46, Math.floor((y - TOP) / 46) % 2 ? STYLE.main[0] : '#8edb9a');
    // 坂: 流れる矢印(向き=曲がる向き)
    if (hole.slope !== 0) {
      var dir = hole.slope > 0 ? 1 : -1;
      var n = Math.round(Math.abs(hole.slope) / 50);
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < n + 1; c++) {
          var ax = L + 60 + (((c * 260 + r * 90 + t * 40 * Math.abs(hole.slope) / 100) % (R - L - 120)) );
          if (dir < 0) ax = R - 60 - (ax - L - 60);
          var ay = TOP + 70 + r * 110;
          game.draw.line(ax, ay - 14, ax + dir * 16, ay, '#ffffff', 5);
          game.draw.line(ax + dir * 16, ay, ax, ay + 14, '#ffffff', 5);
        }
      }
    }
    // 池(赤い杭で危険を示す)
    for (var i = 0; i < hole.ponds.length; i++) {
      var p = hole.ponds[i];
      var flash = warnT > 0 && Math.floor(t * 12) % 2 === 0;
      game.draw.circle(p[0], p[1], p[2] + 12, flash ? '#ff6a7a' : '#ffffff');
      game.draw.circle(p[0], p[1], p[2], STYLE.main[1]);
      game.draw.circle(p[0] - p[2] * 0.3, p[1] - p[2] * 0.3, p[2] * 0.3, '#bfe4ff');
      for (var k = 0; k < 6; k++) {
        var a = k * Math.PI / 3 + 0.3;
        game.draw.circle(p[0] + Math.cos(a) * (p[2] + 12), p[1] + Math.sin(a) * (p[2] + 12), 7, '#ff7a8a');
      }
    }
    // カップと旗(ゴール)
    game.draw.circle(hole.cup[0], hole.cup[1], CUP_R + 14, '#ffffff', 0.6 + 0.3 * Math.sin(t * 5));
    game.draw.circle(hole.cup[0], hole.cup[1], CUP_R, '#3a4a3a');
    game.draw.sprite(FLAG, { k: INK, f: STYLE.main[2] }, hole.cup[0] + 30, hole.cup[1] - 70 + Math.sin(t * 3) * 3, 12, { anchor: 'center' });
    // ティー
    game.draw.rect(hole.tee[0] - 40, hole.tee[1] + 26, 80, 8, '#ffffff', 0.7);
    // 落ちた所
    if (splash) {
      game.draw.circle(splash.x, splash.y, 60 + (0.55 - stopT) * 60, '#ffffff', 0.5);
      game.draw.circle(splash.x, splash.y, 28, '#ffffff');
    }
    if (hl && splash) game.draw.circle(splash.x, splash.y, 110, '#ff6a7a', 0.25 + 0.2 * Math.sin(t * 20));
  }

  function drawBall() {
    if (splash) return;
    var r = BR * (ball.sink > 0 ? ball.sink / 0.45 : 1);
    if (stopKind === 'cup' && stopT > 0 && ball.sink <= 0) return;
    game.draw.circle(ball.x + 5, ball.y + 7, r, '#3a6a4a', 0.35);
    game.draw.circle(ball.x, ball.y, r + 4, INK);
    game.draw.circle(ball.x, ball.y, r, '#ffffff');
    game.draw.circle(ball.x - 5, ball.y - 5, r * 0.35, '#e8f0ff');
    if (!ball.moving && stopT <= 0 && state !== STATE.RESULT) {
      game.draw.circle(ball.x, ball.y, r + 16 + 6 * Math.sin(game.time.elapsed * 6), '#ffffff', 0.35);
    }
  }

  function drawPad(a) {
    var t = game.time.elapsed;
    var ready = state === STATE.ATTRACT || canShoot();
    game.draw.circle(PAD.x, PAD.y, 150, '#ffffff', ready ? 0.75 : 0.35);
    game.draw.circle(PAD.x, PAD.y, 130, STYLE.main[0], ready ? 0.35 + 0.15 * Math.sin(t * 5) : 0.15);
    for (var k = 0; k < 3; k++) {
      var yy = PAD.y + 50 - k * 50 - ((t * 60) % 50);
      game.draw.line(PAD.x - 30, yy + 20, PAD.x, yy, '#ffffff', 8);
      game.draw.line(PAD.x + 30, yy + 20, PAD.x, yy, '#ffffff', 8);
    }
    if (a) {
      var rad = a.ang * Math.PI / 180;
      var len = 60 + a.spd * 0.22;
      var col = a.spd > 1100 ? STYLE.main[2] : a.spd > 700 ? STYLE.accent[1] : STYLE.main[0];
      for (var d = 30; d < len; d += 26) game.draw.circle(ball.x + Math.sin(rad) * d, ball.y - Math.cos(rad) * d, 8, col);
      game.draw.rect(W - 110, PAD.y - 150, 40, 300, '#ffffff', 0.8);
      var h = Math.min(1, a.spd / 1700) * 288;
      game.draw.rect(W - 104, PAD.y + 144 - h, 28, h, col);
    }
  }

  function drawHud() {
    write((hi + 1) + ' / ' + NEEDED, W * 0.62, 96, 52, STYLE.main[1]);
    write(String(score), W - 150, 160, 34, STYLE.main[2]);
    for (var i = 0; i < BALLS; i++) game.draw.sprite(BALL_ICON, { w: '#ffffff', b: INK }, 80 + i * 70, 96, 10, { anchor: 'center', alpha: i < balls ? 1 : 0.25 });
    for (var h = 0; h < NEEDED; h++) game.draw.sprite(FLAG, { k: INK, f: h < holed ? STYLE.main[2] : '#d8d0e8' }, W * 0.45 + h * 60, 170, 7, { anchor: 'center' });
    var bw = W - 200;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(100, 212, bw, 14, '#ffffff', 0.9);
    game.draw.rect(104, 215, (bw - 8) * Math.max(0, left / TIME_LIMIT), 8, low ? STYLE.main[2] : STYLE.main[0]);
  }

  function drawAll(hl) {
    drawTop();
    drawCourse(hl);
    drawBall();
  }

  game.onUpdate(function(dt) {
    if (cheer > 0) cheer -= dt;
    if (sad > 0) sad -= dt;

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawAll(stopKind === 'lost' && stopT > 0);
      drawPad(null);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.055 + bob, 72, STYLE.main[2]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.1, 32, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, STYLE.main[2]);
      else write('INSERT COIN', W / 2, H * 0.975, 32, STYLE.main[1]);
      return;
    }

    if (state === STATE.RESULT) {
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.3; cheer = 0.3;
        game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(H * 0.38, H * 0.7), { color: game.random(0, 1) < 0.5 ? STYLE.main[2] : STYLE.accent[1], count: 14, speed: 360 });
      }
      if (!cleared) sad = 0.2;
      drawAll(!cleared);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.055, 80, cleared ? STYLE.main[2] : STYLE.main[1]);
      write(holed + ' / ' + NEEDED + '  SCORE ' + score, W / 2, H * 0.8, 44, STYLE.main[2]);
      if (!cleared) write('あと' + (NEEDED - holed) + 'ホール!', W / 2, H * 0.85, 40, STYLE.main[1]);
      else { write('PERFECT ' + aces, W * 0.35, H * 0.85, 36, STYLE.main[1]); write(strokes + '打', W * 0.68, H * 0.85, 36, STYLE.main[1]); }
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.1, 34, Math.floor(game.time.elapsed * 4) % 2 ? STYLE.main[2] : STYLE.accent[1]);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.1, 30, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, STYLE.main[1]);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { holes: holed, strokes: strokes, aces: aces };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      if (stopT <= 0) left -= dt;
      var ev = stepPlay(dt, true);
      if (ev === 'holed') { stopKind = ''; setHole(Math.min(NEEDED - 1, holed)); game.audio.play('se_coin', 0.3); }
      if (on && left <= 0) {
        left = 0; cleared = false; ball.moving = false;
        game.feedback.bad(ball.x, ball.y, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    drawAll(stopKind === 'lost' && stopT > 0);
    drawPad(aim);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 96, STYLE.main[2]);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);
