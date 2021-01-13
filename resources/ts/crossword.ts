enum Direction {
    Across="across",
    Down="down",
}

interface ReferencedClue {
    index: number;
    dir: Direction;
}

interface Clue {
    index: number;
    dir: Direction;
    text: string;
    done: boolean;
    references?: ReferencedClue[];
}

interface LetterBox {
    clue?: number;
    answer: string;
}

type Box = true|null|LetterBox;

interface Game {
    name: string;
    clues: Clue[];
    board: Box[][];
}

interface LiveBox {
    readonly row: number;
    readonly col: number;
    readonly box: Box;
    readonly container: HTMLDivElement;
    readonly input?: HTMLInputElement;
    wasFilled: boolean;
}

interface LiveClue {
    readonly clue: Clue;
    readonly row: number;
    readonly col: number;
    readonly viewer: HTMLDivElement;
    readonly text: HTMLParagraphElement;
    readonly num: HTMLSpanElement;
}

interface LiveClueLookup {
    across: { [idx: number]: LiveClue; };
    down: { [idx: number]: LiveClue; };
}

interface ClueLookup {
    across?: LiveBox;
    down?: LiveBox;
}

let currentClue = 1;
let currentDirection = Direction.Across;

async function retreiveGame(gameID: string|number): Promise<Game|undefined> {
    return fetch(`/crossword/${gameID}`)
        .then(r => {
            if (r.status !== 200) {
                throw new Error();
            }
            document.querySelector<HTMLHeadingElement>('h1')?.remove();
            return r.json() as Promise<Game>;
        })
        .then(g => {
            const header = document.createElement('h1');
            header.textContent = `Let's Play ${g.name}`
            document.body.appendChild(header);
            g.clues = g.clues.map(c => {
                c.done = false;
                return c;
            });
            return g;
        })
        .catch(() => {
            const err = document.querySelector<HTMLHeadingElement>('h1') ?? document.createElement('h1');
            document.body.appendChild(err);
            err.textContent = `Unable to load game with ID ${gameID}`;
            return undefined;
        });
}

function createBox(box: Box, row: number, col: number): LiveBox {
    const container = document.createElement('div');
    container.classList.add('letterbox');
    let input = undefined;
    if (box === null) {
        container.classList.add('invisible');
    } else if (typeof box === 'boolean') {
        container.classList.add('filled');
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.tabIndex = -1;
        container.append(input);
        if (box.clue !== undefined) {
            const clue = document.createElement('span');
            clue.textContent = `${box.clue}`;
            container.appendChild(clue);
        }
    }
    container.style.gridRowStart = `${row + 1}`;
    container.style.gridColumnStart = `${col + 1}`;
    const wasFilled = false;
    const out: LiveBox = { container, row, col, box, input, wasFilled };
    return out;
}

function setupClues() {
    const clueContainer = document.createElement('div');
    clueContainer.id = 'clues';
    
    const acrossContainer = document.createElement('div');
    acrossContainer.classList.add('clue-container');
    const acrossTitle = document.createElement('h3');
    acrossTitle.textContent = 'Across';
    const acrossHolder = document.createElement('div');
    acrossHolder.classList.add('clue-holder');
    acrossContainer.appendChild(acrossTitle);
    acrossContainer.appendChild(acrossHolder);

    const downContainer = document.createElement('div');
    downContainer.classList.add('clue-container');
    const downTitle = document.createElement('h3');
    downTitle.textContent = 'Down';
    const downHolder = document.createElement('div');
    downHolder.classList.add('clue-holder');
    downContainer.appendChild(downTitle);
    downContainer.appendChild(downHolder);
    
    const clueHolder = document.createElement('div');
    clueHolder.id = 'clueHolder';
    clueHolder.appendChild(acrossContainer);
    clueHolder.appendChild(downContainer);
    const clueTitle = document.createElement('h2');
    clueTitle.textContent = 'Clues';
    clueContainer.appendChild(clueTitle);
    clueContainer.appendChild(clueHolder);

    return {
        clueContainer,
        down: downHolder,
        across: acrossHolder,
    };
}

