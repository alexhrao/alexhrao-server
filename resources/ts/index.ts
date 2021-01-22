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

const confettiSetup = () => {
    const confetti: Confetti = {
        maxCount: 150,      //set max confetti count
        speed: 2,           //set the particle animation speed
        frameInterval: 15,  //the confetti animation frame interval in milliseconds
        alpha: 1.0,         //the alpha opacity of the confetti (between 0 and 1, where 1 is opaque and 0 is invisible)
        gradient: false,    //whether to use gradients for the confetti particles
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
        if (pause) {
            return;
        } else if (particles.length === 0) {
            context?.clearRect(0, 0, innerWidth, innerHeight);
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
            } else
                context.strokeStyle = particle.color;
            context.moveTo(x, particle.y);
            context.lineTo(x2, y2);
            context.stroke();
        })
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

window.onload = () => {
    const img = document.querySelector('img');
    const hello = document.querySelector('h1');
    if (img === null || hello === null) {
        return;
    }
    const confetti = confettiSetup();
    img.onclick = () => {
        hello.classList.toggle('moved');
        if (confetti.isRunning()) {
            confetti.maxCount += (confetti.maxCount > 500 ? 0 : 100);
            confetti.stop();
            confetti.start();
        } else {
            confetti.start();
        }
    }
}