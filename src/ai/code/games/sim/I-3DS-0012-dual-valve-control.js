// I-3DS-0012-dual-valve-control.js
// デュアルバルブ — 蒸気機関室の整備士が左手で圧力レバーを保持しつつ右手で噴出バルブを次々閉じる
// 操作: 左下のレバーを指で押さえ続けながら、右側に次々出る噴出バルブを別の指で素早くタップして閉じる
// 終わり: レバーを保持したまま規定数(6個)のバルブを閉じきれば成功。圧力が振り切れる/バルブの爆発で失敗
// @mechanic: coop_2zone
// @theme: boiler_room_valves
// 世界観: 老朽化した蒸気機関室、整備士が左手で圧力レバーを保持し続けながら右手で暴走する噴出バルブを次々閉める
// 残るもの: 正誤(CLEAR/GAME OVER) + 閉めたバルブ数
// スタイル: 8bit HOME
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定パレット・大きめドット・くっきりした輪郭
  var C = {
    bg: '#1a1410', bg2: '#241a14', pipe: '#4a3a30', pipeEdge: '#6a5648',
    lever: '#8a7050', leverOn: '#ffb340', valve: '#5a6a74', valveHot: '#ff4d3d',
    steam: '#cfd8dc', good: '#5cff8a', bad: '#ff4d3d', gold: '#ffcf40', white: '#f4ecd8', ink: '#120c08',
  };

  var GAME_TITLE = 'DUAL VALVE';
  var TOTAL = 6;
  var LEFT_ZONE = { x: 40, y: H * 0.80, w: W * 0.42, h: H * 0.16 };
  var SLOTS = [
    { x: W * 0.62, y: H * 0.28 },
    { x: W * 0.82, y: H * 0.42 },
    { x: W * 0.60, y: H * 0.56 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var leftHoldId, pressure, valves, spawnTimer, closedCount, roundIdx;
  var done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENGINEER = ['.###.', '#####', '.###.', '#.#.#'];
  var VALVE_ICON = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.rect(0, H * (0.2 + i * 0.16), W, 6, C.pipeEdge);
  }

  function drawEngineer() {
    game.draw.sprite(ENGINEER, { '#': C.gold }, W * 0.28, H * 0.42, 26, { anchor: 'center' });
  }

  function drawLever(held) {
    game.draw.rect(LEFT_ZONE.x, LEFT_ZONE.y, LEFT_ZONE.w, LEFT_ZONE.h, C.pipeEdge);
    game.draw.rect(LEFT_ZONE.x + 10, LEFT_ZONE.y + 10, LEFT_ZONE.w - 20, LEFT_ZONE.h - 20, held ? C.leverOn : C.lever);
  }

  function drawValve(v) {
    var p = v.t / v.dur;
    var hot = p > 0.65;
    var blink = hot && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.circle(v.x, v.y, 70, blink ? C.valveHot : C.valve);
    game.draw.sprite(VALVE_ICON, { '#': C.white }, v.x, v.y, 14, { anchor: 'center' });
    game.draw.rect(v.x - 50, v.y + 78, 100, 10, C.ink, 0.5);
    game.draw.rect(v.x - 50, v.y + 78, 100 * Math.max(0, 1 - p), 10, hot ? C.bad : C.gold);
  }

  function drawPressure() {
    var danger = pressure > 0.7;
    var blink = danger && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 20, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * pressure, 20, blink ? C.bad : C.gold);
  }

  function newValve(idx) {
    var slot = SLOTS[idx % SLOTS.length];
    var dur = Math.max(1.0, 1.9 - idx * 0.08);
    return { x: slot.x, y: slot.y, t: 0, dur: dur, tapped: false };
  }

  function initGame() {
    leftHoldId = null; pressure = 0.2; valves = []; spawnTimer = 0.4; closedCount = 0; roundIdx = 0;
    done = false; endWait = 0; finished = false; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function inLeft(x, y) {
    return x >= LEFT_ZONE.x && x <= LEFT_ZONE.x + LEFT_ZONE.w && y >= LEFT_ZONE.y && y <= LEFT_ZONE.y + LEFT_ZONE.h;
  }

  function failNow(x, y, label) {
    hitStop = 0.35;
    game.feedback.bad(x, y, { text: label });
    shake = 0.32;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function tryTapValve(x, y) {
    for (var i = 0; i < valves.length; i++) {
      var v = valves[i];
      if (game.hit.circle(x, y, 1, v.x, v.y, 76)) {
        valves.splice(i, 1);
        closedCount++;
        game.feedback.good(v.x, v.y, { text: 'CLOSE', color: C.good });
        game.fx.burst(v.x, v.y, { color: C.gold, count: 12, speed: 280 });
        game.audio.play('se_good', 0.35);
        if (!milestoneShown && closedCount >= Math.ceil(TOTAL / 2)) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', W * 0.6, H * 0.16, { color: C.gold, size: 38 });
          game.audio.play('se_milestone', 0.4);
        }
        if (closedCount >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); }
        return true;
      }
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (leftHoldId === null && inLeft(x, y)) {
      leftHoldId = id;
      game.audio.play('se_tap', 0.08);
      return;
    }
    if (id === leftHoldId) return;
    var hitV = tryTapValve(x, y);
    if (!hitV) game.feedback.bad(x, y, { text: null, shake: 0 });
  });

  game.onRelease(function(x, y, id) {
    if (id === leftHoldId) { leftHoldId = null; game.audio.play('se_tap', 0.04); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx1: LEFT_ZONE.x + LEFT_ZONE.w * 0.5, gy1: LEFT_ZONE.y + LEFT_ZONE.h * 0.5, press1: true, gx2: SLOTS[0].x, gy2: SLOTS[0].y, press2: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { valves = [newValve(0)]; closedCount = 0; pressure = 0.25; roundIdx = 1; }
    demo.press1 = true; pressure = Math.max(0.15, pressure - dt * 0.5);
    if (valves.length === 0 && cyc < 3.6) { valves = [newValve(roundIdx)]; roundIdx++; }
    if (valves.length) {
      var v = valves[0];
      v.t += dt;
      demo.gx2 = v.x; demo.gy2 = v.y;
      if (v.t > v.dur * 0.5 && !v.tapped) {
        v.tapped = true;
        demo.press2 = true;
        closedCount++;
        game.feedback.good(v.x, v.y, { text: 'CLOSE', color: C.good });
        game.audio.play('se_good', 0.25);
        valves = [];
      }
    } else {
      demo.press2 = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pressure === undefined) initGame();
      bg();
      stepDemo(dt);
      drawEngineer();
      drawLever(true);
      for (var di = 0; di < valves.length; di++) drawValve(valves[di]);
      drawPressure();
      game.draw.hand(demo.gx1, demo.gy1, { press: demo.press1, scale: 13 });
      game.draw.hand(demo.gx2, demo.gy2, { press: demo.press2, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEngineer();
      drawLever(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(closedCount + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - closedCount) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(closedCount, { closed: closedCount, total: TOTAL });
        else game.end.failure({ closed: closedCount, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (leftHoldId === null) pressure += dt * 0.35;
      else pressure -= dt * 0.55;
      pressure = Math.max(0, Math.min(1, pressure));
      if (pressure >= 1) { failNow(W * 0.5, H * 0.4, 'BURST'); }
      spawnTimer -= dt;
      if (!finished && spawnTimer <= 0 && valves.length < 2 && closedCount + valves.length < TOTAL) {
        valves.push(newValve(roundIdx));
        roundIdx++;
        spawnTimer = 0.95;
      }
      for (var i = 0; i < valves.length && !finished; i++) {
        var v = valves[i];
        v.t += dt;
        if (v.t >= v.dur) { failNow(v.x, v.y, 'BLOW'); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawEngineer();
    drawLever(leftHoldId !== null);
    for (var k = 0; k < valves.length; k++) drawValve(valves[k]);
    drawPressure();

    txt(closedCount + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
