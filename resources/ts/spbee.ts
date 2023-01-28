async function fetchDay(day: Date): Promise<string[]> {
    return fetch(`https://alexhrao.com/spellingbee`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ day: `${day.getUTCFullYear()}-${(day.getUTCMonth() + 1).toString().padStart(2, '0')}-${day.getUTCDate().toString().padStart(2, '0')}`}),
    })
        .then(r => r.json() as Promise<string[]>);
}

const removed = new Set<string>();

type Statistic = Map<number, number>;
interface Analysis {
    nums: number;
    lens: Map<number, number>;
}

interface Prefix {
    container: HTMLDivElement;
    prefix: HTMLParagraphElement;
    remover: HTMLButtonElement;
}

function analyzeByN(words: string[], n: number): Map<string, Analysis> {
    const ret = new Map<string, Analysis>();
    for (const word of words) {
        if (word.length <= n) {
            continue;
        }
        const key = word.slice(0, n);
        if (!ret.has(key)) {
            ret.set(key, { nums: 0, lens: new Map<number, number>(), });
        }
        const a = ret.get(key)!;
        a.nums += 1;
        if (!a.lens.has(word.length)) {
            a.lens.set(word.length, 0);
        }
        a.lens.set(word.length, a.lens!.get(word.length)! + 1);
    }
    return ret;
}

function constructOneLetterTable(words: string[], analysis: Map<string, Analysis>): HTMLTableElement {
    const tbl = document.createElement('table');
    const thead = document.createElement('thead');
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    const hdrRow = document.createElement('tr');
    thead.appendChild(hdrRow);
    {
        const th = document.createElement('th');
        hdrRow.appendChild(th);
        th.classList.add('header');
    }
    const maxLen = Math.max(...words.map(w => w.length));
    const minLen = Math.min(...words.map(w => w.length));
    const byLen = new Map<number, number>();
    for (let i = minLen; i <= maxLen; ++i) {
        const th = document.createElement('th');
        hdrRow.appendChild(th);
        th.classList.add('header');
        th.textContent = `${i}`;
        byLen.set(i, 0);
    }
    {
        const th = document.createElement('th');
        hdrRow.appendChild(th);
        th.classList.add('header');
        th.textContent = '∑';
    }


    for (const l of analysis.keys()) {
        const row = document.createElement('tr');
        tbody.appendChild(row);
        const rowHdr = document.createElement('td');
        row.appendChild(rowHdr);
        rowHdr.classList.add('header');
        rowHdr.textContent = l.toUpperCase();
        let an = analysis.get(l)!;
        for (let i = minLen; i <= maxLen; ++i) {
            const td = document.createElement('td');
            row.appendChild(td);
            let lens = an.lens.get(i);
            if (lens === undefined) {
                td.textContent = '-';
            } else {
                td.textContent = `${lens}`;
                byLen.set(i, byLen.get(i)! + lens);
            }
        }
        {
            const td = document.createElement('td');
            row.appendChild(td);
            td.classList.add('header');
            td.textContent = `${an.nums}`;
        }
    }
    const tfoot = document.createElement('tfoot');
    tbl.appendChild(tfoot);
    const footRow = document.createElement('tr');
    tfoot.appendChild(footRow);
    {
        const td = document.createElement('td');
        footRow.appendChild(td);
        td.classList.add('header');
        td.textContent = '∑';
    }
    for (let i = minLen; i <= maxLen; ++i) {
        const td = document.createElement('td');
        footRow.appendChild(td);
        td.classList.add('header');
        td.textContent = `${byLen.get(i)!}`;
    }
    {
        const td = document.createElement('td');
        footRow.appendChild(td);
        td.classList.add('header');
        td.textContent = `${words.length}`;
    }
    return tbl;
}

function createPrefixBtn(letters: string): Prefix {
    const prefix = document.createElement('p');
    prefix.classList.add('letter-hint');
    const remover = document.createElement('button');
    remover.textContent = '✓';
    const container = document.createElement('div');
    container.classList.add('prefix-container');
    container.appendChild(prefix);
    container.appendChild(remover);
    container.setAttribute('data-prefix', letters);
    return { container, prefix, remover };
}

