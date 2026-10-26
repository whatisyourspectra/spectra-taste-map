export async function openHelp(page) {
    const dialog = page.locator('.help-center-dialog[open]');
    if (await dialog.count()) return dialog;
    const floating = page.locator('.help-center-trigger');
    if (await floating.isVisible()) await floating.click();
    else {
        const menu = page.locator('.mtm-more-menu');
        if (!await menu.evaluate(element => element.open)) await menu.locator('summary').click();
        await menu.locator('.help-center-menu-entry').click();
    }
    await dialog.waitFor();
    return dialog;
}

export async function openFeedback(page) {
    const help = await openHelp(page);
    await help.locator('.feedback-menu-entry').click();
    await page.locator('.feedback-dialog[open]').waitFor();
}
