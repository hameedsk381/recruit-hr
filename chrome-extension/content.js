console.log("[Reckruit.ai] Extension Loaded");

function injectSourcingButton() {
    if (document.getElementById('reckruit-sourcing-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'reckruit-sourcing-btn';
    btn.innerHTML = '✨ Push to Reckruit.ai';
    btn.className = 'reckruit-btn-primary';
    
    // Style the button to float or attach to specific profiles
    if (window.location.host.includes('linkedin.com')) {
        // Try multiple common LinkedIn profile header selectors
        const target = 
            document.querySelector('.pv-top-card-v2-ctas') || 
            document.querySelector('.ph5.pb5') || 
            document.querySelector('.pvs-profile-actions') ||
            document.querySelector('.mt2.relative') ||
            document.querySelector('main.scaffold-layout__main');

        if (target) {
            // If it's a main layout fallback, we prepend to keep it at the top
            if (target.tagName === 'MAIN') {
                target.prepend(btn);
            } else {
                target.appendChild(btn);
            }
        } else {
            // Floating backup for LinkedIn
            btn.style.position = 'fixed';
            btn.style.bottom = '20px';
            btn.style.right = '20px';
            btn.style.zIndex = '10000';
            document.body.appendChild(btn);
        }
    } else if (window.location.host.includes('github.com')) {
        const target = document.querySelector('.vcard-names-container');
        if (target) {
            target.parentNode.insertBefore(btn, target.nextSibling);
        } else {
            // Floating backup for GitHub
            btn.style.position = 'fixed';
            btn.style.bottom = '20px';
            btn.style.right = '20px';
            btn.style.zIndex = '10000';
            document.body.appendChild(btn);
        }
    }

    btn.addEventListener('click', async () => {
        btn.innerHTML = '⏳ Syncing...';
        btn.disabled = true;

        const profileData = extractProfileData();
        
        chrome.runtime.sendMessage({ 
            action: 'INGEST_CANDIDATE', 
            payload: {
                source: window.location.host,
                externalUrl: window.location.href,
                profileData
            }
        }, (response) => {
            if (response && response.success) {
                btn.innerHTML = '✅ Synced';
                btn.style.backgroundColor = '#10b981';
            } else {
                btn.innerHTML = '❌ Failed';
                btn.style.backgroundColor = '#ef4444';
                console.error("Reckruit Sync Failed:", response?.error);
            }
        });
    });
}

function extractProfileData() {
    // Simple extraction logic - in production this would be more robust
    const name = document.querySelector('h1')?.innerText || 'Unknown';
    const emailMatch = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    
    return {
        name,
        email: emailMatch ? emailMatch[0] : null,
        headline: document.querySelector('.text-body-medium')?.innerText || ''
    };
}

// Poll for SPA navigation
setInterval(injectSourcingButton, 2000);
