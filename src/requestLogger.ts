/* eslint-disable import/prefer-default-export */
const launchChrome = require('@serverless-chrome/lambda');
const Cdp = require('chrome-remote-interface');
const LOAD_TIMEOUT = 1000 * 30;

export async function handler (event, context, callback) {
  const requestsMade = [];

  const browser = await Cdp({ tab: 'ws://127.0.0.1:9222/devtools/browser' });
	console.log("Browser connected...");

	const newTarget = await browser.Target.createTarget({url: 'about:blank'});
	const targetId = newTarget.targetId;
  const targetList = await Cdp.List();
	const url = targetList.find(target => target.id === targetId).webSocketDebuggerUrl;
	const client = await Cdp({tab: url});

	const { Emulation, Network, Page } = client;
  Network.requestWillBeSent(params => requestsMade.push(params));

  const loadEventFired = Page.loadEventFired();

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

	await client.close();
	await browser.Target.closeTarget({targetId});
	await browser.close();

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
