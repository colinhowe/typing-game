import * as seedrandom from 'seedrandom';
const ponySrc = require('assets/img/pony-sprite.png');
const starSrc = require('assets/img/star-sprite.png');
const platformSrc = require('assets/img/grass.png');
const rainbowSrc = require('assets/img/rainbow-large.png');


const actors = new Set();

let cameraY = 0;
let score = 0;

class ActorCollisionMap {
    private map;

    constructor() {
        this.map = {};
    }

    updateActor(actor, oldY) {
        // Use a size that is way above the actual max size of a sprite
        // This makes checks nice and easy in that we only need to go one up
        // and one down
        const checkOldY = Math.floor(oldY / 200);
        const potentials = this.map[checkOldY];
        if (this.map[checkOldY]) {
            this.map[checkOldY] = this.map[checkOldY].filter((other) => other != actor);
        }
        const checkY = Math.floor(actor.y / 200);
        if (!this.map[checkY]) {
            this.map[checkY] = [];
        }
        this.map[checkY].push(actor);
    }

    removeActor(actor) {
        const checkOldY = Math.floor(actor.y / 200);
        const potentials = this.map[checkOldY];
        if (this.map[checkOldY]) {
            this.map[checkOldY] = this.map[checkOldY].filter((other) => other != actor);
        }
    }

    collectCollisions(actor) {
        // Gets any potential collisions for this actor
        const baseY = Math.floor(actor.y / 200);
        const collisions = [];

        const boundsATop = actor.y;
        const boundsABottom = actor.y + actor.sprite.meta.frameHeight;
        const boundsALeft = actor.x;
        const boundsARight = actor.x + actor.sprite.meta.frameWidth;

        for (let i = -1; i < 2; i++) {
            const potentials = this.map[baseY + i];
            if (!potentials) {
                continue;
            }
            for (const other of potentials) {
                if (other == actor) {
                    continue;
                }

                const boundsBTop = other.y;
                const boundsBBottom = other.y + other.sprite.meta.frameHeight;
                const boundsBLeft = other.x;
                const boundsBRight = other.x + other.sprite.meta.frameWidth;

                // Check if there is any intersection
                if (boundsALeft <= boundsBRight && boundsARight >= boundsBLeft
                    && boundsATop <= boundsBBottom && boundsABottom >= boundsBTop) {
                    collisions.push(other);
                }

            }
        }

        return collisions;
    }
}

const collisionMap = new ActorCollisionMap();

class SpriteMeta {
    image: HTMLImageElement;

    constructor(
        public src, public frameWidth, private frameHeight,
        public offsetX, public offsetY,
        private animations) {

        this.image = new Image();
        this.image.src = <string>src;
    }
}

class SpriteAnimation {
    public millisPerFrame: number;
    constructor(public frames, public length) {
        this.millisPerFrame = length / frames.length;
    }
}

class Sprite {
    animation: string;
    private animationStartTime: number;
    private orientation: string;

    // TODO orientation
    // TODO Offset for tail going below legs
    // TODO Scrolling

    constructor(public meta, public x, public y) {
        this.animation = null;
        this.orientation = 'left';
    }

    startAnimation(name) {
        this.animation = name;
    }

    draw(context, time) {
        let frame = 0;

        if (this.animation) {
            // Initial frame should set the last frame change
            if (!this.animationStartTime) {
                this.animationStartTime = time;
            }

            const animationMeta = this.meta.animations[this.animation];
            const frameIndex = Math.floor(
                (time - this.animationStartTime) / animationMeta.millisPerFrame);
            frame = animationMeta.frames[frameIndex % animationMeta.frames.length];
        }

        context.save();

        context.translate(0, -cameraY);
        context.translate(this.x, this.y);
        context.translate(0, -this.meta.offsetY);
        if (this.orientation == 'right') {
            context.translate(this.meta.frameWidth, 0);
            context.scale(-1, 1);
        }

        context.drawImage(
            this.meta.image,
            frame * this.meta.frameWidth, 0,
            this.meta.frameWidth, this.meta.frameHeight,
            0, 0,
            this.meta.frameWidth, this.meta.frameHeight,
        );

        context.restore();
    }
}

