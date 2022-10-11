import { test, expect, Page } from '@playwright/test';
import { addDays, format } from 'date-fns';
const baseURL = `https://presentaciones.stage.iberostar.com/Reservations/availability?codiconc=24&conccodi=76&cp_tealium=&idiocodi=1&idiomercodi=es&monecodi=EUR&numerohabitaciones=1&ok_promo=0&origen_soporte=IBE&search_origin=hotel&Cp=GOOGLEES&edP0_0=30&edadpersona0_0=30&edP0_1=30&edadpersona0_1=30&adultohab0=2&ninohab0=0&bebehab0=0&numeropersonas0=2&utm_source=pruebas_prm&utm_medium=pruebas_prm&utm_campaign=pruebas_prm`;

const today = new Date();
const initDate = addDays(today, 30);
const endDate = addDays(today, 34);
const initDateQuery = `&fechaini=${format(initDate, 'dd/MM/yyyy')}`;
const endDateQuery = `&fechafin=${format(endDate, 'dd/MM/yyyy')}`;
const currencyCode = 'EUR';
const currencyCodeQuery = `&monecodi=${currencyCode}`;
const currentUrl = baseURL + initDateQuery + endDateQuery + currencyCodeQuery;
let page: Page;
let requestFailedCount = 0;
let responseNot200: { [key: string]: number } = {};

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();

  page.on('requestfailed', () => {
    requestFailedCount++;
  });

  page.on('response', response => {
    const statusCode = response.status();
    if (statusCode !== 200) {
      responseNot200[statusCode] = responseNot200[statusCode]++ || 1;
    }
  });

  await page.goto(currentUrl);
});

test.afterAll(async () => {
  console.log('requestFailedCount: ' + requestFailedCount);
  console.table(responseNot200);
  await page.close();
});

test('accept cookies', async () => {
  await page.waitForSelector('#agree-cookies');
  const cookieButton = page.locator('#agree-cookies');
  await cookieButton.click();
  expect(page.url()).toBe(currentUrl);
  const cookies = (await page.request.storageState()).cookies;
  const cookiesConsent = cookies.find(cookie => cookie.name == 'cookies_consent')
  expect(cookiesConsent?.value).toBe('true');
});

test('check currency change', async () => {
  await page.waitForSelector('#currency-selector-btn');
  const currencyListBtn = page.locator('#currency-selector-btn');
  await currencyListBtn.waitFor({ state: 'visible' });
  await currencyListBtn.click();
  const currencyListBtnClass = await currencyListBtn.getAttribute('class');
  expect(currencyListBtnClass?.split(' ')).toContain('active');

  const currencyPanel = page.locator('#currencies-panel');
  currencyPanel.getByText('USD').click();

  await expect(page).toHaveURL(/.*USD/);
});
