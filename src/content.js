"use strict";

/* global $, getSyncStorage, setStorage, getStorage, gitHubInjection */

const isPR = (path) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () => $(".js-menu-target img").attr("alt").slice(1) || "";
const isPrivate = () => $(".repo-private-label").length > 0;

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
  let currentNum = pathNameArr[4]; // 3390
  let repoPath = org + "/" + repo; // babel/babel-eslint
  let contributor = getContributor();

  let ret = {
    contributor,
    currentNum,
    repoPath
  };

  injectInitialUI(ret);

  return ret;
}

function buildUrl({base, q: {type, filterUser, author, repo, user}, sort, order, per_page, access_token}) {
  let query = `${base}?q=`;
  query += `${author ? `+author:${author}`: ""}`;
  query += `${repo ? `+repo:${repo}`: ""}`;
  query += `${user ? `+user:${user}`: ""}`;
  query += `${type ? `+type:${type}`: ""}`;
  query += `${filterUser ? `+-user:${filterUser}`: ""}`;
  query += `${access_token ? `&access_token=${access_token}`: ""}`;
  query += `${order ? `&order=${order}`: ""}`;
  query += `${per_page ? `&per_page=${per_page}`: ""}`;
  query += `${sort ? `&sort=${sort}`: ""}`;
  return query;
}

function contributorCount({access_token, contributor, user, repoPath, old = {}, type}) {
  let searchURL = buildUrl({
    access_token,
    base: "https://api.github.com/search/issues",
    order: "asc",
    per_page: "1",
    q: {
      type,
      author: contributor,
      repo: user ? undefined : repoPath,
      user: user
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
      lastUpdate: Date.now()
    };

    if (type === "pr") {
      obj.prs = json.total_count;
    } else if (type === "issue") {
      obj.issues = json.total_count;
    }

    if (json.items && json.items.length) {
      obj[`first${type[0].toUpperCase() + type.slice(1)}Number`] = json.items[0].number;
    }

    obj = Object.assign(old, obj);

    setStorage(contributor, repoPath, obj);

    return obj;
  });
}

function appendPRText(currentNum, repoInfo) {
  let {issues, prs, firstPrNumber, firstIssueNumber} = repoInfo;

  if (prs !== undefined) {
    let prText = `${prs} PRs`;
    if (firstPrNumber === +currentNum) {
      prText = "First PR";
      if (prs > 1) {
        prText += ` out of ${prs} (to the repo)`;
      }
    }
    repoInfo.prText = prText;
  }

  if (issues !== undefined) {
    let issueText = `${issues} Issues`;
    if (firstIssueNumber === +currentNum) {
      issueText = "First Issue";
      if (issues > 1) {
        issueText += ` out of ${issues} (to the repo)`;
      }
    }
    repoInfo.issueText = issueText;
  }

  return repoInfo;
}

function makeLabel(text) {
  return `<span class="timeline-comment-label">${text}</span>`;
}

function makeUpdateLabel(time) {
  return `<time datetime="${time}" is="relative-time"></time>`;
}

function injectInitialUI({ contributor, repoPath }) {
  let $elem = $(".timeline-comment-header-text").first();
  let prId = "gce-num-prs";
  let prText = makeLabel("Loading..");

  if ($(`#${prId}`).length) return;

  let issueId = "gce-num-issues";
  let issueText = makeLabel("Loading..");
  let updateText = makeLabel("🔄");

  $elem.before(`<a href="/${repoPath}/pulls?utf8=%E2%9C%93&q=is:both+is:pr+author:${contributor}" id="${prId}">${prText}</a>`);
  $elem.before(`<a href="/${repoPath}/issues?utf8=%E2%9C%93&q=is:both+is:issue+author:${contributor}" id="${issueId}">${issueText}</a>`);
  $elem.before(`<a style="cursor:pointer;" id="gce-update">${updateText}</a>`);
  $elem.before(`<a id="gce-update-time" class="timeline-comment-label">N/A</a>`);

  let $update = $("#gce-update");
  $update.dom[0].addEventListener("click", function() {
    setStorage(contributor, repoPath, {});
    update(getContributorInfo());
  });
}

function updateTextNodes({ prText, issueText, lastUpdate }) {
  let prNode = $("#gce-num-prs .timeline-comment-label");
  if (prNode.length) {
    prNode.text(prText);
  }

  let issueNode = $("#gce-num-issues .timeline-comment-label");
  if (issueNode.length) {
    issueNode.text(issueText);
  }

  let updateTime = $("#gce-update-time");
  if (updateTime && typeof lastUpdate === "number") {
    updateTime.html(`<span>Last Updated </span>${makeUpdateLabel(new Date(lastUpdate))}`);
  }
}

function update({ contributor, repoPath, currentNum }) {
  getStorage(contributor, repoPath)
  .then((storage) => {
    let storageRes = storage[contributor][repoPath];
    if (storageRes.prs || storageRes.issues) {
      updateTextNodes(appendPRText(currentNum, storageRes));
    } else {
      getSyncStorage({ "access_token": null })
      .then((res) => {
        Promise.all([
          contributorCount({ old: storageRes, access_token: res.access_token, type: "pr", contributor, repoPath}),
          contributorCount({ old: storageRes, access_token: res.access_token, type: "issue", contributor, repoPath})
        ])
        .then(([prInfo, issueInfo]) => {
          let repoInfo = Object.assign(prInfo, issueInfo);

          if (repoInfo.errors) {
            updateTextNodes(repoInfo.errors[0].message);
            return;
          }

          if (repoInfo.message) {
            // API rate limit exceeded for hzoo.
            if (repoInfo.message.indexOf(`API rate limit exceeded for ${getCurrentUser()}`) >= 0) {
              updateTextNodes("More than 30 req/min :D");
              return;
            }

            // API rate limit exceeded for x.x.x.x.
            // (But here's the good news: Authenticated requests get a higher rate limit.
            // Check out the documentation for more details.)
            if (repoInfo.message.indexOf("the good news") >= 0) {
              updateTextNodes("More than 10 req/min: Maybe add a access_token!");
              return;
            }
          }
          updateTextNodes(appendPRText(currentNum, repoInfo));
        });
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  gitHubInjection(window, () => {
    // if (isPrivate()) return;

    if (isPR(location.pathname) || isIssue(location.pathname)) {
      if (getContributor()) {
        update(getContributorInfo());
      }
    }
  });
});
