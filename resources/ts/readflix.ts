interface Recommendation {
    id: string;
    match: number;
}

interface Book {
    id: string;
    name: string;
    author: string;
    cover: string;
    pdf: string;
    genres: string[];
    min: number;
    dateAdded: string;
    snaps: number;
    numPages: number;
    recommended: Recommendation[];
}

const books: Book[] = [];

function createReader(book: Book): HTMLDivElement {
    const viewport = document.createElement('div');
    viewport.classList.add('book-reader');

    const reader = document.createElement('object');
    reader.data = book.pdf;
    reader.type = 'application/pdf';
    reader.width = '100%';
    reader.height = '100%';
    const helper = document.createElement('p');
    helper.innerHTML = `Can't view it? You can download it <a href="${book.pdf}" download="${book.name}.pdf">here</a>`;
    reader.appendChild(helper);

    viewport.appendChild(reader);
    return viewport;
}

function createRecord(book: Book, match?: number): HTMLDivElement {
    const container = document.createElement('div');
    container.classList.add('book-row');
    const cover = document.createElement('img');
    cover.src = book.cover;
    const blurb = document.createElement('div');
    blurb.classList.add('book-blurb');
    const name = document.createElement('h2');
    name.textContent = `${book.name}${match === undefined ? '' : ` (${match}% match)` }`;
    const list = document.createElement('ul');
    const auth = document.createElement('li');
    // INJECTION! But!! we know data is safe...
    auth.textContent = `By ${book.author}`;
    const genres = document.createElement('li');
    genres.textContent = `Genre(s): ${book.genres.join(', ')}`;
    const pageLen = document.createElement('li');
    pageLen.textContent = `${book.numPages} ${book.numPages === 1 ? 'Page' : 'Pages'}`;
    const dateAdded = document.createElement('li');
    dateAdded.textContent = `Added on ${book.dateAdded}`;
    const numMin = document.createElement('li');
    numMin.textContent = `${book.min}-minute read`;
    const snaps = document.createElement('li');
    snaps.title = "We're in a library, so please snap instead of clapping";
    snaps.textContent = `Snaps: ${book.snaps}`;
    list.appendChild(auth);
    list.appendChild(genres);
    list.appendChild(pageLen);
    list.appendChild(dateAdded);
    list.appendChild(numMin);
    list.appendChild(snaps);

    blurb.appendChild(name);
    blurb.appendChild(list);

    container.appendChild(cover);
    container.appendChild(blurb);
    // on click?? STATS!
    container.onclick = () => {
        stats.duration = Date.now() - stats.startTime;
        // by the way, tell them we clicked!
        if (match !== undefined) {
            fetch(`/readflix/books?book=${book.id}&from=${stats.currentBook.id}`);
        } else {
            fetch(`/readflix/books?book=${book.id}&duration=${stats.duration}`);
        }
        // Add the PDF viewer
        const reader = createReader(book);
        const viewer = document.querySelector('#viewer');
        if (viewer === null) {
            return;
        }
        [...viewer.children].forEach(e => e.remove());
        const title = document.createElement('h1');
        title.textContent = book.name;
    
        const snapper = document.createElement('button');
        snapper.textContent = `${book.snaps} ${book.snaps === 1 ? 'Snap' : 'Snaps'}`;
        snapper.title = 'Click to give the author credit!';
        snapper.onclick = () => {
            fetch(`/readflix/books?book=${book.id}`, {
                method: 'PATCH',
            });
            book.snaps++;
            snapper.textContent = `${book.snaps} ${book.snaps === 1 ? 'Snap' : 'Snaps'}`;
        }

        viewer.appendChild(title);
        viewer.appendChild(snapper);
        viewer.appendChild(reader);
        // kill everyone
        const bookContainer = document.querySelector('#bookRecords');
        if (bookContainer === null) {
            return;
        }
        [...bookContainer.children].forEach(e => e.remove());
        // Add our recs!
        const header = document.createElement('h2');
        header.textContent = 'Recommendations';
        bookContainer.appendChild(header);
        const recs = book.recommended.map(r => {
            const b = books.find(b => b.id === r.id);
            if (b === undefined) {
                throw new Error();
            }
            return {
                book: b,
                match: r.match,
            };
        }).sort((r1, r2) => r2.match - r1.match);
        recs.forEach(b => {
            const record = createRecord(b.book, b.match);
            bookContainer.appendChild(record);
        });
        stats.currentBook = book;
    };

    return container;
}

const stats = {
    startTime: Date.now(),
    duration: 0,
    currentBook: books[0],
};

window.onload = async () => {
    const uploader = document.querySelector<HTMLButtonElement>('#uploadBtn');
    if (uploader === null) {
        return;
    }
    const form = document.querySelector('form');
    if (form === null) {
        return;
    }
    form.onsubmit = (e) => {
        e.preventDefault();
        uploader.textContent = 'Success! Please wait 5-10 business days for a response';
        uploader.type = 'button';
        form.parentElement?.appendChild(uploader);
        form.remove();
    }
    const bookContainer = document.querySelector('#bookRecords');
    if (bookContainer === null) {
        return;
    }
    const bookPayload: Book[] = await fetch('/readflix/books', {
        method: 'GET',
    }).then(resp => resp.json());

    books.push(...bookPayload);
    books.sort((a, b) => a.id.localeCompare(b.id));
    books.forEach(b => {
        const record = createRecord(b);
        bookContainer.appendChild(record);
    });
}