function setupBoard(boardBoxes: Box[][]) {
    const board = document.createElement('div');
    board.id = 'board';

    const liveBoxes: LiveBox[][] = boardBoxes.map((row, r) => {
        return row.map((box, c) => {
            return createBox(box, r, c);
        });
    });
    return { liveBoxes, board };
}

type CurrentClue = Pick<LiveClue, 'viewer'|'text'|'num'>

interface ClueDict {
    [clue: number]: {
        row: number;
        col: number;
    };
}

window.onload = async () => {
    const gameID = new URLSearchParams(window.location.search).get('game') ?? 'crossword1';
    const game = await retreiveGame(gameID);
    if (game === undefined) {
        return;
    }
    const confetti = setupConfetti();
    const { liveBoxes, board } = setupBoard(game.board);
    const clueHolders = setupClues();
    const currClueViewer = convertClue();
    currClueViewer.viewer.classList.add('selected');
    currClueViewer.viewer.id = 'currClue';

    const liveClues: LiveClueLookup = {
        across: {},
        down: {},
    };

    const clueList: LiveClue[] = [];

    const tmpClueDict: ClueDict = {};

    liveBoxes
        .flat()
        .forEach(lb => {
            const { row, col, box } = lb;
            if (box !== null && typeof box !== 'boolean' && box.clue !== undefined) {
                tmpClueDict[box.clue] = { row, col };
            }
        });
    game.clues
        .filter(c => c.dir === Direction.Across)
        .sort((c1, c2) => c1.index - c2.index)
        .forEach(c => {
            const clue = convertClue(c, tmpClueDict[c.index].row, tmpClueDict[c.index].col);
            clueHolders.across.appendChild(clue.viewer);
            liveClues.across[c.index] = clue;
            clueList.push(clue);
        });
    game.clues
        .filter(c => c.dir === Direction.Down)
        .sort((c1, c2) => c1.index - c2.index)
        .forEach(c => {
            const clue = convertClue(c, tmpClueDict[c.index].row, tmpClueDict[c.index].col);
            clueHolders.down.appendChild(clue.viewer);
            liveClues.down[c.index] = clue;
            clueList.push(clue);
        });

    const dimensions = {
        rows: liveBoxes.length,
        cols: liveBoxes[0]?.length ?? 0,
    };

    function hasNeighbor(lb: LiveBox, dir: Direction): boolean {
        let hasNeighbor = false;
        if (dir === Direction.Across) {
            if (lb.col > 0 && liveBoxes[lb.row][lb.col - 1].input !== undefined) {
                hasNeighbor = true;
            }
            if (lb.col < (dimensions.cols - 1) && liveBoxes[lb.row][lb.col + 1].input !== undefined) {
                hasNeighbor = true;
            }
        } else {
            if (lb.row > 0 && liveBoxes[lb.row - 1][lb.col].input !== undefined) {
                hasNeighbor = true;
            }
            if (lb.row < (dimensions.rows - 1) && liveBoxes[lb.row + 1][lb.col].input !== undefined) {
                hasNeighbor = true;
            }
        }
        return hasNeighbor;
    }
    function convertClue(clue: Clue, row: number, col: number): LiveClue;
    function convertClue(): CurrentClue;
    function convertClue(clue: Clue|undefined=undefined, row: number=-1, col: number=-1): LiveClue|CurrentClue {
        const viewer = document.createElement('div');
        viewer.classList.add('clue-viewer');
        const text = document.createElement('p');
        text.classList.add('clue');
        text.textContent = clue?.text ?? '';
        const num = document.createElement('span');
        num.classList.add('clue-number');
        num.textContent = `${clue?.index ?? ''}`;
        viewer.appendChild(num);
        viewer.appendChild(text);
        if (clue !== undefined) {
            viewer.onclick = () => {
                currentClue = clue.index;
                liveBoxes[row][col].input?.focus();
                highlightClue(row, col, clue.dir);
            }
        }
        return { clue, viewer, text, row, col, num };
    }

    const clueLookup: ClueLookup[][] = liveBoxes.map(row => {
        return row.map(lb => {
            // if I have someone to left or right... I have across
            const { row, col } = lb;
            const out: ClueLookup = {};
            if (lb.input === undefined) {
                return out;
            }
            if (hasNeighbor(lb, Direction.Across)) {
                let c = col;
                while (c >= 0) {
                    const box = liveBoxes[row][c].box;
                    if (box === null || typeof box === 'boolean') {
                        break;
                    }
                    c--;
                }
                out.across = liveBoxes[row][++c];
            }
            if (hasNeighbor(lb, Direction.Down)) {
                let r = row;
                while (r >= 0) {
                    const box = liveBoxes[r][col].box;
                    if (box === null || typeof box === 'boolean') {
                        break;
                    }
                    r--;
                }
                out.down = liveBoxes[++r][col];
            }
            return out;
        });
    });

    currentDirection = Direction.Across;

    function enableClue(index: number, dir: Direction): void {
        console.log(`Enable clue ${index} (${dir})`);
        liveClues[dir][index].viewer.classList.remove('disabled');
        liveClues[dir][index].clue.done = false;
    }
    function disableClue(index: number, dir: Direction): void {
        console.log(`Disable clue ${index} (${dir})`);
        liveClues[dir][index].viewer.classList.add('disabled');
        liveClues[dir][index].clue.done = true;
        if (!confetti.isRunning() && puzzleCheck(false)) {
            confetti.start();
        }
    }
    function lookupClue(lb: LiveBox): ClueLookup;
    function lookupClue(row: number, col: number): ClueLookup;
    function lookupClue(lb: LiveBox, dir: Direction): LiveBox|undefined;
    function lookupClue(row: number, col: number, dir: Direction): LiveBox|undefined;
    function lookupClue(rowOrLb: number|LiveBox, colOrDir?: number|Direction, d?: Direction): ClueLookup|LiveBox|undefined {
        let row: number;
        let col: number;
        let dir: Direction|undefined;
        if (typeof rowOrLb === 'number' && typeof colOrDir === 'number') {
            row = rowOrLb;
            col = colOrDir;
            dir = d;
        } else if (typeof rowOrLb !== 'number' && typeof colOrDir !== 'number') {
            ({ row, col } = rowOrLb);
            dir = colOrDir;
        } else {
            throw new Error('invalid arguments');
        }
        const lookup = clueLookup[row][col];
        if (dir === undefined) {
            return lookup;
        } else if (dir === Direction.Across) {
            return lookup.across;
        } else {
            return lookup.down;
        }
    }

    function highlightReferenced(ref: ReferencedClue): void {
        // just keep going in direction until we don't have an input
        const { dir } = ref;
        const currClue = liveClues[dir][ref.index];
        const { row, col } = currClue;
        if (dir === Direction.Across) {
            let c = col;
            while (c < dimensions.cols) {
                if (liveBoxes[row][c].input === undefined) {
                    break;
                }
                liveBoxes[row][c].container.classList.add('referenced');
                c++;
            }
        } else {
            let r = row;
            while (r < dimensions.rows) {
                if (liveBoxes[r][col].input === undefined) {
                    break;
                }
                liveBoxes[r][col].container.classList.add('referenced');
            }
        }
        currClue.viewer.classList.add('referenced');
    }

    function highlightClue(row: number, col: number, dir: Direction): LiveBox {
        // if across, just walk backwards; if down, just walk up
        liveBoxes.flat().forEach(lb => {
            lb.container.classList.remove('active', 'referenced');
        });
        clueList.forEach(c => c.viewer.classList.remove('selected', 'referenced'));
        const base = lookupClue(row, col, dir);
        if (base === undefined) {
            throw new Error("No Highlight Possible");
        }
        const currClue = liveClues[dir][(base.box as LetterBox).clue!];
        currClueViewer.num.textContent = `${currClue.clue.index}`;
        currClueViewer.text.textContent = currClue.clue.text;
        currClue.viewer.classList.add('selected');
        currClue.clue.references?.forEach(r => highlightReferenced(r));

        // walk forward
        if (dir === Direction.Across) {
            let c = base.col;
            while (c < dimensions.cols) {
                if (liveBoxes[row][c].input === undefined) {
                    break;
                } else {
                    liveBoxes[row][c].container.classList.add('active');
                }
                c++;
            }
        } else {
            let r = base.row;
            while (r < dimensions.rows) {
                if (liveBoxes[r][col].input === undefined) {
                    break;
                } else {
                    liveBoxes[r][col].container.classList.add('active');
                }
                r++;
            }
        }
        return base;
    }

    function nextClue(backwards = false, includeDone = false) {
        // so. see what the next one would be
        const currKeys = Object.keys(liveClues[currentDirection])
            .map(k => parseInt(k))
            .filter(k => !(!includeDone && liveClues[currentDirection][k].clue.done) && liveClues[currentDirection][k].clue.index !== currentClue)
            .sort((k1, k2) => k1 - k2);
        // if it's empty... go to the other direction
        if (currKeys.length > 0) {
            // try to find one bigger
            const n = currKeys.find(k => backwards ? k < currentClue : k > currentClue);
            if (n !== undefined) {
                const next = liveClues[currentDirection][n];
                highlightClue(next.row, next.col, currentDirection);
                liveBoxes[next.row][next.col].input?.focus();
                currentClue = next.clue.index;
                return;
            }
        }
        const otherDir = currentDirection === Direction.Across ? Direction.Down : Direction.Across;
        const otherKeys = Object.keys(liveClues[otherDir])
            .map(k => parseInt(k))
            .filter(k => !(!includeDone && liveClues[otherDir][k].clue.done))
            .sort((k1, k2) => backwards ? k2 - 1 : k1 - k2);
        if (otherKeys.length > 0) {
            const n = otherKeys[0];
            const next = liveClues[otherDir][n];
            currentDirection = otherDir;
            highlightClue(next.row, next.col, otherDir);
            liveBoxes[next.row][next.col].input?.focus();
            currentClue = next.clue.index;
            return;
        }
        // literally no clues. Remove the filter
        nextClue(backwards, true);
    }

    const options = document.createElement('div');
    options.id = 'options';
    
    const checkPuzzle = document.createElement('button');
    checkPuzzle.textContent = 'Check Puzzle';
    function puzzleCheck(shouldFlag = true): boolean {
        let allTrue = true;
        liveBoxes
            .flat()
            .forEach(lb => {
                if (lb.input !== undefined && lb.box !== null && typeof lb.box !== 'boolean') {
                    if (lb.input.value.length === 0) {
                        allTrue = false;
                    } else if (lb.box.answer !== lb.input.value) {
                        if (shouldFlag) {
                            lb.container.classList.add('incorrect');
                        }
                        allTrue = false;
                    } else {
                        if (shouldFlag) {
                            lb.container.classList.remove('incorrect');
                        }
                    }
                }
            });
        return allTrue;
    }
    checkPuzzle.onclick = () => puzzleCheck();
    const revealPuzzle = document.createElement('button');
    revealPuzzle.textContent = 'Reveal Puzzle';
    revealPuzzle.onclick = () => {
        liveBoxes
            .flat()
            .forEach(lb => {
                if (lb.input !== undefined && lb.box !== null && typeof lb.box !== 'boolean') {
                    lb.container.classList.remove('incorrect');
                    lb.input.value = lb.box.answer;
                }
            });
        clueList.forEach(lc => disableClue(lc.clue.index, lc.clue.dir));
    };

    const resetPuzzle = document.createElement('button');
    resetPuzzle.textContent = 'Reset Puzzle';
    resetPuzzle.onclick = () => {
        window.location.reload();
    };

    options.appendChild(checkPuzzle);
    options.appendChild(revealPuzzle);
    options.appendChild(resetPuzzle);

    liveBoxes
        .flat()
        .forEach(lb => {
            if (lb.input !== undefined) {
                const input = lb.input;
                input.onfocus = () => {
                    // Get to the end of the selection
                    input.focus();
                    const v = input.value;
                    input.value = '';
                    input.value = v;

                    // so... we might need to change the direction.
                    // if we are in _one_ dimension then switch. Otherwise...
                    // go with the default!
                    if (currentDirection === Direction.Across) {
                        // check that we have someone to left or right. If not, switch
                        let hasNeighbor = false;
                        if (lb.col > 0 && liveBoxes[lb.row][lb.col - 1].input !== undefined) {
                            hasNeighbor = true;
                        }
                        if (lb.col < (dimensions.cols - 1) && liveBoxes[lb.row][lb.col + 1].input !== undefined) {
                            hasNeighbor = true;
                        }
                        if (!hasNeighbor) {
                            currentDirection = Direction.Down;
                        }
                    } else {
                        // check that we have someone to up or down. If not, switch
                        let hasNeighbor = false;
                        if (lb.row > 0 && liveBoxes[lb.row - 1][lb.col].input !== undefined) {
                            hasNeighbor = true;
                        }
                        if (lb.row < (dimensions.rows - 1) && liveBoxes[lb.row + 1][lb.col].input !== undefined) {
                            hasNeighbor = true;
                        }
                        if (!hasNeighbor) {
                            currentDirection = Direction.Across;
                        }
                    }
                    currentClue = (highlightClue(lb.row, lb.col, currentDirection).box as LetterBox).clue!
                }
                input.onkeydown = (e: KeyboardEvent) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        nextClue(e.shiftKey);
                    }
                }
                input.onkeyup = (e: KeyboardEvent) => {
                    input.value = input.value.toUpperCase();
                    if (input.value.length === 0) {
                        // enable all possible clues!
                        const possible = lookupClue(lb);
                        if (possible.across !== undefined) {
                            const box = (possible.across.box as LetterBox);
                            if (box.clue !== undefined) {
                                enableClue(box.clue, Direction.Across);
                            }
                        }
                        if (possible.down !== undefined) {
                            const box = (possible.down.box as LetterBox);
                            if (box.clue !== undefined) {
                                enableClue(box.clue, Direction.Down);
                            }
                        }
                    }
                    // HANDLE UP/DOWN/LEFT/RIGHT
                    if (e.key === 'ArrowLeft') {
                        // if current direction is down, just make across
                        if (currentDirection === Direction.Down) {
                            // if I have no neighbors across... don't
                            if (hasNeighbor(lb, Direction.Across)) {
                                currentDirection = Direction.Across;
                                highlightClue(lb.row, lb.col, currentDirection);
                            }
                            return;
                        }
                        if (lb.col > 0) {
                            liveBoxes[lb.row][lb.col - 1].input?.focus();
                        }
                    } else if (e.key === 'ArrowRight') {
                        // if current direction is down, just make across
                        if (currentDirection === Direction.Down) {
                            if (hasNeighbor(lb, Direction.Across)) {
                                currentDirection = Direction.Across;
                                highlightClue(lb.row, lb.col, currentDirection);
                            }
                            return;
                        }
                        if (lb.col < (dimensions.cols - 1)) {
                            liveBoxes[lb.row][lb.col + 1].input?.focus();
                        }
                    } else if (e.key === 'ArrowUp') {
                        // if current direction is down, just make across
                        if (currentDirection === Direction.Across) {
                            if (hasNeighbor(lb, Direction.Down)) {
                                currentDirection = Direction.Down;
                                highlightClue(lb.row, lb.col, currentDirection);
                            }
                            return;
                        }
                        if (lb.row > 0) {
                            liveBoxes[lb.row - 1][lb.col].input?.focus();
                        }
                    } else if (e.key === 'ArrowDown') {
                        // if current direction is down, just make across
                        if (currentDirection === Direction.Across) {
                            if (hasNeighbor(lb, Direction.Down)) {
                                currentDirection = Direction.Down;
                                highlightClue(lb.row, lb.col, currentDirection);
                            }
                            return;
                        }
                        if (lb.row < (dimensions.rows - 1)) {
                            liveBoxes[lb.row + 1][lb.col].input?.focus();
                        }
                    } else if (e.key === 'Backspace') {
                        // try to go left/up, depending. If we can't... just stop
                        if (currentDirection === Direction.Across) {
                            // try to go left
                            if (lb.col !== 0 && liveBoxes[lb.row][lb.col - 1].input !== undefined) {
                                liveBoxes[lb.row][lb.col - 1].input?.focus();
                            }
                        } else {
                            if (lb.row !== 0 && liveBoxes[lb.row - 1][lb.col].input !== undefined) {
                                liveBoxes[lb.row - 1][lb.col].input?.focus();
                            }
                        }
                        lb.container.classList.remove('incorrect');
                    } else if (lb.input?.value.length === 0) {
                        lb.wasFilled = false;
                    }
                    if (!/^[a-zA-Z]{1}$/.test(input.value)) {
                        input.value = '';
                        lb.container.classList.remove('incorrect');
                        return;
                    }
                    if (!/^[a-zA-Z]{1}$/.test(e.key)) {
                        return;
                    }
                    if (input.value.length === 1) {
                        lb.container.classList.remove('incorrect');
                        lb.wasFilled = true;
                        // check if anyone, down or accross, is finished
                        const possible = lookupClue(lb);
                        input.value = e.key.toUpperCase();
                        if (possible.across !== undefined) {
                            // walk forward. everyone should be filled in
                            const { row, col } = possible.across;
                            let c = col;
                            let isFilled = true;
                            while (c < dimensions.cols) {
                                const i = liveBoxes[row][c].input;
                                if (i === undefined) {
                                    break;
                                } else if (i.value.length === 0) {
                                    isFilled = false;
                                    break;
                                }
                                c++;
                            }
                            if (isFilled) {
                                disableClue((possible.across.box as LetterBox).clue!, Direction.Across);
                            }
                        }
                        if (possible.down !== undefined) {
                            // walk forward. everyone should be filled in
                            const { row, col } = possible.down;
                            let r = row;
                            let isFilled = true;
                            while (r < dimensions.rows) {
                                const i = liveBoxes[r][col].input;
                                if (i === undefined) {
                                    break;
                                } else if (i.value.length === 0) {
                                    isFilled = false;
                                    break;
                                }
                                r++;
                            }
                            if (isFilled) {
                                disableClue((possible.down.box as LetterBox).clue!, Direction.Down);
                            }
                        }
                        // so. if we're not at the end of our row, move
                        // focus to the next one that has an input
                        // AND is not already filled... 
                        if (currentDirection === Direction.Across) {
                            if (lb.col + 1 < dimensions.cols && liveBoxes[lb.row][lb.col + 1].input !== undefined) {
                                liveBoxes[lb.row][lb.col + 1].input?.focus();
                            } else {
                                // Next Clue
                                // which clues are we done with?
                                nextClue();
                            }
                            // the next guy... does he have an input?
                        } else {
                            if (lb.row + 1 < dimensions.rows && liveBoxes[lb.row + 1][lb.col].input !== undefined) {
                                liveBoxes[lb.row + 1][lb.col].input?.focus();
                            } else {
                                // Next clue
                                nextClue();
                            }
                        }
                    } else {
                        // enable all possible clues!
                        const possible = lookupClue(lb);
                        if (possible.across !== undefined) {
                            const box = (possible.across.box as LetterBox);
                            if (box.clue !== undefined) {
                                enableClue(box.clue, Direction.Across);
                            }
                        }
                        if (possible.down !== undefined) {
                            const box = (possible.down.box as LetterBox);
                            if (box.clue !== undefined) {
                                enableClue(box.clue, Direction.Down);
                            }
                        }
                    }
                }
            }
            board.appendChild(lb.container);
        });
    const container = document.createElement('div');
    container.id = 'root';
    
    container.appendChild(board);
    container.appendChild(currClueViewer.viewer);
    const clueContainer = document.createElement('div');
    clueContainer.id = 'clueAndOptions';
    clueContainer.appendChild(options);
    clueContainer.appendChild(clueHolders.clueContainer);
    container.appendChild(clueContainer);
    document.body.appendChild(container);
    const firstClue = game.clues[0];
    const { row: firstRow, col: firstCol } = liveClues[firstClue.dir][firstClue.index];
    liveBoxes[firstRow][firstCol].input?.focus();
    highlightClue(firstRow, firstCol, firstClue.dir);
}

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

function setupConfetti() {
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
    const supportsAnimationFrame = window.requestAnimationFrame ?? window.webkitRequestAnimationFrame;
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
            requestAnimationFrame(runAnimation);
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
            console.log(innerHeight);
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