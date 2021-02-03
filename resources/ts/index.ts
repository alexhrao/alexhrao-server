interface Particle {
    color: string;
    color2: string;
    x: number;
    y: number;
    diameter: number;
    tilt: number;
    tiltAngleIncrement: number;
    tiltAngle: number;
}
interface Confetti {
    maxCount: number;
    speed: number;
    frameInterval: number;
    alpha: number;
    gradient: boolean;
    isHeart: boolean;
    start: () => void;
    stop: () => void;
    toggle: () => void;
    pause: () => void;
    resume: () => void;
    togglePause: () => void;
    remove: () => void;
    isPaused: () => boolean;
    isRunning: () => boolean;
}
interface Riddle {
    stage: number;
    readonly riddle: string;
    readonly blurb: string;
    readonly order: number;
}
interface Changer {
    (key: string): unknown;
}

interface Heart {
    x: number;
    y: number;
    color: string;
}
const colors = ['red', 'blue', 'rebeccapurple', 'coral', 'firebrick'];
const hearts: Heart[] = [];
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
    ctx.save();
    ctx.beginPath();
    const topCurveHeight = height * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    // top left curve
    ctx.bezierCurveTo(
      x, y, 
      x - width / 2, y, 
      x - width / 2, y + topCurveHeight
    );
  
    // bottom left curve
    ctx.bezierCurveTo(
      x - width / 2, y + (height + topCurveHeight) / 2, 
      x, y + (height + topCurveHeight) / 2, 
      x, y + height
    );
  
    // bottom right curve
    ctx.bezierCurveTo(
      x, y + (height + topCurveHeight) / 2, 
      x + width / 2, y + (height + topCurveHeight) / 2, 
      x + width / 2, y + topCurveHeight
    );
  
    // top right curve
    ctx.bezierCurveTo(
      x + width / 2, y, 
      x, y, 
      x, y + topCurveHeight
    );
  
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}
const confettiSetup = () => {
    const confetti: Confetti = {
        maxCount: 150,      //set max confetti count
        speed: 2,           //set the particle animation speed
        frameInterval: 15,  //the confetti animation frame interval in milliseconds
        alpha: 1.0,         //the alpha opacity of the confetti (between 0 and 1, where 1 is opaque and 0 is invisible)
        gradient: false,    //whether to use gradients for the confetti particles
        isHeart: false,     //whether to draw hearts
        start: startConfetti,        //call to start confetti animation (with optional timeout in milliseconds, and optional min and max random confetti count)
        stop: stopConfetti,         //call to stop adding confetti
        toggle: toggleConfetti,       //call to start or stop the confetti animation depending on whether it's already running
        pause: pauseConfetti,        //call to freeze confetti animation
        resume: resumeConfetti,       //call to unfreeze confetti animation
        togglePause: toggleConfettiPause,  //call to toggle whether the confetti animation is paused
        remove: removeConfetti,       //call to stop the confetti animation and remove all confetti immediately
        isPaused: isConfettiPaused,     //call and returns true or false depending on whether the confetti animation is paused
        isRunning: isConfettiRunning	    //call and returns true or false depending on whether the animation is running
    };
    const supportsAnimationFrame = (window.requestAnimationFrame ?? window.webkitRequestAnimationFrame) !== undefined;
    const colors = ["rgba(30,144,255,", "rgba(107,142,35,", "rgba(255,215,0,", "rgba(255,192,203,", "rgba(106,90,205,", "rgba(173,216,230,", "rgba(238,130,238,", "rgba(152,251,152,", "rgba(70,130,180,", "rgba(244,164,96,", "rgba(210,105,30,", "rgba(220,20,60,"];
    let streamingConfetti = false;
    let pause = false;
    let lastFrameTime = Date.now();
    let particles: Particle[] = [];
    let waveAngle = 0;
    let context: CanvasRenderingContext2D|null = null;
    let innerWidth = document.documentElement.scrollWidth;
    let innerHeight = document.documentElement.scrollHeight;

    function resetParticle(particle: Particle, width: number, height: number): Particle {
        particle.color = colors[(Math.random() * colors.length) | 0] + (confetti.alpha + ")");
        particle.color2 = colors[(Math.random() * colors.length) | 0] + (confetti.alpha + ")");
        particle.x = Math.random() * width;
        particle.y = Math.random() * height - height;
        particle.diameter = Math.random() * 10 + 5;
        particle.tilt = Math.random() * 10 - 10;
        particle.tiltAngleIncrement = Math.random() * 0.07 + 0.05;
        particle.tiltAngle = Math.random() * Math.PI;
        return particle;
    }

    function toggleConfettiPause() {
        if (pause)
            resumeConfetti();
        else
            pauseConfetti();
    }

    function isConfettiPaused() {
        return pause;
    }

    function pauseConfetti() {
        pause = true;
    }

    function resumeConfetti() {
        pause = false;
        runAnimation();
    }

    function runAnimation() {
        hearts.forEach(heart => {
            if (context !== null) {
                drawHeart(context, heart.x, heart.y - 30, 60, 60, heart.color);
            }
        });
        if (pause) {
            return;
        } else if (particles.length === 0) {
            context?.clearRect(0, 0, innerWidth, innerHeight);
            hearts.forEach(heart => {
                if (context !== null) {
                    drawHeart(context, heart.x, heart.y - 30, 60, 60, heart.color);
                }
            });
            window.requestAnimationFrame(runAnimation);
        } else {
            const now = Date.now();
            const delta = now - lastFrameTime;
            if ((!supportsAnimationFrame || delta > confetti.frameInterval) && context !== null) {
                context?.clearRect(0, 0, innerWidth, innerHeight);
                updateParticles();
                drawParticles(context);
                lastFrameTime = now - (delta % confetti.frameInterval);
            }
            window.requestAnimationFrame(runAnimation);
        }
    }

    function startConfetti(timeout?: number, min?: number, max?: number) {
        const animator = () => {
            return window.requestAnimationFrame
                ?? window.webkitRequestAnimationFrame
                ?? (callback => window.setTimeout(callback, confetti.frameInterval));
        }
        innerWidth = document.documentElement.scrollWidth*0.99;
        innerHeight = document.documentElement.scrollHeight;
        window.requestAnimationFrame = animator();
        let canvas = document.querySelector<HTMLCanvasElement>('#confettiCanvas');
        if (canvas === null) {
            canvas = document.createElement("canvas");
            canvas.setAttribute("id", "confettiCanvas");
            document.body.prepend(canvas);
            canvas.width = innerWidth;
            canvas.height = innerHeight;
            window.addEventListener("resize", () => {
                innerWidth = document.documentElement.scrollWidth;
                innerHeight = document.documentElement.scrollHeight
                if (canvas !== null) {
                    canvas.width = innerWidth;
                    canvas.height = innerHeight;
                }
            }, true);
            context = canvas.getContext("2d");
        } else if (context === null) {
            context = canvas.getContext("2d");
        }
        let count = confetti.maxCount;
        if (min) {
            if (max) {
                if (min === max) {
                    count = particles.length + max;
                } else {
                    if (min > max) {
                        const temp = min;
                        min = max;
                        max = temp;
                    }
                    count = particles.length + ((Math.random() * (max - min) + min) | 0);
                }
            } else {
                count = particles.length + min;
            }
        } else if (max) {
            count = particles.length + max;
        }
        while (particles.length < count) {
            particles.push(resetParticle({} as Particle, innerWidth, innerHeight));
        }
        streamingConfetti = true;
        pause = false;
        runAnimation();
        if (timeout) {
            window.setTimeout(stopConfetti, timeout);
        }
    }

    function stopConfetti() {
        streamingConfetti = false;
    }

    function removeConfetti() {
        stop();
        pause = false;
        particles = [];
    }

    function toggleConfetti() {
        if (streamingConfetti) {
            stopConfetti();
        } else {
            startConfetti();
        }
    }
    
    function isConfettiRunning() {
        return streamingConfetti;
    }

    function drawParticles(context: CanvasRenderingContext2D) {
        particles.forEach(particle => {
            context.beginPath();
            context.lineWidth = particle.diameter;
            const x2 = particle.x + particle.tilt;
            const x = x2 + particle.diameter / 2;
            const y2 = particle.y + particle.tilt + particle.diameter / 2;
            if (confetti.gradient) {
                const gradient = context.createLinearGradient(x, particle.y, x2, y2);
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(1.0, particle.color2);
                context.strokeStyle = gradient;
            } else {
                context.strokeStyle = particle.color;
            }
            if (confetti.isHeart) {
                drawHeart(context, x, particle.y, 30, 30, 'red');
            } else {
                context.moveTo(x, particle.y);
                context.lineTo(x2, y2);
                context.stroke();
            }
        });
        hearts.forEach(heart => {
            drawHeart(context, heart.x, heart.y - 30, 60, 60, heart.color);
        });
    }

    function updateParticles() {
        waveAngle += 0.01;
        particles.forEach((particle, i) => {
            if (!streamingConfetti && particle.y < -15) {
                particle.y = innerHeight + 100;
            } else {
                particle.tiltAngle += particle.tiltAngleIncrement;
                particle.x += Math.sin(waveAngle) - 0.5;
                particle.y += (Math.cos(waveAngle) + particle.diameter + confetti.speed) * 0.5;
                particle.tilt = Math.sin(particle.tiltAngle) * 15;
            }
            if (particle.x > innerWidth + 20 || particle.x < -20 || particle.y > innerHeight) {
                if (streamingConfetti && particles.length <= confetti.maxCount) {
                    resetParticle(particle, innerWidth, innerHeight);
                } else {
                    particles.splice(i, 1);
                }
            }
        });
    }

    return confetti;
};

