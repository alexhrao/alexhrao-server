function validateEmail(email: string): boolean {
    // From Chromium/Node
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}


window.onload = async () => {
    // if we have a token AND an email... show the password reset. We've been vetted
    // otherwise, just show the email field
    const token = new URLSearchParams(window.location.search).get('token');
    const email = Cookies.get('email');
    const emailContainer = document.querySelector<HTMLDivElement>('#emailContainer');
    const passwordContainer = document.querySelector<HTMLDivElement>('#passwordContainer');
    if (emailContainer === null || passwordContainer === null) {
        return;
    }
    if (token === null || email === undefined) {
        // show the emailContainer
        passwordContainer.remove();
        const btn = document.querySelector<HTMLButtonElement>('#submitReset');
        const inp = document.querySelector<HTMLInputElement>('#email');
        const err = document.querySelector<HTMLParagraphElement>('#requestErr');
        if (btn === null || inp === null || err === null) {
            return;
        }
        inp.onkeyup = () => {
            if (inp.value.length > 0 && validateEmail(inp.value)) {
                inp.classList.remove('angry');
                inp.classList.add('happy');
            } else {
                inp.classList.add('angry');
                inp.classList.remove('happy');
            }
        }
        btn.onclick = async () => {
            // check valid email
            if (!validateEmail(inp.value)) {
                // get out
                err.classList.add('angry');
                err.textContent = 'Invalid Email';
                return;
            } else {
                err.classList.remove('angry');
            }
            // add spinner
            const spinner = document.createElement('i');
            spinner.classList.add('fad', 'fa-life-ring', 'fa-spin');
            btn.childNodes.forEach(n => n.remove());
            btn.appendChild(spinner);
            const tf = await fetch('https://alexhrao.com/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: inp.value
                }),
            }).then(resp => {
                return resp.status === 204;
            });
            if (tf) {
                // success!
                err.classList.add('happy');
                err.textContent = 'Request Processed. Check your email to continue.';
                btn.childNodes.forEach(n => n.remove());
                const icon = document.createElement('i');
                icon.classList.add('fal', 'fa-check');
                btn.appendChild(icon);
                btn.classList.add('happy');
                btn.onclick = null;
            } else {
                // error!
                err.classList.add('angry');
                err.textContent = 'Hmmmmm.... Try refreshing the page and trying again.'
                btn.childNodes.forEach(n => n.remove());
                const icon = document.createElement('i');
                icon.classList.add('fal', 'fa-times');
                btn.appendChild(icon);
                btn.classList.add('angry');
                btn.onclick = null;
            }
        }
    } else {
        emailContainer.remove();
        const btn = document.querySelector<HTMLButtonElement>('#resetPassword');
        const pass = document.querySelector<HTMLInputElement>('#newPassword');
        const conf = document.querySelector<HTMLInputElement>('#confirmPassword');
        const err = document.querySelector<HTMLParagraphElement>('#resetErr');
        if (btn === null || pass === null || conf === null || err === null) {
            return;
        }
        pass.onkeyup = () => {
            if (pass.value.length > 0) {
                pass.classList.remove('angry');
                pass.classList.add('happy');
                err.classList.remove('happy', 'angry');
            } else {
                pass.classList.add('angry');
                pass.classList.remove('happy');
                err.classList.remove('happy');
                err.classList.add('angry');
                err.textContent = 'You must provide a password';
            }
        }
        conf.onkeyup = () => {
            if (conf.value.length > 0 && conf.value === pass.value) {
                conf.classList.remove('angry');
                conf.classList.add('happy');
                err.classList.remove('happy', 'angry');
            } else if (conf.value !== pass.value) {
                conf.classList.add('angry');
                conf.classList.remove('happy');
                err.classList.remove('happy');
                err.classList.add('angry');
                err.textContent = 'Passwords must match';
            } else {
                conf.classList.add('angry');
                conf.classList.remove('happy');
                err.classList.remove('happy');
                err.classList.add('angry');
                err.textContent = 'You must confirm your password';
            }
        }

        btn.onclick = async () => {
            if (pass.value.length === 0 || pass.value !== conf.value) {
                err.classList.remove('happy');
                err.classList.add('angry');
                err.textContent = 'Must provide password';
            } else {
                err.classList.remove('happy', 'angry');
            }
            // add spinner
            const spinner = document.createElement('i');
            spinner.classList.add('fad', 'fa-life-ring', 'fa-spin');
            btn.childNodes.forEach(n => n.remove());
            btn.appendChild(spinner);
            const tf = await fetch('https://alexhrao.com/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    email,
                    password: pass.value,
                }),
            }).then(resp => {
                return resp.status === 204;
            });
            if (tf) {
                // success!
                err.classList.add('happy');
                err.textContent = 'Password Reset! You will be redirected to login';
                btn.childNodes.forEach(n => n.remove());
                const icon = document.createElement('i');
                icon.classList.add('fal', 'fa-check');
                btn.appendChild(icon);
                btn.classList.add('happy');
                btn.onclick = null;
                setTimeout(() => {
                    window.location.href = 'https://alexhrao.com/login';
                }, 5000);
            } else {
                // error!
                err.classList.add('angry');
                err.textContent = 'Hmmmmm.... Try refreshing the page and trying again.'
                btn.childNodes.forEach(n => n.remove());
                const icon = document.createElement('i');
                icon.classList.add('fal', 'fa-times');
                btn.appendChild(icon);
                btn.classList.add('angry');
                btn.onclick = null;
            }
        }
    }
    
};