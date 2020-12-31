enum EventType {
    Chat = "chat",
    Join = "join",
    Leave = "left",
    HandRaise = "handraise",
    HandLower = "handlower",
}

interface TranscriptSummary {
    name: string;
    startTime: number;
    endTime: number;
    timeZone: string;
}

interface TranscriptEvent {
    type: EventType;
    participantName: string;
    timestamp: number;
    body?: string;
}

interface MeetingInfo {
    name: string;
    timeZone: string;
    meetingID: string;
    startTime: number;
    endTime: number;
}

interface Transcript {
    events: TranscriptEvent[];
    name: string;
    info: MeetingInfo;
    token: string;
}

window.onload = async () => {
    const ICONS = {
        containerize: (icon: HTMLElement): HTMLDivElement => {
            const container = document.createElement('div');
            container.appendChild(icon);
            container.classList.add('icon');
            return container;
        },
        join: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fal', 'fa-user-plus');
            const container = ICONS.containerize(icon);
            container.title = 'Member Joined';
            return container;
        },
        leave: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fal', 'fa-user-minus');
            const container = ICONS.containerize(icon);
            container.title = 'Member Left';
            return container;
        },
        handRaise: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fal', 'fa-hand-sparkles');
            const container = ICONS.containerize(icon);
            container.title = 'Member Raised Hand';
            return container;
        },
        handLower: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fal', 'fa-hand-rock');
            const container = ICONS.containerize(icon);
            container.title = 'Member Lowered Hand';
            return container;
        },
        chat: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fal', 'fa-comment', 'fa-flip-horizontal');
            const container = ICONS.containerize(icon);
            container.title = 'Member Sent a Chat';
            return container;
        },
        lock: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fad', 'fa-lock-alt');
            return ICONS.containerize(icon);
        },
        unlock: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fad', 'fa-lock-open-alt');
            return ICONS.containerize(icon);
        },
        spinner: (): HTMLDivElement => {
            const icon = document.createElement('i');
            icon.classList.add('fad', 'fa-spinner', 'fa-spin');
            return ICONS.containerize(icon);
        },
    };
    // get the transcript payload
    // transcript name will be in GET header as ?meeting=...?
    // token _should_ be in localStorage...? or sessionStorage?
    // Once we get the transcript...
    // 1. Fill in transcriptTitle
    // 2. Fill in the right toggler text
    // 3. For each event, record it correctly... (what does this mean?)
    // 4. Fill in the right URL (or not)
    // 5. Attach the right handlers for download, toggle, delete
    const meetingName = new URLSearchParams(window.location.search).get('meeting');
    const token = window.localStorage.getItem('token');
    const email = window.localStorage.getItem('email');
    if (token === null || email === null) {
        return;
    }
    if (meetingName === null) {
        // get out. Big fat error...
        // kill root
        document.getElementById('root')?.remove();
        // attach search functionality... later...
        // Also TODO: Pagination?
        const previews = document.querySelector<HTMLDivElement>('#transcriptPreviews');
        if (previews === null) {
            return;
        }
        // uh... make the request
        const loader = document.createElement('i');
        loader.classList.add('fad', 'fa-spinner', 'fa-spin');
        previews.appendChild(loader);
        const trans = await fetch('https://alexhrao.com/transcripts', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Email': email
            }
        }).then(r => r.json() as Promise<TranscriptSummary[]>);

        const cards = trans.map(tr => {

            const card = document.createElement('div');
            card.classList.add('card');
            const cardTitle = document.createElement('h2');
            cardTitle.textContent = tr.name;
            const cardStart = document.createElement('span');
            const timeZone = tr.timeZone;
            const dt = new Date(tr.startTime).toLocaleString('en-US', { timeZone });
            cardStart.textContent = dt;
            const cardLink = document.createElement('a');
            cardLink.href = `https://alexhrao.com/transcripts?meeting=${tr.name}`;
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-long-arrow-right');
            cardLink.appendChild(icon);
            
            card.appendChild(cardTitle);
            card.appendChild(cardStart);
            card.appendChild(cardLink);
            return card;
        });
        previews.childNodes.forEach(n => n.remove());
        cards.forEach(c => previews.appendChild(c));
        return;
    }
    document.getElementById('generic')?.remove();
    const title = document.querySelector<HTMLHeadingElement>('#transcriptTitle');
    const toggler = document.querySelector<HTMLButtonElement>('#toggleLock');
    const deleter = document.querySelector<HTMLButtonElement>('#deleteTranscript');
    const downloader = document.querySelector<HTMLAnchorElement>('#downloadTranscript');
    const transcriptView = document.querySelector<HTMLDivElement>('#transcriptView');
    const actions = document.querySelector<HTMLDivElement>('.actions');
    if (title === null || toggler === null|| deleter === null || downloader === null || transcriptView === null || actions === null) {
        return;
    }
    const transcript = await fetch(`https://alexhrao.com/transcripts?meeting=${meetingName}`, {
        headers: {
            'X-User-Email': email,
            'Authorization': `Bearer ${token}`
        },
    }).then(resp => {
        if (resp.status !== 200) {
            // oh shite...
            return undefined
        }
        return resp.json() as Promise<Transcript>;
    });
    if (transcript === undefined) {
        title.textContent = 'Not Found';
        actions.remove();
        transcriptView.remove();
        return;
    }
    const friendlyTitle = transcript.name.substr(0, 1).toUpperCase() + transcript.name.substr(1);
    document.title = `Transcript | ${friendlyTitle}`;
    const plain = await fetch(`https://alexhrao.com/transcripts?meeting=${meetingName}&download=true`, {
        headers: {
            'X-User-Email': email,
            'Authorization': `Bearer ${token}`
        },
    }).then(resp => {
        if (resp.status !== 200) {
            throw new Error('Invalid Transcript...');
        }
        return resp.text();
    });

    const timeZone = transcript.info.timeZone;
    const formatStamp = (stamp: number): HTMLElement => {
        const dt = new Date(stamp);
        const txt = document.createElement('em');
        txt.classList.add('transcript-datetime');
        txt.textContent = `(${dt.toLocaleString('en-US', { timeZone })})`;
        return txt;
    }

    let hasToken = transcript.token !== undefined && transcript.token.length > 0;
    // 1
    title.textContent = friendlyTitle;
    // 2
    const toggleToken = (hasToken: boolean): void => {
        if (hasToken) {
            toggler.childNodes.forEach(n => n.remove());
            toggler.appendChild(ICONS.lock());
            toggler.title = 'Remove the public link. Only you will be able to view this transcript';
        } else {
            toggler.childNodes.forEach(n => n.remove());
            toggler.appendChild(ICONS.unlock());
            toggler.title = 'Add a public link; anyone with the link can access the transcript printout';
        }
    };
    toggleToken(hasToken);
    // 3
    const connectionLine = document.createElement('div');
    connectionLine.classList.add('transcript-entry');
    const preamble = document.createElement('p');
    preamble.textContent = 'Connected: ';
    preamble.appendChild(formatStamp(transcript.info.startTime));
    connectionLine.appendChild(preamble);
    transcriptView.appendChild(connectionLine);

    // for each event, append it
    transcript.events.forEach(te => {
        let icon: HTMLElement;
        switch (te.type) {
            case EventType.Chat:
                icon = ICONS.chat();
                break;
            case EventType.HandLower:
                icon = ICONS.handLower();
                break;
            case EventType.HandRaise:
                icon = ICONS.handRaise();
                break;
            case EventType.Join:
                icon = ICONS.join();
                break;
            case EventType.Leave:
                icon = ICONS.leave();
                break;
        }
        const line = document.createElement('div');
        line.classList.add('transcript-entry');
        const prefix = document.createElement('div');
        prefix.classList.add('transcript-prefix');

        prefix.appendChild(icon);
        const sender = document.createElement('strong');
        sender.textContent = te.participantName;
        prefix.appendChild(sender);
        prefix.appendChild(formatStamp(te.timestamp));
        line.appendChild(prefix);
        if (te.type === EventType.Chat) {
            const msg = document.createElement('p');
            msg.textContent = te.body!;
            msg.classList.add('transcript-msg');
            line.appendChild(msg);
        }
        transcriptView.appendChild(line);
    });
    const disconnectionLine = document.createElement('div');
    disconnectionLine.classList.add('transcript-entry');
    const footer = document.createElement('p');
    footer.textContent = 'Disconnected: ';
    footer.appendChild(formatStamp(transcript.info.endTime));
    disconnectionLine.appendChild(footer);
    transcriptView.appendChild(disconnectionLine);
    // 4
    const copy = document.createElement('button');
    const cpyIcon = document.createElement('icon');
    copy.id = 'copyToken';
    cpyIcon.classList.add('fad', 'fa-copy');
    copy.appendChild(cpyIcon);
    copy.title = 'Copy Public Link';
    actions.appendChild(copy);

    const addCopier = (token: string): void => {
        copy.onclick = async () => {
            const link = `https://alexhrao.com/transcripts?token=${token}`;
            await window.navigator.clipboard.writeText(link);
            const check = document.createElement('icon');
            check.classList.add('fad', 'fa-check');

            [...copy.children].forEach(n => n.remove());
            copy.appendChild(check);
            copy.style.color = 'lightgreen';
        }
    };

    if (hasToken) {
        addCopier(transcript.token);
        copy.classList.add('shown');
        // copy button?
    }
    // 5
    downloader.href = `data:text/plain;charset=UTF8;base64,${btoa(plain)}`;
    downloader.download = `${transcript.name}.txt`;
    toggler.onclick = async () => {
        toggler.childNodes.forEach(n => n.remove());
        toggler.appendChild(ICONS.spinner());
        if (hasToken) {
            const payload = {
                auth: {
                    email,
                    token,
                },
                token: transcript.token,
            };
            const resp = await fetch('https://alexhrao.com/transcripts', {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            transcript.token = '';
            // cleanup! We have no token...
            copy.onclick = () => {};
            copy.classList.remove('shown');
            toggleToken(false);
        } else {
            const payload = {
                auth: { email, token },
                meetingName: transcript.name,
            };
            transcript.token = await fetch('https://alexhrao.com/transcripts', {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(resp => resp.text());
            // cleanup! We have a token
            addCopier(transcript.token);
            // change copy token
            copy.classList.add('shown');
            toggleToken(true);
        }
        hasToken = transcript.token !== undefined && transcript.token.length > 0;
        // 1. Spin
        // 2. Request
        // 3.1 If success, change to other
        // 3.2 If failure, somehow indicate
    }
    deleter.onclick = () => {
        // 1. Spin
        // 2. Request
        // 3.1 If success, redirect to overview
        // 3.2 If failure, somehow indicate
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        const modal = document.createElement('div');
        modal.id = 'modal';
        modalContainer.appendChild(modal);
        const title = document.createElement('h1');
        title.textContent = 'Are You Sure?';
        const desc = document.createElement('p');
        desc.textContent = 'You are deleting this transcript; this cannot be undone. Are you sure?';
        const confirmed = document.createElement('button');
        confirmed.id = 'confirmDelete';
        const confIcon = document.createElement('icon');
        confIcon.classList.add('fas', 'fa-trash');
        confirmed.textContent = 'Delete';
        confirmed.prepend(confIcon);
        const choices = document.createElement('div');
        choices.id = 'deleteChoices';
        choices.appendChild(confirmed);
        modal.appendChild(title);
        modal.appendChild(desc);
        modal.appendChild(choices);
        const closer = document.createElement('button');
        closer.id = 'modalCloser';
        closer.onclick = () => {
            modalContainer.remove();
        }

        const closeIcon = document.createElement('icon');
        closeIcon.classList.add('fal', 'fa-times');
        closer.appendChild(closeIcon);
        modal.appendChild(closer);
        confirmed.onclick = async () => {
            // send the request, then redirect
            await fetch(`https://alexhrao.com/transcripts?meeting=${meetingName}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Email': email,
                    'Authorization': `Bearer ${token}`
                },
            });
            window.location.href = 'https://alexhrao.com/account';
        }

        document.body.appendChild(modalContainer);
    }
}