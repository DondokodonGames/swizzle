// K-DS-0062-pulse-arrow-step.js
// パルスアローステップ — 光の床ステージ。降りてくる矢印の向きへ合図の瞬間にスワイプして踏む
// 操作: 中央のレーンを落ちてくる矢印を見て、消える直前に同じ向きへスワイプする
// 終わり: 規定歩数(8歩)を踏み切れば成功。3回外せば失敗
// @mechanic: swipe_direction
// @theme: pulse_arrow_dance_stage
// 世界観: 発光パネルのダンスステージ。中央レーンに矢印の光が降りてきて、踊り手はその向きへ体を弾ませ踏み込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏み切った歩数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管のような縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030', floor: '#20083a', floorEdge: '#3a1060',
    arrow: '#00e5ff', arrowGlow: '#0a3a44', accent: '#ff2e88',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'PULSE STEP';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var CX = W * 0.5;
  var LANE_TOP = H * 0.22, LANE_LINE = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROW_UP = ['...#...', '..###..', '.#####.', '...#...', '...#...'];
  var ARROW_DOWN = ['...#...', '...#...', '.#####.', '..###..', '...#...'];
  var ARROW_LEFT = ['....#..', '...##..', '.#####.', '...##..', '....#..'];
  var ARROW_RIGHT = ['..#....', '..##...', '.#####.', '..##...', '..#....'];
  var ARROW_SPRITE = { up: ARROW_UP, down: ARROW_DOWN, left: ARROW_LEFT, right: ARROW_RIGHT };

  var DANCER_A = ['.##.', '####', '.##.', '#..#'];
  var DANCER_B = ['.##.', '####', '.##.', '.##.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.15 + i * 40, W, 2, '#ffffff06');
    game.draw.rect(CX - 170, LANE_TOP - 10, 340, LANE_LINE - LANE_TOP + 40, C.floor, 0.6);
    game.draw.rect(CX - 170, LANE_LINE, 340, 10, C.arrow, 0.7);
    // 常時明滅する光の帯(ATTRACT演出が静止して見えないようにする常時アニメ。二周波合成で位相停滞を回避)
    var t = game.time.elapsed;
    var pulse = 0.5 + 0.25 * Math.sin(t * 1.7) + 0.25 * Math.sin(t * 2.63);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.05 + 0.22 * pulse);
  }

  var round, arrow, steps, misses, done, endWait, finished, hop, step, walkT;
  var ready, hitStop, shake, milestoneShown;

  function newArrow() {
    var dur = Math.max(0.72, 1.05 - round * 0.04);
    return { dir: DIRS[Math.floor(game.random(0, 4))], t: 0, dur: dur, resolved: false };
  }

  function initGame() {
    round = 0; steps = 0; misses = 0; done = false; endWait = 0; finished = false;
    hop = 0; step = 0; walkT = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    arrow = newArrow();
  }

  function resolveStep(dir) {
    if (!arrow || arrow.resolved || ready > 0 || done || finished) return;
    arrow.resolved = true;
    var correct = dir === arrow.dir;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      steps++;
      hop = 1;
      game.feedback.good(CX, LANE_LINE, { text: 'STEP', color: C.good });
      game.fx.burst(CX, LANE_LINE, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && steps >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(steps + ' / ' + TOTAL, CX, H * 0.3, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
    } else {
      misses++;
      shake = 0.25;
      game.feedback.bad(CX, LANE_LINE, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
    if (!correct && misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (correct && steps >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    arrow = newArrow();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    resolveStep(dir);
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

  function drawArrow(k) {
    if (!k) return;
    var p = Math.min(1, k.t / k.dur);
    var y = LANE_TOP + (LANE_LINE - LANE_TOP) * p;
    var alpha = p > 0.85 ? 1 : 0.9;
    game.draw.circle(CX, y, 46, C.arrowGlow, 0.6);
    game.draw.sprite(ARROW_SPRITE[k.dir], { '#': C.arrow }, CX, y, 12, { anchor: 'center', alpha: alpha });
  }

  function drawDancer() {
    walkT += 0; // draw uses external timer
    var frame = Math.floor(game.time.elapsed * 4) % 2 === 0 ? DANCER_A : DANCER_B;
    var idleBob = Math.sin(game.time.elapsed * 3) * 26;
    var idleSway = Math.cos(game.time.elapsed * 2.1) * 60;
    var offY = (hop > 0 ? -hop * 40 : 0) + idleBob;
    game.draw.sprite(frame, { '#': step ? C.accent : C.white }, CX + idleSway, H * 0.84 + offY, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.98, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { arrow = newArrow(); arrow.dur = 0.9; round = 0; }
    if (!arrow) arrow = newArrow();
    arrow.t += dt;
    if (hop > 0) hop -= dt * 3;
    var p = arrow.t / arrow.dur;
    if (p > 0.62 && !arrow.resolved) {
      arrow.resolved = true;
      hop = 1;
      game.feedback.good(CX, LANE_LINE, { text: 'STEP', color: C.good });
      game.audio.play('se_good', 0.25);
      var lift = arrow.dir === 'up' ? -220 : arrow.dir === 'down' ? 220 : 0;
      var side = arrow.dir === 'left' ? -220 : arrow.dir === 'right' ? 220 : 0;
      demo.gx = CX + side; demo.gy = H * 0.98 + lift * 0.15;
      demo.press = true;
    }
    if (p >= 1) { demo.press = false; demo.gx = CX; demo.gy = H * 0.98; arrow = newArrow(); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawArrow(arrow);
      drawDancer();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 28 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDancer();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(steps + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - steps) + '歩!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(steps, { steps: steps, total: TOTAL, misses: misses });
        else game.end.failure({ steps: steps, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      arrow.t += dt;
      if (arrow.t / arrow.dur >= 1 && !arrow.resolved) {
        arrow.resolved = true;
        hitStop = 0.3;
        shake = 0.25;
        misses++;
        game.feedback.bad(CX, LANE_LINE, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        else { round++; arrow = newArrow(); }
      }
    }
    if (hop > 0) hop -= dt * 3;
    if (shake > 0) shake -= dt;
    step = hop > 0.2;

    bg();
    if (!finished) drawArrow(arrow);
    drawDancer();

    txt(steps + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (steps / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 138, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
