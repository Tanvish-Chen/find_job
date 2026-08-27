window.RadarData = (function () {
  var CONFIG = window.RadarConfig;
  var result = {
    ok: false,
    reason: "",
    companies: [],
    companyMap: {},
    jobs: [],
    updatedAt: null,
    skipped: 0
  };

  function isValidDate(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  function toStringArray(v) {
    if (!Array.isArray(v)) return [];
    return v.filter(function (x) {
      return typeof x === "string" && x.trim() !== "";
    });
  }

  function loadCompanies(list) {
    var valid = [];
    var map = {};
    list.forEach(function (c, i) {
      if (!c || typeof c.id !== "string" || c.id.trim() === "" ||
          typeof c.name !== "string" || c.name.trim() === "") {
        console.warn("companies.json 第 " + (i + 1) + " 条缺少 id 或 name，已跳过");
        result.skipped++;
        return;
      }
      if (map[c.id]) {
        console.warn("companies.json 中 id 重复：" + c.id + "，后一条已跳过");
        result.skipped++;
        return;
      }
      var item = {
        id: c.id,
        name: c.name,
        group: CONFIG.groups[c.group] ? c.group : "other",
        career_url: typeof c.career_url === "string" ? c.career_url : "",
        ats: typeof c.ats === "string" ? c.ats : "unknown",
        note: typeof c.note === "string" ? c.note : ""
      };
      valid.push(item);
      map[item.id] = item;
    });
    return { valid: valid, map: map };
  }

  function loadJobs(list, companyMap) {
    var seen = {};
    var valid = [];
    list.forEach(function (j, i) {
      var where = "jobs.json 第 " + (i + 1) + " 条";
      if (!j || typeof j.id !== "string" || j.id.trim() === "") {
        console.warn(where + "：缺少 id，已跳过");
        result.skipped++;
        return;
      }
      if (seen[j.id]) {
        console.warn(where + "：id 重复（" + j.id + "），已跳过");
        result.skipped++;
        return;
      }
      if (!companyMap[j.company_id]) {
        console.warn(where + "：company_id 无效（" + j.company_id + "），已跳过");
        result.skipped++;
        return;
      }
      if (typeof j.title !== "string" || j.title.trim() === "") {
        console.warn(where + "：缺少 title，已跳过");
        result.skipped++;
        return;
      }
      if (!CONFIG.directions[j.direction]) {
        console.warn(where + "：direction 无效（" + j.direction + "），已跳过");
        result.skipped++;
        return;
      }
      if (typeof j.apply_url !== "string" || j.apply_url.trim() === "") {
        console.warn(where + "：缺少 apply_url，已跳过");
        result.skipped++;
        return;
      }
      var deadline = null;
      if (j.deadline !== null && j.deadline !== undefined && j.deadline !== "") {
        if (!isValidDate(j.deadline)) {
          console.warn(where + "：deadline 格式错误（" + j.deadline + "），已跳过");
          result.skipped++;
          return;
        }
        deadline = j.deadline;
      }
      var diffLevel = j.difficulty && j.difficulty.level;
      if (CONFIG.difficulties.indexOf(diffLevel) === -1) {
        console.warn(where + "：difficulty.level 无效，已跳过");
        result.skipped++;
        return;
      }
      seen[j.id] = true;
      valid.push({
        id: j.id,
        company_id: j.company_id,
        title: j.title.trim(),
        direction: j.direction,
        skills: toStringArray(j.skills),
        degree: typeof j.degree === "string" ? j.degree : "不限",
        cities: toStringArray(j.cities),
        apply_url: j.apply_url.trim(),
        deadline: deadline,
        difficulty: {
          level: diffLevel,
          note: j.difficulty && typeof j.difficulty.note === "string" ? j.difficulty.note : ""
        },
        status: j.status === "closed" ? "closed" : "open",
        source: j.source === "official" ? "official" : "manual",
        fetched_at: isValidDate(j.fetched_at) ? j.fetched_at : null,
        headcount: typeof j.headcount === "number" ? j.headcount : null,
        note: typeof j.note === "string" ? j.note : ""
      });
    });
    return valid;
  }

  async function load() {
    if (location.protocol === "file:") {
      result.ok = false;
      result.reason = "file";
      return result;
    }
    try {
      var responses = await Promise.all([
        fetch("./data/companies.json", { cache: "no-store" }),
        fetch("./data/jobs.json", { cache: "no-store" })
      ]);
      if (!responses[0].ok || !responses[1].ok) {
        throw new Error("HTTP " + responses[0].status + "/" + responses[1].status);
      }
      var companyDoc = await responses[0].json();
      var jobDoc = await responses[1].json();
      var companyList = Array.isArray(companyDoc.companies) ? companyDoc.companies : [];
      var jobList = Array.isArray(jobDoc.jobs) ? jobDoc.jobs : [];
      var loaded = loadCompanies(companyList);
      result.companies = loaded.valid;
      result.companyMap = loaded.map;
      result.jobs = loadJobs(jobList, loaded.map);
      result.updatedAt = isValidDate(jobDoc.updated_at) ? jobDoc.updated_at : null;
      result.ok = true;
    } catch (e) {
      console.warn("数据加载失败：", e);
      result.ok = false;
      result.reason = "http";
    }
    return result;
  }

  return { load: load };
})();
