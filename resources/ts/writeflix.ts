window.onload = () => {
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
};