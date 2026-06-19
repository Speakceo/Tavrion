// SCORM 1.2 API Wrapper
var API = null;

function findAPI(win) {
  var attempts = 0;
  var maxAttempts = 500;

  while (win.API == null && win.parent != null && win.parent != win && attempts < maxAttempts) {
    attempts++;
    win = win.parent;
  }
  return win.API;
}

function getAPI() {
  if (API == null) {
    API = findAPI(window);
  }
  return API;
}

function initializeSCORM() {
  var api = getAPI();
  if (api) {
    var result = api.LMSInitialize("");
    console.log("[SCORM] LMSInitialize: " + result);
    return result === "true";
  }
  console.log("[SCORM] API not found, running in standalone mode");
  return false;
}

function finishSCORM() {
  var api = getAPI();
  if (api) {
    var result = api.LMSFinish("");
    console.log("[SCORM] LMSFinish: " + result);
    return result === "true";
  }
  return false;
}

function setValue(element, value) {
  var api = getAPI();
  if (api) {
    var result = api.LMSSetValue(element, value);
    console.log("[SCORM] LMSSetValue(" + element + ", " + value + "): " + result);
    return result === "true";
  }
  return false;
}

function getValue(element) {
  var api = getAPI();
  if (api) {
    var value = api.LMSGetValue(element);
    console.log("[SCORM] LMSGetValue(" + element + "): " + value);
    return value;
  }
  return "";
}

function commit() {
  var api = getAPI();
  if (api) {
    var result = api.LMSCommit("");
    console.log("[SCORM] LMSCommit: " + result);
    return result === "true";
  }
  return false;
}

// Initialize on load
window.addEventListener('load', function() {
  initializeSCORM();
});

// Finish on unload
window.addEventListener('beforeunload', function() {
  finishSCORM();
});
