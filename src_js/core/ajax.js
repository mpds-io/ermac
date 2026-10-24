/**
 * Ermac AJAX: a minimal promise-based XMLHttpRequest wrapper,
 * keeping cross-domain credentials and abortability of the old jQuery $.ajax calls.
 *
 * Returns a promise, additionally fitted with an .abort() method.
 * The promise resolves with the parsed response, or rejects with
 * {aborted: true} for requests cancelled via .abort(), or {status: N}
 * otherwise; NB a network failure (offline, refused, CORS) is status 0
 * but NOT an abort: like jQuery's textStatus 'error' vs 'abort'.
 */

export function ajax(settings) {
  const xhr = new XMLHttpRequest();
  let aborted = false;
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
      if (xhr.status === 0) return reject({ aborted: aborted, status: 0, xhr: xhr });
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
    aborted = true;
    try {
      xhr.abort();
    } catch (e) {}
  };
  return promise;
}

/**
 * URL query serialization, mimicking the vendored jQuery 3.7.1 $.param()
 * (traditional = false) exactly: encodeURIComponent per key/value, null and
 * undefined emitted as "key=", function values called, nested values
 * expanded like jQuery's buildParams(): arrays as key[]= (key[i]= for
 * object/array members), objects as key[name]=, a top-level array as
 * {name, value} pairs.
 * NB spaces stay as %20 (the vendored jQuery does NOT convert them to '+').
 * NB #inquiry hashes with a numeric search need inquiry_param() instead.
 */

const PARAM_RBRACKET = /\[\]$/;
const PARAM_NON_OBJECT_TAGS = [
  'Boolean', 'Number', 'String', 'Function', 'Array', 'Date', 'RegExp', 'Error', 'Symbol',
];

function param_is_object(value) {
  // jQuery's toType(value) === 'object'
  if (value == null || (typeof value !== 'object' && typeof value !== 'function')) return false;
  const tag = Object.prototype.toString.call(value).slice(8, -1);
  return PARAM_NON_OBJECT_TAGS.indexOf(tag) === -1;
}

function param_build(prefix, value, add) {
  if (Array.isArray(value)) {
    value.forEach(function (member, index) {
      if (PARAM_RBRACKET.test(prefix)) add(prefix, member);
      else
        param_build(
          prefix + '[' + (typeof member === 'object' && member != null ? index : '') + ']',
          member,
          add,
        );
    });
  } else if (!param_is_object(value)) {
    add(prefix, value);
  } else {
    for (const name in value) param_build(prefix + '[' + name + ']', value[name], add);
  }
}

export function param(obj) {
  const parts = [];
  const add = function (key, value) {
    const resolved = typeof value === 'function' ? value() : value;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(resolved == null ? '' : resolved));
  };
  if (obj == null) return '';
  if (Array.isArray(obj)) {
    obj.forEach(function (item) {
      add(item.name, item.value);
    });
  } else {
    for (const key in obj) param_build(key, obj[key], add);
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
