/* global getSyncStorage, setSyncStorage */

let BASE_URL = "https://api.github.com/search/issues";

// "/babel/babel-eslint/pull/1"
let pathNameArr = window.location.pathname.split("/");
let ORG = pathNameArr[1]; // babel
let REPO = pathNameArr[2]; // babel-eslint
let CURRENT_PR = pathNameArr[4]; // 3390
let ORG_REPO_PATH = ORG + "/" + REPO; // babel/babel-eslint

let firstHeader =
document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text");

let LOGGED_IN_USER =
document.querySelector(".js-menu-target").getAttribute("href").slice(1) || "";

let CONTRIBUTOR =
document.querySelector(".timeline-comment-wrapper .timeline-comment-header-text strong").innerText.trim();

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

  return "?q=type:pr+-user:" + CONTRIBUTOR + "+author:" + CONTRIBUTOR + checkRepo +
  "&sort=created&order=asc&per_page=1" + access_token;
}

function prCount(checkRepo, access_token) {
  if (LOGGED_IN_USER === CONTRIBUTOR) {
    return;
  }

  let searchURL = BASE_URL + queryParams(checkRepo, access_token);
  // console.log(searchURL);

  return fetch(searchURL)
  .then(function(response) {
    return response.json();
  }).then(function(json) {
    console.log("parsed json", json);

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
  }).catch(function(ex) {
    console.log("parsing failed", ex);
  });
}

function showInfo(repoInfo) {
  let repoPrs = repoInfo.prs;
  let repoText = `${repoPrs} PRs `;
  if (repoInfo  .firstPRNumber === +CURRENT_PR) {
    repoText = `First PR to ${ORG_REPO_PATH}!`;
    if (repoPrs > 1) {
      repoText += ` out of ${repoPrs} total PRs made to ${ORG_REPO_PATH}`;
    }
  }

  addContributorInfo(repoText);
}

function addContributorInfo(text) {
  let link = firstHeader.appendChild(document.createElement("a"));
  link.textContent = text;
  link.href =
  `https://github.com/${ORG_REPO_PATH}/pulls?utf8=%E2%9C%93&q=is%3Aboth+is%3Apr+author%3A${CONTRIBUTOR}`;

  let update = firstHeader.appendChild(document.createElement("a"));
  update.textContent = "(Update)";
  update.addEventListener("click", () => {
    window.reload();
  });
}

function update() {
  if (ORG_REPO_PATH === "babel/babel") {
  // if (ORG_REPO_PATH) {
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
          if (res.access_token) {
            // repo specific
            prCount(true, res.access_token)
            .then(function([repoInfo]) {
              if (repoInfo.errors) {
                addContributorInfo(repoInfo.errors[0].message);
                return;
              }
              showInfo(repoInfo);
            });
          }
        });
      }
    });
  }
}

update();
