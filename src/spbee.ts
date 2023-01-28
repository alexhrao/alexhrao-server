import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

function extractWord(li: Element): String {
    if (li.children.length !== 0) {
        return extractWord(li.children[0].children[0]);
    } else {
        return li.innerHTML.trim();
    }
}

export function fetchDay(day: Date): Promise<String[]> {
    return (fetch(`https://nytbee.com/Bee_${day.getUTCFullYear()}${(day.getUTCMonth() + 1).toString().padStart(2, '0')}${day.getUTCDate().toString().padStart(2, '0')}.html`, { method: 'GET' })
        .then(r => r.text())
        .then(html => {
            const { document } = new JSDOM(html).window;
            const els = document.querySelectorAll('#main-answer-list > ul > li');
            const d = [...els];
            const words = d.map(li => extractWord(li));
            return words;
        }));
}