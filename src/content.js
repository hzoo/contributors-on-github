"use strict";

/* global chrome, getSyncStorage, setStorage, getStorage */

const isPR = (path) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () => document.querySelector('.js-menu-target img').alt.slice(1) || "";

function getContributor() {
  let contributorNode = document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text strong");
  if (contributorNode) {
    return contributorNode.innerText.trim();
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

  let headerNode =
  document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text");

  let ret = {
    contributor,
    currentPR,
    headerNode,
    repoPath
  };

  if (headerNode) {
    headerNode.style.maxWidth = "initial";
    injectPRText(ret);
    injectUpdateText(ret);
  }

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

function injectPRText({ contributor, headerNode, repoPath }) {
  if (!document.querySelector("#gce-num-prs")) {
    let linkNode = headerNode.appendChild(document.createElement("a"));
    linkNode.id = "gce-num-prs";
    linkNode.href =
    `https://github.com/${repoPath}/pulls?utf8=%E2%9C%93&q=is:both+is:pr+author:${contributor}`;
    linkNode.text = "Loading # of PRs...";
  }
}

function injectUpdateText({ contributor, headerNode, repoPath }) {
  if (!document.querySelector("#gce-update")) {
    let updateNode = headerNode.appendChild(document.createElement("a"));
    updateNode.style = "float: right";
    updateNode.id = "gce-update";
    updateNode.text = "[Update #PRs]";
    updateNode.addEventListener("click", function() {
      setStorage(contributor, repoPath, {
        prs: null
      });
      update(getContributorInfo());
    });
  }
}

function updatePRText(text) {
  let prText = document.querySelector("#gce-num-prs");
  if (prText) {
    prText.text = text;
  }
}

function update({ contributor, headerNode, repoPath, currentPR }) {
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
