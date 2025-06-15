document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(form);
            await fetch('send.php', { method: 'POST', body: data });
            location.reload();
        });
    }
});
