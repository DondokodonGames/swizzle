// 799-avalanche.js
// アバランシュ — 落下する岩を、着地する前に爆破ゾーンでタップで爆破せよ
// 操作: タップ — 落下する岩が爆破ゾーン（画面下部）に入った瞬間
// 成功: 12個 爆破  失敗: 3個 着地 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、雪山） ──
  var C = { bg:'#060404', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var MOUNTAIN = '#1a1410', SNOW = '#c0d0e0', ROCK = '#6a5a4a', ROCK_HI = '#9c8c7a', ZONE = '#ffe600', EXPLODE = '#ff6600', EXPLODE_HI = '#fff3c0';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'AVALANCHE';
  var HOW_TO_PLAY = 'TAP THE FALLING ROCKS WHILE THEY PASS THROUGH THE BLAST ZONE';
  var MAX_TIME = 24;
  var NEEDED   = 12;         // 修正2: 35 → 12
  var MAX_LAND = 3;          // 修正2: 10 → 3
  var BLAST_ZONE_Y = snap(H * 0.72), BLAST_ZONE_H = snap(H * 0.12), GROUND_Y = snap(H * 0.9);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rocks, spawnTimer, score, landed, done, timeLeft, elapsed, explosions, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#060404');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnRock() { var x = W * 0.08 + Math.random() * W * 0.84, r = 28 + Math.random() * 22, vy = 200 + Math.random() * 160 + score * 6; rocks.push({ x: snap(x), y: -r, vy: vy, r: r, tapped: false, landed: false }); }

  function initGame() { rocks = []; spawnTimer = 0; score = 0; landed = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; explosions = []; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnRock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 130) : score * 130;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(W * 0.25, H * 0.68, W * 0.32, MOUNTAIN, 0.95); pc(W * 0.75, H * 0.65, W * 0.35, MOUNTAIN, 0.95); pc(W * 0.5, H * 0.6, W * 0.28, MOUNTAIN, 0.95);
    pc(W * 0.25, H * 0.5, W * 0.1, SNOW, 0.5); pc(W * 0.75, H * 0.47, W * 0.11, SNOW, 0.5); pc(W * 0.5, H * 0.44, W * 0.09, SNOW, 0.55);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#2a1c0e', 0.95); game.draw.rect(0, GROUND_Y, W, 8, SNOW, 0.4);
    game.draw.rect(0, BLAST_ZONE_Y, W, BLAST_ZONE_H, ZONE, 0.06 + 0.04 * Math.sin(elapsed * 4));
    game.draw.line(0, BLAST_ZONE_Y, W, BLAST_ZONE_Y, ZONE, 3); game.draw.line(0, BLAST_ZONE_Y + BLAST_ZONE_H, W, BLAST_ZONE_Y + BLAST_ZONE_H, '#5a4a00', 2);
    txt('BLAST ZONE', W / 2, BLAST_ZONE_Y + BLAST_ZONE_H / 2 + 8, 30, ZONE);
    for (var ri2 = 0; ri2 < rocks.length; ri2++) {
      var rock2 = rocks[ri2]; if (rock2.tapped) continue;
      var inBlastZone = rock2.y >= BLAST_ZONE_Y && rock2.y <= BLAST_ZONE_Y + BLAST_ZONE_H, rCol = inBlastZone ? ZONE : ROCK;
      pc(rock2.x, rock2.y, rock2.r, rCol, 0.9); pc(rock2.x - rock2.r * 0.3, rock2.y - rock2.r * 0.3, rock2.r * 0.35, inBlastZone ? EXPLODE_HI : ROCK_HI, 0.4);
      if (inBlastZone) pc(rock2.x, rock2.y, rock2.r + 18 + 6 * Math.sin(elapsed * 10), ZONE, 0.2);
    }
    for (var ex2 = 0; ex2 < explosions.length; ex2++) { var exp = explosions[ex2]; pc(exp.x, exp.y, exp.r, EXPLODE, exp.life * 0.5); pc(exp.x, exp.y, exp.r * 0.5, EXPLODE_HI, exp.life * 0.7); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = rocks.length - 1; i >= 0; i--) {
      var rock = rocks[i]; if (rock.tapped || rock.landed) continue;
      if (!(rock.y >= BLAST_ZONE_Y && rock.y <= BLAST_ZONE_Y + BLAST_ZONE_H)) continue;
      var dx = tx - rock.x, dy = ty - rock.y;
      if (Math.sqrt(dx * dx + dy * dy) < rock.r + 40) {
        rock.tapped = true; score++; flash = 0.18; flashCol = C.b; resultText = 'BOOM!'; resultTimer = 0.32; game.audio.play('se_success', 0.6); explosions.push({ x: rock.x, y: rock.y, r: 0, maxR: rock.r * 4, life: 1.0 });
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: rock.x, y: rock.y, vx: Math.cos(pa) * (160 + Math.random() * 120), vy: Math.sin(pa) * (160 + Math.random() * 120) - 40, life: 0.5, col: EXPLODE }); }
        if (score >= NEEDED) { finish(true); return; }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rocks) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SLOPE SECURED!' : 'BURIED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.4, 0.9 - score * 0.025); if (spawnTimer <= 0) { spawnTimer = spawnRate; spawnRock(); if (score > 6 && Math.random() < 0.35) spawnRock(); }
      for (var ri = rocks.length - 1; ri >= 0; ri--) {
        var rock = rocks[ri];
        if (!rock.tapped) {
          rock.y += rock.vy * dt; rock.vy += 180 * dt;
          if (rock.y >= GROUND_Y && !rock.landed) { rock.landed = true; landed++; flash = 0.3; flashCol = C.a; resultText = 'LANDED!'; resultTimer = 0.42; game.audio.play('se_failure', 0.35); for (var b = 0; b < 5; b++) { var ba = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: rock.x, y: GROUND_Y, vx: Math.cos(ba) * 120, vy: Math.sin(ba) * 120 - 80, life: 0.4, col: SNOW }); } if (landed >= MAX_LAND) { finish(false); return; } }
        }
        if (rock.y > H + 100 || (rock.landed && rock.y > GROUND_Y + 50)) rocks.splice(ri, 1);
      }
      for (var ei = explosions.length - 1; ei >= 0; ei--) { var ex = explosions[ei]; ex.r += 600 * dt; ex.life = 1 - ex.r / ex.maxR; if (ex.life <= 0) explosions.splice(ei, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 350 * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.18), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LAND; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LAND - 1) / 2) * 56) - 10, 224, 20, 20, li < landed ? C.a : '#060404');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
