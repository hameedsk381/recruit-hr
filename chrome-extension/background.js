chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'INGEST_CANDIDATE') {
        handleIngestion(request.payload).then(sendResponse);
        return true; // Keep channel open for async
    }
});

async function handleIngestion(payload) {
    try {
        const { apiKey, apiUrl } = await chrome.storage.local.get(['apiKey', 'apiUrl']);
        
        if (!apiKey) return { success: false, error: 'No API Key configured' };

        const response = await fetch(`${apiUrl || 'http://localhost:3001'}/sourcing/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}
