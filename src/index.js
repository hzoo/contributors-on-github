"use strict";

/* global chrome, getSyncStorage, setStorage, getStorage */

const path = location.pathname;
const isPR = () => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = () => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);

let CURRENT_PR, ORG_REPO_PATH, FIRST_HEADER, CONTRIBUTOR;

function loadConsts() {
  // "/babel/babel-eslint/pull/1"
  let pathNameArr = window.location.pathname.split("/");
  let ORG = pathNameArr[1]; // babel
  let REPO = pathNameArr[2]; // babel-eslint
  CURRENT_PR = pathNameArr[4]; // 3390
  ORG_REPO_PATH = ORG + "/" + REPO; // babel/babel-eslint

  CONTRIBUTOR =
  document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text strong");

  if (CONTRIBUTOR) {
    CONTRIBUTOR = CONTRIBUTOR.innerText.trim();
  }

  FIRST_HEADER =
  document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text");
  if (FIRST_HEADER) {
    FIRST_HEADER.style.maxWidth = "initial";
    injectPRText(FIRST_HEADER);
    injectUpdateText(FIRST_HEADER);
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

function setPRText(repoInfo) {
  let {prs, firstPRNumber} = repoInfo;
  let PRText = `${prs} PRs `;

  if (firstPRNumber === +CURRENT_PR) {
    PRText = "First PR";
    if (prs > 1) {
      PRText += ` out of ${prs} (to the repo)`;
    }
  }

  return PRText;
}

function injectPRText(node) {
  if (!document.querySelector("#gce-num-prs")) {
    let linkNode = node.appendChild(document.createElement("a"));
    linkNode.id = "gce-num-prs";
    linkNode.href =
    `https://github.com/${ORG_REPO_PATH}/pulls?utf8=%E2%9C%93&q=is:both+is:pr+author:${CONTRIBUTOR}`;
    linkNode.text = "Loading # of PRs...";
  }
}

function injectUpdateText(node) {
  if (!document.querySelector("#gce-update")) {
    let updateNode = node.appendChild(document.createElement("a"));
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

function updatePRText(text) {
  document.querySelector("#gce-num-prs").text = text;
}

function update() {
  getStorage(CONTRIBUTOR, ORG_REPO_PATH)
  .then((storage) => {
    let storageRes = storage[CONTRIBUTOR][ORG_REPO_PATH];
    if (storageRes.prs) {
      updatePRText(setPRText(storageRes));
    } else {
      getSyncStorage({ "access_token": null })
      .then((res) => {
        prCount(res.access_token)
        .then((repoInfo) => {
          if (repoInfo.errors) {
            updatePRText(repoInfo.errors[0].message);
            return;
          }
          updatePRText(setPRText(repoInfo));
        });
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (isPR()) {
    gitHubInjection(window, () => {
      loadConsts();
      if (CONTRIBUTOR) update();
    });
  }
});
