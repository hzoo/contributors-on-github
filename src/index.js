"use strict";

/* global chrome, getSyncStorage, setStorage, getStorage */

let ORG, REPO, CURRENT_PR, ORG_REPO_PATH, FIRST_HEADER, LOGGED_IN_USER, CONTRIBUTOR;

function loadConsts() {
  // "/babel/babel-eslint/pull/1"
  let pathNameArr = window.location.pathname.split("/");
  ORG = pathNameArr[1]; // babel
  REPO = pathNameArr[2]; // babel-eslint
  CURRENT_PR = pathNameArr[4]; // 3390
  ORG_REPO_PATH = ORG + "/" + REPO; // babel/babel-eslint

  FIRST_HEADER =
  document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text");
  if (FIRST_HEADER) {
    FIRST_HEADER.style.maxWidth = "initial";
  }

  LOGGED_IN_USER =
  document.querySelector(".js-menu-target").getAttribute("href").slice(1) || "";

  CONTRIBUTOR =
  document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text strong");

  if (CONTRIBUTOR) {
    CONTRIBUTOR = CONTRIBUTOR.innerText.trim();
  }

  if (!document.querySelector("#gce-num-prs")) {
    let linkNode = FIRST_HEADER.appendChild(document.createElement("a"));
    linkNode.id = "gce-num-prs";
    linkNode.href =
    `https://github.com/${ORG_REPO_PATH}/pulls?utf8=%E2%9C%93&q=is%3Aboth+is%3Apr+author%3A${CONTRIBUTOR}`;
    linkNode.text = "Loading # of PRs...";
  }
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

function prCount(access_token) {
  let searchURL = buildUrl({
    access_token,
    base: "https://api.github.com/search/issues",
    order: "asc",
    per_page: "1",
    q: {
      type: "pr",
      author: CONTRIBUTOR,
      repo: ORG_REPO_PATH
    },
    sort: "created"
  });

  return fetch(searchURL)
  .then((res) => res.json())
  .then(function(json) {
    if (json.errors) {
      return json;
    }

    let obj = {
      prs: json.total_count
    };

    if (json.items && json.items.length) {
      obj.firstPRNumber = json.items[0].number;
    }

    setStorage(CONTRIBUTOR, ORG_REPO_PATH, {
      prs: obj.prs,
      firstPRNumber: obj.firstPRNumber
    });

    return obj;
  });
}

function showInfo(repoInfo) {
  let repoPrs = repoInfo.prs;
  let repoText = `${repoPrs} PRs `;

  if (repoInfo.firstPRNumber === +CURRENT_PR) {
    repoText = "First PR";
    if (repoPrs > 1) {
      repoText += ` out of ${repoPrs} (to the repo)`;
    }
  }

  addContributorInfo(repoText);
}

function addContributorInfo(text) {
  let linkNode = document.querySelector("#gce-num-prs");
  linkNode.text = text;

  if (!document.querySelector("#gce-update")) {
    let updateNode = FIRST_HEADER.appendChild(document.createElement("a"));
    updateNode.style = "float: right";
    updateNode.id = "gce-update";
    updateNode.text = "[Update #PRs]";
    updateNode.addEventListener("click", function() {
      setStorage(CONTRIBUTOR, ORG_REPO_PATH, {
        prs: null
      });
      update();
    });
  }
}

function update() {
  getStorage(CONTRIBUTOR, ORG_REPO_PATH)
  .then((storage) => {
    let storageRes = storage[CONTRIBUTOR][ORG_REPO_PATH];
    if (storageRes.prs) {
      showInfo(storageRes);
    } else {
      getSyncStorage({ "access_token": null })
      .then((res) => {
        prCount(res.access_token)
        .then((repoInfo) => {
          if (repoInfo.errors) {
            addContributorInfo(repoInfo.errors[0].message);
            return;
          }
          showInfo(repoInfo);
        });
      });
    }
  });
}

if (window.location.href.match(/https?:\/\/(www\.)?github\.com\/[\w-.]+\/[\w-.]+\/pull\/\d+/)) {
  loadConsts();
  if (CONTRIBUTOR) update();
}

chrome.runtime.onMessage.addListener(() => {
  // not sure why it fires 2 onHistoryStateUpdated updates
  // the first one is before DOM loads?
  if (document.querySelector(".timeline-comment-wrapper")) {
    loadConsts();
    if (CONTRIBUTOR) update();
  }
});
