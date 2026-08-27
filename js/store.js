window.RadarStore = (function () {
  var FAV_KEY = "airadar:v1:favorites";
  var STATUS_KEY = "airadar:v1:status";
  var memoryOnly = false;
  var memFavorites = [];
  var memStatus = {};

  try {
    window.localStorage.setItem("__airadar_test__", "1");
    window.localStorage.removeItem("__airadar_test__");
  } catch (e) {
    memoryOnly = true;
  }

  function readJSON(key, fallback) {
    if (memoryOnly) {
      return key === FAV_KEY ? memFavorites.slice() : Object.assign({}, memStatus);
    }
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    if (memoryOnly) {
      if (key === FAV_KEY) memFavorites = value;
      else memStatus = value;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      memoryOnly = true;
      if (key === FAV_KEY) memFavorites = value;
      else memStatus = value;
    }
  }

  function getFavorites() {
    var list = readJSON(FAV_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function isFavorite(id) {
    return getFavorites().indexOf(id) !== -1;
  }

  function toggleFavorite(id) {
    var list = getFavorites();
    var idx = list.indexOf(id);
    if (idx === -1) list.push(id);
    else list.splice(idx, 1);
    writeJSON(FAV_KEY, list);
    return idx === -1;
  }

  function getAllStatus() {
    var obj = readJSON(STATUS_KEY, {});
    return obj && typeof obj === "object" ? obj : {};
  }

  function getStatus(id) {
    var all = getAllStatus();
    return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : "";
  }

  function setStatus(id, status) {
    var all = getAllStatus();
    if (status) all[id] = status;
    else delete all[id];
    writeJSON(STATUS_KEY, all);
  }

  return {
    isMemoryOnly: function () { return memoryOnly; },
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getAllStatus: getAllStatus,
    getStatus: getStatus,
    setStatus: setStatus
  };
})();
