/**
 * Ermac AJAX: a minimal promise-based XMLHttpRequest wrapper,
 * keeping cross-domain credentials and abortability of the old jQuery $.ajax calls.
 *
 * Returns a promise, additionally fitted with an .abort() method.
 * The promise resolves with the parsed response, or rejects with
 * {aborted: true} for aborted requests, or {status: N} otherwise.
 */

export function ajax(settings) {
  const xhr = new XMLHttpRequest();
  let url = settings.url;
  const type = (settings.type || 'GET').toUpperCase();
  let query = null;

  if (settings.data) {
    if (type === 'GET') {
      url += (url.indexOf('?') === -1 ? '?' : '&') + param(settings.data);
    } else {
      query = param(settings.data);
    }
  }

  const promise = new Promise(function (resolve, reject) {
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 0) return reject({ aborted: true, xhr: xhr });
      if (xhr.status >= 200 && xhr.status < 300) {
        let answer = xhr.responseText;
        if (
          settings.dataType === 'json' ||
          (settings.dataType !== 'text' &&
            (xhr.getResponseHeader('Content-Type') || '').indexOf('json') !==
              -1)
        ) {
          try {
            answer = JSON.parse(answer);
          } catch (e) {
            /* keep raw text */
          }
        }
        resolve(answer);
      } else {
        reject({ status: xhr.status, xhr: xhr });
      }
    };
    xhr.open(type, url);
    xhr.withCredentials = true;
    if (type === 'POST' && query) {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
    xhr.send(query);
  });

  promise.abort = function () {
    try {
      xhr.abort();
    } catch (e) {}
  };
  return promise;
}

/**
 * URL query serialization, mimicking jQuery $.param() exactly:
 * encodeURIComponent per key/value, null and undefined emitted as "key=",
 * NB spaces stay as %20 (the vendored jQuery does NOT convert them to '+').
 */

export function param(obj) {
  const parts = [];
  for (const key in obj) {
    parts.push(
      encodeURIComponent(key) +
        '=' +
        encodeURIComponent(obj[key] == null ? '' : obj[key]),
    );
  }
  return parts.join('&');
}

export function is_empty(obj) {
  if (!obj) return true;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}
