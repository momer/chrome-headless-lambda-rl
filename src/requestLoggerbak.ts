/* eslint-disable import/prefer-default-export */
const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(require('aws-sdk'));
const launchChrome = require('@serverless-chrome/lambda');
const Cdp = require('chrome-remote-interface');
const LOAD_TIMEOUT = 1000 * 30;

export async function handler (event, context, callback) {
  const requestsMade = [];
  const options = { host: 'localhost', port: 9222 };

  const browser = await Cdp({ tab: 'ws://127.0.0.1:9222/devtools/browser', remote: true });
  console.log("Browser connected...");

  const newTarget = await browser.Target.createTarget({url: 'about:blank'});
  const targetId = newTarget.targetId;
  const targetList = await Cdp.List();
  const url = targetList.find(target => target.id === targetId).webSocketDebuggerUrl;
  const client = await Cdp({tab: url, remote: true});

  const { Emulation, Network, Page } = client;
  Network.requestWillBeSent(params => requestsMade.push(params));

  const loadEventFired = Page.loadEventFired();
  // Print all tabs
  Cdp.List(function(err, targets) {
    if (!err) {
      console.log("Listing targets...");
      console.log(targets);
    }
    else {
      console.log(`Error listing targets ${err}`);
    }
  });

  console.log("Browser clear");
  await Network.clearBrowserCache();
  console.log("Cookies clear");
  await Network.clearBrowserCookies();
  //console.log("Disable cache");
  //await Network.setCacheDisabled();
  // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-enable
  await Network.enable();

  // https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-enable
  await Page.enable();

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
  //
  console.log("Disable network");
  await Network.disable();
  console.log("Disable page");
  await Page.disable();

  let clientClose = await client.close();
  console.log(`Was clientclose ok? ${clientClose}`);
  //let closedTarget = await browser.Target.closeTarget({targetId});
  //console.log(`Was closedtarget ok? ${closedTarget}`);
  Cdp.Close({ 'id': targetId }, function(err) {
    console.log(`Closing target... error (if any): ${err}`);
  });
  let browserClose = await browser.close();
  console.log(`Was browsertarget ok? ${browserClose}`);

  await new Promise((resolve, reject) => {
    return setTimeout(
      resolve,
      150
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
