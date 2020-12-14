console.log('hello');

function setupLogin() {
    const loginBtn = document.querySelector<HTMLButtonElement>('#loginContainer button');
    const loginEmail = document.querySelector<HTMLInputElement>('#loginEmail');
    const loginPassword = document.querySelector<HTMLInputElement>('#loginPassword');
    const loginEmailErr = document.querySelector<HTMLParagraphElement>('#loginEmailErr');
    const loginPasswordErr = document.querySelector<HTMLParagraphElement>('#loginPasswordErr');
    const loginErr = document.querySelector<HTMLParagraphElement>('#loginErr');
    // Best-effort...
    if (loginBtn === null || loginEmail === null || loginPassword === null || loginEmailErr === null || loginPasswordErr === null || loginErr === null) {
        return;
    }
    const emailRegex = /[a-z0-9!#$%&'*+/=?^_‘{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_‘{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    function checkLoginEmail(): boolean {
        if (loginEmail === null || loginEmailErr === null) {
            return false;
        }
        if (!emailRegex.test(loginEmail.value)) {
            // get mad
            loginEmailErr.classList.add('shown');
            loginEmail.classList.add('invalid');
            loginEmailErr.textContent = 'Invalid Email';
            return false;
        } else {
            loginEmailErr.classList.remove('shown');
            loginEmail.classList.remove('invalid');
            return true;
        }
    }
    function checkLoginPassword(): boolean {
        if (loginPassword === null || loginPasswordErr === null) {
            return false;
        }
        if (loginPassword.value.length === 0) {
            loginPasswordErr.classList.add('shown');
            loginPassword.classList.add('invalid');
            loginPasswordErr.textContent = 'Please provide a password';
            return false;
        } else {
            loginPasswordErr.classList.remove('shown');
            loginPassword.classList.remove('invalid');
            return true;
        }
    }

    loginPassword.onkeyup = () => checkLoginPassword();
    loginEmail.onkeyup = () => checkLoginEmail();
    loginBtn.onclick = async () => {
        // check!
        if (!checkLoginEmail() || !checkLoginPassword()) {
            return;
        }
        const payload = {
            email: loginEmail.value,
            password: loginPassword.value,
        };
        const icon = document.createElement('i');
        icon.classList.add('fad', 'fa-circle-notch', 'fa-spin');
        loginBtn.textContent = '';
        loginBtn.appendChild(icon);
        try {
            const response = await fetch('https://alexhrao.com/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (response.status !== 200) {
                loginErr.textContent = 'Invalid Login, please try again';
                loginErr.classList.add('shown');
                loginBtn.childNodes.forEach(n => n.remove());
                loginBtn.textContent = 'Login';
                return;
            } else {
                loginErr.classList.remove('shown');
                loginBtn.childNodes.forEach(n => n.remove());
                const check = document.createElement('i');
                check.classList.add('fad', 'fa-check');
                loginBtn.appendChild(check);
            }
        } catch {
            loginErr.textContent = 'Invalid Login, please try again';
            loginErr.classList.add('shown');
            //loginBtn.childNodes.forEach(n => n.remove());
            //loginBtn.textContent = 'Login';
        }
        
    }
}

function setupCreate() {
    const createBtn = document.querySelector<HTMLButtonElement>('#createContainer button');
    const createEmail = document.querySelector<HTMLInputElement>('#createEmail');
    const createPassword = document.querySelector<HTMLInputElement>('#createPassword');
    const createConfirm = document.querySelector<HTMLInputElement>('#createConfirm')
    const createEmailErr = document.querySelector<HTMLParagraphElement>('#createEmailErr');
    const createPasswordErr = document.querySelector<HTMLParagraphElement>('#createPasswordErr');
    const createErr = document.querySelector<HTMLParagraphElement>('#createErr');
    // Best-effort...
    if (createBtn === null || createEmail === null || createPassword === null || createConfirm === null || createEmailErr === null || createPasswordErr === null || createErr === null) {
        return;
    }
    const emailRegex = /[a-z0-9!#$%&'*+/=?^_‘{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_‘{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    function checkEmail(): boolean {
        if (createEmail === null || createEmailErr === null) {
            return false;
        }
        if (!emailRegex.test(createEmail.value)) {
            // get mad
            createEmailErr.classList.add('shown');
            createEmail.classList.add('invalid');
            createEmailErr.textContent = 'Invalid Email';
            return false;
        } else {
            createEmailErr.classList.remove('shown');
            createEmail.classList.remove('invalid');
            return true;
        }
    }
    function checkPassword(): boolean {
        if (createPassword === null || createConfirm === null || createPasswordErr === null) {
            return false;
        }
        if (createPassword.value.length === 0) {
            createPasswordErr.classList.add('shown');
            createPassword.classList.add('invalid');
            createPasswordErr.textContent = 'Please provide a password';
            return false;
        } else if (createConfirm.value !== createPassword.value) {
            createPasswordErr.classList.add('shown');
            createConfirm.classList.add('invalid');
            createPasswordErr.textContent = 'Passwords must match'
            return false;
        } else {
            createPasswordErr.classList.remove('shown');
            createPassword.classList.remove('invalid');
            createConfirm.classList.remove('invalid');
            return true;
        }
    }

    createPassword.onkeyup = () => checkPassword();
    createConfirm.onkeyup = () => checkPassword();
    createEmail.onkeyup = () => checkEmail();
    createBtn.onclick = async () => {
        // check!
        if (!checkEmail() || !checkPassword()) {
            return;
        }
        const payload = {
            email: createEmail.value,
            password: createPassword.value,
        };
        const icon = document.createElement('i');
        icon.classList.add('fad', 'fa-circle-notch', 'fa-spin');
        createBtn.textContent = '';
        createBtn.appendChild(icon);
        try {
            const response = await fetch('https://alexhrao.com/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (response.status !== 201) {
                createErr.textContent = 'Invalid , please try again';
                createErr.classList.add('shown');
                createBtn.childNodes.forEach(n => n.remove());
                createBtn.textContent = 'Login';
                return;
            } else {
                createErr.classList.remove('shown');
                createBtn.childNodes.forEach(n => n.remove());
                const check = document.createElement('i');
                check.classList.add('fad', 'fa-check');
                createBtn.appendChild(check);
            }
        } catch {
            createErr.textContent = 'Invalid Login, please try again';
            createErr.classList.add('shown');
            //createBtn.childNodes.forEach(n => n.remove());
            //createBtn.textContent = 'Login';
        }
        
    }
}

function setupAccountPortal() {
    const loginBtn = document.querySelector<HTMLButtonElement>('#loginPicker');
    const createBtn = document.querySelector<HTMLButtonElement>('#createPicker');
    const loginContainer = document.querySelector<HTMLDivElement>('#loginContainer');
    const createContainer = document.querySelector<HTMLDivElement>('#createContainer');
    if (loginBtn === null || createBtn === null) {
        return;
    }
    loginBtn.onclick = () => {
        if (loginBtn === null || createBtn === null || loginContainer === null || createContainer === null) {
            return;
        }
        loginBtn.classList.add('picked');
        createBtn.classList.remove('picked');
        loginContainer.classList.add('panel-shown');
        createContainer.classList.remove('panel-shown');
    }
    createBtn.onclick = () => {
        if (loginBtn === null || createBtn === null || loginContainer === null || createContainer === null) {
            return;
        }
        createBtn.classList.add('picked');
        loginBtn.classList.remove('picked');
        createContainer.classList.add('panel-shown');
        loginContainer.classList.remove('panel-shown');
    }

}
window.onload = () => {
    setupLogin();
    setupCreate();
    setupAccountPortal();

}