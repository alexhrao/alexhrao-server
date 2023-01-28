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
    const supportsAnimationFrame = window.requestAnimationFrame !== undefined;
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
            const sizer = () => {
                innerWidth = document.documentElement.scrollWidth;
                innerHeight = document.documentElement.scrollHeight
                if (canvas !== null) {
                    canvas.width = innerWidth;
                    canvas.height = innerHeight;
                }
            };
            window.addEventListener('resize', sizer, true);
            window.setInterval(sizer, 1000);
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
const vendorFlag = true;
const dateFlag = false;
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
        blurb: `Babe, you are beautiful. I could never put it into words, but that won't stop me from trying. Linnea, your hair is absolutely stunning, and you know I love the way you move it around. You have such deep and distracting eyes, especially when you're winking. You have such an amazing voice, although I must say I'm looking forward to taking your breath away. You're gorgeous, babe.`,
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
        blurb: `Somehow, we've only been dating for a little under three months. And yet... I feel like it's been so much longer. Each month I look back and am in awe by how much further we've come together. We've seen our share of challenges, and risen above them all. I trust you, a lot. And it means the world that you feel the same about me`,
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
        blurb: `Linnea, one of my favorite things to do is to make you smile. In fact, I hope you're doing that right now! When you smile, your whole face lights up and you look beautiful. Lucky for me, it would appear that I'm actually pretty good at this! But, just for the record: No matter what is going on in my life at any given moment... A smile from you always makes it better :))`,
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
        blurb: `One of my favorite things about you, Linnea, is your voice. I can hear the emotion in a way that's impossible to glean from a simple text. I actually get to feel your happiness, which of course in turn makes me happy :)). And it should go without saying, I don't talk to many people, but I'll always find time to talk to you, no matter what`,
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
        blurb: `One thing I really value is communication. I really appreciate how I always feel safe to bring something up with you, even if it's not comfortable. I know I can trust us, which gives any hard conversation a strong foundation to end well. Of course, it should be obvious that I immensely enjoy talking to you. Every morning, every night... Like I said, talking to you is always something I will look forward to.`,
    },
    lofi: {
        order: 10,
        stage: 0,
        riddle: 'My "Weird" Music Playlist',
        blurb: `I have really enjoyed getting to know you. Music taste is, of course, but a small part of someone. With that being said, it's something that is clearly important to you, and so it is to me too! Even though my selection of music might be "weird" (Lofi anybody?), I appreciate that you at least give it a chance. Like I said, I've thoroughly enjoyed getting to know you so far, and it seems like you've enjoyed getting to know me too. I can't wait to learn all the little things about you that make you, well, the Linnea I know and cherish`,
    },
    movies: {
        order: 11,
        stage: 0,
        riddle: 'My List for you Consists of?',
        blurb: `Linnea, I enjoy spending time with you, no matter what we're doing. Whether it's watching a movie, or walking, or stretching, or just plain old talking, being with you is by far my favorite place to be. You are considerate, caring, and above all, you're fun! It's infectious (am I allowed to use that word?), and I can never stay frustrated with you for very long. Whether it's this website, or that very first list of movies, I'll never grow tired of making things for you, however frivolous they may be ;)`,
    },
    italian: {
        order: 12,
        stage: 0,
        riddle: 'The Most Romantic of Foods',
        blurb: `Babe, I really want to take you out on a date. Not just a date to the movies; a real, romantic, genuine date. Why? Because I like you; because it'll be fun; but most importantly, because you deserve it. You deserve a man that understands how lucky he is, and shows it at every chance he gets. You deserve someone who treasures you, who enjoys your company, and who always shows you how amazing you are. Someone who lifts you up and holds you there. I like you so much, Linnea, and I can't wait to be this for you.`,
    },
    trademark: {
        order: 13,
        stage: 0,
        riddle: 'The Big Sad*, I Know Things*, a Good Day*',
        blurb: `I want you to do me a Favor™; I want you to go look in the mirror. I want you to try and see what I see. When I look at you, I see a capable, strong person who's ready and willing to take on the world. I see a gorgeous woman who cares more about others than she does about herself. I see passion, generosity, integrity. I see someone any guy would be lucky to date, let alone be in a relationship with. When I look into your eyes Linnea, I'm looking into the eyes of someone I'm beyond grateful to be with. So look in the mirror, and you just might see it to.`,
    },
    gruszynski: {
        order: 14,
        stage: 0,
        riddle: 'School Therapy Dog',
        blurb: `Honestly, I thought this one was the hardest -- I really had to sit and think for a long time. But I like this story because it's real, and it reminds me of how wonderful it is to talk to you. Looking back on all our conversations, one thing is clear - I've literally never talked to anyone this much, and I've never enjoyed talking to anyone this much before either. And, while there are so many reasons now that make you uniquely special to me... This one is the first, and it is the one I most treasure. I couldn't imagine a better partner to talk with, whether it's Serious or just for fun; flirting or just shooting the breeze; words of joy or words of sorrow; no matter what you're talking about, I want to be there and I want to listen. I'm looking forward to many, many more times where I get to do just that!`
    },
    good: {
        order: 15,
        stage: 0,
        riddle: 'Are we...?',
        blurb: `Linnea. On this site I’ve talked about a lot of things. I’ve discussed how beautiful you are, how passionate you are, how much I like you. I’ve mentioned how great it is to talk to you, how you’re often the best of my day. What I see in you is what I want to see in myself; care, integrity, honesty, affection, and compassion, just to name a few. But those traits don’t only come out when the sun’s out; sometimes we have conflict, which unfortunately is inevitable in any committed relationship. But here’s what’s critical - you don’t leave it. Communication is absolutely essential to any healthy relationship, and it goes double for one that’s long distance. In that regard, I have no better partner than you, Linnea. You never duck from a serious conversation that we need to have. I appreciate that you don’t hold grudges, and that you’re quick to admit when you’ve made the mistake while remaining gracious when the roles are reversed. I’ve never felt like there’s something I can’t tell you about, and I cannot overstate how important that is to me. I wanted to end on this one because, of everything I’ve said, this is the most important. I like you, I cherish our relationship, and I’m looking forward to exploring whatever the future holds for us. The beautiful memories we have made, and the beautiful ones yet to be formed, are possible because of how freely we can discuss anything that comes to mind. Because of that, I'm beyond optimistic about us, and I'm glad you are too.`,
    },
    excited: {
        order: 16,
        stage: 0,
        riddle: "I'm so _____ to see you!",
        blurb: `Linnea, I'll keep it short, but I am so excited to see you. Holding your hand, hugging you, hearing your real voice and looking into your eyes. I can't wait to spend time with you, real, quality time with you; no matter what we're doing, as long as we're together, I'll be happy. I know you're nervous; so am I! I'm nervous because of how much I care about you, about us. Our relationship is the best relationship I have ever had, and I really mean that. With you I feel comfortable being myself. Weird, quirky, awkward, flawed, and 100% devoted to you; you accept all of it, and I cannot tell you how meaningful that is to me.`,
    },
    care: {
        order: 17,
        stage: 0,
        riddle: "Above all Linnea, I ____ about you",
        blurb: `I care _so much_ about you Linnea, about us. I've alluded to it before, but I'll say it as many times as you'd like: you're the best, babe. You're my best friend, my favorite person, and the only one I can trust with anything and everything. I'm so, so happy that my best friend is also my Significant Other. You're sweet, kind, considerate, genuine, authentic, lovely, honest, diligent, smart, and above all, you're a *good person*. I'm not sure I've ever really felt how I feel about you and us now, and I have to say, I love this feeling. So yeah, I care about you so much baby, and I can't help but try to show it every chance I get.`
    },
    heart: {
        order: 18,
        stage: 0,
        riddle: "Linnea, you have my ______ in your hands",
        blurb: `Linnea, you have my heart; you know this. But I want you to know how much I appreciate it. I don't give it away easily, nor do I give it away without serious thought, and yet... giving it to you was perhaps the easiest thing I've done in a long time. It's so, so comforting to know that I'm not alone, that there's someone, somewhere, who's looking out for me - someone that has my back. I want you to know that, no matter what happens, I've got yours too! I can honestly say I've never felt so supported, so safe, and so comfortable being myself than I feel with you. And no, I will not stop telling you how much I like you, deal with hit ;)`,
    },
    favorite: {
        order: 19,
        stage: 0,
        riddle: "You're my ____ person",
        blurb: `It's true! I say it all the time but I wanted to take a moment and tell you what that really means. It means that I care more about you than I care about pretty much anyone else. It means I don't trust anyone as much as I trust you. It means your opinions, perspectives, and thoughts matter more to me than anyone else's. In short, it means you matter to me more than anyeone else, really. Friends come and go, but someone like you babe? Someone like you only comes around once, and I'm beyond ecstatic you've chosen to spend your time with me :))`,
    },
    flight: {
        order: 20,
        stage: 0,
        riddle: "Here are my ____ details",
        blurb: `Flight 1012, arriving in San Diego (SAN) at exactly 6:40 pm. I'll have to pick up my checked bag, then I'll be taking an uber to 3520 Lebon Drive, 5321, San Diego, CA 92122. Then, I'll probably take a shower, and then who knows?`,
    },
    today: {
        order: 21,
        stage: 0,
        riddle: "_____'s The Day!",
        blurb: `It's actually happening baby! I like you so, so much, and I cannot wait to see you. Remember, Flight 1012. Don't worry, I'll probably text you today too, so no need to remember ;). I know it's scary, and I'm scared too, but I'm so glad we're finally able to do this. I'm so happy I met you, and I can't wait to meet you! Mkay bye Linnea, I like you, and I'll see you soon :)).`,
    },
    love: {
        order: 22,
        stage: 0,
        riddle: "I <3 You!",
        blurb: `Baby, I can't believe it's already been six months. On the other hand... I can't believe it's only been six months! I know I've said it a billion times, but I'll say it a billion more - you have had an incredibly positive impact on my life. I've known you for just a year, but honestly Linnea, it feels like I've known you for so much longer. We've had our ups and downs, but never once have I doubted that I love you. So for what will not even remotely be the last time: Linnea, I love you, and I am so unbelievably lucky to be in love with you. These past six months have been the best six months of my life, and I can safely say it's because you were in them... I can't wait to see what the next six months hold :)). Happy Anniversary Baby; Love, Alex <3`,
    },
    difficult: {
        order: 23,
        stage: 0,
        riddle: "I love you, even during _________ conversations",
        blurb: `Hey Linnea, relationships aren't always easy. It takes time and effort, and sometimes it's really hard to see eye to eye. Sometimes it might even feel impossible to come to some kind of consensus; sometimes I know it can feel demoralizing. But I want to take a moment to tell you how much I appreciate your willingness to have these conversations anyway. Dating me isn't always easy, this is something I know. Which is why it means the world to me that you're doing so anyway. I love you Linnea, and while I can't promise it'll always be easy, I can promise that I will always do my best to understand your view, respect your thoughts, and reach consensus where we can.`,
    },
    atlanta: {
        order: 24,
        stage: 0,
        riddle: "I can't wait for you to come to _______!",
        blurb: `I can't believe it's only a month away! I hope recent conversations haven't put a damper on your thoughts about coming to visit me, but I want to take just a second and tell you how excited I am to host you. I can't wait to show you my campus, my buildings, my home. I can't wait to take you to the aquarium and Piedmont Park. I can promise you that it won't be as fun as San Diego (your city wins by a **long shot**), but hopefully I can at least make it worth the trip!`,
    },
    think: {
        order: 25,
        stage: 0,
        riddle: "Baby, I could _____ about you all day",
        blurb: `Oh Linnea. I'm sitting here, struggling to come up with the best way to show you how much I love you. And of course, the problem is no matter what I do, there's no way it's enough. Not because you won't appreciate it - you're very good at being appreciative :)) - but because it won't **feel** like it's been enough. It won't feel as though I've fully explained to you how I feel about you. So consider this a poor attempt at capturing even just a whisper of my love for you Linnea. I love you so much; I think about you all the time. Whether we're talking about fluff, substance, or something difficult... As long as you're there, I'm happy and excited to be there too. I love you baby, and I just want to make sure you know it :))`,
    },
    rain: {
        order: 26,
        stage: 0,
        riddle: "The best kind of weather?",
        blurb: `It's raining here, and it got me thinking about us. I think the reason we've survived long distance (even thrived, if you ask me!) is because of how compatible we are. Think about it: Long Distance is hard for everyone; it's universally a **worse arrangement**. And yet, our relationship has blossomed into the beautiful thing it is today, all the while being remote. If we're this good together virtually, I think that bodes so well for the anniversaries to come :))`,
    },
    surprise: {
        order: 27,
        stage: 0,
        riddle: "This one's probably a ________ to you, hehehe...",
        blurb: `Mwahahaha, I'm sure you didn't expect this after I sent that message :)). Too bad, I like (and love!) you too much, so today you're getting both. It's funny, you know, I simultaneously feel like I've said so much and nothing at all; I've told you that I like you, that I love you, that I'm lucky to be yours... but it doesn't feel complete. Perhaps all that's missing is a big hug and a small kiss! But for the record, I'm happy to say it again: Baby, I'm in love with you, head over heels. I'm so glad (and lucky!) that I'm yours, and I can't wait to see you!! Mmmm but before I go, did you check the link bar at the top? Something may have been added there...`
    },
    reminder: {
        order: 28,
        stage: 0,
        riddle: "As promised, here's a _________ of how much I love you!",
        blurb: `I'll keep it short and sweet; Linnea, I love you so much! I know these next few weeks are going to be stressful. I'm equally confident that you've got this! You're so smart and capable, even though you have to bring all your group members along kicking and screaming, you're going to get it done. If anyone could do it babe, it's you! And remember, I love you _so_ much. Like, **so**, **so** much. I'm so so excited to show you Atlanta, to take you places, but most of all just to be with you. When I'm with you... it feels like nothing else really matters, to be honest. Don't worry - even though I haven't found the words to express how much I really love you, I won't stop trying :))`,
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
    /*
    const world = document.querySelector<HTMLDivElement>('.about-section:last-child div');
    if (world === null) {
        return;
    }
    world.onclick = () => {
        linneaChanger('l');
        linneaChanger('i');
        linneaChanger('n');
        linneaChanger('n');
        linneaChanger('e');
        linneaChanger('a');
        holmChanger('h');
        holmChanger('o');
        holmChanger('l');
        holmChanger('m');
    }
    */
    img.onclick = (e: MouseEvent) => {
        if (stages.linnea.stage === -1) {
            audio.pause();
        } else if (hello.classList.contains('moved')) {
            audio.pause();
        } else {
            audio.play();
        }
        hello.classList.toggle('moved');
        if (confetti.isRunning()) {
            confetti.maxCount += 100;
            if (confetti.maxCount > 550) {
                confetti.maxCount = 150;
            }
            confetti.stop();
            confetti.start();
        } else if (stages.holm.stage !== -1) {
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
    const heart = document.querySelector<HTMLAnchorElement>('#passwordMarker');
    if (heart === null) {
        return;
    }
    heart.onclick = e => {
        e.stopPropagation();
        const pass = document.createElement('input');
        pass.type = 'text';
        pass.id = 'password';
        pass.placeholder = 'Secret Code...'
        heart.parentElement?.appendChild(pass);
        heart.remove();
    }
}

function stageChanger(str: string & keyof typeof stages, onComplete: () => unknown): (key: string) => void {
    return key => {
        if (stages[str].stage === -1) {
            return;
        }
        const k = key.toLowerCase();
        if (/\s+/.test(k)) {
            return;
        }
        // otherwise... check the next one
        if (str[stages[str].stage] === k) {
            stages[str].stage++;
        } else {
            stages[str].stage = 0;
            if (str[stages[str].stage] === k) {
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
        rose.href = 'https://github.com/alexhrao/rose-garden/releases/download/v1.1.0/dists.zip';
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
    // if (dateFlag) {
    //     const plan = document.querySelector<HTMLDivElement>('#plan')!;
    //     if (vendorFlag) {
    //         plan.style.display = 'block';
    //     }
    //     plan.classList.add('linnea', 'about-section');
    //     sectionHolder.appendChild(plan);
    // }
    {
        const movieLink = document.createElement('a');
        movieLink.href = 'https://docs.google.com/document/d/1gSxFdSrdByr7G_WG9tI2tcSzsGy39L-sK0Z7-umKyB0/edit?usp=sharing';
        movieLink.textContent = 'Movie List';
        const li = document.createElement('li');
        li.appendChild(movieLink);
        navBarList.appendChild(li);
    }
    {
        const player = document.createElement('button');
        const linneaAudio = new Audio( dateFlag ? './resources/audio/wonderful.mp3' :
                                    vendorFlag ? './resources/audio/piano.mp3' : './resources/audio/gallery.mp3');
        linneaAudio.loop = true;
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
    {
        const heart = document.createElement('button');
        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-heart');
        heart.appendChild(icon);
        heart.onclick = e => {
            e.stopPropagation();
            // if running, stop, if stopped, run
            [...heart.children].forEach(c => c.remove());
            const icon = document.createElement('i');
            if (confetti.isRunning()) {
                icon.classList.add('fal', 'fa-heart');
                confetti.stop();
            } else {
                icon.classList.add('fal', 'fa-heartbeat');
                confetti.start();
            }
            heart.appendChild(icon);
        }
        confetti.stop();
        const li = document.createElement('li');
        li.appendChild(heart);
        navBarList.appendChild(li);
    }
    {
        const bomb = document.createElement('a');
        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-bomb');
        bomb.appendChild(icon);
        bomb.href = 'https://alexhrao.github.io/mine-solver/';
        bomb.id = 'bomb';
        const li = document.createElement('li');
        li.appendChild(bomb);
        navBarList.appendChild(li);
    }
    if (vendorFlag) {
        const valentine = document.querySelector<HTMLDivElement>('#valentineDay')!;
        const blurb = valentine.querySelector<HTMLParagraphElement>('p')!;
        blurb.onclick = () => {
            const list = valentine.querySelector<HTMLUListElement>('ul');
            list?.classList.add('shown');
        }
        valentine.style.display = 'block';
        valentine.classList.add('linnea', 'about-section');
        sectionHolder.appendChild(valentine);
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
    const img = document.querySelector<HTMLImageElement>('img');
    if (img === null) {
        return;
    }
    img.src = '/resources/img/alexrose.jpg';
    intro.textContent = `Hey there babe, I like you a lot. In fact, I like you ${confetti.maxCount} hearts worth! The rest of the website may have changed, maybe you should take a look :))`;
    if (colorInd === -1) {
        window.onclick = (e: MouseEvent) => {
            hearts.push({
                x: e.pageX,
                y: e.pageY,
                color: colors[colorInd++],
            });
            if (colorInd === colors.length) {
                colorInd = 0;
            }
        }
        colorInd = 0;
    }
}