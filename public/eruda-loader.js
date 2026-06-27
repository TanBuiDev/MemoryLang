// Eruda Mobile DevTools loader — TEMPORARY, remove after debugging
// Activates only when ?debug is present in the URL
(function () {
  if (/[?&]debug\b/.test(location.search)) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js';
    s.onload = function () { eruda.init(); };
    document.body.appendChild(s);
  }
})();
