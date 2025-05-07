let isRunning = false;
let articlesClicked = 0;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Message received in content script:", message);

  if (message.command === "checkElement") {
    const el = document.querySelector("div.alert.alert-info strong");
    if (el) {
      el.style.color = "red";
      return Promise.resolve(el.textContent.trim());
    } else {
      return Promise.resolve(null);
    }
  }

  if (message.command === "runTask") {
    isRunning = true;
    attemptClickWithRetry(message.maxArticles);
  } else if (message.command === "stopTask") {
    isRunning = false;
  } else if (message.command === "extractCount") {
    const el = document.querySelector("div.alert.alert-info strong");
    const value = el ? el.textContent.trim() : null;
    sendResponse({ value });
  }

  return true; // allow async sendResponse or Promise
});



browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Message received in content script:", message);

  if (message.command === "runTask") {
    isRunning = true;
    attemptClickWithRetry(message.maxArticles);
  } else if (message.command === "stopTask") {
    isRunning = false;
  } else if (message.command === "extractCount") {
    const el = document.querySelector("div.alert.alert-info strong");
    const value = el ? el.textContent.trim() : null;
    sendResponse({ value });
  }

  return true; // allow async sendResponse
});

// Function to find and click elements with retries using XPath
function attemptClickWithRetry(maxArticles) {
  if (!isRunning) {
    console.log("⛔ Not running. Skipping attemptClickWithRetry.");
    return;
  }

  const maxAttempts = 5;
  let attempts = 0;

  const retryInterval = setInterval(() => {
    attempts++;
    console.log(`🔁 Attempt ${attempts} to click the select assignment button`);

    try {
      const selectAssignmentBtn = document.evaluate(
        '//*[@id="selectassignmentbtn"]',
        document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
      ).singleNodeValue;

      if (selectAssignmentBtn) {
        selectAssignmentBtn.scrollIntoView();
        selectAssignmentBtn.click();
        console.log("✅ Clicked the select assignment button");

        const submitBtn1 = document.evaluate(
          "//input[@name='submit' and @type='submit' and @class='h-btn btn--primary btn--small' and @value='Select']",
          document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;

        const submitBtn2 = document.evaluate(
          "//input[@class='h-btn btn--primary btn--small' and @name='submit' and @type='submit' and @value='Select']",
          document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;

        const submitBtn = submitBtn1 || submitBtn2;

        if (submitBtn) {
          console.log("➡️ Found submit button. Clicking it.");
          setTimeout(() => {
            submitBtn.click();
            articlesClicked++;
            console.log("🆗 Clicked submit. Total clicked:", articlesClicked);

            if (articlesClicked >= maxArticles) {
              clearInterval(retryInterval);
              isRunning = false;
              console.log("✅ Max articles reached. Stopping.");
            }
          }, 500);
        } else {
          console.warn("⚠️ Submit button not found. Refreshing.");
          clearInterval(retryInterval);
          browser.runtime.sendMessage({ command: "noSecondElement" });
        }
      } else {
        console.log("⏳ Select assignment button not found. Will retry...");
      }

      if (attempts >= maxAttempts) {
        console.warn("❌ Max attempts reached. Giving up.");
        clearInterval(retryInterval);
      }
    } catch (err) {
      console.error("💥 Error during attempt:", err);
      clearInterval(retryInterval);
    }
  }, 1000);
}
