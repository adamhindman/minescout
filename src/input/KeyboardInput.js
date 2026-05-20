import Phaser from 'phaser';

export class KeyboardInput {
  constructor(scene, getGame, onRestart) {
    const kb = scene.input.keyboard;
    const K  = Phaser.Input.Keyboard.KeyCodes;
    const k  = (code) => kb.addKey(code);

    const up    = k(K.UP);
    const down  = k(K.DOWN);
    const left  = k(K.LEFT);
    const right = k(K.RIGHT);
    const keyA     = k(K.A);
    const keyR     = k(K.R);
    const keyEnter = k(K.ENTER);
    const keyEsc   = k(K.ESC);
    const keyShift = k(K.SHIFT);

    const g = () => getGame();

    up.on('down',    () => g().defuseMode ? g().moveCursor(0, -1) : g().move(0, -1));
    down.on('down',  () => g().defuseMode ? g().moveCursor(0,  1) : g().move(0,  1));
    left.on('down',  () => g().defuseMode ? g().moveCursor(-1, 0) : g().move(-1, 0));
    right.on('down', () => g().defuseMode ? g().moveCursor( 1, 0) : g().move( 1, 0));

    keyA.on('down',     () => g().move(-1, 0));
    keyR.on('down',     () => onRestart());
    keyEnter.on('down', () => g().confirmDefuse());
    keyEsc.on('down',   () => { if (g().defuseMode) g().exitDefuse(); });
    keyShift.on('down', () => g().toggleDefuse());
  }
}
