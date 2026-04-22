document.addEventListener('DOMContentLoaded', async () => {
    const keyInput = document.getElementById('api-key');
    const urlInput = document.getElementById('api-url');
    const saveBtn = document.getElementById('save-btn');
    const status = document.getElementById('status');

    // Load existing config
    const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);
    if (config.apiKey) {
        keyInput.value = config.apiKey;
        status.innerText = 'Connected to Reckruit.ai';
    }
    if (config.apiUrl) urlInput.value = config.apiUrl;

    saveBtn.addEventListener('click', async () => {
        const apiKey = keyInput.value.trim();
        const apiUrl = urlInput.value.trim();

        if (!apiKey) {
            status.innerText = 'API Key is required';
            return;
        }

        await chrome.storage.local.set({ apiKey, apiUrl });
        status.innerText = 'Settings saved successfully!';
        status.style.color = '#10b981';
        
        setTimeout(() => {
            status.innerText = 'Connected to Reckruit.ai';
            status.style.color = '#666';
        }, 2000);
    });
});
