/* Isolated integration test for the guided flow. Requires Playwright on NODE_PATH. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createStaticServer} = require('../server/static-server.cjs');

(async()=>{
  const server = createStaticServer('/');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({headless:true, executablePath:process.env.SPLIT_CHROME_PATH||undefined});
  const errors = [];
  try {
    const page = await browser.newPage({viewport:{width:1440, height:900}});
    page.on('pageerror', e => errors.push(String(e)));
    const states = () => page.$$eval('.flow-step', items => items.map(item => item.className));
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.flow-step').length === 5);

    let steps = await states();
    assert.match(steps[0], /is-current/, 'an empty campaign starts at Elementos');
    assert.match(steps[2], /is-optional/, 'Layout is optional');
    assert.equal(await page.getAttribute('#generate', 'aria-disabled'), 'true');
    console.log('PASS 1: empty campaign points to the first step and blocks generation');

    await page.click('.flow-step button[data-step="formats"]');
    assert.equal(await page.evaluate(() => document.activeElement.closest('section')?.id), 'panel-formats');
    console.log('PASS 2: a step moves focus to its panel');

    await page.click('#emptyDemo');
    await page.waitForFunction(() => document.querySelectorAll('.output-card').length === 6);
    steps = await states();
    assert.match(steps[3], /is-done/);
    assert.match(steps[4], /is-current/, 'after generating, export is next');
    const flagged = await page.$$eval('.output-card', cards => cards.filter(card => card.querySelector('.card-alerts')).map(card => card.dataset.format));
    assert.ok(flagged.includes('leaderboard'), 'the 728 × 90 banner flags its small text');
    assert.ok(!flagged.includes('square'), 'the square feed has no alerts');
    assert.match(steps[3], /has-warning/);
    console.log('PASS 3: readability alerts flag small text only where it occurs');

    await page.click('.output-card[data-format="leaderboard"] .card-alerts');
    await page.waitForFunction(() => !document.getElementById('editor').hidden);
    assert.match(await page.textContent('#legibilityNotice'), /px/);
    console.log('PASS 4: an alert opens the format and the editor repeats it');

    const phone = await browser.newPage({viewport:{width:390, height:844}, acceptDownloads:true});
    phone.on('pageerror', e => errors.push(String(e)));
    await phone.goto(url);
    await phone.click('#emptyDemo');
    await phone.waitForFunction(() => document.querySelectorAll('.output-card').length === 6);
    assert.ok(await phone.evaluate(() => document.body.classList.contains('review-mode')));
    assert.equal(await phone.evaluate(() => getComputedStyle(document.getElementById('leftDock')).display), 'none');
    const download = phone.waitForEvent('download');
    await phone.click('.output-card[data-format="square"] .card-footer > button');
    assert.match((await download).suggestedFilename(), /1080x1080\.png$/);
    console.log('PASS 5: phones open in review mode and download each PNG');

    await phone.click('#editOnPhone');
    assert.ok(!(await phone.evaluate(() => document.body.classList.contains('review-mode'))));
    assert.equal(await phone.textContent('.output-card .card-footer > button'), 'Editar');
    console.log('PASS 6: Editar mesmo assim restores the full editor');

    assert.deepEqual(errors, []);
    console.log('Completed 6 flow browser checks.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
