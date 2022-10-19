import { test, expect, Page } from '@playwright/test';
import { addDays, format } from 'date-fns';
const domain = 'https://presentaciones.stage.iberostar.com';
const view = 'Reservations/availability';
const baseURL = `${domain}/${view}?codiconc=24&conccodi=76&cp_tealium=&idiomercodi=es&numerohabitaciones=1&ok_promo=0&origen_soporte=IBE&search_origin=hotel&Cp=GOOGLEES&edP0_0=30&edadpersona0_0=30&edP0_1=30&edadpersona0_1=30&adultohab0=2&ninohab0=0&bebehab0=0&numeropersonas0=2&utm_source=pruebas_prm&utm_medium=pruebas_prm&utm_campaign=pruebas_prm`;

const today = new Date();
const initDate = addDays(today, 30);
const endDate = addDays(today, 34);
const initDateQuery = `&fechaini=${format(initDate, 'dd/MM/yyyy')}`;
const endDateQuery = `&fechafin=${format(endDate, 'dd/MM/yyyy')}`;
const currencyCode = 'EUR';
const currencyCodeQuery = `&monecodi=${currencyCode}`;
const regionCode = 1; // espaniol
const regionCodeQuery = `&idiocodi=${regionCode}`;
const currentUrl = baseURL + initDateQuery + endDateQuery + currencyCodeQuery + regionCodeQuery;
let requestFailedCount = 0;
let responseNot200: { [key: string]: number } = {};

async function passCookieCheck(page: Page): Promise<void> {
  await page.goto(currentUrl);
  await page.waitForSelector('#agree-cookies');
  const cookieButton = page.locator('#agree-cookies');
  await cookieButton.click();
}

test.describe('EMEA - B2C - 1Hab - 2 Adults - 0 Child - EUR', () => {
  test.beforeEach(async ({ page }) => {
    page.on('requestfailed', () => {
      requestFailedCount++;
    });
  
    page.on('response', response => {
      const statusCode = response.status();
      if (statusCode !== 200) {
        responseNot200[statusCode] = responseNot200[statusCode]++ || 1;
      }
    });

    await passCookieCheck(page);
  });

  test('accept cookies', async ({ page }) => {
    expect(page.url()).toBe(currentUrl);
    const cookies = (await page.request.storageState()).cookies;
    const cookiesConsent = cookies.find(cookie => cookie.name == 'cookies_consent')
    expect(cookiesConsent?.value).toBe('true');
  });
  
  test('currency change', async ({ page }) => {
    await page.waitForSelector('#currency-selector-btn');
  
    const currencyListBtn = page.locator('#currency-selector-btn');
    await currencyListBtn.waitFor({ state: 'visible' });
    await currencyListBtn.click();
  
    const currencyListBtnClass = await currencyListBtn.getAttribute('class');
    expect(currencyListBtnClass?.split(' ')).toContain('active');
  
    const currencyPanel = page.locator('#currencies-panel');
    currencyPanel.getByText('USD').click();
  
    await expect(page).toHaveURL(/.*USD/);
    const currencyTotalText = await page.locator('.final-price').textContent();
    expect(currencyTotalText).toMatch(/.*USD/);
  });

  test('region change', async ({ page }, testInfo) => {
    await page.waitForSelector('#lang-selector-btn');
  
    const langListBtn = page.locator('#lang-selector-btn');
    await langListBtn.waitFor({ state: 'visible' });
    await langListBtn.click();
  
    const currencyListBtnClass = await langListBtn.getAttribute('class');
    expect(currencyListBtnClass?.split(' ')).toContain('active');
  
    const langPanel = page.locator('#panel-lang');
    langPanel.getByText('English').click();
  
    await expect(page).toHaveURL(/.*&idiocodi=2/);
    const newlangListBtnText = await page.locator('#lang-selector-btn').textContent();
    expect(newlangListBtnText).toMatch('English');
    // const screenshot = await page.screenshot();
    // await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  });

  test('youtube video loads correctly', async ({ page }) => {
    const photosButton = page.locator('.hotel-card .image img');
    await photosButton.waitFor({ state: 'visible' });
    await photosButton.click();

    const modalInfoBox = page.locator('.modal-wrapper .info-box .box-gallery.active');
    await modalInfoBox.waitFor({ state: 'visible' });
    await expect(modalInfoBox).not.toBeEmpty();

    const videosFilter = modalInfoBox.locator('.gallery-content .gallery-filters ul li [data-tag-id="videos"]');
    await expect(videosFilter).not.toBeEmpty();
    let videosFilterClass = await videosFilter.getAttribute('class');
    expect(videosFilterClass).not.toMatch(/.*active/);
    await videosFilter.click();
    videosFilterClass = await videosFilter.getAttribute('class');
    expect(videosFilterClass).toMatch(/.*active/);

    const galleryItems = modalInfoBox.locator('.gallery-items .gallery-item');
    const galleryItemsCount = await galleryItems.count();
    expect(galleryItemsCount).toBeGreaterThan(0);
    const currentVideo = galleryItems.first().frameLocator('.ytmedia').locator('#player');
    await expect(currentVideo).not.toBeEmpty();
  });
});

// test.afterEach(async ({ page }, testInfo) => {
//   const video = page.video();
//   const videoPath = './test-results/' + testInfo.title.split(' ').join('-') + '.webm';
//   //const a = await video?.path();
//   await page.close();
//   await video?.saveAs(videoPath);
//   await testInfo.attach('video', { path: videoPath });
// });

test.afterEach(async ({ page }, testInfo) => {
  const screenshot = await page.screenshot();
  await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
});