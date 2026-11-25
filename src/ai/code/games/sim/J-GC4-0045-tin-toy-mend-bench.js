// J-GC4-0045-tin-toy-mend-bench.js
// ブリキおもちゃ修理台 — 調子の悪いおもちゃと、症状に合う工具を線で結んで直していく
// 操作: おもちゃ(上段)から工具(下段)へ指を引いて離す(逆向きも可)。症状と工具が合えば修理完了
// 終わり: 制限時間内に12体直せばCLEAR。時間切れでGAME OVER(誤りは残り時間-1.5秒)
// @mechanic: connect
// @theme: tin_toy_repair_bench
// 世界観: 夜市の片隅のブリキおもちゃ修理屋が、閉店の鐘までに持ち込まれたゼンマイ鳥・ロボ・オルゴールの不調を見抜いて工具とつなぎ、順番待ちの客を捌き切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 直した数・最大連続・スコア
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目の作業台・フェルト・光沢の工具札。gradient で厚みを出す
  var STYLE = { bg: ['#5a3a22', '#3b2414', '#2a180c'], main: ['#e8d3a8', '#b88a52', '#7a5230'], accent: ['#ffd25a', '#ff6b4a'] };
  var C = {
    wood1: '#8a5a32', wood2: '#6b4224', felt: '#2f5d4a', felt2: '#244a3a', brass: '#e0b050', brassD: '#9a7428',
    ink: '#2a180c', cream: '#f6ead0', good: '#7ee07e', bad: '#ff5a4a', gold: '#ffd25a', shadow: '#1a0e06'
  };

  var GAME_TITLE = 'TIN TOY BENCH';
  var TIME_LIMIT = 22;
  var NEEDED = 12;
  var PENALTY = 1.5;
  var DRAG_TIMEOUT = 2.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 症状 i は 工具 i で直る(0:ゼンマイ切れ→巻き鍵 1:錆びきしみ→油差し 2:ネジゆるみ→ねじ回し 3:電球暗い→電池)
  var TOOL_COL = ['#ffd25a', '#ff9a3a', '#7ec8ff', '#b6f06a'];
  var SLOT_X = [W * 0.2, W * 0.5, W * 0.8];
  var TOY_Y = H * 0.38;
  var TOOL_Y = H * 0.8;
  var TOOL_X = [W * 0.14, W * 0.38, W * 0.62, W * 0.86];

  var TOY_ART = [
    ['....##....', '...####...', '..##o###>>', '.########.', '##########', '.########.', '..######..', '...#..#...', '...#..#...', '..##..##..'],
    ['...#..#...', '..######..', '..#o##o#..', '..######..', '...####...', '.########.', '#.######.#', '#.######.#', '..##..##..', '..##..##..'],
    ['..........', '.########.', '.#oooooo#.', '##########', '#=#=#=#=##', '##########', '#========#', '##########', '.#......#.', '..........']
  ];
  var TOY_BODY = ['#5ab0e0', '#c0c8d0', '#d06a8a'];
  var TOOL_ART = [
    ['.##..##.', '########', '.##..##.', '...##...', '...##...', '...##...', '...##...', '..####..'],
    ['......#.', '.....#..', '....#...', '.####...', '######..', '######..', '######..', '.####...'],
    ['...##...', '...##...', '...##...', '...##...', '..####..', '..####..', '..####..', '..####..'],
    ['..##..', '######', '#++++#', '#++++#', '#....#', '#....#', '######']
  ];
  var GLYPH = [
    ['#.....', '.#...#', '..#.#.', '...#..', '..#.#.', '.#...#'],
    ['..#...', '#.#.#.', '.###..', '#####.', '.###..', '#.#.#.'],
    ['.####.', '..##..', '..##..', '..##..', '..##..', '...#..'],
    ['.###..', '#...#.', '#...#.', '.#.#..', '.###..', '.###..']
  ];
  var KEEPER = ['..####..', '.######.', '..o..o..', '..####..', '.######.', '########', '.##..##.'];

  var toys, timeLeft, repaired, combo, bestCombo, score, ready, hitStop, endWait, ended, ok;
  var link, milestoneShown, hiToy, lastX, lastY, spawnDelay;

  function newToy(slot, demoMode) {
    var sym = Math.floor(game.random(0, 4));
    if (demoMode) sym = (slot * 2 + 1) % 4;
    var patience = Math.max(4.5, 6.5 - repaired * 0.18);
    return { slot: slot, kind: Math.floor(game.random(0, 3)), sym: sym, patience: patience, max: patience, fixed: 0, gone: 0, wobble: game.random(0, 6) };
  }

  function initGame() {
    toys = [newToy(0, false), newToy(1, false), newToy(2, false)];
    timeLeft = TIME_LIMIT; repaired = 0; combo = 0; bestCombo = 0; score = 0;
    ready = 0.8; hitStop = 0; endWait = 0; ended = false; ok = false;
    link = null; milestoneShown = false; hiToy = null; lastX = W / 2; lastY = H / 2; spawnDelay = [0, 0, 0];
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.shadow, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawBench() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 木目の板
    for (var i = 0; i < 9; i++) {
      var y = H * 0.22 + i * 44;
      game.draw.rect(0, y, W, 3, C.wood1, 0.35);
    }
    // フェルト敷きの作業面(光沢の縁)
    game.draw.gradient(H * 0.26, H * 0.62, [[0, C.felt], [1, C.felt2]]);
    game.draw.rect(0, H * 0.26, W, H * 0.36, C.felt, 0.0);
    game.draw.rect(0, H * 0.26, W, 8, C.brass, 0.7);
    game.draw.rect(0, H * 0.62, W, 8, C.brassD, 0.8);
    // 工具札の棚(親指ゾーン)
    game.draw.gradient(H * 0.7, H * 0.9, [[0, C.wood1], [1, C.wood2]]);
    game.draw.rect(0, H * 0.7, W, 6, C.cream, 0.3);
    // 吊りランプの揺れと周囲光の脈動
    var sway = Math.sin(t * 1.1) * 26;
    game.draw.line(W * 0.5, 0, W * 0.5 + sway, H * 0.16, C.brassD, 4);
    game.draw.circle(W * 0.5 + sway, H * 0.17, 26, C.gold, 0.85);
    game.draw.circle(W * 0.5 + sway, H * 0.17, 90, C.gold, 0.08 + 0.05 * Math.sin(t * 2.3));
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(t * 1.7));
    // 店番(左下の見習い)が小さく揺れる
    game.draw.sprite(KEEPER, { '#': '#c9a070', 'o': C.ink }, W * 0.08, H * 0.66 + Math.sin(t * 2.4) * 6, 8, { anchor: 'center' });
  }

  function drawToy(ty, t) {
    if (!ty) return;
    var x = SLOT_X[ty.slot];
    var bob = Math.sin(t * 2.2 + ty.wobble) * 8;
    var sway = Math.cos(t * 1.6 + ty.wobble) * 5;
    var jit = 0;
    if (!ty.fixed && ty.sym === 1) jit = Math.sin(t * 40) * 4;
    var slump = (!ty.fixed && ty.sym === 0) ? 14 : 0;
    var alpha = ty.gone > 0 ? Math.max(0, ty.gone / 0.5) : 1;
    var pal = { '#': ty.fixed ? '#ffffff' : TOY_BODY[ty.kind], 'o': C.ink, '>': '#f4a020', '=': C.brass };
    var scale = (hiToy === ty) ? 15 : 12;
    game.draw.circle(x, TOY_Y + 78, 70, C.shadow, 0.35);
    game.draw.sprite(TOY_ART[ty.kind], pal, x + sway + jit, TOY_Y + bob + slump, scale, { anchor: 'center', alpha: alpha });
    if (hiToy === ty) game.draw.circle(x, TOY_Y, 110, '#ffffff', 0.25);
    if (ty.fixed) {
      game.draw.circle(x, TOY_Y - 120, 30, C.good, 0.9 * alpha);
      return;
    }
    // 症状の吹き出し(工具と同じ色の縁)
    var by = TOY_Y - 150 + bob * 0.5;
    var flick = ty.sym === 3 ? (Math.floor(t * 9 + ty.wobble) % 3 === 0 ? 0.35 : 1) : 1;
    game.draw.circle(x, by, 50, TOOL_COL[ty.sym], 0.95);
    game.draw.circle(x, by, 40, C.cream, 1);
    game.draw.sprite(GLYPH[ty.sym], { '#': C.ink }, x, by, 10, { anchor: 'center', alpha: flick });
    if (ty.sym === 2) game.draw.line(x + 50, TOY_Y - 30, x + 50 + Math.sin(t * 8) * 10, TOY_Y - 70, '#dddddd', 8);
    // 待ち時間のメーター(残り1秒で赤点滅=予告)
    var r = ty.patience / ty.max;
    var warn = ty.patience < 1.2 && Math.floor(t * 8) % 2 === 0;
    game.draw.rect(x - 80, TOY_Y + 110, 160, 14, C.shadow, 0.6);
    game.draw.rect(x - 80, TOY_Y + 110, 160 * r, 14, warn ? C.bad : C.gold, 1);
  }

  function drawTools(t) {
    for (var i = 0; i < 4; i++) {
      var x = TOOL_X[i];
      var lift = Math.sin(t * 1.9 + i) * 5;
      var sel = link && link.tool === i;
      game.draw.circle(x, TOOL_Y + 6, 92, C.shadow, 0.35);
      game.draw.circle(x, TOOL_Y + lift, 88, TOOL_COL[i], 1);
      game.draw.circle(x, TOOL_Y + lift - 8, 76, C.cream, sel ? 1 : 0.92);
      game.draw.sprite(TOOL_ART[i], { '#': '#6a6a78', '+': TOOL_COL[i] }, x, TOOL_Y + lift - 6, 13, { anchor: 'center' });
    }
  }

  function nodeAt(x, y) {
    for (var i = 0; i < 3; i++) {
      var ty = toys[i];
      if (ty && !ty.fixed && ty.gone <= 0 && Math.hypot(x - SLOT_X[i], y - TOY_Y) < 130) return { toy: i };
    }
    for (var k = 0; k < 4; k++) if (Math.hypot(x - TOOL_X[k], y - TOOL_Y) < 110) return { tool: k };
    return null;
  }

  // 実ロジック: 1本の線を結び、正誤を判定する(ATTRACTデモも同じ関数を使う)
  function tryLink(toyIdx, toolIdx, demoMode) {
    var ty = toys[toyIdx];
    if (!ty || ty.fixed || ty.gone > 0) return;
    var x = SLOT_X[toyIdx];
    if (ty.sym === toolIdx) {
      ty.fixed = 0.8; repaired++; combo++; bestCombo = Math.max(bestCombo, combo);
      var mult = combo >= 4 ? 2 : 1;
      score += 100 * mult;
      if (!demoMode) {
        game.feedback.good(x, TOY_Y - 60, { text: combo >= 4 ? 'x2' : 'GOOD', color: C.good });
        if (combo === 4) { game.audio.play('se_powerup', 0.5); game.fx.popup('COMBO', W / 2, H * 0.3, { color: C.gold, size: 64 }); }
        if (!milestoneShown && repaired >= NEEDED / 2) {
          milestoneShown = true;
          game.audio.play('se_milestone', 0.6);
          game.fx.popup(repaired + ' / ' + NEEDED, W / 2, H * 0.24, { color: C.gold, size: 70 });
        }
      } else {
        game.fx.burst(x, TOY_Y - 60, { color: C.good, count: 10 });
      }
    } else {
      combo = 0;
      if (!demoMode) {
        timeLeft = Math.max(0.01, timeLeft - PENALTY);
        game.feedback.bad(x, TOY_Y - 60, { text: 'MISS' });
      } else {
        game.fx.burst(x, TOY_Y - 60, { color: C.bad, count: 8 });
      }
      ty.patience = Math.max(0.2, ty.patience - 1);
    }
  }

  function stepToys(dt, demoMode) {
    for (var i = 0; i < 3; i++) {
      var ty = toys[i];
      if (!ty) {
        spawnDelay[i] -= dt;
        if (spawnDelay[i] <= 0) toys[i] = newToy(i, demoMode);
        continue;
      }
      if (ty.fixed) {
        ty.fixed -= dt;
        if (ty.fixed <= 0) { toys[i] = null; spawnDelay[i] = 0.25; }
        continue;
      }
      if (ty.gone > 0) {
        ty.gone -= dt;
        if (ty.gone <= 0) { toys[i] = null; spawnDelay[i] = 0.3; }
        continue;
      }
      if (demoMode) continue;
      var before = ty.patience;
      ty.patience -= dt;
      if (before >= 0.8 && ty.patience < 0.8) game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.05 });
      if (ty.patience <= 0) {
        ty.gone = 0.5; combo = 0;
        game.feedback.bad(SLOT_X[i], TOY_Y, { text: 'MISS', shake: 6 });
      }
    }
  }

  // ── 入力 ─────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || ended || hitStop > 0) return;
    var n = nodeAt(x, y);
    if (n) {
      link = { toy: n.toy, tool: n.tool, x: x, y: y, age: 0 };
      game.audio.play('se_tap', 0.4);
      game.fx.burst(x, y, { color: C.cream, count: 5, speed: 160 });
    } else {
      game.audio.tone('C3', 0.05, { wave: 'triangle', volume: 0.04 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !link) return;
    link.x = x; link.y = y; lastX = x; lastY = y;
    if (Math.random() < 0.08) game.audio.tone('E6', 0.02, { wave: 'sine', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !link) return;
    var n = nodeAt(x, y);
    var from = link;
    link = null;
    if (n && from.toy !== undefined && n.tool !== undefined) tryLink(from.toy, n.tool, false);
    else if (n && from.tool !== undefined && n.toy !== undefined) tryLink(n.toy, from.tool, false);
    else game.audio.play('se_tap', 0.15);
  });

  // ── ATTRACT ゴースト実演(実ロジック tryLink を使う。4秒周期で 正→正→誤) ──
  var demo = { t: 0, gx: W / 2, gy: H / 2, press: false, done: [false, false, false] };
  var DEMO_PLAN = [0, 1, 2];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) {
      toys = [newToy(0, true), newToy(1, true), newToy(2, true)];
      spawnDelay = [9, 9, 9]; combo = 0; demo.done = [false, false, false];
    }
    var step = Math.min(2, Math.floor(cyc / 1.3));
    var p = (cyc - step * 1.3) / 1.3;
    var toyIdx = DEMO_PLAN[step];
    var ty = toys[toyIdx];
    var target = ty ? (step === 2 ? (ty.sym + 1) % 4 : ty.sym) : 0;
    var sx = SLOT_X[toyIdx], sy = TOY_Y;
    var ex = TOOL_X[target], ey = TOOL_Y;
    var k = Math.max(0, Math.min(1, (p - 0.2) / 0.55));
    demo.gx = sx + (ex - sx) * k; demo.gy = sy + (ey - sy) * k;
    demo.press = p > 0.15 && p < 0.8;
    link = demo.press ? { toy: toyIdx, x: demo.gx, y: demo.gy, age: 0 } : null;
    if (p >= 0.8 && !demo.done[step]) { demo.done[step] = true; tryLink(toyIdx, target, true); }
    stepToys(dt, true);
  }

  function drawLink() {
    if (!link) return;
    var sx = link.toy !== undefined ? SLOT_X[link.toy] : TOOL_X[link.tool];
    var sy = link.toy !== undefined ? TOY_Y : TOOL_Y;
    game.draw.line(sx, sy, link.x, link.y, C.shadow, 22);
    game.draw.line(sx, sy, link.x, link.y, C.brass, 12);
    game.draw.circle(link.x, link.y, 20, C.gold, 0.9);
  }

  function drawHud() {
    txt(repaired + ' / ' + NEEDED, W / 2, H * 0.055, 64, C.cream);
    game.draw.rect(60, 170, W - 120, 22, C.shadow, 0.7);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.gold);
    if (combo >= 2) txt('COMBO ' + combo, W * 0.82, H * 0.055, 36, C.gold);
    txt('SCORE ' + score, W * 0.18, H * 0.055, 34, C.cream);
  }

  function finish(success) {
    ended = true; ok = success; link = null;
    hitStop = 0.45; endWait = 1.1;
    if (!success) {
      var pend = null;
      for (var i = 0; i < 3; i++) if (toys[i] && !toys[i].fixed) { pend = toys[i]; break; }
      hiToy = pend;
      game.fx.flash('#ffffff', 0.2);
    } else {
      game.fx.flash('#fff6d0', 0.25);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (toys === undefined) initGame();
      stepDemo(dt);
      drawBench();
      for (var a = 0; a < 3; a++) drawToy(toys[a], t);
      drawTools(t);
      drawLink();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      var ly = H * 0.1 + Math.sin(t * 2) * 8;
      txt(GAME_TITLE, W / 2, ly, 84, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.155, 38, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 50, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 44, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawBench();
      drawResult(t);
      return;
    }

    // PLAYING
    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.4, { color: C.gold, count: 40, speed: 600 }); }
          else { game.feedback.bad(hiToy ? SLOT_X[hiToy.slot] : W / 2, TOY_Y, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { repaired: repaired, bestCombo: bestCombo, needed: NEEDED };
          drawBench();
          drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      stepToys(dt, false);
      if (link) {
        link.age += dt;
        if (link.age > DRAG_TIMEOUT) { link = null; combo = 0; game.feedback.bad(lastX, lastY, { text: 'MISS', shake: 4 }); }
      }
      if (repaired >= NEEDED) { finish(true); }
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawBench();
    for (var i = 0; i < 3; i++) drawToy(toys[i], t);
    drawTools(t);
    drawLink();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.gold);
    if (ended && hitStop > 0 && !ok && hiToy) game.draw.circle(SLOT_X[hiToy.slot], TOY_Y, 150, '#ffffff', 0.35);
  });

  function drawResult(t) {
    game.draw.rect(0, H * 0.25, W, H * 0.46, C.shadow, 0.72);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.33, 130, C.good);
      for (var s = 0; s < 3; s++) game.draw.sprite(TOY_ART[s], { '#': '#ffffff', 'o': C.ink, '>': '#f4a020', '=': C.brass }, W * (0.3 + s * 0.2), H * 0.44 + Math.sin(t * 3 + s) * 12, 9, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.33, 110, C.bad);
      txt('あと' + Math.max(0, NEEDED - repaired) + '体!', W / 2, H * 0.44, 64, C.gold);
    }
    txt(repaired + ' / ' + NEEDED, W / 2, H * 0.52, 60, C.cream);
    txt('SCORE ' + score, W / 2, H * 0.58, 50, C.cream);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.64, 46, isNew ? C.gold : C.cream);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 46, C.cream);
  }

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1]
    ], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['C3', 2], ['F3', 2], ['G3', 2], ['C3', 2], ['A2', 2], ['D3', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
