"use strict";

/* global $, getSyncStorage, setStorage, getStorage, gitHubInjection */

const isPR = (path) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () => $(".js-menu-target img").attr("alt").slice(1) || "";
const isPrivate = () => $(".label-private").length > 0;
let statsScope = "repo";

const isEnterprise = window.location.hostname !== 'github.com';
const githubURLBase = isEnterprise ? `${window.location.hostname}/api/v3` : 'api.github.com';
const githubURL = `https://${githubURLBase}`;

function getContributor() {
  let $contributor = $(".timeline-comment-wrapper .timeline-comment-header-text strong a");
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

  // global variable
  if (statsScope === "org") {
    ret.user = org;
    ret.repoPath = org;
  }

  if (statsScope === "account") {
    ret.repoPath = "__self";
  }

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
  let repo = repoPath;

  // global variable
  if (statsScope === "org") {
    repo = undefined;
    repoPath = repoPath.split("/")[0];
  } else if (statsScope === "account") {
    repo = undefined;
    repoPath = "__self";
  }
  
  let searchURL = buildUrl({
    access_token,
    base: `${githubURL}/search/issues`,
    order: "asc",
    per_page: "1",
    q: {
      type,
      repo,
      author: contributor,
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
    let prText = `${prs}`;
    if (firstPrNumber === +currentNum && statsScope !== "account") {
      prText = "First PR";
      if (prs > 1) {
        prText += ` out of ${prs}`;
      }
    }
    repoInfo.prText = prText;
  }

  if (issues !== undefined) {
    let issueText = `${issues}`;
    if (firstIssueNumber === +currentNum && statsScope !== "account") {
      issueText = "First Issue";
      if (issues > 1) {
        issueText += ` out of ${issues}`;
      }
    }
    repoInfo.issueText = issueText;
  }

  return repoInfo;
}

function getIconPath(icon) {
  if (icon === "git-issue-opened") {
    return `<path d="M7 2.3c3.14 0 5.7 2.56 5.7 5.7S10.14 13.7 7 13.7 1.3 11.14 1.3 8s2.56-5.7 5.7-5.7m0-1.3C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7S10.86 1 7 1z m1 3H6v5h2V4z m0 6H6v2h2V10z" />`;
  } else if (icon === "git-pull-request") {
    return `<path d="M11 11.28c0-1.73 0-6.28 0-6.28-0.03-0.78-0.34-1.47-0.94-2.06s-1.28-0.91-2.06-0.94c0 0-1.02 0-1 0V0L4 3l3 3V4h1c0.27 0.02 0.48 0.11 0.69 0.31s0.3 0.42 0.31 0.69v6.28c-0.59 0.34-1 0.98-1 1.72 0 1.11 0.89 2 2 2s2-0.89 2-2c0-0.73-0.41-1.38-1-1.72z m-1 2.92c-0.66 0-1.2-0.55-1.2-1.2s0.55-1.2 1.2-1.2 1.2 0.55 1.2 1.2-0.55 1.2-1.2 1.2zM4 3c0-1.11-0.89-2-2-2S0 1.89 0 3c0 0.73 0.41 1.38 1 1.72 0 1.55 0 5.56 0 6.56-0.59 0.34-1 0.98-1 1.72 0 1.11 0.89 2 2 2s2-0.89 2-2c0-0.73-0.41-1.38-1-1.72V4.72c0.59-0.34 1-0.98 1-1.72z m-0.8 10c0 0.66-0.55 1.2-1.2 1.2s-1.2-0.55-1.2-1.2 0.55-1.2 1.2-1.2 1.2 0.55 1.2 1.2z m-1.2-8.8c-0.66 0-1.2-0.55-1.2-1.2s0.55-1.2 1.2-1.2 1.2 0.55 1.2 1.2-0.55 1.2-1.2 1.2z" />`;
  } else if (icon === "sync") {
    return `<path d="M10.24 7.4c0.19 1.28-0.2 2.62-1.2 3.6-1.47 1.45-3.74 1.63-5.41 0.54l1.17-1.14L0.5 9.8 1.1 14l1.31-1.26c2.36 1.74 5.7 1.57 7.84-0.54 1.24-1.23 1.81-2.85 1.74-4.46L10.24 7.4zM2.96 5c1.47-1.45 3.74-1.63 5.41-0.54l-1.17 1.14 4.3 0.6L10.9 2l-1.31 1.26C7.23 1.52 3.89 1.69 1.74 3.8 0.5 5.03-0.06 6.65 0.01 8.26l1.75 0.35C1.57 7.33 1.96 5.98 2.96 5z" />`;
  }
}

function makeIcon(icon) {
  return `<svg aria-hidden="true" class="octicon octicon-${icon}" height="14" role="img" version="1.1" viewBox="0 0 14 16" width="14">
    ${getIconPath(icon)}
  </svg>`;
}

function makeLabel(text, octicon) {
  return `${octicon ? makeIcon(octicon) : ""}
<span class="timeline-comment-label-text">${text}</span>
`;
}

function makeUpdateLabel(time) {
  return `<time datetime="${time}" is="relative-time"></time>`;
}

function issueOrPrLink(type, repoPath, contributor) {
  let end = `${type === "pr" ? "pulls" : "issues"}?utf8=%E2%9C%93&q=is:both+is:${type}+author:${contributor}`;

  // repo
  if (repoPath.split("/").length === 2) {
    return `/${repoPath}/${end}`;
  // account
  } else if (repoPath === "__self") {
    return `https://github.com/${end}`;
  // org
  } else {
    return `https://github.com/${end}+user:${repoPath}`;
  }
}

function injectInitialUI({ contributor, repoPath }) {
  let $elem = $(".timeline-comment-header-text").first();
  let prId = "gce-num-prs";
  let prText = makeLabel("Loading..", "git-pull-request");

  if ($(`#${prId}`).length) return;

  let issueId = "gce-num-issues";
  let issueText = makeLabel("Loading..", "git-issue-opened");
  let updateText = makeLabel("", "sync");
  let $checkbox = `<svg aria-hidden="true" class="octicon octicon-check" height="16" version="1.1" viewBox="0 0 12 16" width="12"><path d="M12 5L4 13 0 9l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5z"></path></svg>`;

  let dropdown = `<div class="dropdown js-menu-container" style="display: inline-block">
    <button class="btn-link muted-link js-menu-target">
      <span id="gce-dropdown-text">in this repo</span>
      <span class="dropdown-caret"></span>
    </button>
    <div class="dropdown-menu-content diff-options-content js-menu-content">
      <ul class="dropdown-menu dropdown-menu-sw">
        <div class="dropdown-header">
          View options
        </div>
        <a class="dropdown-item selected" id="gce-in-this-repo">
            ${$checkbox}
          in this repo
        </a>
        <a class="dropdown-item" id="gce-in-this-org">
          in this org
        </a>
        <a class="dropdown-item" id="gce-in-this-account">
          in this account
        </a>
      </ul>
    </div>
  </div>`;

  $elem.before(`<span class="timeline-comment-label">
<a href="${issueOrPrLink("pr", repoPath, contributor)}" id="${prId}">${prText}</a>
<a href="${issueOrPrLink("issue", repoPath, contributor)}" id="${issueId}">${issueText}</a>
${dropdown}
</span>
  `);
  $elem.before(`<a class="timeline-comment-label" style="cursor:pointer;" id="gce-update">${updateText}</a>`);
  $elem.before(`<a id="gce-update-time" class="timeline-comment-label">N/A</a>`);

  let $update = $("#gce-update");
  $update.dom[0].addEventListener("click", function() {
    setStorage(contributor, repoPath, {});
    update(getContributorInfo());
  });

  let $inThisOrg = $("#gce-in-this-org");
  let $inThisRepo = $("#gce-in-this-repo");
  let $inThisAccount = $("#gce-in-this-account");
  let $dropdownText = $("#gce-dropdown-text");

  $inThisOrg.dom[0].addEventListener("click", function() {
    $inThisOrg.addClass("selected");
    $inThisRepo.removeClass("selected");
    $inThisAccount.removeClass("selected");

    $inThisOrg.html(`${$checkbox} in this org`);
    $dropdownText.html("in this org");

    $inThisAccount.html("in this account");
    $inThisRepo.html("in this repo");

    $(`#${prId}`).attr("href", issueOrPrLink("pr", repoPath.split("/")[0], contributor));
    $(`#${issueId}`).attr("href", issueOrPrLink("issue", repoPath.split("/")[0], contributor));

    // global
    statsScope = "org";
    update(getContributorInfo());
  });

  $inThisRepo.dom[0].addEventListener("click", function() {
    $inThisRepo.addClass("selected");
    $inThisOrg.removeClass("selected");
    $inThisAccount.removeClass("selected");

    $inThisRepo.html(`${$checkbox} in this repo`);
    $dropdownText.html("in this repo");

    $inThisAccount.html("in this account");
    $inThisOrg.html("in this org");

    $(`#${prId}`).attr("href", issueOrPrLink("pr", repoPath, contributor));
    $(`#${issueId}`).attr("href", issueOrPrLink("issue", repoPath, contributor));

    // global
    statsScope = "repo";
    update(getContributorInfo());
  });

  $inThisAccount.dom[0].addEventListener("click", function() {
    $inThisAccount.addClass("selected");
    $inThisOrg.removeClass("selected");
    $inThisRepo.removeClass("selected");

    $inThisAccount.html(`${$checkbox} in this account`);
    $dropdownText.html("in this account");

    $inThisRepo.html("in this repo");
    $inThisOrg.html("in this org");

    $(`#${prId}`).attr("href", issueOrPrLink("pr", "__self", contributor));
    $(`#${issueId}`).attr("href", issueOrPrLink("issue", "__self", contributor));

    // global
    statsScope = "account";
    update(getContributorInfo());
  });
}

function updateTextNodes({ prText, issueText, lastUpdate }) {
  let prNode = $("#gce-num-prs .timeline-comment-label-text");
  if (prNode.length) {
    prNode.text(prText);
  }

  let issueNode = $("#gce-num-issues .timeline-comment-label-text");
  if (issueNode.length) {
    issueNode.text(issueText);
  }

  let updateTime = $("#gce-update-time");
  if (updateTime && typeof lastUpdate === "number") {
    updateTime.html(`<span>Last Updated </span>${makeUpdateLabel(new Date(lastUpdate))}`);
  }
}

function update({ contributor, repoPath, currentNum, user }) {
  getStorage(contributor, repoPath)
  .then((storage) => {
    let path = repoPath;
    if (user) {
      path = user;
    } else if (statsScope === "account") {
      path = "__self";
    }

    let storageRes = storage[`${contributor}|${path}`] || {};

    if (storageRes.prs || storageRes.issues) {
      updateTextNodes(appendPRText(currentNum, storageRes));
    } else {
      const token = isEnterprise ? "enterprise_access_token" : "access_token";

      getSyncStorage({ [token]: null })
      .then((res) => {
        const access_token = isEnterprise ? res.enterprise_access_token : res.access_token;

        Promise.all([
          contributorCount({ old: storageRes, user, access_token, type: "pr", contributor, repoPath}),
          contributorCount({ old: storageRes, user, access_token, type: "issue", contributor, repoPath})
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
    if (isPR(location.pathname) || isIssue(location.pathname)) {
      getSyncStorage({ "_showPrivateRepos": null })
      .then(({ _showPrivateRepos }) => {
        if (!_showPrivateRepos && isPrivate()) return;

          if (getContributor()) {
            update(getContributorInfo());
          }
      });
    }
  });
});
