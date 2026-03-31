(function() {
  if (window.__zhaopinFetcherHooked) return;
  window.__zhaopinFetcherHooked = true;

  function postPayload(url, data, source) {
    window.postMessage({
      type: 'ZHAOPIN_API_DATA',
      source,
      url,
      data
    }, '*');
  }

  var originalFetch = window.fetch;
  window.fetch = function() {
    var args = arguments;
    var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    var promise = originalFetch.apply(this, args);
    if (url && url.indexOf('fe-api.zhaopin.com/c/i/sou') !== -1) {
      promise.then(function(response) {
        var clone = response.clone();
        clone.json().then(function(data) {
          postPayload(url, data, 'main-world');
        }).catch(function() {
          // ignore malformed json
        });
      }).catch(function() {
        // ignore fetch failure
      });
    }

    return promise;
  };

  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, requestUrl) {
    this.__zhaopinUrl = requestUrl;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    var xhr = this;
    var url = xhr.__zhaopinUrl || '';

    if (url && url.indexOf('fe-api.zhaopin.com/c/i/sou') !== -1) {
      var originalOnLoad = xhr.onload;
      xhr.onload = function() {
        try {
          var data = JSON.parse(xhr.responseText);
          postPayload(url, data, 'main-world-xhr');
        } catch (e) {
          // ignore malformed json
        }
        if (originalOnLoad) originalOnLoad.apply(this, arguments);
      };
    }

    return originalSend.apply(this, arguments);
  };

  console.log('[ZhaopinScraper] MAIN world fetch/XHR hook 已注入');
})();