class Actor {
    public velocityX;
    public velocityY;
    // realX and realY track the absolute position of the actor, this is only
    // used for tracking velocity.
    public realX;
    public realY;
    public sprite;
    protected interactable;

    constructor(private meta, public x, public y) {
        this.sprite = new Sprite(meta, x, y);
        this.velocityX = 0;
        this.velocityY = 0;
        this.realX = x;
        this.realY = y;
        this.interactable = true;

        actors.add(this);
    }

    draw(context, time, elapsed) {
        const oldY = this.y;
        this.realX += this.velocityX * elapsed / 1000;
        this.realY += this.velocityY * elapsed / 1000;

        // Allow effects to fall off the screen... but interactions, no!
        if (this.interactable) {
            if (this.realX < 0) {
                this.realX = 0;
            }
            if (this.realX + this.sprite.meta.frameWidth > document.body.clientWidth) {
                this.realX = document.body.clientWidth - this.sprite.meta.frameWidth;
            }

            if (this.realY > document.body.clientHeight) {
                this.realY = document.body.clientHeight - 200;
            }
        }

        this.x = Math.round(this.realX);
        this.y = Math.round(this.realY);
        if (this.interactable) {
            collisionMap.updateActor(this, oldY);
        }

        this.sprite.x = this.x;
        this.sprite.y = this.y;

        if (this.velocityX > 0) {
            this.sprite.orientation = 'right';
        } else {
            this.sprite.orientation = 'left';
        }

        this.sprite.draw(context, time);
    }

    startAnimation(name) {
        this.sprite.startAnimation(name);
    }

    destroy() {
        actors.delete(this);
        collisionMap.removeActor(this);
    }

    checkInteractions() {
        if (this.interactable) {
            const collisions = collisionMap.collectCollisions(this);
            for (const collision of collisions) {
                collision.interact(this);
            }
        }
    }

    // Dummy method to be used by other things
    interact(other) {
    }
}

const ponySpriteMeta = new SpriteMeta(ponySrc, 100, 95, 0, -5, {
    gallop: new SpriteAnimation([0, 5, 6, 7, 8], 400),
    fly: new SpriteAnimation([0, 1, 2, 3, 4, 3, 2, 1], 400),
    stand: new SpriteAnimation([0, 1], 800),
});

const platformSpriteMeta = new SpriteMeta(platformSrc, 250, 28, 0, 0, {});
const rainbowSpriteMeta = new SpriteMeta(rainbowSrc, 80, 49, 0, 0, {});


const starSpriteMeta = new SpriteMeta(starSrc, 20, 19, 0, 0, {
    cycle: new SpriteAnimation([0, 1, 2, 3, 4, 5, 6], 1000),
    teal: new SpriteAnimation([0], 1000),
    green: new SpriteAnimation([1], 1000),
    orange: new SpriteAnimation([2], 1000),
    pink: new SpriteAnimation([3], 1000),
    purple: new SpriteAnimation([4], 1000),
    red: new SpriteAnimation([5], 1000),
    yellow: new SpriteAnimation([6], 1000),
});

const colorIndexes = {
    0: 'teal',
    1: 'green',
    2: 'orange',
    3: 'pink',
    4: 'purple',
    5: 'red',
    6: 'yellow',
};

class Star extends Actor {
    private lifeLeft;

    constructor(x, y) {
        super(starSpriteMeta, x, y);
        this.lifeLeft = 500;
        this.interactable = false;
    }

    draw(context, time, elapsed) {
        super.draw(context, time, elapsed);

        this.lifeLeft -= elapsed;
        if (this.lifeLeft < 0) {
            this.destroy();
        }
    }
}

const GRAVITY = 0.5;

class Pony extends Actor { 
    private lastStarX;
    private lastStarY;
    private stars;
    private lastColour = 0;
    public grounded = false;

    constructor(x, y) {
        super(ponySpriteMeta, x, y);
        this.lastStarX = x;
        this.lastStarY = y;
        this.stars = new Set();
    }

