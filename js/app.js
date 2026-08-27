(function () {
  var CONFIG = window.RadarConfig;
  var Store = window.RadarStore;

  var els = {};
  var data = null;

  var state = {
    direction: "",
    city: "",
    company: "",
    group: "",
    applyStatus: "",
    keyword: "",
    onlyUrgent: false,
    onlyFavorites: false,
    hideClosed: true,
    sort: "deadline"
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function parseDate(s) {
    var p = s.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function todayMidnight() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function daysLeft(deadline) {
    return Math.round((parseDate(deadline) - todayMidnight()) / 86400000);
  }

  function deadlineSortKey(job) {
    if (job.status !== "open" || !job.deadline) return Infinity;
    if (daysLeft(job.deadline) < 0) return Infinity;
    return parseDate(job.deadline).getTime();
  }

  function compareJobs(a, b) {
    if (state.sort === "deadline") {
      var ka = deadlineSortKey(a);
      var kb = deadlineSortKey(b);
      if (ka !== kb) return ka - kb;
      return a.title.localeCompare(b.title, "zh");
    }
    if (state.sort === "added") {
      var fa = a.fetched_at || "";
      var fb = b.fetched_at || "";
      if (fa !== fb) return fa < fb ? 1 : -1;
      return a.title.localeCompare(b.title, "zh");
    }
    var ca = data.companyMap[a.company_id].name;
    var cb = data.companyMap[b.company_id].name;
    var c = ca.localeCompare(cb, "zh");
    if (c !== 0) return c;
    return a.title.localeCompare(b.title, "zh");
  }

  function matchKeyword(job, company, kw) {
    var hay = [
      job.title,
      company.name,
      CONFIG.directions[job.direction],
      job.cities.join(" "),
      job.skills.join(" ")
    ].join(" ").toLowerCase();
    return hay.indexOf(kw) !== -1;
  }

  function getVisibleJobs() {
    var kw = state.keyword.trim().toLowerCase();
    return data.jobs.filter(function (job) {
      var company = data.companyMap[job.company_id];
      if (!company) return false;
      if (state.hideClosed && job.status !== "open") return false;
      if (state.direction && job.direction !== state.direction) return false;
      if (state.group && company.group !== state.group) return false;
      if (state.company && job.company_id !== state.company) return false;
      if (state.city && job.cities.indexOf(state.city) === -1) return false;
      if (state.applyStatus) {
        var st = Store.getStatus(job.id);
        if (state.applyStatus === "none") {
          if (st !== "") return false;
        } else if (st !== state.applyStatus) {
          return false;
        }
      }
      if (state.onlyFavorites && !Store.isFavorite(job.id)) return false;
      if (state.onlyUrgent) {
        if (job.status !== "open" || !job.deadline) return false;
        var d = daysLeft(job.deadline);
        if (d < 0 || d > CONFIG.urgentDays) return false;
      }
      if (kw && !matchKeyword(job, company, kw)) return false;
      return true;
    }).sort(compareJobs);
  }

  function deadlineText(job) {
    if (!job.deadline) return "滚动招聘";
    if (job.status !== "open") return "已关闭";
    var d = daysLeft(job.deadline);
    if (d < 0) return "已截止 " + job.deadline;
    if (d === 0) return "今天截止（" + job.deadline + "）";
    return "截止 " + job.deadline + "（剩 " + d + " 天）";
  }

  function cardClass(job) {
    var cls = "job-card";
    if (job.status !== "open" || (job.deadline && daysLeft(job.deadline) < 0)) {
      cls += " closed";
    } else if (job.deadline && daysLeft(job.deadline) <= CONFIG.urgentDays) {
      cls += " urgent";
    }
    return cls;
  }

  function renderCard(job) {
    var company = data.companyMap[job.company_id];
    var fav = Store.isFavorite(job.id);
    var st = Store.getStatus(job.id);
    var cities = job.cities.length ? job.cities.join(" · ") : "未注明";
    var degree = job.degree === "不限" ? "学历不限" : job.degree + "及以上";
    var skillTags = job.skills.map(function (s) {
      return '<span class="tag skill">' + esc(s) + "</span>";
    }).join("");
    var urgentTag = "";
    if (cardClass(job).indexOf("urgent") !== -1) {
      urgentTag = '<span class="urgent-tag">剩 ' + daysLeft(job.deadline) + " 天</span>";
    }
    var statusOptions = '<option value="">未投</option>' +
      Object.keys(CONFIG.applyStatus).map(function (k) {
        return '<option value="' + k + '"' + (st === k ? " selected" : "") + ">" +
          esc(CONFIG.applyStatus[k]) + "</option>";
      }).join("");

    return '<article class="' + cardClass(job) + '" data-id="' + esc(job.id) + '">' +
      '<div class="job-head">' +
        '<span class="company-badge">' + esc(company.name.slice(0, 1)) + "</span>" +
        '<div class="job-title-line">' +
          "<h3>" + esc(job.title) + "</h3>" +
          '<div class="job-company">' + esc(company.name) + " · " +
            esc(CONFIG.groups[company.group] || company.group) + "</div>" +
        "</div>" +
        urgentTag +
        '<button type="button" class="fav-btn' + (fav ? " active" : "") +
          '" aria-pressed="' + fav + '" title="收藏职位">' + (fav ? "★" : "☆") + "</button>" +
      "</div>" +
      '<div class="job-tags">' +
        '<span class="tag direction">' + esc(CONFIG.directions[job.direction]) + "</span>" +
        skillTags +
      "</div>" +
      '<div class="job-meta">' +
        "<span>城市：" + esc(cities) + "</span>" +
        "<span>学历：" + esc(degree) + "</span>" +
        '<span class="deadline-text">' + esc(deadlineText(job)) + "</span>" +
        '<span class="difficulty difficulty-' +
          ({ "高": "high", "中": "mid", "低": "low" }[job.difficulty.level] || "mid") +
          '">难度 ' + esc(job.difficulty.level) +
          (job.difficulty.note ? " — " + esc(job.difficulty.note) : "") + "</span>" +
      "</div>" +
      '<div class="job-actions">' +
        '<a class="apply-btn" href="' + esc(job.apply_url) +
          '" target="_blank" rel="noopener">立即投递 ↗</a>' +
        '<label class="status-label">投递状态 ' +
          '<select class="status-select">' + statusOptions + "</select>" +
        "</label>" +
      "</div>" +
    "</article>";
  }

  function render() {
    var visible = getVisibleJobs();
    els.resultCount.textContent = "共 " + visible.length + " 个岗位";
    if (visible.length === 0) {
      els.jobList.innerHTML = "";
      els.emptyState.classList.remove("hidden");
    } else {
      els.emptyState.classList.add("hidden");
      els.jobList.innerHTML = visible.map(renderCard).join("");
    }
  }

  function buildFilterOptions() {
    var directionOpts = '<option value="">全部方向</option>' +
      Object.keys(CONFIG.directions).map(function (k) {
        return '<option value="' + k + '">' + esc(CONFIG.directions[k]) + "</option>";
      }).join("");
    els.directionFilter.innerHTML = directionOpts;

    var groupOpts = '<option value="">全部类别</option>' +
      Object.keys(CONFIG.groups).map(function (k) {
        return '<option value="' + k + '">' + esc(CONFIG.groups[k]) + "</option>";
      }).join("");
    els.groupFilter.innerHTML = groupOpts;

    var statusOpts = '<option value="">全部状态</option><option value="none">未投</option>' +
      Object.keys(CONFIG.applyStatus).map(function (k) {
        return '<option value="' + k + '">' + esc(CONFIG.applyStatus[k]) + "</option>";
      }).join("");
    els.statusFilter.innerHTML = statusOpts;

    var citySet = {};
    data.jobs.forEach(function (j) {
      j.cities.forEach(function (c) { citySet[c] = true; });
    });
    var cities = Object.keys(citySet).sort(function (a, b) {
      return a.localeCompare(b, "zh");
    });
    els.cityFilter.innerHTML = '<option value="">全部城市</option>' +
      cities.map(function (c) {
        return '<option value="' + esc(c) + '">' + esc(c) + "</option>";
      }).join("");

    var companies = data.companies.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, "zh");
    });
    els.companyFilter.innerHTML = '<option value="">全部公司</option>' +
      companies.map(function (c) {
        return '<option value="' + esc(c.id) + '">' + esc(c.name) + "</option>";
      }).join("");
  }

  function bindEvents() {
    els.directionFilter.addEventListener("change", function () {
      state.direction = this.value; render();
    });
    els.cityFilter.addEventListener("change", function () {
      state.city = this.value; render();
    });
    els.companyFilter.addEventListener("change", function () {
      state.company = this.value; render();
    });
    els.groupFilter.addEventListener("change", function () {
      state.group = this.value; render();
    });
    els.statusFilter.addEventListener("change", function () {
      state.applyStatus = this.value; render();
    });
    els.sortSelect.addEventListener("change", function () {
      state.sort = this.value; render();
    });
    els.keywordInput.addEventListener("input", function () {
      state.keyword = this.value; render();
    });
    els.onlyUrgent.addEventListener("change", function () {
      state.onlyUrgent = this.checked; render();
    });
    els.onlyFavorites.addEventListener("change", function () {
      state.onlyFavorites = this.checked; render();
    });
    els.hideClosed.addEventListener("change", function () {
      state.hideClosed = this.checked; render();
    });

    function resetFilters() {
      state = {
        direction: "", city: "", company: "", group: "", applyStatus: "",
        keyword: "", onlyUrgent: false, onlyFavorites: false,
        hideClosed: true, sort: state.sort
      };
      els.directionFilter.value = "";
      els.cityFilter.value = "";
      els.companyFilter.value = "";
      els.groupFilter.value = "";
      els.statusFilter.value = "";
      els.keywordInput.value = "";
      els.onlyUrgent.checked = false;
      els.onlyFavorites.checked = false;
      els.hideClosed.checked = true;
      render();
    }
    els.resetBtn.addEventListener("click", resetFilters);
    els.emptyResetBtn.addEventListener("click", resetFilters);

    els.jobList.addEventListener("click", function (e) {
      var card = e.target.closest(".job-card");
      if (!card) return;
      var id = card.getAttribute("data-id");
      if (e.target.closest(".fav-btn")) {
        Store.toggleFavorite(id);
        render();
        return;
      }
      if (e.target.closest(".apply-btn")) {
        if (Store.getStatus(id) === "" &&
            window.confirm("已将投递链接在新标签页打开。要把这条岗位标记为「已投」吗？")) {
          Store.setStatus(id, "applied");
          render();
        }
      }
    });

    els.jobList.addEventListener("change", function (e) {
      if (e.target.classList.contains("status-select")) {
        var card = e.target.closest(".job-card");
        if (!card) return;
        Store.setStatus(card.getAttribute("data-id"), e.target.value);
        render();
      }
    });
  }

  function showGuide(reason) {
    document.querySelector(".toolbar").classList.add("hidden");
    els.jobList.classList.add("hidden");
    els.guidePanel.classList.remove("hidden");
    els.guideReason.textContent = reason === "file"
      ? "你是通过双击 index.html 打开的（file:// 协议），浏览器禁止在这种方式下加载 JSON 数据文件。"
      : "数据文件加载失败。请确认通过 HTTP 服务访问，且 data/ 目录下存在 companies.json 和 jobs.json。";
    document.querySelector(".guide-panel pre").textContent = "py -m http.server 8000";
  }

  async function init() {
    els = {
      updatedAt: $("updatedAt"),
      warnBanner: $("warnBanner"),
      keywordInput: $("keywordInput"),
      directionFilter: $("directionFilter"),
      cityFilter: $("cityFilter"),
      companyFilter: $("companyFilter"),
      groupFilter: $("groupFilter"),
      statusFilter: $("statusFilter"),
      sortSelect: $("sortSelect"),
      onlyUrgent: $("onlyUrgent"),
      onlyFavorites: $("onlyFavorites"),
      hideClosed: $("hideClosed"),
      resultCount: $("resultCount"),
      resetBtn: $("resetBtn"),
      emptyResetBtn: $("emptyResetBtn"),
      jobList: $("jobList"),
      emptyState: $("emptyState"),
      guidePanel: $("guidePanel"),
      guideReason: $("guideReason")
    };

    data = await window.RadarData.load();
    if (!data.ok) {
      showGuide(data.reason);
      return;
    }

    els.updatedAt.textContent = data.updatedAt
      ? "数据更新于 " + data.updatedAt
      : "数据更新时间未知";

    if (data.skipped > 0) {
      els.warnBanner.textContent = "有 " + data.skipped +
        " 条数据存在问题已被跳过，请检查 data/jobs.json 或 data/companies.json（详见浏览器控制台）";
      els.warnBanner.classList.remove("hidden");
    }

    buildFilterOptions();
    bindEvents();
    render();
  }

  init();
})();
