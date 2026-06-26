// 567-orbit-catch.js
// オービットキャッチ — 惑星の軌道を周回するアイテムをタイミング良くキャッチ
// 操作: タップで惑星の引力をオン/オフしてアイテムを引き寄せる
// 成功: 20個キャッチ  失敗: 8個取り逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#00020f',
    planet:  '#4466ff',
    planetHi:'#88aaff',
    orbit:   '#1a1a44',
    item:    '#f59e0b',
    itemHi:  '#fcd34d',
    attract: '#ff6633',
    catchFx: '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#334466'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var PLANET_R = 80;
  var ORBIT_R = 320;
  var ITEM_R = 28;
  var ATTRACT_R = 200;

  var items = [];
  var attracting = false;
  var catches = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var nextSpawn = 1.5;
  var attractAnim = 0;

  function spawnItem() {
    var startAngle = Math.random() * Math.PI * 2;
    var speed = (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8);
    items.push({
      angle: startAngle,
      speed: speed,
      orbitR: ORBIT_R * (0.7 + Math.random() * 0.6),
      life: 6.0,
      maxLife: 6.0,
      caught: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    attracting = !attracting;
    attractAnim = 0.3;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (attractAnim > 0) attractAnim -= dt * 3;

    // Spawn items
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnItem();
      nextSpawn = Math.max(0.8, 1.5 - catches * 0.03);
    }

    // Update items
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i];
      item.angle += item.speed * dt;

      var ix = CX + Math.cos(item.angle) * item.orbitR;
      var iy = CY + Math.sin(item.angle) * item.orbitR;

      // Attraction: pull toward planet when attract is on
      if (attracting) {
        var dx = CX - ix, dy = CY - iy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ATTRACT_R + item.orbitR) {
          item.orbitR = Math.max(PLANET_R + ITEM_R + 4, item.orbitR - 200 * dt);
        }
      } else {
        // Drift back outward
        item.orbitR = Math.min(ORBIT_R * 1.3, item.orbitR + 60 * dt);
      }

      // Catch
      if (item.orbitR <= PLANET_R + ITEM_R + 8 && !item.caught) {
        item.caught = true;
        catches++;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: ix, y: iy, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.catchFx });
        }
        items.splice(i, 1);
        if (catches >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(catches * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
        continue;
      }

      // Miss: item drifts too far or times out
      item.life -= dt;
      if (item.life <= 0 || item.orbitR > ORBIT_R * 1.8) {
        if (!item.caught) {
          misses++;
          game.audio.play('se_failure', 0.3);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        items.splice(i, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si = 0; si < 40; si++) {
      var sx = (si * 137 + 13) % W;
      var sy = (si * 97 + 41) % H;
      game.draw.circle(sx, sy, 2 + Math.sin(elapsed * 2 + si) * 1, '#ffffff', 0.3 + Math.sin(elapsed + si * 0.5) * 0.2);
    }

    // Orbit rings
    for (var oi = 1; oi <= 3; oi++) {
      game.draw.circle(CX, CY, ORBIT_R * 0.7 * oi / 2, C.orbit, 0.4);
    }
    game.draw.circle(CX, CY, ORBIT_R, C.orbit, 0.6);
    game.draw.circle(CX, CY, ORBIT_R * 1.3, C.orbit, 0.3);

    // Attract field
    if (attracting) {
      var aAlpha = 0.08 + Math.sin(elapsed * 8) * 0.04;
      game.draw.circle(CX, CY, ATTRACT_R + ORBIT_R, C.attract, aAlpha);
      game.draw.circle(CX, CY, ATTRACT_R + ORBIT_R * 0.6, C.attract, aAlpha * 1.5);
    }

    // Items
    for (var i2 = 0; i2 < items.length; i2++) {
      var item2 = items[i2];
      var ix2 = CX + Math.cos(item2.angle) * item2.orbitR;
      var iy2 = CY + Math.sin(item2.angle) * item2.orbitR;
      var lifeRatio = item2.life / item2.maxLife;
      game.draw.circle(ix2, iy2, ITEM_R + 6, C.item, lifeRatio * 0.2);
      game.draw.circle(ix2, iy2, ITEM_R, C.item, lifeRatio * 0.9);
      game.draw.circle(ix2 - 8, iy2 - 8, ITEM_R * 0.3, C.itemHi, 0.5);
    }

    // Planet
    game.draw.circle(CX + 6, CY + 6, PLANET_R, '#001', 0.4);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.95);
    game.draw.circle(CX - 20, CY - 20, PLANET_R * 0.35, C.planetHi, 0.4);
    // Planet ring
    game.draw.line(CX - PLANET_R - 30, CY + 20, CX + PLANET_R + 30, CY - 20, C.planetHi, 10);

    var attractLabel = attracting ? '引力ON' : '引力OFF';
    var attractCol = attracting ? C.attract : C.ui;
    game.draw.circle(CX, CY, PLANET_R - 10, attractCol, 0.15 + Math.sin(elapsed * 6) * 0.05);
    game.draw.text(attractLabel, CX, CY + 16, { size: 32, color: attracting ? C.attract : '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 50 + mi * 100, H * 0.955, 20, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(catches + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.planet : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
  });
})(game);