    draw(context, time, elapsed) {
        // TODO Terminal velocity

        if (this.sprite.animation == 'stand') {
            if (this.velocityY) {
                this.startAnimation('fly');
            } else if (this.velocityX) {
                this.startAnimation('gallop');
            }
        } else {
            if (!this.velocityY && !this.velocityX) {
                this.startAnimation('stand');
            } else {
                if (this.sprite.animation == 'fly' && !this.velocityY) {
                    this.startAnimation('gallop');
                } else if (this.sprite.animation == 'gallop' && this.velocityY) {
                    this.startAnimation('fly');
                }
            }
        }

        // Apply gravity
        if (!this.grounded) {
            this.velocityY += GRAVITY * elapsed;
        }
        // Reset grounded flag, will be set to true by platforms
        this.grounded = false;

        super.draw(context, time, elapsed);

        // Decide if we need to drop another star
        const distance = Math.sqrt(
            Math.pow(this.x - this.lastStarX, 2) +
            Math.pow(this.y - this.lastStarY, 2)
        );

        if (distance > 25) {
            this.lastColour += 1;
            let starX = this.x;
            if (this.velocityX > 0) {
                starX -= 20;
            } else {
                starX += this.sprite.meta.frameWidth;
            }
            const star = new Star(starX, this.y + 50);
            const animation = colorIndexes[this.lastColour % Object.keys(colorIndexes).length];
            star.startAnimation(animation);
            star.velocityY = 30;
            this.lastStarX = this.x;
            this.lastStarY = this.y;
        }
    }
}

class Platform extends Actor {
    constructor(x, y) {
        super(platformSpriteMeta, x, y);
    }

    interact(other) {
        if (!(other instanceof Pony)) {
            return;
        }

        // Only interact if the pony is going downwards and nearly on the platform
        if (other.velocityY > 0
            && other.y + other.sprite.meta.frameHeight < this.y + 20) {
            // Going downwards... stop them and force them to the top
            other.velocityY = 0;
            other.y = this.y - other.sprite.meta.frameHeight;
            other.realY = other.y;
            other.grounded = true;
        }
    }
}

class Rainbow extends Actor {
    private initialY;

    constructor(x, y) {
        super(rainbowSpriteMeta, x, y);
        this.initialY = y;
    }

    draw(context, time, elapsed) {
        this.realY = this.initialY - Math.sin(time / 250) * 5;
        this.y = this.realY;
        this.sprite.y = this.y;

        super.draw(context, time, elapsed);
    }

    interact(other) {
        if (!(other instanceof Pony)) {
            return;
        }

        score += 1;
        this.destroy();
    }
}




const ponyActor = new Pony(document.body.clientWidth / 2, document.body.clientHeight - 200);
for (let platformX = 0; platformX < document.body.clientWidth; platformX += 250) {
    new Platform(platformX, document.body.clientHeight - 28);
}

const MAX_GAP = 600;


var rng = seedrandom('hello.');

let lastX = 0;
for (let layer = 1; layer < 200; layer += 1) {
    let newX;
    while (true) {
        newX = Math.floor(lastX + (2 * rng() * MAX_GAP) - MAX_GAP);
        if (newX < 0) {
            newX = 0;
        }
        if (newX + 250 > document.body.clientWidth) {
            newX = document.body.clientWidth - 250;
        }
        if (newX != lastX) {
            break;
        }
    }

    new Platform(newX, document.body.clientHeight - 28 - layer * 180);
    new Rainbow(newX + 85, document.body.clientHeight - 28 - layer * 180 - 60);
    lastX = newX;
}


const PONY_HORIZONTAL_SPEED = 200;
const PONY_VERTICAL_SPEED = -450;

// canvas element in DOM
var canvas1 = <HTMLCanvasElement>document.getElementById('mainCanvas');
canvas1.width = document.body.clientWidth;
canvas1.height = document.body.clientHeight;
var context1 = canvas1.getContext('2d');

var canvas2 = document.createElement('canvas');
canvas2.width = canvas1.width;
canvas2.height = canvas1.height;
var context2 = canvas2.getContext('2d');


