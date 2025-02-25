/* global getSyncStorage, setStorage, getStorage, gitHubInjection */

// Define key selectors as constants for easier maintenance
const SELECTORS = {
  TIMELINE_COMMENT_HEADER: ".timeline-comment-header>h3",
  CURRENT_USER_IMG: ".Header-link img",
  PRIVATE_LABEL: ".Label",
  FIRST_CONTRIBUTOR: ".timeline-comment a.author"
};

const isPR = (path) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () =>
  document.querySelector(SELECTORS.CURRENT_USER_IMG)?.getAttribute("alt")?.slice(1) ||
  "";
const isPrivate = () =>
  document.querySelector(SELECTORS.PRIVATE_LABEL)?.innerText === "Private";
let statsScope = "repo";

// Get the username of the first contributor *in the DOM* of the page
function getFirstContributor() {
  return document.querySelector(SELECTORS.FIRST_CONTRIBUTOR)?.innerText;
}

function getContributorInfo() {
  // "/babel/babel-eslint/pull/1"
  const pathNameArr = location.pathname.split("/");
  const org = pathNameArr[1]; // babel
  const repo = pathNameArr[2]; // babel-eslint
  const currentNum = pathNameArr[4]; // 3390
  const repoPath = `${org}/${repo}`; // babel/babel-eslint
  const contributor = getFirstContributor();

  const ret = {
    contributor,
    currentNum,
    repoPath,
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

function buildUrl({
  base,
  q: { type, filterUser, author, repo, user },
  sort,
  order,
  per_page,
}) {
  let query = `${base}?q=`;
  query += `${author ? `+author:${author}` : ""}`;
  query += `${repo ? `+repo:${repo}` : ""}`;
  query += `${user ? `+user:${user}` : ""}`;
  query += `${type ? `+type:${type}` : ""}`;
  query += `${filterUser ? `+-user:${filterUser}` : ""}`;
  query += `${order ? `&order=${order}` : ""}`;
  query += `${per_page ? `&per_page=${per_page}` : ""}`;
  query += `${sort ? `&sort=${sort}` : ""}`;

  return query;
}

function contributorCount({
  access_token,
  contributor,
  user,
  repoPath,
  old = {},
  type,
}) {
  let repo = repoPath;

  // global variable
  if (statsScope === "org") {
    repo = undefined;
    repoPath = repoPath.split("/")[0];
  } else if (statsScope === "account") {
    repo = undefined;
    repoPath = "__self";
  }

  const searchURL = buildUrl({
    base: "https://api.github.com/search/issues",
    order: "asc",
    per_page: "1",
    q: {
      type,
      repo,
      author: contributor,
      user: user,
    },
    sort: "created",
  });

  return fetch(searchURL, {
    headers: {
      Authorization: `token ${access_token}`,
    },
  })
    .then((res) => res.json())
    .then((json) => {
      if (json.errors || json.message) {
        return json;
      }

      let obj = {
        lastUpdate: Date.now(),
      };

      if (type === "pr") {
        obj.prs = json.total_count;
      } else if (type === "issue") {
        obj.issues = json.total_count;
      }

      if (json.items?.length) {
        obj[`first${type[0].toUpperCase() + type.slice(1)}Number`] =
          json.items[0].number;
      }

      obj = Object.assign(old, obj);

      setStorage(contributor, repoPath, obj);

      return obj;
    });
}

function appendPRText(currentNum, repoInfo) {
  const { issues, prs, firstPrNumber, firstIssueNumber } = repoInfo;

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

function issueOrPrLink(type, repoPath, contributor) {
  const end = `${
    type === "pr" ? "pulls" : "issues"
  }?utf8=%E2%9C%93&q=is:${type}+author:${contributor}`;

  // repo
  if (repoPath.split("/").length === 2) {
    return `/${repoPath}/${end}`;
    // account
  }
  if (repoPath === "__self") {
    return `https://github.com/${end}`;
  }

  // org
  return `https://github.com/${end}+user:${repoPath}`;
}

function injectInitialUI({ contributor, repoPath }) {
  const $elem = document.querySelector(SELECTORS.TIMELINE_COMMENT_HEADER);
  const prId = "gce-num-prs";
  const issueId = "gce-num-issues";
  
  if (document.getElementById(`${prId}`)) return;

  // Use GitHub's current icon styling
  const prIcon = `<svg aria-hidden="true" class="octicon octicon-git-pull-request" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path></svg>`;
  const issueIcon = `<svg aria-hidden="true" class="octicon octicon-issue-opened" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`;
  const syncIcon = `<svg aria-hidden="true" class="octicon octicon-sync" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img"><path d="M8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.001 7.001 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.501 5.501 0 0 0 8 2.5ZM1.705 8.005a.75.75 0 0 1 .834.656 5.501 5.501 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.001 7.001 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834Z"></path></svg>`;
  const checkIcon = `<svg aria-hidden="true" class="octicon octicon-check" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>`;

  // Create dropdown menu similar to GitHub's current style - removed button styling
  const dropdown = `
    <details class="details-overlay details-reset position-relative d-inline-block">
      <summary class="btn-link Link--secondary" aria-haspopup="menu" role="button">
        <span id="gce-dropdown-text">repo</span>
        <span class="dropdown-caret"></span>
      </summary>
      <div class="dropdown-menu dropdown-menu-sw">
        <div class="dropdown-header">
          View options
        </div>
        <a class="dropdown-item d-flex flex-items-center selected" id="gce-in-this-repo">
          ${checkIcon}
          <span class="ml-2">in this repo</span>
        </a>
        <a class="dropdown-item d-flex flex-items-center" id="gce-in-this-org">
          <span class="ml-4">in this org</span>
        </a>
        <a class="dropdown-item d-flex flex-items-center" id="gce-in-this-account">
          <span class="ml-4">in this account</span>
        </a>
        <div class="dropdown-divider"></div>
        <a id="gce-sync-button" class="dropdown-item d-flex flex-items-center">
          ${syncIcon}
          <span class="ml-2">Refresh stats</span>
        </a>
        <div class="dropdown-divider"></div>
        <div class="px-3 py-1 color-fg-subtle f6 text-center" id="gce-update-time"></div>
      </div>
    </details>`;
  
  // Create the main container with GitHub utility classes
  $elem.insertAdjacentHTML(
    "beforebegin",
    `<div class="d-flex flex-items-center">
      <a href="${issueOrPrLink("pr", repoPath, contributor)}" 
         id="${prId}" 
         class="d-flex flex-items-center mr-2 Link--secondary no-underline" 
         aria-label="Pull requests by this user">
         ${prIcon}
         <span class="ml-1" id="gce-pr-count">..</span>
      </a>
      <a href="${issueOrPrLink("issue", repoPath, contributor)}" 
         id="${issueId}" 
         class="d-flex flex-items-center mr-2 Link--secondary no-underline" 
         aria-label="Issues by this user">
         ${issueIcon}
         <span class="ml-1" id="gce-issue-count">..</span>
      </a>
      ${dropdown}
    </div>`
  );

  const $syncButton = document.getElementById("gce-sync-button");
  $syncButton.addEventListener("click", () => {
    setStorage(contributor, repoPath, {});
    update(getContributorInfo());
  });

  const $inThisOrg = document.getElementById("gce-in-this-org");
  const $inThisRepo = document.getElementById("gce-in-this-repo");
  const $inThisAccount = document.getElementById("gce-in-this-account");
  const $dropdownText = document.getElementById("gce-dropdown-text");

  // Simplified event handlers with helper function
  function updateScope(scope, scopeText) {
    return () => {
      // Update selected state
      $inThisRepo.classList.toggle('selected', scope === 'repo');
      $inThisOrg.classList.toggle('selected', scope === 'org');
      $inThisAccount.classList.toggle('selected', scope === 'account');
      
      // Update dropdown text
      $dropdownText.textContent = scopeText;
      
      // Update icons
      $inThisRepo.innerHTML = scope === 'repo' 
        ? `${checkIcon}<span class="ml-2">in this repo</span>` 
        : `<span class="ml-4">in this repo</span>`;
      
      $inThisOrg.innerHTML = scope === 'org' 
        ? `${checkIcon}<span class="ml-2">in this org</span>` 
        : `<span class="ml-4">in this org</span>`;
      
      $inThisAccount.innerHTML = scope === 'account' 
        ? `${checkIcon}<span class="ml-2">in this account</span>` 
        : `<span class="ml-4">in this account</span>`;
      
      // Update links
      let href;
      if (scope === 'org') {
        href = repoPath.split("/")[0];
      } else if (scope === 'account') {
        href = "__self";
      } else {
        href = repoPath;
      }
      
      document.getElementById(prId).setAttribute("href", issueOrPrLink("pr", href, contributor));
      document.getElementById(issueId).setAttribute("href", issueOrPrLink("issue", href, contributor));
      
      // Update global scope and refresh data
      statsScope = scope;
      update(getContributorInfo());
    };
  }

  $inThisRepo.addEventListener("click", updateScope('repo', 'repo'));
  $inThisOrg.addEventListener("click", updateScope('org', 'org'));
  $inThisAccount.addEventListener("click", updateScope('account', 'account'));
}

function updateTextNodes({ prText, issueText, lastUpdate }) {
  const prNode = document.getElementById("gce-pr-count");
  if (prNode) {
    prNode.textContent = prText;
  }

  const issueNode = document.getElementById("gce-issue-count");
  if (issueNode) {
    issueNode.textContent = issueText;
  }

  const updateTime = document.getElementById("gce-update-time");
  if (updateTime && typeof lastUpdate === "number") {
    // Format the time in a more compact way
    const now = new Date();
    const updated = new Date(lastUpdate);
    const diffMs = now - updated;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    let timeText = '';
    if (diffMins < 60) {
      timeText = `${diffMins}m`;
    } else if (diffHours < 24) {
      timeText = `${diffHours}h`;
    } else {
      timeText = `${diffDays}d`;
    }
    
    updateTime.textContent = `Updated ${timeText} ago`;
  }
}

// Improved error handling with toast notifications
function showToast(message, type = 'error') {
  // Remove existing toast if any
  const existingToast = document.getElementById('gce-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'gce-toast';
  toast.className = 'position-fixed bottom-0 right-0 m-3 p-3 color-bg-danger-inverse color-fg-on-emphasis rounded-2';
  toast.style.zIndex = '100';
  toast.style.maxWidth = '300px';
  toast.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.16)';
  
  if (type === 'warning') {
    toast.className = toast.className.replace('color-bg-danger-inverse', 'color-bg-attention-inverse');
  }
  
  toast.innerHTML = `
    <div class="d-flex flex-items-center">
      <svg class="octicon mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
        <path fill="currentColor" d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm1.5-8.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0zM5 5a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5z"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

function update({ contributor, repoPath, currentNum, user }) {
  getStorage(contributor, repoPath).then((storage) => {
    let path = repoPath;
    if (user) {
      path = user;
    } else if (statsScope === "account") {
      path = "__self";
    }

    const storageRes = storage[`${contributor}|${path}`] || {};

    if (storageRes.prs || storageRes.issues) {
      updateTextNodes(appendPRText(currentNum, storageRes));
    } else {
      getSyncStorage({ access_token: null }).then((res) => {
        Promise.all([
          contributorCount({
            old: storageRes,
            user,
            access_token: res.access_token,
            type: "pr",
            contributor,
            repoPath,
          }),
          contributorCount({
            old: storageRes,
            user,
            access_token: res.access_token,
            type: "issue",
            contributor,
            repoPath,
          }),
        ]).then(([prInfo, issueInfo]) => {
          const repoInfo = Object.assign(prInfo, issueInfo);

          if (repoInfo.errors) {
            const errorMessage = repoInfo.errors[0].message;
            updateTextNodes({ prText: "Error", issueText: "Error" });
            showToast(`API Error: ${errorMessage}`);
            return;
          }

          if (repoInfo.message) {
            // API rate limit exceeded for hzoo.
            if (
              repoInfo.message.indexOf(
                `API rate limit exceeded for ${getCurrentUser()}`
              ) >= 0
            ) {
              updateTextNodes({ prText: "Rate limited", issueText: "Rate limited" });
              showToast("API rate limit exceeded. Try again later or add an access token in settings.", "warning");
              return;
            }

            // API rate limit exceeded for x.x.x.x.
            if (repoInfo.message.indexOf("the good news") >= 0) {
              updateTextNodes({ prText: "Auth needed", issueText: "Auth needed" });
              showToast("GitHub API rate limit reached. Please add an access token in the extension settings.", "warning");
              return;
            }
            
            // Generic error
            updateTextNodes({ prText: "Error", issueText: "Error" });
            showToast(`GitHub API Error: ${repoInfo.message}`);
            return;
          }
          
          updateTextNodes(appendPRText(currentNum, repoInfo));
        }).catch(error => {
          console.error("GitHub Contributors Extension error:", error);
          updateTextNodes({ prText: "Error", issueText: "Error" });
          showToast("Failed to fetch contributor data. Check console for details.");
        });
      });
    }
  });
}

// Improved caching with local storage
function getCachedData(key, maxAge = 3600000) { // Default 1 hour cache
  try {
    const cached = localStorage.getItem(`gce-cache-${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < maxAge) {
        return data;
      }
    }
    return null;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(`gce-cache-${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error("Cache write error:", e);
    // If localStorage is full, clear old caches
    try {
      // Use for...of instead of forEach
      for (const storageKey of Object.keys(localStorage)) {
        if (storageKey.startsWith('gce-cache-')) {
          localStorage.removeItem(storageKey);
        }
      }
      // Try again
      localStorage.setItem(`gce-cache-${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("Failed to clear cache:", e);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  gitHubInjection(() => {
    if (isPR(location.pathname) || isIssue(location.pathname)) {
      getSyncStorage({ _showPrivateRepos: null }).then(
        ({ _showPrivateRepos }) => {
          if (!_showPrivateRepos && isPrivate()) return;

          if (getFirstContributor()) {
            update(getContributorInfo());
          }
        }
      );
    }
  });
});
