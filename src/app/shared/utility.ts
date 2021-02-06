export function sortObjectByKey(unordered) {
  const ordered = {};
  Object.keys(unordered).sort().forEach(function (key) {
    ordered[key] = unordered[key];
  });

  return ordered;
}

export function sortObjectByValues(unordered, keys, ascending = true) {
  let sortable = [];
  for (var item in unordered) {
    sortable.push([item, unordered[item]]);
  }

  const compareFunction = (a, b, keys) => {
    let key = Array.isArray(keys) ? keys[0] : keys;
    keys = keys.slice(1);
    if (a[key] < b[key]) {
      return ascending ? -1 : 1;
    } else if (a[key] > b[key]) {
      return ascending ? 1 : -1;
    }

    return keys.length ? compareFunction(a, b, keys) : 0;
  }

  sortable.sort(function (a, b) {
    return compareFunction(a[1], b[1], keys);
  });

  let objSorted = {}
  sortable.forEach(function (item) {
    objSorted[item[0]] = item[1]
  })

  return objSorted;
}

export function isElement(obj) {
  try {
    //Using W3 DOM2 (works for FF, Opera and Chrome)
    return obj instanceof HTMLElement;
  }
  catch (e) {
    //Browsers not supporting W3 DOM2 don't have HTMLElement and
    //an exception is thrown and we end up here. Testing some
    //properties that all elements have (works on IE7)
    return (typeof obj === "object") &&
      (obj.nodeType === 1) && (typeof obj.style === "object") &&
      (typeof obj.ownerDocument === "object");
  }
}

export function capitalize(text) {
  text = (text || '').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function cleanObject(obj) {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
      delete obj[propName];
    }
    if (Array.isArray(obj[propName]) && obj[propName].length === 0) {
      delete obj[propName];
    }
  }
  return obj;
}
