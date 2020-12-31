interface AccountDetails {
    email: string;
    slack: {
        name: string;
        id: string;
    }[];
    outlook: {
        name: string;
    }[];
    transcripts: {
        meetingInfo: {
            name: string;
            timeZone: string;
            meetingID: string;
            startTime: number;
            endTime: number;
        };
        name: string;
    }[];
    createdDate: number;
}

window.onload = async () => {
    const email = window.localStorage.getItem('email');
    const token = window.localStorage.getItem('token');
    if (email === null || token === null) {
        window.location.href = 'https://alexhrao.com/login';
        return;
    }

    const accountDetails = await fetch('https://alexhrao.com/account', {
        method: 'GET',
        headers: {
            'X-User-Email': email,
            'Authorization': `Bearer ${token}`,
        },
    }).then(resp => {
        if (resp.status !== 200) {
            window.location.href = 'https://alexhrao.com/login';
            throw new Error('Invalid User Token');
        } else {
            return resp.json() as Promise<AccountDetails>;
        }
    });
    // fill in the account information
    const userDesc = document.querySelector<HTMLParagraphElement>('#userDesc');
    if (userDesc === null) {
        return;
    }
    const dt = new Date(accountDetails.createdDate);
    userDesc.textContent = `Member ${accountDetails.email}, since ${dt.toLocaleString('default', { month: 'long' })} ${dt.getFullYear()}`;

    const integrations = document.querySelector<HTMLDivElement>('#profileIntegrations');
    if (integrations === null) {
        return;
    }
    accountDetails.outlook.forEach(mt => {
        const row = document.createElement('div');
        row.classList.add('token', 'outlook-token');
        const icon = document.createElement('i');
        icon.classList.add('fab', 'fa-microsoft');
        row.appendChild(icon);
        const desc = document.createElement('p');
        desc.textContent = mt.name;
        row.appendChild(desc);
        const closer = document.createElement('button');
        const closeIcon = document.createElement('i');
        closeIcon.classList.add('fal', 'fa-times');
        closer.appendChild(closeIcon);
        closer.classList.add('account-close');
        closer.onclick = async () => {
            // send the request...
            await fetch(`https://alexhrao.com/tokens?acct_type=outlook&acct_name=${encodeURIComponent(mt.name)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Email': email,
                }
            });
            // kill ourselves
            row.remove();
        };
        row.appendChild(closer);

        integrations.appendChild(row);
    });

    accountDetails.slack.forEach(st => {
        const row = document.createElement('div');
        row.classList.add('token', 'slack-token');
        const icon = document.createElement('i');
        icon.classList.add('fab', 'fa-slack');
        row.appendChild(icon);
        const desc = document.createElement('p');
        desc.textContent = st.name;
        row.appendChild(desc);
        const closer = document.createElement('button');
        const closeIcon = document.createElement('i');
        closeIcon.classList.add('fal', 'fa-times');
        closer.appendChild(closeIcon);
        closer.classList.add('account-close');
        closer.onclick = async () => {
            // send the request...
            await fetch(`https://alexhrao.com/tokens?acct_type=slack&acct_name=${encodeURIComponent(st.name)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Email': email,
                }
            });
            // kill ourselves
            row.remove();
        };
        row.appendChild(closer);

        integrations.appendChild(row);
    });
    // fill in the first 10 transcripts...
    const previews = document.querySelector<HTMLDivElement>('#transcriptPreviews');
    if (previews === null) {
        return;
    }
    accountDetails.transcripts.forEach(tr => {

        const card = document.createElement('div');
        card.classList.add('card');
        const cardTitle = document.createElement('h2');
        cardTitle.textContent = tr.name;
        const cardStart = document.createElement('span');
        const timeZone = tr.meetingInfo.timeZone;
        const dt = new Date(tr.meetingInfo.startTime).toLocaleString('en-US', { timeZone });
        cardStart.textContent = dt;
        const cardLink = document.createElement('a');
        cardLink.href = `https://alexhrao.com/transcripts?meeting=${tr.name}`;
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-long-arrow-right');
        cardLink.appendChild(icon);
        
        card.appendChild(cardTitle);
        card.appendChild(cardStart);
        card.appendChild(cardLink);
        previews.appendChild(card);
    });
    const viewMore = document.createElement('div');
    viewMore.classList.add('card');
    const viewMoreTitle = document.createElement('h2');
    viewMoreTitle.textContent = 'View More';
    const viewMoreLink = document.createElement('a');
    viewMoreLink.href = 'https://alexhrao.com/transcripts';
    const viewMoreIcon = document.createElement('i');
    viewMoreIcon.classList.add('fas', 'fa-long-arrow-right');
    viewMoreLink.appendChild(viewMoreIcon);

    viewMore.appendChild(viewMoreTitle);
    viewMore.appendChild(viewMoreLink);
    previews.appendChild(viewMore);

    // already so
    // attach button handlers
    const passBtn = document.querySelector<HTMLButtonElement>('#passwordReset');
    if (passBtn === null) {
        return;
    }
    passBtn.onclick = () => {
        // show the modal
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        const modal = document.createElement('div');
        modal.id = 'modal';
        const closer = document.createElement('button');
        closer.id = 'modalCloser';
        const closeIcon = document.createElement('i');
        closeIcon.classList.add('fal', 'fa-times');
        closer.appendChild(closeIcon);
        closer.onclick = () => {
            modalContainer.remove();
        }
        
        const title = document.createElement('h1');
        title.id = 'modalTitle';
        title.textContent = 'Change Password';

        const password = document.createElement('input');
        password.id = 'newPassword';
        password.type = 'password';
        password.placeholder = 'Password';
        password.onkeyup = () => {
            if (password.value.length === 0) {
                password.classList.add('angry');
                password.title = 'You must enter a password';
            } else {
                password.classList.remove('angry');
                password.title = '';
            }
        };

        const conf = document.createElement('input');
        conf.id = 'confirmPassword';
        conf.type = 'password';
        conf.placeholder = 'Confirm Password';
        conf.onkeyup = () => {
            if (password.value !== conf.value) {
                conf.classList.add('angry');
                conf.title = 'Passwords must match';
            } else {
                conf.classList.remove('angry');
                conf.title = '';
            }
        }

        const btn = document.createElement('button');
        btn.textContent = 'Change Password';
        btn.id = 'sendReset';
        btn.onclick = async () => {
            if (password.value.length === 0 || password.value !== conf.value) {
                return;
            }
            const spinner = document.createElement('i');
            spinner.classList.add('fal', 'fa-circle-notch', 'fa-spin');
            btn.textContent = '';
            btn.childNodes.forEach(n => n.remove());
            btn.appendChild(spinner);
            const payload = {
                auth: { email, token },
                password: password.value,
            };
            const resp = await fetch('https://alexhrao.com/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (resp.status === 204) {
                btn.childNodes.forEach(n => n.remove());
                const ic = document.createElement('icon');
                ic.classList.add('fal', 'fa-check');
                btn.appendChild(ic);
            } else {
                btn.childNodes.forEach(n => n.remove());
                btn.textContent = 'Error, please try again';
            }
        }
        modal.appendChild(closer);
        modal.appendChild(title);
        modal.appendChild(password);
        modal.appendChild(conf);
        modal.appendChild(btn);
        modalContainer.appendChild(modal);
        document.body.appendChild(modalContainer);
    }
}