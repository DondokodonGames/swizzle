// I-GBA-0004v2-mistbank-paper-run.js
// ミストバンクラン — 朝霧の河川敷を走り続け、水たまりと石段を跳び越えて配達所まで駆け抜ける
// 操作: 押した瞬間に跳ぶ。押し続けるほど高く遠くへ跳べる(短押し=小跳び/長押し=大跳び)。走りは自動
// 終わり: 制限時間内に1100m走り切れば成功。障害にぶつかると転んで減速し、時間切れで失敗
// @mechanic: camera_run
// @theme: river_mist_paper_route
// 世界観: 朝霧の河川敷で、新聞配達の少年が朝刊の束を抱えたまま水たまりや石段を跳び越え、始発前に配達所まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走った距離と拾った朝刊数
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = { bg: ['#8fd3ff', '#ffe3a8', '#3bb273'], main: ['#ff6b2c', '#1b1b2f', '#ffffff'], accent: ['#ffd500', '#00c2ff'] };
  var OUT = STYLE.main[1];

  var GROUND = H * 0.68;
  var RUN_X = W * 0.26;
  var PX_PER_M = 12;
  var GOAL_M = 1100;
  var TIME_LIMIT = 20;
  var GRAV = 3600, JUMP_V = 1100, HOLD_MAX = 0.22, HOLD_GRAV = 1200;

  var BOY_RUN1 = ['..###..', '..#e#..', '.#####p', '#.###.p', '..###..', '.#...#.', '#.....#'];
  var BOY_RUN2 = ['..###..', '..#e#..', '.#####p', '#.###.p', '..###..', '..#.#..', '..#.#..'];
  var BOY_AIR = ['..###..', '..#e#..', '#######', '..###.p', '..###.p', '.##.##.', '.......'];
  var BOY_PAL = { '#': STYLE.main[0], 'e': OUT, 'p': STYLE.main[2] };
  var BOY_HIT = { '#': '#ffffff', 'e': OUT, 'p': '#ffffff' };
  var PAPER = ['#####', '#.#.#', '#####'];
  var WARN = ['..#..', '.###.', '#####'];
  var DEPOT = ['.#####.', '#######', '#.#.#.#', '#######', '#.###.#'];

  var mode = 'ATTRACT';
  var R;

  function newRun() {
    return {
      dist: 0, speed: 760, y: 0, vy: 0, air: false, holdT: 0, holding: false,
      obs: [], papers: [], spawnIn: 0.9, clock: TIME_LIMIT, count: 0.8,
      trip: 0, stopT: 0, culprit: null, over: false, won: false, got: 0, trips: 0, mile: false, puff: 0, cheer: 0,
    };
  }

  function metres() { return Math.floor(R.dist / PX_PER_M); }

  function spawn() {
    var k = R.obs.length + Math.floor(R.dist / 900);
    var big = game.random(0, 1) < Math.min(0.55, 0.15 + R.dist / 30000);
    var puddle = game.random(0, 1) < 0.5;
    var o = puddle
      ? { kind: 'pud', x: W + 80, w: big ? game.random(380, 480) : game.random(170, 250), h: 18 }
      : { kind: 'step', x: W + 80, w: 110, h: big ? game.random(200, 240) : game.random(100, 140) };
    o.warn = 0.6; o.hit = false; o.id = k;
    R.obs.push(o);
    if (game.random(0, 1) < 0.45) R.papers.push({ x: W + 80 + o.w / 2, y: GROUND - (big ? 300 : 220), got: false });
    R.spawnIn = game.random(0.95, 1.4) - Math.min(0.3, R.dist / 50000);
    game.audio.tone(big ? 'D5' : 'A4', 0.06, { wave: 'square', volume: 0.04 });
  }

  function leap() {
    if (R.air) { R.puff = 0.12; game.audio.tone('E6', 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    R.air = true; R.vy = -JUMP_V; R.holdT = 0; R.holding = true;
    game.audio.play('se_jump', 0.35);
    game.fx.burst(RUN_X, GROUND, { color: '#d9c7a0', count: 6, speed: 160 });
  }

  function letGo() { R.holding = false; }

  function stumble(o) {
    o.hit = true;
    R.trips++;
    R.trip = 0.6; R.stopT = 0.3; R.culprit = o;
    game.fx.flash('#ffffff', 0.1);
    game.feedback.bad(RUN_X, GROUND - R.y - 120, { text: 'MISS', size: 46, shake: 6 });
  }

  function runStep(dt) {
    R.clock -= dt;
    if (R.trip > 0) R.trip -= dt;
    if (R.puff > 0) R.puff -= dt;
    if (R.cheer > 0) R.cheer -= dt;
    var base = 760 + Math.min(300, R.dist / 45);
    R.speed += ((R.trip > 0 ? base * 0.3 : base) - R.speed) * Math.min(1, dt * 5);
    var dx = R.speed * dt;
    R.dist += dx;
    if (R.air) {
      var g = (R.holding && R.holdT < HOLD_MAX) ? HOLD_GRAV : GRAV;
      if (R.holding) R.holdT += dt;
      R.vy += g * dt;
      R.y -= R.vy * dt;
      if (R.y <= 0) { R.y = 0; R.vy = 0; R.air = false; }
    }
    R.spawnIn -= dt;
    if (R.spawnIn <= 0 && metres() < GOAL_M - 40) spawn();
    for (var i = 0; i < R.obs.length; i++) {
      var o = R.obs[i];
      if (o.warn > 0) { o.warn -= dt; continue; }
      o.x -= dx;
      if (!o.hit && RUN_X + 30 > o.x && RUN_X - 30 < o.x + o.w && R.y < o.h) stumble(o);
    }
    R.obs = R.obs.filter(function (q) { return q.x + q.w > -60; });
    for (var p = 0; p < R.papers.length; p++) {
      var pp = R.papers[p];
      pp.x -= dx;
      if (!pp.got && Math.abs(pp.x - RUN_X) < 70 && Math.abs((GROUND - R.y - 70) - pp.y) < 90) {
        pp.got = true; R.got++; R.clock = Math.min(TIME_LIMIT, R.clock + 0.4);
        game.audio.play('se_coin', 0.35);
        game.fx.popup('+0.4', pp.x, pp.y - 40, { color: STYLE.accent[0], size: 40 });
      }
    }
    R.papers = R.papers.filter(function (q) { return q.x > -60 && !q.got; });
    // 障害を越えた瞬間の小さな称賛
    for (var j = 0; j < R.obs.length; j++) {
      var c = R.obs[j];
      if (!c.hit && !c.passed && c.x + c.w < RUN_X - 30) {
        c.passed = true;
        game.feedback.good(RUN_X, GROUND - 260, { text: c.h > 180 || c.w > 360 ? 'NICE' : 'GOOD', color: STYLE.accent[1], size: 38, count: 4 });
      }
    }
    if (!R.mile && metres() >= GOAL_M / 2) { R.mile = true; game.fx.popup(GOAL_M / 2 + 'm', W / 2, H * 0.22, { color: STYLE.accent[0], size: 64 }); game.audio.play('se_milestone', 0.45); }
    if (metres() >= GOAL_M) { R.won = true; R.over = true; R.stopT = 0.5; R.culprit = null; game.fx.burst(RUN_X, GROUND - 100, { color: STYLE.accent[0], count: 30, speed: 500 }); return; }
    if (R.clock <= 0) { R.clock = 0; R.over = true; R.stopT = 0.5; game.fx.flash('#ffffff', 0.12); }
  }

  function finishRun() {
    var stats = { metres: metres(), goal: GOAL_M, papers: R.got, trips: R.trips };
    if (R.won) {
      game.feedback.good(RUN_X, GROUND - 200, { text: 'CLEAR', color: STYLE.accent[0], size: 66 });
      game.audio.play('se_success', 0.6);
      game.end.success(Math.round(R.clock * 100) + R.got * 50 + GOAL_M, stats);
    } else {
      game.feedback.bad(RUN_X, GROUND - 200, { text: 'TIME UP', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    mode = 'RESULT';
  }

  // ── 描画 ─────────────────────────────
  function world() {
    var t = game.time.elapsed;
    var scroll = R.dist;
    game.draw.gradient(0, GROUND, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, '#fff2d0']]);
    game.draw.circle(W * 0.78, H * 0.3, 90, '#fff7c2', 0.9);
    // 対岸の街並み(遠景・ゆっくり)
    for (var b = 0; b < 9; b++) {
      var bx = ((b * 150 - scroll * 0.15) % (W + 150) + W + 150) % (W + 150) - 75;
      var bh = 90 + (b * 53) % 110;
      game.draw.rect(bx, GROUND - 200 - bh, 110, bh, '#8aa3c2');
    }
    // 川面
    game.draw.rect(0, GROUND - 200, W, 110, '#5bb8e8');
    for (var w = 0; w < 6; w++) {
      var wx = ((w * 210 - scroll * 0.4) % W + W) % W;
      game.draw.rect(wx, GROUND - 150 + (w % 3) * 22, 90, 6, '#ffffff', 0.7);
    }
    // 土手の草
    game.draw.rect(0, GROUND - 90, W, 90, STYLE.bg[2]);
    for (var gidx = 0; gidx < 14; gidx++) {
      var gx = ((gidx * 90 - scroll * 0.8) % W + W) % W;
      game.draw.rect(gx, GROUND - 100, 10, 24, '#2c8f5a');
    }
    // 道
    game.draw.rect(0, GROUND, W, H - GROUND, '#d9c7a0');
    game.draw.rect(0, GROUND, W, 10, OUT);
    for (var d = 0; d < 8; d++) {
      var dx = ((d * 160 - scroll) % W + W) % W;
      game.draw.rect(dx, GROUND + 60, 70, 10, '#c4ae84');
    }
    // 朝霧の層(ゆっくり脈打つ)
    for (var f = 0; f < 4; f++) {
      var fy = H * 0.34 + f * 90;
      game.draw.rect(0, fy, W, 70, '#ffffff', 0.12 + 0.06 * Math.sin(t * 0.8 + f));
    }
  }

  function hazards() {
    for (var i = 0; i < R.obs.length; i++) {
      var o = R.obs[i];
      if (o.warn > 0) {
        if (Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.sprite(WARN, { '#': STYLE.accent[0] }, W - 60, GROUND - o.h - 60, 12, { anchor: 'center' });
        continue;
      }
      var lit = R.stopT > 0 && R.culprit === o;
      if (o.kind === 'pud') {
        game.draw.rect(o.x - 6, GROUND - 4, o.w + 12, 22, OUT);
        game.draw.rect(o.x, GROUND, o.w, 14, lit ? '#ffffff' : '#3a7bd5');
        game.draw.rect(o.x + 20, GROUND + 3, o.w * 0.4, 4, '#bfe3ff');
      } else {
        game.draw.rect(o.x - 6, GROUND - o.h - 6, o.w + 12, o.h + 6, OUT);
        game.draw.rect(o.x, GROUND - o.h, o.w, o.h, lit ? '#ffffff' : '#9a9aa8');
        for (var s = 1; s * 50 < o.h; s++) game.draw.rect(o.x, GROUND - o.h + s * 50, o.w, 5, '#6d6d7a');
      }
    }
    for (var p = 0; p < R.papers.length; p++) {
      var pp = R.papers[p];
      game.draw.sprite(PAPER, { '#': STYLE.main[2] }, pp.x, pp.y + Math.sin(game.time.elapsed * 6 + p) * 8, 14, { anchor: 'center' });
    }
  }

  function runner() {
    var art = R.air ? BOY_AIR : (Math.floor(R.dist / 70) % 2 ? BOY_RUN1 : BOY_RUN2);
    var sq = R.trip > 0 ? Math.sin(game.time.elapsed * 40) * 6 : 0;
    game.draw.circle(RUN_X, GROUND + 8, 50 - Math.min(30, R.y / 8), '#000000', 0.25);
    game.draw.sprite(art, { '#': OUT, 'e': OUT, 'p': OUT }, RUN_X + 5 + sq, GROUND - R.y - 67, 19, { anchor: 'center' });
    game.draw.sprite(art, R.stopT > 0 && R.culprit ? BOY_HIT : BOY_PAL, RUN_X + sq, GROUND - R.y - 72, 18, { anchor: 'center' });
    if (R.holding && R.air && R.holdT < HOLD_MAX) game.draw.circle(RUN_X, GROUND - R.y + 10, 30, STYLE.accent[1], 0.5);
    if (R.puff > 0) game.draw.circle(RUN_X, GROUND - R.y - 70, 60, '#ffffff', 0.3);
  }

  function gauge() {
    var x0 = 70, x1 = W - 70, y = 175;
    game.draw.rect(x0 - 6, y - 12, x1 - x0 + 12, 24, OUT);
    game.draw.rect(x0, y - 6, (x1 - x0) * Math.min(1, metres() / GOAL_M), 12, STYLE.accent[0]);
    game.draw.sprite(DEPOT, { '#': STYLE.main[0] }, x1, y - 40, 7, { anchor: 'center' });
    game.draw.sprite(BOY_RUN1, BOY_PAL, x0 + (x1 - x0) * Math.min(1, metres() / GOAL_M), y - 36, 5, { anchor: 'center' });
  }

  function pads() {
    game.draw.rect(0, H * 0.8, W, H * 0.2, '#b89c6c');
    game.draw.circle(W / 2, H * 0.89, 120, R.holding ? STYLE.accent[1] : STYLE.main[2], R.holding ? 0.6 : 0.3);
    game.draw.sprite(WARN, { '#': OUT }, W / 2, H * 0.89, 20, { anchor: 'center' });
  }

  function big(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: OUT, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function frame() {
    world();
    hazards();
    runner();
    pads();
  }

  // ── ATTRACT: 本物の runStep をボットの押し/離しで動かす ─────
  var demo = { t: 0, gx: W / 2, gy: H * 0.89, press: false, holdFor: 0, skip: false };
  function demoRun(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { R = newRun(); R.count = 0; R.spawnIn = 0.2; demo.skip = false; demo.holdFor = 0; demo.n = 0; }
    if (R.stopT > 0) { R.stopT -= dt; }
    else runStep(dt);
    if (R.over) R = newRun();
    if (demo.holdFor > 0) { demo.holdFor -= dt; if (demo.holdFor <= 0) { letGo(); demo.press = false; } }
    for (var i = 0; i < R.obs.length; i++) {
      var o = R.obs[i];
      if (o.warn > 0 || o.hit || o.x < RUN_X) continue;
      var need = o.h > 180 || o.w > 360;
      var eta = (o.x + o.w / 2 - RUN_X) / R.speed;
      if (!R.air && !o.tried && eta <= (need ? 0.45 : 0.3)) {
        o.tried = true;
        demo.n++;
        if (demo.n === 3 && !demo.skip) { demo.skip = true; break; }
        leap(); demo.press = true; demo.holdFor = need ? HOLD_MAX : 0.06;
      }
      break;
    }
  }

  function begin() { R = newRun(); mode = 'PLAYING'; }

  game.onTap(function (x, y) {
    if (mode === 'ATTRACT') { game.audio.play('se_coin', 0.5); begin(); return; }
    if (mode === 'RESULT') { game.audio.play('se_tap', 0.3); mode = 'ATTRACT'; R = newRun(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (mode !== 'PLAYING' || R.count > 0 || R.over) return;
    if (R.stopT > 0) { game.audio.play('se_tap', 0.1); return; }
    leap();
  });
  game.onRelease(function (x, y) {
    if (mode !== 'PLAYING') return;
    if (R.holding && R.air) game.audio.tone('G5', 0.04, { wave: 'triangle', volume: 0.04 });
    letGo();
  });

  game.onUpdate(function (dt) {
    if (!R) R = newRun();
    if (mode === 'ATTRACT') {
      demoRun(dt);
      frame();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      big('MIST RUN', W / 2, 90, 76, STYLE.accent[0]);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.3, 38, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.975, 42, STYLE.accent[0]);
      else big('INSERT COIN', W / 2, H * 0.975, 36, STYLE.main[2]);
      return;
    }
    if (mode === 'RESULT') {
      frame();
      game.draw.rect(0, H * 0.3, W, H * 0.28, OUT, 0.8);
      big(R.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 90, R.won ? STYLE.accent[0] : STYLE.main[0]);
      big(metres() + ' / ' + GOAL_M, W / 2, H * 0.43, 52, STYLE.main[2]);
      var sc = Math.round(R.clock * 100) + R.got * 50 + GOAL_M;
      if (!R.won) big('あと' + Math.max(1, GOAL_M - metres()) + 'm!', W / 2, H * 0.49, 50, STYLE.accent[0]);
      else big(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, W / 2, H * 0.49, 46, STYLE.accent[0]);
      big('x' + R.got, W / 2, H * 0.54, 40, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.975, 36, STYLE.main[2]);
      return;
    }
    if (R.count > 0) {
      R.count -= dt;
      if (R.count <= 0) game.audio.play('se_tap', 0.3);
    } else if (R.stopT > 0) {
      R.stopT -= dt;
      if (R.stopT <= 0 && R.over) { finishRun(); return; }
    } else if (!R.over) {
      runStep(dt);
    }
    frame();
    big(metres() + 'm', W * 0.22, 80, 56, STYLE.main[2]);
    big(R.clock.toFixed(1), W * 0.78, 80, 56, R.clock < 4 ? STYLE.main[0] : STYLE.main[2]);
    gauge();
    if (R.count > 0) big(R.count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.5], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5], ['F#5', 0.25], ['D5', 0.25], ['E5', 0.5]], { tempo: 168, wave: 'square', volume: 0.045, loop: true, bass: true });
    mode = 'ATTRACT';
    R = newRun();
    demo.t = 0;
  });
})(game);