let lastTime = Date.now();

const KEY_ARROW_UP = 38;
const KEY_ARROW_RIGHT = 39;
const KEY_ARROW_LEFT = 37;

window.setInterval(function() {
    // buffer canvas
    context2.fillStyle = "#87CEEB";
    context2.fillRect(0, 0, canvas1.width, canvas1.height);

    let time = Date.now();
    let elapsed = time - lastTime;

    // Hack for when JS stutters. Do lots of quick short frames
    if (elapsed > 50) {
        elapsed = 50;
        time = lastTime + elapsed;
    }


    // Keyboard input
    let gamepadXAxis = 0;
    let gamepad = null;
    if (gamepadIndex !== null) {
        gamepad = navigator.getGamepads()[gamepadIndex];
        for (let i = 0; i < gamepad.axes.length; i += 2) {
            if (Math.abs(gamepad.axes[i * 2]) == 1) {
                gamepadXAxis = gamepad.axes[i * 2];
                console.log(`I got axis ${gamepadXAxis}`);
            }
        }
        for (let i = 0; i < gamepad.buttons.length; i++) {
            if (gamepad.buttons[i].pressed) {
                console.log(`Button ${i} pressed`);
            }
        }

        if (gamepad.buttons[14] && gamepad.buttons[14].pressed) {
            gamepadXAxis = -1;
        }
        if (gamepad.buttons[15] && gamepad.buttons[15].pressed) {
            gamepadXAxis = 1;
        }
    }


    if (pressed[KEY_ARROW_RIGHT] || gamepadXAxis == 1) {
        ponyActor.velocityX = PONY_HORIZONTAL_SPEED;
    } else if (pressed[KEY_ARROW_LEFT] || gamepadXAxis == -1) {
        ponyActor.velocityX = -PONY_HORIZONTAL_SPEED;
    } else {
        ponyActor.velocityX = 0;
    }

    if (ponyActor.y > 1000) {
        ponyActor.destroy();
    }

    // Interaction loop
    actors.forEach(actor => {
        actor.checkInteractions();
    });

    if (!ponyActor.velocityY && ponyActor.grounded) {
        if (pressed[KEY_ARROW_UP] || (gamepad && gamepad.buttons[0].pressed)) {
            ponyActor.velocityY = PONY_VERTICAL_SPEED;
        }
    }

    // TODO Z indexing
    //
    actors.forEach(actor => {
        actor.draw(context2, time, elapsed);
    });
    lastTime = time;


    context2.save();
    context2.font = "80px Sans";

    // Fill with gradient
    const txt = `${score}`;
    context2.fillStyle = '#ff00ff';
    const txtSize = context2.measureText(txt);
    context2.fillText(txt, document.body.clientWidth - 30 - txtSize.width, 70 + 30);
    context2.restore();

    // Render!
    context1.drawImage(canvas2, 0, 0);

    // Start moving the camera if the pony is heading out of bounds
    const idealTop = cameraY + (document.body.clientHeight * 0.33);
    const idealBottom = cameraY + (document.body.clientHeight * 0.66);
    if (ponyActor.y < idealTop) {
        let change = (idealTop - ponyActor.y) / 10;
        if (change < 2) {
            change = 2;
        }
        cameraY -= change;
    }
    if (ponyActor.y > idealBottom) {
        let change = (ponyActor.y - idealBottom) / 10;
        if (change < 2) {
            change = 2;
        }
        cameraY += change;
    }
    if (cameraY > 0) {
        cameraY = 0;
    }
}, 10);

var pressed={};
window.onkeydown=function(e){
    e = e || <KeyboardEvent>window.event;
    pressed[e.keyCode] = true;
}


window.onkeyup=function(e){
    e = e || <KeyboardEvent>window.event;
     delete pressed[e.keyCode];
}

let gamepadIndex = null;

window.addEventListener("gamepadconnected", function(e : GamepadEvent) {
  console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
    e.gamepad.index, e.gamepad.id,
      e.gamepad.buttons.length, e.gamepad.axes.length);

    gamepadIndex = e.gamepad.index;
});
