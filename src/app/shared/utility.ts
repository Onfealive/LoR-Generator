export function sortObjectByKey(unordered) {
  const ordered = {};
  Object.keys(unordered).sort().forEach(function (key) {
    ordered[key] = unordered[key];
  });

  return ordered;
}

const compareFunction = (a, b, keys, sortOrder = {}) => {
  let key = Array.isArray(keys) ? keys[0] : keys;
  let ascending = (sortOrder != undefined && sortOrder[key] != undefined) ? sortOrder[key] : true;
  keys = keys.slice(1);
  if (a[key] < b[key]) {
    return ascending ? -1 : 1;
  } else if (a[key] > b[key]) {
    return ascending ? 1 : -1;
  }

  return keys.length ? compareFunction(a, b, keys, sortOrder) : 0;
}

export function sortArrayByValues(sortable: Array<any>, keys: Array<string>, sortOrder = {}) {
  sortable.sort(function (a, b) {
    return compareFunction(a, b, keys, sortOrder);
  });

  return sortable;
}

export function sortObjectByValues(unordered: object, keys, sortOrder = {}) {
  let sortable = [];
  for (var item in unordered) {
    sortable.push([item, unordered[item]]);
  }

  sortable.sort(function (a, b) {
    return compareFunction(a[1], b[1], keys, sortOrder);
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

export function capitalize(input) {
  if (Array.isArray(input)) {
    return input.map(a => capitalize(a));
  }
  return (input || '').trim().toLowerCase().replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
}

export function camelize(str) {
  return str.trim().toLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

export function cleanNewline(str: string) {
  if (!str) {
    return str;
  }
  ['\r\n', '\r', '\n'].forEach(indicator => {
    str = str.split(indicator).map(s => s.trim()).join(' ');
  });

  return str;
}

export function cleanObject(obj) {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
      delete obj[propName];
    }
    if (Array.isArray(obj[propName]) && obj[propName].length === 0) {
      delete obj[propName];
    }

    if (typeof obj[propName] == 'string') {
      obj[propName] = obj[propName].trim();
    }
  }
  return obj;
}

export function unique(array: Array<any>) {
  return array.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });
}

export function numberFormat(no) {
  var str = no + '';
  var ar = [];
  var i = str.length - 1;

  while (i >= 0) {
    ar.push((str[i - 2] || '') + (str[i - 1] || '') + (str[i] || ''));
    i = i - 3;
  }
  return ar.reverse().join(',');
}