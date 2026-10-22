/* Isolated integration test for format groups. Requires Playwright on NODE_PATH. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createStaticServer} = require('../server/static-server.cjs');

// Names stored in a ZIP's central directory.
function zipNames(buffer) {
  const names = [];
  for (let i = 0; i + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    const length = buffer.readUInt16LE(i + 28);
    names.push(buffer.toString('utf8', i + 46, i + 46 + length));
  }
  return names;
}

(async()=>{
  const server = createStaticServer('/');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({headless:true, executablePath:process.env.SPLIT_CHROME_PATH||undefined});
  const errors = [];
  try {
    const page = await browser.newPage({viewport:{width:1440, height:1000}, acceptDownloads:true});
    page.on('pageerror', e => errors.push(String(e)));
    const groups = () => page.$$eval('.format-group', list => list.map(g => [g.getAttribute('aria-label'), g.querySelectorAll('.format-option input').length]));
    const count = () => page.textContent('#formatCount');
    await page.goto(url);
    await page.waitForSelector('.format-group');

    assert.deepEqual(await groups(), [['Ads Meta', 4], ['Banners para sites', 2]]);
    assert.equal(await count(), '6');
    console.log('PASS 1: default sizes are grouped as Ads Meta and Banners para sites');

    const banners = page.locator('.format-group[aria-label="Banners para sites"] [data-group-toggle]');
    await banners.uncheck();
    assert.equal(await count(), '4');
    assert.equal(await page.textContent('.format-group[aria-label="Banners para sites"] .format-group-count'), '0/2');
    await page.locator('.format-group[aria-label="Banners para sites"] .format-option input').first().check();
    assert.ok(await banners.evaluate(input => input.indeterminate), 'a partial group shows an indeterminate checkbox');
    await page.evaluate(() => undo());
    await page.evaluate(() => undo());
    assert.equal(await count(), '6');
    console.log('PASS 2: a group checkbox selects its sizes, shows partial selection and undoes');

    await page.click('#addSizes summary');
    await page.click('.size-catalog-group:has-text("Banners para sites") .size-catalog-head button');
    assert.deepEqual((await groups())[1], ['Banners para sites', 8], 'existing sizes are reused, the rest added');
    await page.click('.size-catalog-group:has-text("LinkedIn Ads") .size-chip:has-text("720 × 900")');
    assert.deepEqual((await groups()).at(-1), ['LinkedIn Ads', 1]);
    assert.match(await page.textContent('.size-catalog-group:has-text("Ads Meta") .size-chip'), /^✓/);
    await page.evaluate(() => undo());
    await page.evaluate(() => undo());
    assert.deepEqual(await groups(), [['Ads Meta', 4], ['Banners para sites', 2]]);
    console.log('PASS 3: the catalog adds a channel or a single size without duplicates');

    await page.fill('#customWidth', '600');
    await page.fill('#customHeight', '400');
    await page.fill('#customName', 'Capa do e-mail');
    await page.fill('#customGroup', 'E-mail');
    await page.click('#customFormatForm button[type="submit"]');
    assert.deepEqual((await groups()).at(-1), ['E-mail', 1]);
    assert.ok(await page.isVisible('.format-group[aria-label="E-mail"] >> text=Capa do e-mail'));
    console.log('PASS 4: a custom size takes a name and a new group');

    await page.hover('.format-entry:has-text("Feed quadrado")');
    await page.click('.format-entry:has-text("Feed quadrado") [data-format-menu]');
    await page.click('.format-menu button:has-text("E-mail")');
    assert.deepEqual(await groups(), [['Ads Meta', 3], ['Banners para sites', 2], ['E-mail', 2]]);
    await page.click('.format-group[aria-label="E-mail"] [data-group-menu]');
    await page.click('.format-menu button:has-text("Renomear grupo")');
    await page.fill('.format-menu input', 'Newsletter');
    await page.press('.format-menu input', 'Enter');
    assert.deepEqual((await groups()).at(-1), ['Newsletter', 2]);
    await page.click('.format-group[aria-label="Newsletter"] .format-group-name');
    assert.ok(await page.isHidden('.format-group[aria-label="Newsletter"] .format-group-items'));
    assert.equal(await count(), '7', 'collapsing a group keeps its selection');
    console.log('PASS 5: formats move between groups and groups rename and collapse');

    await page.click('#emptyDemo');
    await page.waitForFunction(() => document.querySelectorAll('.output-card').length === 7);
    const headings = await page.$$eval('.cards-group h3', list => list.map(h => h.firstChild.textContent));
    assert.deepEqual(headings, ['Ads Meta', 'Banners para sites', 'Newsletter']);
    const optgroups = await page.$$eval('#activeFormat optgroup', list => list.map(g => g.label));
    assert.deepEqual(optgroups, headings);
    console.log('PASS 6: the overview and the format picker follow the groups');

    let download = page.waitForEvent('download');
    await page.click('#exportAll');
    let file = await download;
    let names = zipNames(require('node:fs').readFileSync(await file.path()));
    assert.equal(names.length, 7);
    assert.ok(names.includes('ads-meta/Estudio-26-exemplo-1080x1350.png'), names.join(', '));
    assert.ok(names.includes('newsletter/Estudio-26-exemplo-1080x1080.png'));
    download = page.waitForEvent('download');
    await page.click('.cards-group:has-text("Newsletter") .cards-group-zip');
    file = await download;
    assert.equal(file.suggestedFilename(), 'Estudio-26-exemplo-newsletter.zip');
    names = zipNames(require('node:fs').readFileSync(await file.path()));
    assert.deepEqual(names.sort(), ['Estudio-26-exemplo-1080x1080.png', 'Estudio-26-exemplo-600x400.png']);
    console.log('PASS 7: the ZIP has a folder per group and each group downloads alone');

    await page.click('.format-group[aria-label="Newsletter"] [data-group-menu]');
    await page.click('.format-menu .danger-item');
    assert.equal(await page.locator('.output-card').count(), 5);
    await page.evaluate(() => undo());
    assert.equal(await page.locator('.output-card').count(), 7);
    console.log('PASS 8: deleting a group removes its pieces and undo brings them back');

    const legacy = await page.evaluate(() => {
      FORMATS[0].group = 'SOCIAL';
      FORMATS.at(-1).group = 'CUSTOM';
      formatOptions(chosenFormats());
      return [FORMATS[0].group, FORMATS.at(-1).group];
    });
    assert.deepEqual(legacy, ['Ads Meta', 'Personalizados']);
    console.log('PASS 9: projects saved with the old group codes open with named groups');

    assert.deepEqual(errors, []);
    console.log('Completed 9 format group browser checks.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
