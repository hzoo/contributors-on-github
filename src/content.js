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

function prCount({access_token, contributor, repoPath}) {
  let searchURL = buildUrl({
    access_token,
    base: "https://api.github.com/search/issues",
    order: "asc",
    per_page: "1",
    q: {
      type: "pr",
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
      prs: json.total_count
    };

    if (json.items && json.items.length) {
      obj.firstPRNumber = json.items[0].number;
    }

    if (obj.prs) {
      setStorage(contributor, repoPath, {
        prs: obj.prs,
        firstPRNumber: obj.firstPRNumber
      });
    }

    return obj;
  });
}

function setPRText(currentPR, repoInfo) {
  let {prs, firstPRNumber} = repoInfo;
  let PRText = `${prs} PRs `;

  if (firstPRNumber === +currentPR) {
    PRText = "First PR";
    if (prs > 1) {
      PRText += ` out of ${prs} (to the repo)`;
    }
  }

  return PRText;
}

function makeLabel(text) {
  return `<span class="timeline-comment-label">${text}</span>`;
}

function injectInitialUI({ contributor, repoPath }) {
  if ($("#gce-num-prs").length) return;

  let $elem = $(".timeline-comment-header-text").first();
  let id = "gce-num-prs";
  let prText = makeLabel("Loading # of PRs...");
  let updateText = makeLabel("Update PRs");

  if (!$(id).length) {
    $elem.before(`<a href="/${repoPath}/pulls?utf8=%E2%9C%93&q=is:both+is:pr+author:${contributor}" id="${id}">${prText}</a>`);
    $elem.before(`<a style="cursor:pointer;" id="gce-update">${updateText}</a>`);

    let $update = $("#gce-update");
    $update.dom[0].addEventListener("click", function() {
      setStorage(contributor, repoPath, {
        prs: null
      });
      update(getContributorInfo());
    });
  }
}

function updatePRText(text) {
  let prText = $("#gce-num-prs .timeline-comment-label");
  if (prText.length) {
    prText.text(text);
  }
}

function update({ contributor, repoPath, currentPR }) {
  getStorage(contributor, repoPath)
  .then((storage) => {
    let storageRes = storage[contributor][repoPath];
    if (storageRes.prs) {
      updatePRText(setPRText(currentPR, storageRes));
    } else {
      getSyncStorage({ "access_token": null })
      .then((res) => {
        prCount({ access_token: res.access_token, contributor, repoPath})
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
          updatePRText(setPRText(currentPR, repoInfo));
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
