// J-GC4-0057-kite-panel-patchwork.js
// 凧絵のつぎはぎ — 風でばらけた凧絵の切れ端を、薄く残った下絵の正しいマスへドラッグで並べ戻す
// 操作: 下の籠から切れ端をつまみ、上の枠の下絵と絵柄が合うマスへ運んで離す。違うマスだと籠に戻る
// 終わり: 2枚(4片+9片)を制限時間内に仕上げればCLEAR。時間切れでGAME OVER(誤りは-1秒)
// @mechanic: drag_sort
// @theme: festival_kite_patchwork
// 世界観: 浜の凧揚げ祭りの直前、突風で切れ端に散った太陽凧と魚凧の絵を、凧職人の弟子が揚げ合図の法螺が鳴る前に枠へ並べ戻す
// 残るもの: 正誤(CLEAR/GAME OVER) + 並べた片数・誤配置数・残り時間スコア
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報を分ける
  var STYLE = { bg: ['#bfe6ff', '#e8f6ff', '#fff4e6'], main: ['#ffffff', '#ffd6e0', '#cfe9c8'], accent: ['#ff8fab', '#7a86ff'] };
  var C = { ink: '#5a5a7a', white: '#ffffff', frame: '#f7c8d6', good: '#6ccf8e', bad: '#ff6f86', gold: '#ffb347', sky: '#bfe6ff', sand: '#ffe9c7' };
  var PAL = { a: '#ffe08a', b: '#9fd8ff', c: '#c7b8ff', y: '#ffd24a', o: '#ff9a5a', k: '#5a4a6a', r: '#ff7f9e', w: '#fff3f6', g: '#8fdcb0', s: '#7fb8ff', m: '#ffc0cb' };

  var GAME_TITLE = 'KITE PATCHWORK';
  var TIME_LIMIT = 24;
  var NEEDED = 13; // 4 + 9 片
  var TP = 8;      // 1片の文字数
  var BOARD_TOP = H * 0.2;

  // ── 絵柄の生成(太陽凧 16x16 / 魚凧 24x24) ──
  function makeSun() {
    var rows = [];
    for (var j = 0; j < 16; j++) {
      var s = '';
      for (var i = 0; i < 16; i++) {
        var dx = i - 7.5, dy = j - 7.5, r = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx);
        var ch = j < 6 ? 'b' : (j < 11 ? 'c' : 'm');
        if (r < 4.6) ch = 'y';
        else if (r < 7.6 && Math.floor((ang + Math.PI) * 8 / Math.PI) % 2 === 0) ch = 'o';
        if ((i === 6 || i === 9) && j === 6) ch = 'k';
        if (j === 9 && i >= 6 && i <= 9) ch = 'r';
        s += ch;
      }
      rows.push(s);
    }
    return rows;
  }
  function makeFish() {
    var rows = [];
    for (var j = 0; j < 24; j++) {
      var s = '';
      for (var i = 0; i < 24; i++) {
        var ch = Math.floor((i + j) / 3) % 2 === 0 ? 'b' : 's';
        if (j > 19) ch = 'g';
        var ex = (i - 10) / 8.6, ey = (j - 11.5) / 5.8;
        if (ex * ex + ey * ey < 1) ch = ((i + (j % 2) * 2) % 4 < 2) ? 'r' : 'w';
        if (i >= 18 && Math.abs(j - 11.5) < (i - 17) * 1.2 && i < 23) ch = 'o';
        if (i >= 3 && i <= 4 && j >= 9 && j <= 10) ch = 'k';
        if (i === 7 && j > 7 && j < 16) ch = 'a';
        s += ch;
      }
      rows.push(s);
    }
    return rows;
  }
  var PICS = [{ art: makeSun(), n: 2, px: 30 }, { art: makeFish(), n: 3, px: 30 }];
  function cutTile(pic, r, c) {
    var out = [];
    for (var j = 0; j < TP; j++) out.push(pic.art[r * TP + j].substr(c * TP, TP));
    return out;
  }

  var SLOT_POS = [];
  (function() {
    var xs1 = [0.12, 0.31, 0.5, 0.69, 0.88], xs2 = [0.21, 0.4, 0.6, 0.79];
    for (var a = 0; a < 5; a++) SLOT_POS.push({ x: W * xs1[a], y: H * 0.72 });
    for (var b = 0; b < 4; b++) SLOT_POS.push({ x: W * xs2[b], y: H * 0.83 });
  })();

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var panel, tiles, held, placed, wrongs, timeLeft, ready, ended, ok, hitStop, endWait, score;
  var gust, gustCd, missCell, chainT, heldAge;

  function boardGeom() {
    var pic = PICS[panel];
    var cell = TP * pic.px;
    var size = cell * pic.n;
    return { x: (W - size) / 2, y: BOARD_TOP, cell: cell, n: pic.n };
  }

  function buildPanel(p) {
    panel = p;
    var pic = PICS[p];
    tiles = [];
    var order = [];
    for (var k = 0; k < pic.n * pic.n; k++) order.push(k);
    for (var q = order.length - 1; q > 0; q--) { var z = Math.floor(game.random(0, q + 1)); var tmp = order[q]; order[q] = order[z]; order[z] = tmp; }
    for (var t = 0; t < order.length; t++) {
      var id = order[t];
      var r = Math.floor(id / pic.n), c = id % pic.n;
      tiles.push({ r: r, c: c, art: cutTile(pic, r, c), slot: t, x: SLOT_POS[t].x, y: SLOT_POS[t].y, placed: false, pop: 0, back: 0 });
    }
  }

  function initGame() {
    buildPanel(0);
    held = null; placed = 0; wrongs = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    ended = false; ok = false; hitStop = 0; endWait = 0; score = 0;
    gust = 0; gustCd = 7; missCell = null; chainT = 0; heldAge = 0;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: C.white, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var KITE_SMALL = ['..#..', '.###.', '#####', '.###.', '..#..', '..|..', '.|...', '..|..'];
  function drawSky(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    game.draw.rect(0, 0, W, H, C.white, 0.05 + 0.04 * Math.sin(t * 1.4));
    // 遠くで揚がる凧(演出のみ)と雲
    for (var i = 0; i < 3; i++) {
      var kx = W * (0.15 + i * 0.35) + Math.sin(t * 0.9 + i * 2) * 30;
      var ky = H * 0.14 + Math.cos(t * 1.2 + i) * 18 + i * 20;
      game.draw.sprite(KITE_SMALL, { '#': ['#ff8fab', '#7a86ff', '#8fdcb0'][i], '|': C.ink }, kx, ky, 7, { anchor: 'center', alpha: 0.55 });
    }
    for (var cl = 0; cl < 4; cl++) {
      var cx = ((t * 20 + cl * 300) % (W + 300)) - 150;
      game.draw.circle(cx, H * 0.6 + cl * 14, 50, C.white, 0.35);
      game.draw.circle(cx + 50, H * 0.6 + cl * 14, 38, C.white, 0.35);
    }
    // 籠(親指ゾーン)
    game.draw.rect(30, H * 0.655, W - 60, H * 0.25, C.sand, 0.9);
    game.draw.rect(30, H * 0.655, W - 60, 8, C.frame, 1);
    game.draw.rect(30, H * 0.905 - 8, W - 60, 8, C.frame, 1);
  }

  function drawBoard(t) {
    var g = boardGeom();
    var size = g.cell * g.n;
    game.draw.rect(g.x - 18, g.y - 18, size + 36, size + 36, C.white, 1);
    game.draw.rect(g.x - 10, g.y - 10, size + 20, size + 20, C.frame, 1);
    // 薄い下絵
    game.draw.sprite(PICS[panel].art, PAL, g.x, g.y, PICS[panel].px, { alpha: 0.22 });
    for (var k = 1; k < g.n; k++) {
      game.draw.line(g.x + k * g.cell, g.y, g.x + k * g.cell, g.y + size, C.white, 4);
      game.draw.line(g.x, g.y + k * g.cell, g.x + size, g.y + k * g.cell, C.white, 4);
    }
    for (var i = 0; i < tiles.length; i++) {
      var tl = tiles[i];
      if (!tl.placed) continue;
      var s = 1 + tl.pop * 0.12;
      var cx = g.x + tl.c * g.cell + g.cell / 2, cy = g.y + tl.r * g.cell + g.cell / 2;
      game.draw.sprite(tl.art, PAL, cx, cy, PICS[panel].px * s, { anchor: 'center' });
    }
    if (missCell) {
      var mx = g.x + missCell.c * g.cell, my = g.y + missCell.r * g.cell;
      game.draw.rect(mx, my, g.cell, g.cell, C.white, 0.5 + 0.3 * Math.sin(t * 20));
    }
  }

  function trayScale() { return panel === 0 ? 15 : 14; }

  function drawTray(t) {
    for (var i = 0; i < tiles.length; i++) {
      var tl = tiles[i];
      if (tl.placed || tl === held) continue;
      var bob = Math.sin(t * 2 + i) * 6, sway = Math.cos(t * 1.5 + i * 0.7) * 4;
      var ts = trayScale() * TP;
      game.draw.rect(tl.x - ts / 2 - 6 + sway, tl.y - ts / 2 - 6 + bob, ts + 12, ts + 12, C.white, 1);
      game.draw.sprite(tl.art, PAL, tl.x + sway, tl.y + bob, trayScale(), { anchor: 'center' });
    }
    if (held) {
      var hs = PICS[panel].px * 0.8;
      game.draw.rect(held.x - (hs * TP) / 2 - 8, held.y - (hs * TP) / 2 - 8, hs * TP + 16, hs * TP + 16, C.white, 0.9);
      game.draw.sprite(held.art, PAL, held.x, held.y, hs, { anchor: 'center' });
    }
  }

  function cellAt(x, y) {
    var g = boardGeom();
    var c = Math.floor((x - g.x) / g.cell), r = Math.floor((y - g.y) / g.cell);
    if (c < 0 || r < 0 || c >= g.n || r >= g.n) return null;
    return { r: r, c: c };
  }
  function cellTaken(cell) {
    for (var i = 0; i < tiles.length; i++) if (tiles[i].placed && tiles[i].r === cell.r && tiles[i].c === cell.c) return true;
    return false;
  }

  // 実ロジック: 切れ端を (x,y) に離す(デモも同じ関数)
  function dropTile(tl, x, y, demoMode) {
    var cell = cellAt(x, y);
    if (!cell || cellTaken(cell)) {
      tl.x = SLOT_POS[tl.slot].x; tl.y = SLOT_POS[tl.slot].y;
      if (!demoMode) game.audio.play('se_tap', 0.3);
      return;
    }
    if (cell.r === tl.r && cell.c === tl.c) {
      tl.placed = true; tl.pop = 1; placed++;
      var g = boardGeom();
      var px = g.x + cell.c * g.cell + g.cell / 2, py = g.y + cell.r * g.cell + g.cell / 2;
      if (!demoMode) {
        var quick = chainT > 0;
        score += quick ? 150 : 100;
        game.feedback.good(px, py, { text: quick ? 'NICE' : 'GOOD', color: C.good });
        chainT = 1.6;
      } else {
        game.fx.burst(px, py, { color: C.good, count: 10 });
      }
    } else {
      wrongs++;
      tl.x = SLOT_POS[tl.slot].x; tl.y = SLOT_POS[tl.slot].y; tl.back = 0.3;
      if (!demoMode) {
        timeLeft = Math.max(0.01, timeLeft - 1);
        game.feedback.bad(x, y, { text: 'MISS' });
      } else {
        game.fx.burst(x, y, { color: C.bad, count: 8 });
      }
    }
  }

  function panelDone() {
    for (var i = 0; i < tiles.length; i++) if (!tiles[i].placed) return false;
    return true;
  }

  function doGust() {
    var free = [];
    for (var i = 0; i < tiles.length; i++) if (!tiles[i].placed && tiles[i] !== held) free.push(tiles[i]);
    var slots = free.map(function(tl) { return tl.slot; });
    for (var q = slots.length - 1; q > 0; q--) { var z = Math.floor(game.random(0, q + 1)); var tmp = slots[q]; slots[q] = slots[z]; slots[z] = tmp; }
    for (var k = 0; k < free.length; k++) { free[k].slot = slots[k]; free[k].x = SLOT_POS[slots[k]].x; free[k].y = SLOT_POS[slots[k]].y; }
  }

  function tileAt(x, y) {
    var half = (trayScale() * TP) / 2 + 12;
    for (var i = tiles.length - 1; i >= 0; i--) {
      var tl = tiles[i];
      if (!tl.placed && Math.abs(x - tl.x) < half && Math.abs(y - tl.y) < half) return tl;
    }
    return null;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    var tl = tileAt(x, y);
    if (tl) {
      held = tl; heldAge = 0; held.x = x; held.y = y;
      game.audio.play('se_tap', 0.4);
      game.fx.burst(x, y, { color: C.white, count: 5, speed: 150 });
    } else if (y > H * 0.65) {
      game.audio.tone('G3', 0.05, { wave: 'sine', volume: 0.04 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !held) return;
    held.x = x; held.y = y - 40;
    var cell = cellAt(x, y - 40);
    if (cell && Math.random() < 0.1) game.audio.tone('C6', 0.02, { wave: 'sine', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !held) return;
    var tl = held;
    held = null;
    if (ended) { tl.x = SLOT_POS[tl.slot].x; tl.y = SLOT_POS[tl.slot].y; game.audio.play('se_tap', 0.1); return; }
    dropTile(tl, x, y - 40, false);
  });

  // ── ATTRACT ゴースト実演(太陽凧を4片、5秒周期。2手目はわざと違うマスで弾かれる) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.75, press: false, stage: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { buildPanel(0); held = null; demo.stage = -1; }
    var st = Math.min(3, Math.floor(cyc / 1.1));
    var p = (cyc - st * 1.1) / 1.1;
    var target = null;
    for (var i = 0; i < tiles.length; i++) if (!tiles[i].placed) { target = tiles[i]; break; }
    if (cyc > 4.4 || !target) { demo.press = false; held = null; demo.gx = W * 0.5; demo.gy = H * 0.66; return; }
    var g = boardGeom();
    var wrong = st === 1;
    var tr = wrong ? (target.r + 1) % 2 : target.r, tc = wrong ? (target.c + 1) % 2 : target.c;
    var ex = g.x + tc * g.cell + g.cell / 2, ey = g.y + tr * g.cell + g.cell / 2;
    var sx = SLOT_POS[target.slot].x, sy = SLOT_POS[target.slot].y;
    var k = Math.max(0, Math.min(1, (p - 0.15) / 0.6));
    demo.gx = sx + (ex - sx) * k; demo.gy = sy + (ey - sy) * k;
    demo.press = p > 0.1 && p < 0.8;
    if (demo.press) { held = target; held.x = demo.gx; held.y = demo.gy; }
    if (p >= 0.8 && demo.stage !== st) { demo.stage = st; held = null; dropTile(target, ex, ey, true); }
  }

  function tickTiles(dt) {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].pop > 0) tiles[i].pop = Math.max(0, tiles[i].pop - dt * 3);
      if (tiles[i].back > 0) tiles[i].back = Math.max(0, tiles[i].back - dt);
    }
  }

  function drawHud(t) {
    txt(placed + ' / ' + NEEDED, W / 2, H * 0.05, 62, C.ink);
    txt('SCORE ' + score, W * 0.2, H * 0.05, 32, C.ink);
    for (var p = 0; p < 2; p++) game.draw.circle(W * 0.8 + p * 50, H * 0.05, 16, p < panel || (p === panel && panelDone()) ? C.good : C.white);
    game.draw.rect(60, 160, W - 120, 22, C.white, 1);
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 160, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.gold);
  }

  function drawGust(t) {
    if (gust <= 0) return;
    // 予告: 籠を横切る風の筋
    for (var i = 0; i < 6; i++) {
      var y = H * 0.68 + i * 50;
      var x0 = ((t * 1400 + i * 170) % (W + 300)) - 300;
      game.draw.line(x0, y, x0 + 220, y - 10, C.white, 8);
    }
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1; held = null;
    if (success) { score += Math.round(timeLeft * 20); game.fx.flash('#ffffff', 0.25); }
    else {
      for (var i = 0; i < tiles.length; i++) if (!tiles[i].placed) { missCell = { r: tiles[i].r, c: tiles[i].c }; break; }
      game.fx.flash('#ffffff', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (tiles === undefined) initGame();
      stepDemo(dt);
      tickTiles(dt);
      drawSky(t);
      drawBoard(t);
      drawTray(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 6, 76, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 36, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 48, '#ff8fab');
      else txt('INSERT COIN', W / 2, H * 0.95, 42, C.ink);
      return;
    }
    if (state === S.RESULT) { drawSky(t); drawBoard(t); drawResult(t); return; }

    tickTiles(dt);
    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.4, { color: '#ff8fab', count: 40, speed: 600 }); }
          else { game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { placed: placed, wrong: wrongs, needed: NEEDED };
          drawSky(t); drawBoard(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (chainT > 0) chainT -= dt;
      if (held) {
        heldAge += dt;
        if (heldAge > 3) { var hb = held; held = null; hb.x = SLOT_POS[hb.slot].x; hb.y = SLOT_POS[hb.slot].y; game.feedback.bad(hb.x, hb.y, { text: 'MISS', shake: 4 }); }
      }
      if (panel === 1) {
        if (gust > 0) {
          gust -= dt;
          if (gust <= 0) { doGust(); game.audio.play('se_break', 0.3); gustCd = game.random(5, 7); }
        } else {
          gustCd -= dt;
          if (gustCd <= 0) { gust = 0.7; game.audio.tone('D5', 0.5, { wave: 'sawtooth', volume: 0.04, slide: -300 }); }
        }
      }
      if (panelDone()) {
        if (panel === 0) {
          game.audio.play('se_milestone', 0.6);
          game.fx.popup('CLEAR 1 / 2', W / 2, H * 0.4, { color: '#ff8fab', size: 72 });
          buildPanel(1); chainT = 0;
        } else {
          finish(true);
        }
      } else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawSky(t);
    drawBoard(t);
    drawTray(t);
    drawGust(t);
    drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, '#ff8fab');
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.3, W - 120, H * 0.4, C.white, 0.92);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.37, 120, C.good);
      game.draw.sprite(KITE_SMALL, { '#': '#ff8fab', '|': C.ink }, W / 2, H * 0.46 + Math.sin(t * 3) * 14, 16, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.37, 100, C.bad);
      txt('あと' + Math.max(0, NEEDED - placed) + '片!', W / 2, H * 0.46, 64, C.gold);
    }
    txt(placed + ' / ' + NEEDED, W / 2, H * 0.53, 56, C.ink);
    txt('SCORE ' + score, W / 2, H * 0.59, 48, C.ink);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.65, 44, isNew ? C.gold : C.ink);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.ink);
  }

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 1],
      ['F5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['G5', 2]
    ], { tempo: 132, wave: 'sine', volume: 0.06, loop: true, bass: [['C4', 2], ['A3', 2], ['F3', 2], ['G3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
