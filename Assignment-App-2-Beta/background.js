let intervals = {};
let activeTabs = {};
let lastExtractedValue = {};
let articleLimits = {};
let currentDelays = {};
let messageDelays = {};

function revisitURL(tabId) {
  browser.tabs.get(tabId).then((tab) => {
    if (tab) {
      const currentUrl = tab.url;
      browser.tabs.update(tabId, { url: currentUrl });
    }
  });
}

function runLoop(tabId, maxArticles) {
  browser.tabs.sendMessage(tabId, { command: "checkElement" }).then((value) => {
    if (!value) {
      console.error("❌ CSS element not found. Ending task.");
      clearInterval(intervals[tabId]);
      delete intervals[tabId];
      delete activeTabs[tabId];
      delete messageDelays[tabId];
      delete currentDelays[tabId];
      browser.alarms.clear(`loop-${tabId}`);
      return;
    }

    lastExtractedValue[tabId] = value;
    const num = parseInt(value.replace(/\D/g, "")) || 0;

    const desiredDelay = num > 0 ? 1 : messageDelays[tabId];
    const currentDelay = currentDelays[tabId];

    if (desiredDelay !== currentDelay) {
      console.log(`⏱️ Updating delay for tab ${tabId} to ${desiredDelay}s`);

      clearInterval(intervals[tabId]);

      intervals[tabId] = setInterval(() => {
        runLoop(tabId, maxArticles);
      }, desiredDelay * 1000);
      currentDelays[tabId] = desiredDelay;

      browser.alarms.create(`loop-${tabId}`, {
        delayInMinutes: desiredDelay / 60,
        periodInMinutes: desiredDelay / 60
      });
    }

    browser.tabs.sendMessage(tabId, { command: "runTask", maxArticles }).catch(() => {});
  }).catch((err) => {
    console.error("❌ Failed to communicate with content script:", err);
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;

  if (message.command === "start") {
    const delayInSeconds = message.delayInSeconds;
    const maxArticles = message.maxArticles;
    const delayInMinutes = Math.max(delayInSeconds / 60, 0.1);

    activeTabs[tabId] = true;
    articleLimits[tabId] = maxArticles;
    messageDelays[tabId] = delayInSeconds;
    currentDelays[tabId] = delayInSeconds;

    if (intervals[tabId]) {
      clearInterval(intervals[tabId]);
    }

    intervals[tabId] = setInterval(() => {
      runLoop(tabId, maxArticles);
    }, delayInSeconds * 1000);

    browser.alarms.create(`loop-${tabId}`, {
      delayInMinutes,
      periodInMinutes: delayInMinutes
    });

    sendResponse({ status: "started" });

  } else if (message.command === "stop") {
    clearInterval(intervals[tabId]);
    browser.alarms.clear(`loop-${tabId}`);
    delete intervals[tabId];
    delete activeTabs[tabId];
    delete articleLimits[tabId];
    delete messageDelays[tabId];
    delete currentDelays[tabId];
    sendResponse({ status: "stopped" });

  } else if (message.command === "checkStatus") {
    sendResponse({ status: activeTabs[tabId] ? "running" : "stopped" });

  } else if (message.command === "noSecondElement") {
    revisitURL(tabId);
  }

  return true;
});

browser.alarms.onAlarm.addListener((alarm) => {
  const match = alarm.name.match(/^loop-(\d+)$/);
  if (match) {
    const tabId = parseInt(match[1]);
    if (activeTabs[tabId]) {
      const maxArticles = articleLimits[tabId] || 9999;
      runLoop(tabId, maxArticles);
    }
  }
});
