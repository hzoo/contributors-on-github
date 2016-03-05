"use strict";

/* global chrome, getSyncStorage, setSyncStorage */

let BASE_URL = "https://api.github.com/search/issues";

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

function queryParams(checkRepo, access_token) {
  if (checkRepo) {
    checkRepo = "+repo:" + ORG_REPO_PATH;
  } else {
    checkRepo = "";
  }

  if (access_token) {
    access_token = "&access_token=" + access_token;
  } else {
    access_token = "";
  }

  // +-user:" + CONTRIBUTOR + "
  return "?q=type:pr+author:" + CONTRIBUTOR + checkRepo +
  "&sort=created&order=asc&per_page=1" + access_token;
}

function prCount(checkRepo, access_token) {
  if (LOGGED_IN_USER === CONTRIBUTOR) {
    return;
  }

  let searchURL = BASE_URL + queryParams(checkRepo, access_token);
  // console.log(searchURL);

  return fetch(searchURL)
  .then((res) => res.json())
  .then(function(json) {
    // console.log("parsed json", json);

    if (json.errors) {
      return json;
    }

    let obj = {
      prs: json.total_count,
    };

    if (json.items && json.items.length) {
      obj.firstPRNumber = json.items[0].number;
    }

    setSyncStorage({
      [CONTRIBUTOR]: {
        [ORG_REPO_PATH]: {
          prs: obj.prs,
          firstPRNumber: obj.firstPRNumber
        }
      }
    });

    return obj;
  });
}

function showInfo(repoInfo) {
  let repoPrs = repoInfo.prs;
  let repoText = `${repoPrs} PRs `;
  if (repoInfo  .firstPRNumber === +CURRENT_PR) {
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
      setSyncStorage({
        [CONTRIBUTOR]: {
          [ORG_REPO_PATH]: {
            prs: null
          }
        }
      });
      update();
    });
  }
}

function update() {
  getSyncStorage({ repos: "" })
  .then((storage) => {
    if (storage.repos) {
      let storageRepos = storage.repos.split("\n");
      return storageRepos.some((storageRepo) => {
        if (storageRepo.indexOf("/") >= 0) {
          return storageRepo.indexOf(ORG_REPO_PATH) >= 0;
        } else {
          return storageRepo.indexOf(ORG) >= 0;
        }
      });
    } else {
      return true;
    }
  })
  .then((shouldShow) => {
    if (shouldShow) {
      getSyncStorage({
        [CONTRIBUTOR]: {
          [ORG_REPO_PATH]: {}
        }
      })
      .then((storage) => {
        let storageRes = storage[CONTRIBUTOR][ORG_REPO_PATH];
        if (storageRes.prs) {
          showInfo(storageRes);
        } else {
          getSyncStorage({ "access_token": null })
          .then((res) => {
            prCount(true, res.access_token)
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
    } else {
      let linkNode = document.querySelector("#gce-num-prs");
      linkNode.text = "[Filtered Repo]";
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