let confetti: Confetti;
const vendorFlag = false;
const stages: { [key: string]: Riddle } = {
    linnea: {
        order: -1,
        stage: 0,
        riddle: '',
        blurb: '',
    },
    holm: {
        order: -1,
        stage: 0,
        riddle: '',
        blurb: '',
    },
    bigmac: {
        order: 0,
        stage: 0,
        riddle: 'Our First Joke',
        blurb: `Linnea, it hasn't even been a year, but it's amazing how comfortable I am with you. I can really be myself around you, and this goes way back. Our first meme, the key to this portion, was objectively weird! It's also how I knew I never needed to hide anything from you`,
    },
    gorgeous: {
        order: 1,
        stage: 0,
        riddle: 'A Word Specifically for You',
        blurb: `Babe, you are beautiful. I could never put it into words, but that won't stop me from trying. Linnea, your hair is absolutely stunning, and you know I love the way you move it around. You have such deep and distracting eyes, especially when you're winking. You have such an amazing voice, although I must say I'm looking forward to taking your breath away. You're gorgeous, babe; talk to me if you want to hear more...`,
    },
    cowboy: {
        order: 2,
        stage: 0,
        riddle: 'Name of My Favorite Sticker',
        blurb: `Linnea, you are so caring. I consider myself a sentimental, sensitive man, and I cannot tell you how much I appreciate you. I appreciate that you make so much time for me, even when you have little (if any!) to spare. I appreciate how considerate you are, and how you always have me in mind. I appreciate the way you wish me good morning and good night. I've said it before, and I'll certainly continue to do so, but you're the best part of waking up and falling asleep. You're my favorite way to start the day, and what I look forward to every night.`,
    },
    november: {
        order: 3,
        stage: 0,
        riddle: 'The Month of a Truly Special Date',
        blurb: `Somehow, we've only been dating for a little under three months. And yet... I feel like it's been so much longer. Each month I look back and am in awe by how much further we've come together. We've seen our share of challenges, and risen above all of them. I trust you, a lot. And it means the world that you feel the same about me`,
    },
    snuggle: {
        order: 4,
        stage: 0,
        riddle: "Mmmm, I'm tired of talking. C'mere to the couch and...?",
        blurb: `Looking forward, I can't wait to see you. I can't wait to hug you, to hold you. I can't wait to lift you up, to smile like a fool while looking into your eyes. I can't wait to hold your hand as we walk the town together. I want to stroll along the beach with you in the morning, to see the sunrise with you by my side. I can't wait to take you on a real, in-person date. As for anything else, that's entirely speculation... But I'd suggest you talk to me if there's anything else on your mind ;)`,
    },
    radiator: {
        order: 5,
        stage: 0,
        riddle: 'Mmmmmmmmm',
        blurb: `Linnea, one of my favorite things to do is to make you smile. In fact, I hope you're doing that right now! When you smile, your whole face lights up and you look beautiful. Lucky for me, it would appear that I'm actually pretty good at this! But, just for the record: No matter what is going on in my life at any given moment... A smile from you always makes me happy :))`,
    },
    reddit: {
        order: 6,
        stage: 0,
        riddle: 'The Best Dating Platform',
        blurb: `Looking back, I'm in disbelief. If you had told me a year ago that I would meet someone as amazing as you - over Reddit, no less - I would have laughed at you so hard. Had you told me I'd eventually be dating said woman, I would have doubled down and finally told you that what you're saying is impossible. And yet... here we are. And I couldn't be happier! Really and truly, you have had such a positive impact upon my life. For that, I will always be grateful`,
    },
    harmonizing: {
        order: 7,
        stage: 0,
        riddle: 'Hmmmmmmmm... Hmmmmmmmmmmmmmmm...',
        blurb: `One of my favorite things about you, Linnea, is your voice. I can hear the emotion in a way that's impossible to glean from a simple text. I actually get to hear your happiness! (which of course in turn makes me happy :))) And it should go without saying, I don't talk to many people, but I'll always find time to talk to you, no matter what`,
    },
    graveyard: {
        order: 8,
        stage: 0,
        riddle: 'Where People Go to Kiss',
        blurb: `You're such a fun person to be with! You make me laugh more than anyone else. You're someone I genuinely enjoy being around, no matter the context. A delightful day isn't complete without a call from you. You're cute, you make me laugh, and you're absolutely wonderful - what more could I want?`,
    },
    "1230": {
        order: 9,
        stage: 0,
        riddle: 'Time to Talk',
        blurb: `One thing I really value is communication. I really appreciate how I always feel safe to bring something up with you, even if it's not comfortable. I know I can trust us, which gives any hard conversation a strong foundation to end well. Of course, it should be obvious that I immensely enjoy talking to you. Every morning, Every night... Like I said, talking to you is always something I will look forward to.`,
    },
};
const audio = new Audio('./resources/audio/vote_results.mp3');
const changers: Changer[] = [];
window.onload = () => {
    const img = document.querySelector('img');
    const hello = document.querySelector('h1');
    const navBarList = document.querySelector<HTMLUListElement>('#navBar ul');
    audio.loop = true;
    if (img === null || hello === null || navBarList === null) {
        return;
    }
    confetti = confettiSetup();
    img.onclick = () => {
        if (stages.linnea.stage === -1) {
            audio.pause();
        } else if (hello.classList.contains('moved')) {
            audio.pause();
        } else {
            audio.play();
        }
        hello.classList.toggle('moved');
        if (confetti.isRunning()) {
            confetti.maxCount += (confetti.maxCount > 500 ? 0 : 100);
            confetti.stop();
            if (confetti.maxCount < 500) {
                confetti.start();
            }
        } else {
            confetti.start();
        }
        if (stages.linnea.stage === -1) {
            linneaIntro();
        }
    }

    const linneaChanger = stageChanger('linnea', () => {
        const hello = document.querySelector('h1');
        if (hello === null || confetti === undefined) {
            return;
        }
        hello.textContent = 'Hello There, Linnea!';
        confetti.isHeart = true;
        confetti.start();
    });
    const holmChanger = stageChanger('holm', openYourWorld);
    window.onkeypress = (ev: KeyboardEvent) => {
        ev.preventDefault();
        if (stages.linnea.stage !== -1) {
            linneaChanger(ev.key);
        } else if (stages.holm.stage !== -1) {
            holmChanger(ev.key);
            window.onkeydown = (e: KeyboardEvent) => {
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                }
            }
        } else {
            ev.preventDefault();
            changers.forEach(f => f(ev.key));
        }
    }
}

