// 398-earthquake-drill.js
// 地震訓練 — 揺れる棚から落ちる物を全部キャッチして守る
// 操作: 左右スワイプで救助ネットを動かす
// 成功: 20個キャッチ  失敗: 5個床に落とす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0a08',
    room:   '#2d1a10',
    shelf:  '#78350f',
    shelfHi:'#92400e',
    net:    '#22c55e',
    netHi:  '#86efac',
    obj0:   '#3b82f6',
    obj1:   '#ef4444',
    obj2:   '#fbbf24',
    obj3:   '#a855f7',
    floor:  '#451a03',
    crack:  '#dc2626',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var OBJ_COLS = [C.obj0, C.obj1, C.obj2, C.obj3];

  var SHELF_Y1 = H * 0.25;
  var SHELF_Y2 = H * 0.45;
  var FLOOR_Y = H * 0.86;

  var NET_W = 280;
  var NET_Y = H * 0.78;
  var netX = W / 2;
  var netVX = 0;
  var NET_SPEED = 800;

  var shakeX = 0;
  var shakePhase = 0;
  var shakeAmp = 0;
  var nextShakeTimer = 1.5;

  var objects = [];
  var spawnTimer = 0.8;
  var objectsCaught = 0;
  var NEEDED = 20;
  var objectsDropped = 0;
  var MAX_DROP = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var flashCol = '#fff';
  var flashAnim = 0;

  function spawnObject() {
    var col = OBJ_COLS[Math.floor(Math.random()*OBJ_COLS.length)];
    var shelfY = Math.random() < 0.5 ? SHELF_Y1 : SHELF_Y2;
    objects.push({
      x: 80 + Math.random()*(W-160),
      y: shelfY,
      vy: 0,
      r: 28 + Math.random()*20,
      col: col,
      shape: Math.floor(Math.random()*3)  // 0=circle, 1=rect, 2=triangle
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') netVX = -NET_SPEED;
    else if (dir === 'right') netVX = NET_SPEED;
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap positions net
    netVX = (tx - netX) * 5;
    netVX = Math.max(-NET_SPEED, Math.min(NET_SPEED, netVX));
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Earthquake shake
    nextShakeTimer -= dt;
    if (nextShakeTimer <= 0) {
      shakeAmp = 15 + Math.random()*20;
      nextShakeTimer = 3 + Math.random()*3;
      game.audio.play('se_failure', 0.15);
    }
    shakePhase += dt * 18;
    shakeX = Math.sin(shakePhase) * shakeAmp;
    shakeAmp *= (1 - 4*dt);

    // Net movement
    netX += netVX * dt;
    netX = Math.max(NET_W/2 + 20, Math.min(W - NET_W/2 - 20, netX));
    netVX *= (1 - 6*dt);

    // Spawn objects
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnObject();
      spawnTimer = 1.2 + Math.random()*1.2;
    }

    // Update objects
    for (var i = objects.length-1; i >= 0; i--) {
      var obj = objects[i];
      obj.vy += 500 * dt;
      obj.y += obj.vy * dt;
      obj.x += shakeX * 0.3 * dt;

      // Check net catch
      if (obj.y + obj.r > NET_Y - 20 && obj.y < NET_Y + 40 &&
          Math.abs(obj.x - netX) < NET_W/2 + obj.r) {
        objectsCaught++;
        game.audio.play('se_success', 0.4);
        flashCol = C.netHi;
        flashAnim = 0.3;
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x:obj.x, y:NET_Y, vx:Math.cos(ang)*150, vy:Math.sin(ang)*150-100, life:0.5, col:obj.col });
        }
        objects.splice(i, 1);
        if (objectsCaught >= NEEDED && !done) {
          done = true;
          setTimeout(function(){ game.end.success(objectsCaught*200+Math.ceil(timeLeft)*80); }, 600);
        }
        continue;
      }

      // Hit floor
      if (obj.y > FLOOR_Y && !done) {
        objectsDropped++;
        game.audio.play('se_failure', 0.4);
        flashCol = C.crack;
        flashAnim = 0.4;
        for (var pi2 = 0; pi2 < 6; pi2++) {
          var ang2 = Math.random()*Math.PI;
          particles.push({ x:obj.x, y:FLOOR_Y, vx:Math.cos(ang2)*200, vy:-Math.sin(ang2)*150, life:0.5, col:obj.col });
        }
        objects.splice(i, 1);
        if (objectsDropped >= MAX_DROP && !done) {
          done = true;
          setTimeout(function(){ game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy += 300*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.room, 0.7);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, H-FLOOR_Y, C.floor, 0.9);
    game.draw.line(0, FLOOR_Y, W, FLOOR_Y, C.shelfHi, 3);

    // Shelves (shaking)
    var sx = shakeX;
    game.draw.rect(sx, SHELF_Y1, W, 24, C.shelf, 0.9);
    game.draw.rect(sx, SHELF_Y1, W, 24, C.shelfHi, 0.2);
    game.draw.rect(sx, SHELF_Y2, W, 24, C.shelf, 0.9);
    game.draw.rect(sx, SHELF_Y2, W, 24, C.shelfHi, 0.2);
    // Shelf supports
    game.draw.rect(sx+60, SHELF_Y1-100, 20, 100, C.shelfHi, 0.5);
    game.draw.rect(sx+W-80, SHELF_Y1-100, 20, 100, C.shelfHi, 0.5);
    game.draw.rect(sx+60, SHELF_Y2-100, 20, 100, C.shelfHi, 0.5);
    game.draw.rect(sx+W-80, SHELF_Y2-100, 20, 100, C.shelfHi, 0.5);

    // Falling objects
    for (var i2 = 0; i2 < objects.length; i2++) {
      var obj2 = objects[i2];
      if (obj2.shape === 0) {
        game.draw.circle(obj2.x, obj2.y, obj2.r, obj2.col, 0.9);
        game.draw.circle(obj2.x-obj2.r*0.3, obj2.y-obj2.r*0.3, obj2.r*0.3, '#fff', 0.4);
      } else if (obj2.shape === 1) {
        game.draw.rect(obj2.x-obj2.r, obj2.y-obj2.r, obj2.r*2, obj2.r*2, obj2.col, 0.9);
      } else {
        game.draw.circle(obj2.x, obj2.y, obj2.r, obj2.col, 0.9);
        game.draw.circle(obj2.x, obj2.y, obj2.r*0.6, '#fff', 0.15);
      }
    }

    // Net
    game.draw.rect(netX-NET_W/2, NET_Y-12, NET_W, 24, C.net, 0.9);
    game.draw.rect(netX-NET_W/2, NET_Y-12, NET_W, 24, C.netHi, 0.2);
    // Net posts
    game.draw.line(netX-NET_W/2, NET_Y-12, netX-NET_W/2, NET_Y+48, C.net, 8);
    game.draw.line(netX+NET_W/2, NET_Y-12, netX+NET_W/2, NET_Y+48, C.net, 8);
    // Net lines
    for (var ni = 0; ni < 6; ni++) {
      var nx = netX - NET_W/2 + ni*(NET_W/5);
      game.draw.line(nx, NET_Y+12, nx+(NET_W/5)*0.5, NET_Y+48, C.netHi, 3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);

    // Drop dots
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W/2-(MAX_DROP-1)*34+di*68, H*0.935, 14, di < objectsDropped ? C.crack : C.ui, 0.9);
    }

    game.draw.text(objectsCaught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.net : C.crack);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
