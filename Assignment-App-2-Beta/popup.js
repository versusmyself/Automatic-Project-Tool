document.addEventListener('DOMContentLoaded', function () {
    const startBtn = document.getElementById('startBtn');
    const inputValue = document.getElementById('numberInput');
  
    // Check if the process is still running when the popup is opened
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const activeTab = tabs[0];
      browser.runtime.sendMessage({ command: 'checkStatus', tabId: activeTab.id }).then((response) => {
        if (response && response.status === 'running') {
          // Set the button to Stop if the process is still running
          startBtn.innerText = "Stop";
          startBtn.style.backgroundColor = "#FF0000";  // Red for Stop
        }
      });
    });
  
    startBtn.addEventListener('click', function () {
      if (startBtn.innerText === "Start") {
        const delayInSeconds = parseInt(inputValue.value);
  
        if (delayInSeconds > 0) {
          // Start the process
          browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            const activeTab = tabs[0];
            browser.runtime.sendMessage({
              command: 'start',
              tabId: activeTab.id,
              delayInSeconds: delayInSeconds
            });
  
            // Change button to Stop
            startBtn.innerText = "Stop";
            startBtn.style.backgroundColor = "#FF0000";  // Red for Stop
          });
        } else {
          console.log('Please enter a valid number.');
        }
      } else {
        // Stop the process
        browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          const activeTab = tabs[0];
          browser.runtime.sendMessage({ command: 'stop', tabId: activeTab.id });
  
          // Change button to Start
          startBtn.innerText = "Start";
          startBtn.style.backgroundColor = "#4CAF50";  // Green for Start
        });
      }
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message.command === "displayValue") {
        const displayEl = document.getElementById("valueDisplay");
        if (displayEl) {
          displayEl.textContent = "Value: " + message.value;
        }
      }
    });
    
  });
  