/* eslint-disable import/prefer-default-export */
const launchChrome = require('@serverless-chrome/lambda');
const Cdp = require('chrome-remote-interface');
const LOAD_TIMEOUT = 1000 * 30;

export async function handler (event, context, callback) {
  const chromeo = await launchChrome();
  const requestsMade = [];
  const options = { host: 'localhost', port: 9222 };

  const client = await Cdp(options);

  const { Emulation, Network, Page } = client;
  Network.requestWillBeSent(params => requestsMade.push(params));

  const loadEventFired = Page.loadEventFired();

  console.log("Browser clear");
  await Network.clearBrowserCache();

  console.log("Cookies clear");
  await Network.clearBrowserCookies();
  //console.log("Disable cache");
  //await Network.setCacheDisabled();

  // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-enable
  // https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-enable
  await Promise.all([Network.enable(), Page.enable()]);

  // https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-navigate
  await Page.navigate({ url: 'https://www.chromium.org/' });

  // wait until page is done loading, or timeout
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      reject,
      LOAD_TIMEOUT,
      new Error(`Page load timed out after ${LOAD_TIMEOUT} ms.`)
    );

    loadEventFired.then(async () => {
      console.log("Load event fired...");
      clearTimeout(timeout);
      resolve();
    });
  });
  // It's important that we close the websocket connection,
  // or our Lambda function will not exit properly
  //await Cdp.Close({ id: client.target.id });
  await client.close();
  await chromeo.kill();

  await new Promise((resolve, reject) => {
    return setTimeout(
      resolve,
      350
    );
  });


  callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      requestsMade,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
