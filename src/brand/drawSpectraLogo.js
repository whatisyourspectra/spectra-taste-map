let logoPromise;

function loadLogo() {
    if (!logoPromise) {
        logoPromise = new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('SPECTRA logo could not be loaded'));
            image.src = '/spectra-wordmark.svg';
        }).catch((error) => {
            logoPromise = null;
            throw error;
        });
    }
    return logoPromise;
}

export async function drawSpectraLogo(ctx, { centerX = 540, top, width = 360 }) {
    const image = await loadLogo();
    ctx.drawImage(image, centerX - width / 2, top, width, width * 110 / 1200);
}

export const BRAND_TAGLINE = 'YOUR MUSIC TASTE MAP';
