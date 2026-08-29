(function () {
  var data = null;
  var state = { category: "", keyword: "" };
  var els = {};

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function visibleItems() {
    var kw = state.keyword.trim().toLowerCase();
    return data.items.filter(function (it) {
      if (state.category && it.category !== state.category) return false;
      if (kw) {
        var hay = (it.q + " " + it.a).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      return true;
    });
  }

  function catName(id) {
    for (var i = 0; i < data.categories.length; i++) {
      if (data.categories[i].id === id) return data.categories[i].name;
    }
    return id;
  }

  function renderChips() {
    var html = '<button type="button" class="chip' + (state.category === "" ? " active" : "") +
      '" data-cat="">全部</button>' +
      data.categories.map(function (c) {
        var n = data.items.filter(function (it) { return it.category === c.id; }).length;
        return '<button type="button" class="chip' + (state.category === c.id ? " active" : "") +
          '" data-cat="' + esc(c.id) + '">' + esc(c.name) + "（" + n + "）</button>";
      }).join("");
    els.catChips.innerHTML = html;
  }

  function renderItems() {
    var list = visibleItems();
    els.qaCount.textContent = "共 " + list.length + " 题";
    if (!list.length) {
      els.qaList.innerHTML = "";
      els.qaEmpty.classList.remove("hidden");
      return;
    }
    els.qaEmpty.classList.add("hidden");
    els.qaList.innerHTML = list.map(function (it) {
      return '<details class="qa-item">' +
        '<summary class="qa-q">' +
          '<span class="cat-tag">' + esc(catName(it.category)) + "</span>" +
          '<span class="qa-text">' + esc(it.q) + "</span>" +
          '<span class="freq-badge">' + esc(it.freq) + "</span>" +
        "</summary>" +
        '<div class="qa-a">' + esc(it.a) + "</div>" +
      "</details>";
    }).join("");
  }

  function renderResources() {
    els.resGrid.innerHTML = data.resources.map(function (r) {
      return '<a class="res-card" href="' + esc(r.url) + '" target="_blank" rel="noopener">' +
        '<span class="res-name">' + esc(r.name) + "</span>" +
        '<span class="res-meta">' + esc(r.lang) + " · " + esc(r.stars) + "★ · " + esc(r.license) + "</span>" +
        '<span class="res-desc">' + esc(r.desc) + "</span>" +
      "</a>";
    }).join("");
  }

  function bind() {
    els.catChips.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      state.category = chip.getAttribute("data-cat");
      renderChips();
      renderItems();
    });
    els.qaKeywordInput.addEventListener("input", function () {
      state.keyword = this.value;
      renderItems();
    });
  }

  async function init() {
    els = {
      catChips: $("catChips"),
      qaList: $("qaList"),
      qaEmpty: $("qaEmpty"),
      qaCount: $("qaCount"),
      qaKeywordInput: $("qaKeywordInput"),
      resGrid: $("resGrid"),
      resUpdatedAt: $("resUpdatedAt")
    };
    try {
      var res = await fetch("./data/interview.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      data = await res.json();
    } catch (e) {
      els.qaList.innerHTML = '<p class="load-error">题库加载失败。请通过 <code>py -m http.server 8000</code> 启动本地服务后访问，不要直接双击打开本文件。</p>';
      return;
    }
    els.resUpdatedAt.textContent = "题库更新于 " + (data.updated_at || "");
    bind();
    renderChips();
    renderItems();
    renderResources();
  }

  init();
})();
