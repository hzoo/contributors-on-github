"use strict";

/* global chrome, getSyncStorage, setStorage, getStorage */

const isPR = (path) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () => $('.js-menu-target img').attr('alt').slice(1) || "";

function getContributor() {
  let $contributor = $(".timeline-comment-wrapper .timeline-comment-header-text strong");
  if ($contributor.length) {
    return $contributor.first().text().trim();
  }
}

function getContributorInfo() {
  // "/babel/babel-eslint/pull/1"
  let pathNameArr = location.pathname.split("/");
  let org = pathNameArr[1]; // babel
  let repo = pathNameArr[2]; // babel-eslint
  let currentPR = pathNameArr[4]; // 3390
  let repoPath = org + "/" + repo; // babel/babel-eslint
  let contributor = getContributor();

  let ret = {
    contributor: getContributor(),
    currentPR,
    repoPath
  };

  injectInitialUI(ret);

  return ret;
}

function buildUrl({base, q: {type, filterUser, author, repo}, sort, order, per_page, access_token}) {
  let query = `${base}?q=`;
  query += `${author ? `+author:${author}`: ""}`;
  query += `${repo ? `+repo:${repo}`: ""}`;
  query += `${type ? `+type:${type}`: ""}`;
  query += `${filterUser ? `+-user:${filterUser}`: ""}`;
  query += `${access_token ? `&access_token=${access_token}`: ""}`;
  query += `${order ? `&order=${order}`: ""}`;
  query += `${per_page ? `&per_page=${per_page}`: ""}`;
  query += `${sort ? `&sort=${sort}`: ""}`;
  return query;
}

function contributorCount({access_token, contributor, repoPath, type}) {
  let searchURL = buildUrl({
    access_token,
    base: "https://api.github.com/search/issues",
    order: "asc",
    per_page: "1",
    q: {
      type,
      author: contributor,
      repo: repoPath
    },
    sort: "created"
  });

  return fetch(searchURL)
  .then((res) => res.json())
  .then(function(json) {
    if (json.errors || json.message) {
      return json;
    }

    let obj = {
      prs: json.total_count,
      lastUpdate: Date.now()
    };

    if (json.items && json.items.length) {
      obj.firstPRNumber = json.items[0].number;
    }

    if (obj.prs) {
      setStorage(contributor, repoPath, obj);
    }

    return obj;
  });
}

function appendPRText(currentPR, repoInfo) {
  let {prs, firstPRNumber} = repoInfo;
  let text = `${prs} PRs`;

  if (firstPRNumber === +currentPR) {
    text = "First PR";
    if (prs > 1) {
      text += ` out of ${prs} (to the repo)`;
    }
  }

  repoInfo.text = text;
  return repoInfo;
}

function makeLabel(text) {
  return `<span class="timeline-comment-label">${text}</span>`;
}

function makeUpdateLabel(time) {
  return `<time datetime="${time}" is="relative-time"></time>`;
}

function injectInitialUI({ contributor, repoPath }) {
  if ($("#gce-num-prs").length) return;

  let $elem = $(".timeline-comment-header-text").first();
  let id = "gce-num-prs";
  let prText = makeLabel("Loading # of PRs..");
  let updateText = makeLabel("🔄 PRs");

  if (!$(id).length) {
    $elem.before(`<a href="/${repoPath}/pulls?utf8=%E2%9C%93&q=is:both+is:pr+author:${contributor}" id="${id}">${prText}</a>`);
    $elem.before(`<a style="cursor:pointer;" id="gce-update">${updateText}</a>`);
    $elem.before(`<a id="gce-update-time" class="timeline-comment-label">N/A</a>`);

    let $update = $("#gce-update");
    $update.dom[0].addEventListener("click", function() {
      setStorage(contributor, repoPath, {});
      update(getContributorInfo());
    });
  }
}

function updatePRText({ text, lastUpdate }) {
  let prText = $("#gce-num-prs .timeline-comment-label");
  if (prText.length) {
    prText.text(text);
  }
  let updateTime = $("#gce-update-time");
  if (updateTime && typeof lastUpdate === "number") {
    updateTime.html(`<span>Last Updated </span>${makeUpdateLabel(new Date(lastUpdate))}`);
  }
}

function update({ contributor, repoPath, currentPR }) {
  getStorage(contributor, repoPath)
  .then((storage) => {
    let storageRes = storage[contributor][repoPath];
    if (storageRes.prs) {
      updatePRText(appendPRText(currentPR, storageRes));
    } else {
      getSyncStorage({ "access_token": null })
      .then((res) => {
        contributorCount({ access_token: res.access_token, type: "pr", contributor, repoPath})
        .then((repoInfo) => {
          if (repoInfo.errors) {
            updatePRText(repoInfo.errors[0].message);
            return;
          }

          if (repoInfo.message) {
            // API rate limit exceeded for hzoo.
            if (repoInfo.message.indexOf(`API rate limit exceeded for ${getCurrentUser()}`) >= 0) {
              updatePRText("More than 30 req/min :D");
              return;
            }

            // API rate limit exceeded for x.x.x.x.
            // (But here's the good news: Authenticated requests get a higher rate limit.
            // Check out the documentation for more details.)
            if (repoInfo.message.indexOf("the good news") >= 0) {
              updatePRText("More than 10 req/min: Maybe add a access_token!");
              return;
            }
          }
          updatePRText(appendPRText(currentPR, repoInfo));
        });
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  gitHubInjection(window, () => {
    if (isPR(location.pathname) || isIssue(location.pathname)) {
      if (getContributor()) {
        update(getContributorInfo());
      }
    };
  });
});
