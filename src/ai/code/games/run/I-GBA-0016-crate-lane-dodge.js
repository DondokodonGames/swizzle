// I-GBA-0016-crate-lane-dodge.js
// クレートレーンドッジ — 頭上のコンベアから落ちてくる木箱を避け続けながら通路を進む
// 操作: 落下物が来るレーンを見て、来ない側のレーンへホールド移動する
// 終わり: 制限時間を生き延びれば成功。木箱に当たれば失敗
// @mechanic: dodge
// @theme: cargo_conveyor_dodge
// 世界観: 倉庫の搬入通路。頭上のコンベアから木箱が連続で落ちてくる中、台車係が轢かれないようレーンを渡り歩く
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした個数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: くすんだオリーブ系4色パレット、大粒ドット
  var C = {
    bg: '#8a9a5a', bg2: '#6f7f46', belt: '#3c4426', beltEdge: '#232a16',
    crate: '#c47a2e', crateDark: '#7a4a1a', warn: '#ffdd33',
    good: '#dfe8b0', bad: '#d43b3b', gold: '#ffe14d', white: '#f4f8e4', ink: '#141a08',
  };

  var GAME_TITLE = 'CRATE LANE';
  var DUR = 18;
  var LANES = 3;
  var LANE_X = [W * 0.24, W * 0.5, W * 0.76];
  var FLOOR_Y = H * 0.66;
  var LANE_W = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var lane, timeLeft, dodged, spawnT, crates, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.1, W, 26, C.beltEdge);
    for (var i = 0; i < LANES; i++) {
      game.draw.rect(LANE_X[i] - LANE_W / 2, H * 0.14, LANE_W, FLOOR_Y - H * 0.14, C.belt, 0.5);
      game.draw.rect(LANE_X[i] - LANE_W / 2, H * 0.14, 6, FLOOR_Y - H * 0.14, C.beltEdge);
      game.draw.rect(LANE_X[i] + LANE_W / 2 - 6, H * 0.14, 6, FLOOR_Y - H * 0.14, C.beltEdge);
    }
    game.draw.rect(0, FLOOR_Y + 30, W, H - (FLOOR_Y + 30), C.beltEdge, 0.4);
  }

  function newCrate() {
    var l = Math.floor(game.random(0, LANES));
    return { lane: l, y: H * 0.12, tele: 0.6, resolved: false, hit: false };
  }

  function initGame() {
    lane = 1; timeLeft = DUR; dodged = 0; spawnT = 0.9; crates = [];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function moveLane(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var next = lane + dir;
    if (next < 0 || next >= LANES) return;
    lane = next;
    game.audio.play('se_tap', 0.15);
  }

  game.onSwipe(function(dir) {
    if (dir === 'left') moveLane(-1);
    else if (dir === 'right') moveLane(1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) moveLane(x < LANE_X[lane] ? -1 : x > LANE_X[lane] ? 1 : 0);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawCrate(c) {
    var falling = (c.y - H * 0.12) / (FLOOR_Y - H * 0.12);
    if (falling > 0.35 && falling < 0.85) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(LANE_X[c.lane], FLOOR_Y + 10, 60, C.warn, 0.35);
    }
    game.draw.rect(LANE_X[c.lane] - 55, c.y - 45, 110, 90, C.crateDark);
    game.draw.rect(LANE_X[c.lane] - 46, c.y - 36, 92, 72, C.crate);
    game.draw.line(LANE_X[c.lane] - 46, c.y, LANE_X[c.lane] + 46, c.y, C.crateDark, 6);
  }

  function drawWorker(l, hitFlash) {
    game.draw.sprite(WORKER, { '#': hitFlash ? C.white : C.gold }, LANE_X[l], FLOOR_Y + 90, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LANE_X[1], gy: FLOOR_Y + 220, press: false, lane: 1, crates: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      demo.crates = [
        { lane: 0, y: H * 0.12, spawn: 0.2 },
        { lane: 1, y: H * 0.12, spawn: 1.6 },
        { lane: 1, y: H * 0.12, spawn: 3.0 },
      ];
      demo.lane = 1;
    }
    lane = demo.lane;
    crates = [];
    for (var i = 0; i < demo.crates.length; i++) {
      var d = demo.crates[i];
      var age = cyc - d.spawn;
      if (age < 0) continue;
      var p = Math.min(1, age / 1.35);
      var c = { lane: d.lane, y: H * 0.12 + p * (FLOOR_Y - H * 0.12) };
      crates.push(c);
      if (p > 0.4 && p < 0.55 && demo.lane === d.lane) {
        var target = d.lane === 0 ? 1 : 0;
        demo.lane = target;
        demo.gx = LANE_X[target];
        demo.press = true;
      }
    }
    lane = demo.lane;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      for (var di = 0; di < crates.length; di++) drawCrate(crates[di]);
      drawWorker(lane, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWorker(lane, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(dodged + ' HIT', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, duration: DUR });
        else game.end.failure({ dodged: dodged, duration: DUR });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      spawnT -= dt;
      if (spawnT <= 0) {
        crates.push(newCrate());
        spawnT = Math.max(0.55, 1.15 - dodged * 0.03);
      }
      for (var i = crates.length - 1; i >= 0; i--) {
        var c = crates[i];
        c.y += dt * (620 + dodged * 8);
        if (!c.resolved && c.y >= FLOOR_Y - 20) {
          c.resolved = true;
          if (c.lane === lane) {
            c.hit = true;
            hitStop = 0.35;
            game.feedback.bad(LANE_X[c.lane], FLOOR_Y, { text: 'HIT' });
            shake = 0.3;
            game.audio.play('se_bad', 0.4);
            ok = false; finished = true; finish();
          } else {
            dodged++;
            game.feedback.good(LANE_X[c.lane], FLOOR_Y, { text: 'GOOD', color: C.good, size: 30 });
            game.audio.play('se_good', 0.25);
            if (!milestoneShown && dodged === 5) {
              milestoneShown = true;
              game.fx.popup('5 DODGED!', LANE_X[lane], FLOOR_Y - 140, { color: C.gold, size: 38 });
              game.audio.play('se_milestone', 0.4);
            }
          }
        }
      }
      for (var j = crates.length - 1; j >= 0; j--) if (crates[j].y > FLOOR_Y + 140) crates.splice(j, 1);
      if (timeLeft <= 0) { ok = true; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var k = 0; k < crates.length; k++) drawCrate(crates[k]);
    if (!finished || !crates.some(function(c) { return c.hit; })) drawWorker(lane, false);
    else drawWorker(lane, true);

    txt(Math.max(0, Math.ceil(timeLeft)) + 's', W / 2, H * 0.05, 34, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    txt(dodged + ' HIT', W * 0.5, H * 0.20, 24, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['C3', 0.5], ['D3', 0.5], ['E3', 1]], { tempo: 108, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