function createPrefix(prefix: string, num: number, words: string[]): HTMLDivElement|null {
    if (removed.has(prefix)) {
        return null;
    }
    const b = createPrefixBtn(prefix);
    b.prefix.textContent = `${prefix} x${num}`;
    b.prefix.onclick = () => loadPrefixes(b.container, words);
    b.remover.onclick = () => {
        if (b.container.classList.contains('removed')) {
            removed.delete(prefix);
        } else {
            removed.add(prefix);
        }
        b.container.classList.toggle('removed');
    }
    return b.container;
}

function loadPrefixes(seed: HTMLDivElement, words: string[]) {
    const letters = seed.getAttribute('data-prefix')!;
    // append a row to my parent, and foreach new prefix, make loadPrefixes the handler
    const existing = document.querySelector(`div:not(.prefix-container)[data-prefix="${letters}"]`);
    if (existing === null) {
        seed.classList.add('selected');
        const analysis = analyzeByN(words.filter(w => w.startsWith(letters)), letters.length + 1);
        const subRow = document.createElement('div');
        seed.parentElement!.insertAdjacentElement('afterend', subRow);
        subRow.setAttribute('data-prefix', letters);
        subRow.classList.add('letter-row');

        const prefixRow = document.createElement('div');
        subRow.appendChild(prefixRow);
        prefixRow.classList.add('prefix-row');
        for (const prefix of analysis.keys()) {
            const child = createPrefix(prefix, analysis.get(prefix)!.nums, words);
            if (child !== null) {
                prefixRow.appendChild(child);
            }
        }
    } else {
        seed.classList.remove('selected');
        existing.remove();
    }
}

async function loadAnalysis(day: Date) {
    const oneLetterTbl = document.getElementById('oneLetterTable')!;
    const nLetterHints = document.getElementById('nLetterHints')!;
    removed.clear();
    while (oneLetterTbl.firstChild) {
        oneLetterTbl.removeChild(oneLetterTbl.lastChild!);
    }
    while (nLetterHints.firstChild) {
        nLetterHints.removeChild(nLetterHints.lastChild!);
    }
    const words = await fetchDay(day);
    if (words.length === 0) {
        throw new Error("Unknown Error");
    }
    const oneLetterAnalysis = analyzeByN(words, 1);
    const tbl = constructOneLetterTable(words, oneLetterAnalysis);
    oneLetterTbl.appendChild(tbl);

    const hdr2 = document.createElement('h2');
    hdr2.textContent = '2-Letter Hints';
    nLetterHints.appendChild(hdr2);

    const twoLetterAnalysis = analyzeByN(words, 2);
    // should be in sorted order...?
    const analysisRows = new Map<string, [string, number][]>();
    for (const letter of oneLetterAnalysis.keys()) {
        analysisRows.set(letter, []);
    }

    for (const twoLetter of twoLetterAnalysis.keys()) {
        const row = analysisRows.get(twoLetter.charAt(0))!;
        row.push([twoLetter, twoLetterAnalysis.get(twoLetter)!.nums]);
    }
    for (const letter of analysisRows.keys()) {
        const cols = analysisRows.get(letter)!;
        cols.sort((a, b) => a[0].localeCompare(b[0]));
        
        const row = document.createElement('div');
        nLetterHints.appendChild(row);
        row.classList.add('letter-row');

        const prefixRow = document.createElement('div');
        row.appendChild(prefixRow);
        prefixRow.classList.add('prefix-row');
        for (const [letters, num] of cols) {
            const child = createPrefix(letters, num, words);
            if (child !== null) {
                prefixRow.appendChild(child);
            }
        }
    }
}

async function loadDay(day: Date) {
    const banner = document.getElementById('banner')!;
    const title = document.getElementById('beeTitle')!;
    try {
        banner.textContent = 'Loading';
        await loadAnalysis(day);
        banner.textContent = '';
        title.textContent = `Spelling Bee Hints for ${day.toLocaleDateString('en-US', { timeZone: 'UTC'})}`;
    } catch (e) {
        banner.textContent = `Error fetching hints for ${day.toLocaleDateString('en-US', { timeZone: 'UTC'})}`;
    }
}

window.onload = async () => {
    const input = document.querySelector('#spDatePicker input')! as HTMLInputElement;
    input.value = new Date().toISOString().split('T')[0];
    
    (document.querySelector('#spDatePicker button')! as HTMLButtonElement).onclick = () => loadDay(new Date(input.value));
    loadDay(new Date());
}