function stageChanger(str: string & keyof typeof stages, onComplete: () => unknown): (key: string) => void {
    return key => {
        if (stages[str].stage === -1) {
            return;
        }
        const k = key.toLowerCase();
        if (/\s+/.test(key)) {
            return;
        }
        // otherwise... check the next one
        if (str[stages[str].stage] === key) {
            stages[str].stage++;
        } else {
            stages[str].stage = 0;
            if (str[stages[str].stage] === key) {
                stages[str].stage++;
            }
        }
        if (stages[str].stage === str.length) {
            onComplete();
            stages[str].stage = -1;
        }
    };
}

function openYourWorld() {
    const hello = document.querySelector('h1');
    const navBarList = document.querySelector<HTMLUListElement>('#navBar ul');
    if (hello === null || navBarList === null) {
        return;
    }
    [...navBarList.children].forEach(c => c.remove());
    hello.classList.add('linnea');
    linneaIntro();
    const sectionHolder = document.querySelector<HTMLDivElement>('#aboutMe');
    if (sectionHolder === null) {
        return;
    }
    [...sectionHolder.children].forEach(c => c.remove());
    // Add controls
    {
        const rose = document.createElement('a');
        rose.href = 'https://github.com/alexhrao/rose-garden/releases/download/v1.0.0/dists.zip';
        rose.download = 'roses.zip';
        rose.textContent = 'Pickup your Rose';
        const li = document.createElement('li');
        li.appendChild(rose);
        navBarList.appendChild(li);
    }
    {
        const msgPdf = document.createElement('a');
        msgPdf.href = './resources/html/messages.pdf';
        msgPdf.download = 'messages.pdf';
        msgPdf.textContent = 'Message Statistics';
        const li = document.createElement('li');
        li.appendChild(msgPdf);
        navBarList.appendChild(li);
    }
    {
        const xwordLink = document.createElement('a');
        if (!vendorFlag) {
            xwordLink.textContent = 'Get Ready!';   
        } else {
            xwordLink.href = './crossword?game=linnea';
            xwordLink.textContent = 'Crossword';
        }
        const li = document.createElement('li');
        li.appendChild(xwordLink);
        navBarList.appendChild(li);
    }
    {
        const solitaireLink = document.createElement('a');
        solitaireLink.href = 'https://alexhrao.github.io/solitaire';
        solitaireLink.textContent = 'Solitaire';
        const li = document.createElement('li');
        li.appendChild(solitaireLink);
        navBarList.appendChild(li);
    }
    {
        const plan = document.querySelector<HTMLDivElement>('#plan')!;
        if (vendorFlag) {
            plan.style.display = 'block';
        }
        plan.classList.add('linnea', 'about-section');
        sectionHolder.appendChild(plan);
    }
    {
        const movieLink = document.createElement('a');
        movieLink.href = 'https://docs.google.com/document/d/1gSxFdSrdByr7G_WG9tI2tcSzsGy39L-sK0Z7-umKyB0/edit?usp=sharing';
        movieLink.textContent = 'Movie List';
        const li = document.createElement('li');
        li.appendChild(movieLink);
        navBarList.appendChild(li);
    }
    {
        const player = document.createElement('a');
        const linneaAudio = new Audio(vendorFlag ? './resources/audio/wonderful.mp3' : './resources/audio/gallery.mp3');
        linneaAudio.loop = true;
        player.href = "#";
        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-play');
        player.appendChild(icon);
        player.onclick = async e => {
            // if paused, play... otherwise, 
            e.stopPropagation();
            if (linneaAudio.paused) {
                await linneaAudio.play();
                [...player.children].forEach(c => c.remove());
                const icon = document.createElement('i');
                icon.classList.add('fal', 'fa-pause');
                player.appendChild(icon);
            } else {
                linneaAudio.pause();
                [...player.children].forEach(c => c.remove());
                const icon = document.createElement('i');
                icon.classList.add('fal', 'fa-play');
                player.appendChild(icon);
            }
        }
        audio.pause();
        const li = document.createElement('li');
        li.appendChild(player);
        navBarList.appendChild(li);
    }
    document.querySelectorAll('footer').forEach(e => e.remove());
    changers.push(...Object.keys(stages)
        .sort((s1, s2) => stages[s1].order - stages[s2].order)
        .map(key => {
            const k = key as string & keyof typeof stages;
            if (k === 'linnea') {
                return (key: string) => {};
            } else if (k === 'holm') {
                return (key: string) => {};
            }
            const s = document.createElement('div');
            s.classList.add('about-section');
            const icon = document.createElement('i');
            icon.classList.add('fad', 'fa-lock-alt', 'about-icon');
            s.appendChild(icon);
            const riddle = document.createElement('p');
            s.appendChild(riddle);
            s.classList.add('linnea');
            sectionHolder.appendChild(s);
            riddle.textContent = stages[k].riddle;

            const onComplete = () => {
                [...s.children].forEach(e => e.remove());
                const b = document.createElement('p');
                b.textContent = stages[k].blurb;
                if (!vendorFlag) {
                    b.textContent = 'Clever Girl ;). Come back later to see what happens...';
                }
                s.appendChild(b);
            };

            return stageChanger(k, onComplete);
    }));
}
let colorInd = -1;
function linneaIntro() {
    const intro = document.querySelector<HTMLParagraphElement>('#splashIntro p');
    if (intro === null) {
        return;
    }
    intro.textContent = `Hey there babe, I like you a lot. In fact, I like you ${confetti.maxCount} hearts worth! The rest of the website may have changed, maybe you should take a look :))`;
    if (colorInd === -1) {
        window.onclick = (e: MouseEvent) => {
            hearts.push({
                x: e.screenX,
                y: e.screenY,
                color: colors[colorInd++],
            });
            if (colorInd === colors.length) {
                colorInd = 0;
            }
        }
        colorInd = 0;
    }
}