import { draw, drawLeaderBoard, updateTimeText } from './ui.js';
import { update } from './game.js';
import { importLevel } from './level.js';
import { startedAt,  finalTime } from './game.js';
import { initCanvasListeners } from './input.js';

(async () => {
    let last = performance.now();
  
    function tick(now){
        const dt=(now-last)/16;
        last = now;
        if (startedAt) {
            if (finalTime != null) {
                updateTimeText(finalTime);
            } else {
                updateTimeText((now - startedAt) / 1000);
            }
        }

        if (startedAt)
            update(dt);

        draw();
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    drawLeaderBoard();

    importLevel();

    initCanvasListeners();
})();
