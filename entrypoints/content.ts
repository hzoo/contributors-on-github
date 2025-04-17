import gitHubInjection from '../vendor/github-injection';
import {
	STORAGE_KEYS,
	setStorage,
	getStorage,
	clearContributorCache
} from '../src/storage';

interface PathInfo {
	contributor: string | undefined;
	currentNum: string | undefined;
	repoPath: string;
	org: string;
}

interface GitHubIssue {
	number: number;
	// Add other relevant properties if needed
}

interface GitHubIssueSearchResponse {
	total_count: number;
	items?: GitHubIssue[];
	errors?: { message: string }[];
	message?: string; // For errors like rate limiting or bad credentials
}

interface ContributorStats {
	prs?: number;
	issues?: number;
	firstPrNumber?: number;
	firstIssueNumber?: number;
	lastUpdate?: number;
}

interface FetchStatsParams {
	contributor: string;
	repoPath: string; // Can be repo path, org name, or "__self"
	currentNum: string | undefined;
	scope: 'repo' | 'org' | 'account';
	user?: string; // User/Org context for API query
	forceUpdate?: boolean;
}

// Augment the Window interface to include our custom property
declare global {
	interface Window {
		gceEventHandlersInitialized?: boolean;
	}
}

// --- End Type Definitions ---

export default defineContentScript({
	matches: ['https://github.com/*/*'],
	runAt: 'document_idle',

	main() {
		// console.log('[Contributors on GitHub]: Content script loaded');

		// The main logic needs to run after page loads and on SPA navigations
		gitHubInjection(() => {
			// console.log('[Contributors on GitHub]: Initializing or Re-initializing UI');
			// Call the main initialization function from the original script
			// Ensure this function and all its dependencies use the imported modules
			// instead of window globals.
			initializeContributorStats(); 
		});
	},
});

// Define key selectors as constants for easier maintenance
const SELECTORS = {
	// Pull request selectors
	PR_TIMELINE_COMMENT: ".timeline-comment-header>h3",
	FIRST_CONTRIBUTOR_PR: ".timeline-comment a.author",
	
	// Issue selectors
	ISSUE_HEADER: ".js-issue-title, [data-testid='issue-body']",
	FIRST_CONTRIBUTOR_ISSUE: "[data-testid='issue-body-header-author'], .js-issue-header-byline .author",
	
	// Common selectors
	CURRENT_USER_IMG: ".Header-link img",
	PRIVATE_LABEL: ".Label"
};

// Use GitHub's current icon styling
const ICONS = {
	PR: `<svg aria-hidden="true" class="octicon octicon-git-pull-request" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path></svg>`,
	ISSUE: `<svg aria-hidden="true" class="octicon octicon-issue-opened" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`,
	SYNC: `<svg aria-hidden="true" class="octicon octicon-sync" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path d="M8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.001 7.001 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.501 5.501 0 0 0 8 2.5ZM1.705 8.005a.75.75 0 0 1 .834.656 5.501 5.501 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.001 7.001 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834Z"></path></svg>`,
};

const ELEMENT_IDS = {
	CONTAINER: "gce-container",
	HOVER_PANEL: "gce-hover-panel",
	PR_COUNT: "gce-num-prs",
	ISSUE_COUNT: "gce-num-issues",
	SYNC_BUTTON: "gce-sync-button",
	UPDATE_TIME: "gce-update-time",
};

// Configuration constants
const CONFIG = {
	CACHE_EXPIRATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
	HOVER_DELAY: 100, // milliseconds to wait before hiding panel
	STAT_PADDING: 3, // number of digits to pad stats to
};

// Path and user detection helpers
const isPR = (path: string) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path: string) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () =>
	document
		.querySelector(SELECTORS.CURRENT_USER_IMG)
		?.getAttribute("alt")
		?.slice(1) || "";
const isPrivate = () =>
	(document.querySelector(SELECTORS.PRIVATE_LABEL) as HTMLElement)?.innerText === "Private";

// Get the username of the first contributor *in the DOM* of the page
function getFirstContributor(): string | undefined {
	// Try PR selector first, then issue selector
	const selector = isPR(location.pathname)
		? SELECTORS.FIRST_CONTRIBUTOR_PR
		: SELECTORS.FIRST_CONTRIBUTOR_ISSUE;
	return (document.querySelector(selector) as HTMLElement)?.innerText;
}

// Get all comment authors on the page
function getAllCommentAuthors(): string[] { // Return type is string array
	const authors = new Set<string>(); // Use Set<string>
	
	// Add the first contributor (issue/PR creator)
	const firstContributor = getFirstContributor();
	if (firstContributor) {
		authors.add(firstContributor);
	}
	
	// Add authors from comments (assuming PR_TIMELINE_COMMENT selects headers near author links)
	// This part might need adjustment based on the actual DOM structure for comments
	// document.querySelectorAll(SELECTORS.PR_TIMELINE_COMMENT).forEach(header => {
	//   const authorLink = header.querySelector('a.author');
	//   if (authorLink && authorLink instanceof HTMLElement) {
	//     authors.add(authorLink.innerText);
	//   }
	// });

	return Array.from(authors);
}

function getPathInfo(): PathInfo {
	// "/babel/babel-eslint/pull/1"
	const pathNameArr = location.pathname.split("/");
	const org = pathNameArr[1] || ''; 
	const repo = pathNameArr[2] || ''; 
	const currentNum = pathNameArr[4]; // Might be undefined
	const repoPath = `${org}/${repo}`; 
	const contributor = getFirstContributor(); // Might be undefined

	return {
		contributor,
		currentNum,
		repoPath,
		org,
	};
}

// Define a more specific type for buildUrl q parameter
interface BuildUrlQueryParams {
	type: 'pr' | 'issue';
	filterUser?: string;
	author?: string;
	repo?: string; // Repo path (e.g., "org/repo") - can be undefined
	user?: string; // User/Org scope - can be undefined
	created?: string; // Date range
}

function buildUrl({
	base,
	q,
	sort,
	order,
	per_page,
}: {
	base: string;
	q: BuildUrlQueryParams;
	sort?: string;
	order?: 'asc' | 'desc';
	per_page?: string;
}): string {
	let query = `${base}?q=`;
	// Ensure properties exist before adding
	query += `${q.author ? `+author:${q.author}` : ""}`;
	query += `${q.repo ? `+repo:${q.repo}` : ""}`;
	query += `${q.user ? `+user:${q.user}` : ""}`;
	query += `${q.type ? `+type:${q.type}` : ""}`;
	query += `${q.filterUser ? `+-user:${q.filterUser}` : ""}`;
	query += `${q.created ? `+created:${q.created}` : ""}`;
	query += `${order ? `&order=${order}` : ""}`;
	query += `${per_page ? `&per_page=${per_page}` : ""}`;
	query += `${sort ? `&sort=${sort}` : ""}`;

	return query;
}

// Type for the parameters of contributorCount
interface ContributorCountParams {
	access_token: string | null;
	contributor: string;
	user?: string; // Org/User scope for the API query (if applicable)
	repoPath: string; // Storage key path (repo, org, or __self)
	old: ContributorStats;
	type: 'pr' | 'issue';
	scope: 'repo' | 'org' | 'account';
}

// Return type should include potential API errors
async function contributorCount({
	access_token,
	contributor,
	user,
	repoPath, // This is the storage key path
	old,
	type,
	scope
}: ContributorCountParams): Promise<ContributorStats | GitHubIssueSearchResponse> { 
	let repoForApiQuery: string | undefined = undefined;
	let userForApiQuery: string | undefined = undefined;

	// Determine repo/user context for API query based on scope
	if (scope === "repo" && repoPath.includes("/")) { // Only use repoPath if it looks like org/repo
		repoForApiQuery = repoPath;
	} else if (scope === "org") {
		userForApiQuery = user; // Use the passed 'user' (org name) for the API query
	}
	// For scope "account", both repoForApiQuery and userForApiQuery remain undefined

	const searchURL = buildUrl({
		base: "https://api.github.com/search/issues",
		order: "asc",
		per_page: "1",
		q: {
			type,
			repo: repoForApiQuery, // Use determined repo for API
			author: contributor,
			user: userForApiQuery // Use determined user/org for API
		},
		sort: "created",
	});

	try {
		// Ensure access_token is not null before fetching
		if (!access_token) {
			// Return an object matching GitHubIssueSearchResponse structure for error
			return { total_count: 0, message: "Access token is missing" };
		}
		const response = await fetch(searchURL, {
			headers: {
				Authorization: `token ${access_token}`,
			},
		});
		const json: GitHubIssueSearchResponse = await response.json();

		if (json.errors || json.message) {
			console.error("[Contributors on GitHub]: GitHub API Error:", json.errors || json.message);
			return json; 
		}

		const statsUpdate: ContributorStats = {
			lastUpdate: Date.now()
		};

		if (type === "pr") {
			statsUpdate.prs = json.total_count;
			if (json.items?.length) {
				statsUpdate.firstPrNumber = json.items[0].number;
			}
		} else if (type === "issue") {
			statsUpdate.issues = json.total_count;
			if (json.items?.length) {
				statsUpdate.firstIssueNumber = json.items[0].number;
			}
		}
		
		const finalStats: ContributorStats = { ...old, ...statsUpdate };

		// Pass the combined stats to storage using the original repoPath (storage key)
		setStorage(contributor, repoPath, finalStats); 

		return finalStats;
	} catch (error: unknown) {
		console.error("[Contributors on GitHub]: Fetch error in contributorCount:", error);
		const message = error instanceof Error ? error.message : "Unknown fetch error";
		// Return an object matching GitHubIssueSearchResponse structure for error
		return { total_count: 0, message };
	}
}

function formatText(count: number | undefined, firstNumber: number | undefined, currentNum: string | undefined, scope: 'repo' | 'org' | 'account'): string {
	if (count === undefined) return "..";
	
	// Ensure currentNum is treated as a number for comparison
	const currentNumParsed = currentNum ? Number.parseInt(currentNum, 10) : Number.NaN;

	if (firstNumber === currentNumParsed && scope !== "account") {
		const isFirst = count === 1 ? "First" : "1st";
		const countText = count > 1 ? ` of ${count}` : "";
		return `${isFirst}${countText}`;
	}
	
	return `${count}`;
}

function issueOrPrLink(type: 'pr' | 'issue', repoPath: string, contributor: string): string {
	const end = `${
		type === "pr" ? "pulls" : "issues"
	}?utf8=%E2%9C%93&q=is:${type}+author:${contributor}`;

	// repo
	if (repoPath.includes("/")) { // More reliable check for repo path
		return `/${repoPath}/${end}`;
	}
	// account
	if (repoPath === "__self") {
		return `https://github.com/${end}`;
	}

	// org (assuming repoPath is the org name)
	return `https://github.com/${end}+user:${repoPath}`;
}

function createStatRow(scope: 'repo' | 'org' | 'account', label: string, contributor: string, repoPath: string): string {
	// Determine the correct path/context for the link based on scope
	const linkContext = scope === "repo" ? repoPath : scope === "org" ? repoPath : "__self";
	return `
    <div class="d-flex flex-items-center py-1">
      <div class="gce-scope-label">
        <span class="f6 color-fg-muted">${label}</span>
      </div>
      <div class="d-flex flex-items-center ml-auto">
        <div class="d-inline-flex flex-items-center mr-2">
          ${ICONS.PR}<a href="${issueOrPrLink("pr", linkContext, contributor)}" class="ml-1 gce-stat-number gce-text Link--secondary" id="gce-${scope}-pr-count">...</a>
        </div>
        <div class="d-inline-flex flex-items-center">
          ${ICONS.ISSUE}<a href="${issueOrPrLink("issue", linkContext, contributor)}" class="ml-1 gce-stat-number gce-text Link--secondary" id="gce-${scope}-issue-count">...</a>
        </div>
      </div>
    </div>
  `;
}

function injectStyles(): void {
	const styleEl = document.createElement('style');
	styleEl.id = 'gce-responsive-styles';
	styleEl.textContent = `
		[id^="${ELEMENT_IDS.CONTAINER}"] {
			margin-right: 8px;
			align-items: center;
			display: inline-flex;
			margin-left: 8px;
			position: relative;
			z-index: 101; /* Ensure container has higher z-index */
		}
		[id^="${ELEMENT_IDS.CONTAINER}"] svg {
			vertical-align: text-bottom;
		}
		.gce-hover-panel {
			box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
			border: 1px solid var(--color-border-default);
			z-index: 101;
			position: fixed; /* Change to fixed positioning */
			min-width: 250px;
			margin-top: 4px;
		}
		.gce-text {
			font-size: 12px;
			line-height: 1.5;
		}
		.gce-scope-label {
			width: 90px;
			flex-shrink: 0;
		}
		.gce-stat-number {
			min-width: 30px;
			display: inline-block;
			text-align: right;
			font-variant-numeric: tabular-nums;
			text-decoration: none;
		}
		.gce-stat-number:hover {
			text-decoration: underline;
			color: var(--color-accent-fg);
		}
		.gce-sync-button {
			padding: 2px 0;
		}
		@media (max-width: 768px) {
			.timeline-comment-header {
				flex-wrap: wrap;
			}
			[id^="${ELEMENT_IDS.CONTAINER}"] {
				margin-top: 4px;
			}
		}
	`;
	document.head.appendChild(styleEl);
}

function injectInitialUI({ contributor, repoPath, currentNum, org }: PathInfo): void {
	// Don't inject if already present (check container instead of counts)
	if (document.getElementById(ELEMENT_IDS.CONTAINER)) {
		// console.log("UI already injected, skipping.");
		return;
	}
	
	// Get the appropriate container element based on whether we're on a PR or issue page
	let targetElement: Element | null = null; // Use more specific type
	if (isPR(location.pathname)) {
		targetElement = document.querySelector(SELECTORS.PR_TIMELINE_COMMENT);
	} else if (isIssue(location.pathname)) {
		targetElement = document.querySelector(SELECTORS.ISSUE_HEADER);
	}
	
	// If we can't find a suitable container, exit
	if (!targetElement) {
		// console.warn("[Contributors on GitHub]: Could not find a suitable container element");
		return;
	}

	// Ensure contributor is defined before proceeding
	if (!contributor) {
		// console.warn("[Contributors on GitHub]: Cannot inject UI without contributor info.");
		return;
	}

	// Create the main container with GitHub utility classes
	const containerHTML = `
		<div class="d-flex flex-items-center position-relative" id="${ELEMENT_IDS.CONTAINER}" data-username="${contributor}">
			<div class="d-flex flex-items-center position-relative">
				<a href="${issueOrPrLink("pr", repoPath, contributor)}" 
					id="${ELEMENT_IDS.PR_COUNT}" 
					class="Link--secondary color-fg-muted d-inline-flex flex-items-center no-underline mr-2" 
					aria-label="Pull requests by this user">
					${ICONS.PR}<span class="ml-1 gce-text">${"..."}</span>
				</a>
				<a href="${issueOrPrLink("issue", repoPath, contributor)}" 
					id="${ELEMENT_IDS.ISSUE_COUNT}" 
					class="Link--secondary color-fg-muted d-inline-flex flex-items-center no-underline" 
					aria-label="Issues by this user">
					${ICONS.ISSUE}<span class="ml-1 gce-text">${"..."}</span>
				</a>
				
				<div id="${ELEMENT_IDS.HOVER_PANEL}" class="gce-hover-panel Box color-shadow-medium rounded-2 p-2" style="display: none;">
					<!-- Stats rows -->
					${createStatRow("repo", "In this repo:", contributor, repoPath)}
					${createStatRow("org", "In this org:", contributor, org)}
					${createStatRow("account", "In this account:", contributor, "__self")}
					
					<div class="border-top mt-1 mb-1"></div>
					<div class="d-flex flex-items-center">
						<button id="${ELEMENT_IDS.SYNC_BUTTON}" class="btn-link Link--secondary d-flex flex-items-center color-fg-muted" data-username="${contributor}">
							${ICONS.SYNC}
							<span class="ml-1 f6">refresh</span>
						</button>
						<span class="color-fg-subtle f6 ml-auto" id="${ELEMENT_IDS.UPDATE_TIME}"></span>
					</div>
				</div>
			</div>
		</div>
	`;
	
	// Insert the container
	if (isPR(location.pathname)) {
		targetElement.insertAdjacentHTML("beforebegin", containerHTML);
	} else if (isIssue(location.pathname)) {
		// For issues, find a better insertion point within the issue header
		const issueAuthorElement = document.querySelector(SELECTORS.FIRST_CONTRIBUTOR_ISSUE);
		if (issueAuthorElement) {
			issueAuthorElement.insertAdjacentHTML("afterend", containerHTML);
		} else {
			// Fallback: insert near the title (might need adjustment based on GitHub structure)
			targetElement.insertAdjacentHTML("afterbegin", containerHTML); 
		}
	}

	// Styles should be injected only once ideally, maybe move to main() or use a flag
	injectStyles();
	// Handlers should be set up after this in initializeContributorStats
	setupGlobalEventHandlers({ repoPath, currentNum, org, contributor });

	// Initial fetch of all stats
	fetchAllStats({ contributor, repoPath, currentNum, org });
}

// Set up global event handlers using event delegation
function setupGlobalEventHandlers({ repoPath, currentNum, org }: PathInfo): void {
	// Use window property as a flag
	if (window.gceEventHandlersInitialized) return;
	window.gceEventHandlersInitialized = true;
	
	// Use type assertions for elements retrieved by ID
	const container = document.getElementById(ELEMENT_IDS.CONTAINER) as HTMLElement | null;
	const hoverPanel = document.getElementById(ELEMENT_IDS.HOVER_PANEL) as HTMLElement | null;
	const syncButton = document.getElementById(ELEMENT_IDS.SYNC_BUTTON) as HTMLButtonElement | null;
	
	if (!container || !hoverPanel) {
		// console.error("[Contributors on GitHub]: Could not find container or hover panel for event handlers.");
		return;
	}
	
	// Handle hover events for the container
	container.addEventListener('mouseenter', () => {
		// Position the panel relative to the container
		const rect = container.getBoundingClientRect();
		hoverPanel.style.top = `${rect.bottom + window.scrollY}px`; // Adjust for scroll
		hoverPanel.style.left = `${rect.left + window.scrollX}px`; // Adjust for scroll
		hoverPanel.style.display = 'block';
	});
	
	container.addEventListener('mouseleave', () => {
		// Hide after a short delay to allow moving to the panel
		setTimeout(() => {
			// Only hide if not hovering the panel
			if (!hoverPanel.matches(':hover') && !container.matches(':hover')) {
				hoverPanel.style.display = 'none';
			}
		}, CONFIG.HOVER_DELAY);
	});
	
	// Handle hover events for the panel
	hoverPanel.addEventListener('mouseleave', () => {
		// Hide after a short delay
		setTimeout(() => {
			// Only hide if not hovering the container or panel
			if (!hoverPanel.matches(':hover') && !container.matches(':hover')) {
				hoverPanel.style.display = 'none';
			}
		}, CONFIG.HOVER_DELAY);
	});
	
	// Handle clicks outside the panel to close it
	document.addEventListener('click', (e: MouseEvent) => { // Type the event
		// Check if target is a Node before calling contains
		if (hoverPanel.style.display === 'block' && 
			e.target instanceof Node && 
			!container.contains(e.target) && 
			!hoverPanel.contains(e.target)) {
			hoverPanel.style.display = 'none';
		}
	});
	
	// Handle sync button click
	if (syncButton) {
		syncButton.addEventListener('click', () => {
			const username = container.dataset.username;
			if (!username) return;
			
			clearContributorCache(username); 
			fetchAllStats({ 
				contributor: username, 
				repoPath, 
				currentNum, 
				org,
				forceUpdate: true
			});
		});
	}
}

// Check if cache is expired
function isCacheExpired(lastUpdate: number | undefined): boolean {
	if (!lastUpdate) return true;
	
	const now = Date.now();
	return now - lastUpdate > CONFIG.CACHE_EXPIRATION;
}

// Fetch stats for all scopes (repo, org, account)
function fetchAllStats({ contributor, repoPath, currentNum, org, forceUpdate }: PathInfo & { forceUpdate?: boolean }): void {
	if (!contributor) return;
	// Fetch repo stats
	fetchStats({ contributor, repoPath, currentNum, scope: "repo", user: undefined, forceUpdate }); // Pass user as undefined for repo scope
	
	// Fetch org stats (use org as user and repoPath context)
	fetchStats({ contributor, repoPath: org, currentNum, scope: "org", user: org, forceUpdate });
	
	// Fetch account stats (use __self as repoPath context)
	fetchStats({ contributor, repoPath: "__self", currentNum, scope: "account", user: undefined, forceUpdate }); // Pass user as undefined for account scope
}

// Type for parameters of updateStatsDisplay
interface UpdateStatsParams {
	prText: string;
	issueText: string;
	scope: 'repo' | 'org' | 'account';
	lastUpdate?: number;
}

// Update stats display for a specific container
function updateStatsDisplay({ prText, issueText, scope, lastUpdate }: UpdateStatsParams): void {
	// Update the main display (always shows repo stats)
	if (scope === "repo") {
		const prNode = document.getElementById(ELEMENT_IDS.PR_COUNT);
		if (prNode) {
			const spanNode = prNode.querySelector("span");
			if (spanNode) {
				spanNode.textContent = prText;
			}
		}

		const issueNode = document.getElementById(ELEMENT_IDS.ISSUE_COUNT);
		if (issueNode) {
			const spanNode = issueNode.querySelector("span");
			if (spanNode) {
				spanNode.textContent = issueText;
			}
		}
	}
	
	// Update the hover panel stats based on scope
	const prScopeNode = document.getElementById(`gce-${scope}-pr-count`) as HTMLAnchorElement | null;
	if (prScopeNode) {
		prScopeNode.textContent = padNumber(prText);
	}
	
	const issueScopeNode = document.getElementById(`gce-${scope}-issue-count`) as HTMLAnchorElement | null;
	if (issueScopeNode) {
		issueScopeNode.textContent = padNumber(issueText);
	}

	// Update timestamp
	const updateTimeNode = document.getElementById(ELEMENT_IDS.UPDATE_TIME) as HTMLElement | null;
	if (updateTimeNode && typeof lastUpdate === "number") {
		updateTimeNode.textContent = formatTimestamp(lastUpdate);
	}
	// Reset sync button in hover panel
	const syncButton = document.getElementById(ELEMENT_IDS.SYNC_BUTTON) as HTMLButtonElement | null;
	if (syncButton) {
		syncButton.disabled = false;
		syncButton.innerHTML = ICONS.SYNC;
		syncButton.title = "refresh";
	}
}

// Format timestamp for display
function formatTimestamp(lastUpdate: number): string { // lastUpdate must be a number here
	// Format the time in a more compact way
	const now = new Date();
	const updated = new Date(lastUpdate);
	const diffMs = now.getTime() - updated.getTime(); // Use getTime() for difference
	const diffMins = Math.round(diffMs / 60000);
	const diffHours = Math.round(diffMs / 3600000);
	const diffDays = Math.round(diffMs / 86400000);

	let timeText = "";
	if (diffMins < 1) {
		timeText = "<1m";
	} else if (diffMins < 60) {
		timeText = `${diffMins}m`;
	} else if (diffHours < 24) {
		timeText = `${diffHours}h`;
	} else {
		timeText = `${diffDays}d`;
	}

	return `${timeText} ago`;
}

// Type guard to check if the object is a ContributorStats object (and not an error response)
function isContributorStats(data: unknown): data is ContributorStats { // Use unknown for parameter
  return typeof data === 'object' && data !== null && ('prs' in data || 'issues' in data || 'lastUpdate' in data) && !('message' in data) && !('errors' in data);
}

// Handle API errors and update UI accordingly
function handleApiError(repoInfo: { contributor: string, repoPath: string, org?: string, currentNum?: string }, scope: 'repo' | 'org' | 'account', reason: 'token_missing' | 'api_error'): void {
	const { contributor, repoPath, org, currentNum } = repoInfo; // Destructure with potentially undefined org/currentNum
	const prCountEl = document.getElementById(`gce-${scope}-pr-count`) as HTMLAnchorElement | null;
	const issueCountEl = document.getElementById(`gce-${scope}-issue-count`) as HTMLAnchorElement | null;
	const updateTimeEl = document.getElementById(ELEMENT_IDS.UPDATE_TIME) as HTMLElement | null;
	const syncButton = document.getElementById(ELEMENT_IDS.SYNC_BUTTON) as HTMLButtonElement | null;

	const errorText = "Error";

	if (prCountEl) prCountEl.textContent = errorText;
	if (issueCountEl) issueCountEl.textContent = errorText;
	if (updateTimeEl) updateTimeEl.textContent = "Failed";

	if (syncButton) {
		syncButton.disabled = false;
		syncButton.innerHTML = ICONS.SYNC;
		syncButton.title = "Retry fetching stats";
		// Re-add event listener if needed, or ensure it persists
		// Check if contributor is defined before setting onclick
		if (contributor) {
			syncButton.onclick = () => {
				// Ensure fetchStats uses imported functions and correct params
				const fetchParams: FetchStatsParams = {
					contributor,
					repoPath: scope === "repo" ? repoPath : scope === "org" ? org || '' : "__self",
					currentNum, 
					scope,
					user: scope === "org" ? org : undefined,
					forceUpdate: true, 
				};
				fetchStats(fetchParams);
			};
		} else {
			syncButton.onclick = null; // Disable if contributor is missing
		}
	}

	// showToast may need refactoring if it relied on global state/functions
	let toastMessage: string;
	if (reason === 'token_missing') { // Specific check for missing token
		toastMessage = 'GitHub Access Token not set. Please set it in the <a href="#" id="gce-options-link" style="text-decoration: underline; color: inherit;">extension options</a>.';
	} else {
		toastMessage = `Failed to fetch stats for ${contributor || 'unknown user'} in ${scope}. Check token/permissions or API rate limits.`;
	}
	showToast(toastMessage, reason === 'token_missing' ? 'warning' : 'error'); // Use warning for token missing

	// Consider removing cached data on error
	const storageKeyPath = scope === "repo" ? repoPath : scope === "org" ? org : "__self";
	if(contributor && storageKeyPath) {
		setStorage(contributor, storageKeyPath, {}); // Clear storage for this scope
	}
}

// Fetch stats for a specific scope
async function fetchStats(params: FetchStatsParams): Promise<void> { // Use FetchStatsParams
	const { contributor, repoPath, currentNum, scope, user, forceUpdate = false } = params;
	if (!contributor) {
		// console.warn("[Contributors on GitHub]: fetchStats called without contributor.");
		return;
	}

	const prCountEl = document.getElementById(`gce-${scope}-pr-count`) as HTMLAnchorElement | null;
	const issueCountEl = document.getElementById(`gce-${scope}-issue-count`) as HTMLAnchorElement | null;
	const syncButton = document.getElementById(ELEMENT_IDS.SYNC_BUTTON) as HTMLButtonElement | null;

	// Indicate loading
	if (prCountEl) prCountEl.textContent = "...";
	if (issueCountEl) issueCountEl.textContent = "...";
	if (syncButton) {
		syncButton.disabled = true;
		syncButton.innerHTML = `<span class="AnimatedEllipsis"></span>`; // Loading indicator
	}

	const keysToGet = {
		[STORAGE_KEYS.ACCESS_TOKEN]: null,      
		[STORAGE_KEYS.SHOW_PRIVATE_REPOS]: true 
	};
	const syncData = await browser.storage.sync.get(keysToGet);

	// Access token might be undefined if not in storage, default to null
	const access_token = syncData.access_token ?? null; 
	// Default to true if undefined
	const showPrivateRepos = syncData._showPrivateRepos ?? true; 

	if (!access_token) {
		handleApiError({ contributor, repoPath, org: user, currentNum }, scope, 'token_missing'); // Pass reason
		return;
	}
	
	// If on a private repo and settings hide private stats, don't fetch
	if (isPrivate() && showPrivateRepos === false) { 
		// console.warn("[Contributors on GitHub]: Skipping fetch for private repo based on settings.");
		updateStatsDisplay({ prText: "-", issueText: "-", scope }); // Indicate skipped
		return;
	}

	// Determine the correct key for storage based on scope
	const storageKeyPath = repoPath; 
	const storageResult = await getStorage(contributor, storageKeyPath);
	const cachedDataRaw = storageResult[`${contributor}|${storageKeyPath}`];
	let cachedData: ContributorStats = {};
	if(typeof cachedDataRaw === 'object' && cachedDataRaw !== null) {
		cachedData = cachedDataRaw as ContributorStats;
	}

	// If not forcing update and cache is valid, use cached data
	if (!forceUpdate && cachedData.lastUpdate && !isCacheExpired(cachedData.lastUpdate)) {
		// console.log(`[Contributors on GitHub]: Using cached data for ${contributor} in ${scope}`);
		updateStatsDisplay({
			prText: formatText(cachedData.prs, cachedData.firstPrNumber, currentNum, scope),
			issueText: formatText(cachedData.issues, cachedData.firstIssueNumber, currentNum, scope),
			scope,
			lastUpdate: cachedData.lastUpdate,
		});
		return;
	}

	// console.log(`[Contributors on GitHub]: Fetching fresh data for ${contributor} in ${scope}`);

	// Fetch PRs and Issues
	const [prResult, issueResult] = await Promise.all([
		contributorCount({
			access_token,
			contributor,
			repoPath: storageKeyPath,
			user, // Pass user (string | undefined)
			old: cachedData,
			type: "pr",
			scope
		}),
		contributorCount({
			access_token,
			contributor,
			repoPath: storageKeyPath,
			user, // Pass user (string | undefined)
			old: cachedData, 
			type: "issue",
			scope
		})
	]);

	// Check for errors in results
	if (!isContributorStats(prResult) || !isContributorStats(issueResult)) {
		// Handle API error from either call
		handleApiError({ contributor, repoPath, org: user, currentNum }, scope, 'api_error'); // Pass reason
		const errorMsg = (!isContributorStats(prResult) ? prResult.message : '') || 
					   (!isContributorStats(issueResult) ? issueResult.message : '') || 
					   'Unknown API error';
		console.error("[Contributors on GitHub]: API Error results:", { prResult, issueResult });
		return;
	}
	
	// Merge results - contributorCount now returns the *final* stats object
	// We just need the latest update time, PR count from prResult, issue count from issueResult
	const finalData: ContributorStats = {
		...cachedData, // Start with old cache
		...prResult,   // Overwrite with PR results (includes lastUpdate)
		...issueResult, // Overwrite with Issue results (includes lastUpdate, potentially same as PRs)
		prs: prResult.prs, // Explicitly take PR count from PR result
		issues: issueResult.issues, // Explicitly take Issue count from Issue result
		firstPrNumber: prResult.firstPrNumber, // Take first numbers
		firstIssueNumber: issueResult.firstIssueNumber,
		lastUpdate: Math.max(prResult.lastUpdate ?? 0, issueResult.lastUpdate ?? 0) // Use latest update time
	};
	
	// Update UI
	updateStatsDisplay({
		prText: formatText(finalData.prs, finalData.firstPrNumber, currentNum, scope),
		issueText: formatText(finalData.issues, finalData.firstIssueNumber, currentNum, scope),
		scope,
		lastUpdate: finalData.lastUpdate,
	});
}

// Pad numbers for consistent width
function padNumber(text: string): string { // Add type for text
	// Only pad if it's a number
	const num = Number(text);
	if (!Number.isNaN(num) && text !== "...") {
		// Right-align with space padding
		return text.toString().padStart(CONFIG.STAT_PADDING, ' ');
	}
	return text;
}

// Simple Toast Notification System
function showToast(message: string, type: "error" | "warning" | "success" = "error"): void { // Add types
	// Remove existing toast if any
	const existingToast = document.getElementById("gce-toast");
	if (existingToast) {
		existingToast.remove();
	}

	// Create toast element
	const toast = document.createElement("div");
	toast.id = "gce-toast";

	// Set base styles
	toast.style.position = "fixed";
	toast.style.bottom = "20px";
	toast.style.right = "20px";
	toast.style.padding = "12px 16px";
	toast.style.borderRadius = "6px";
	toast.style.zIndex = "100";
	toast.style.maxWidth = "300px";
	toast.style.boxShadow = "0 3px 6px rgba(0, 0, 0, 0.16)";
	toast.style.fontSize = "14px";

	// Set type-specific styles
	if (type === "warning") {
		toast.style.backgroundColor = "#fff3cd";
		toast.style.color = "#856404";
		toast.style.border = "1px solid #ffeeba";
	} else if (type === "error") {
		toast.style.backgroundColor = "#f8d7da";
		toast.style.color = "#721c24";
		toast.style.border = "1px solid #f5c6cb";
	} else {
		toast.style.backgroundColor = "#d4edda";
		toast.style.color = "#155724";
		toast.style.border = "1px solid #c3e6cb";
	}

	toast.innerHTML = `
    <div>
      <span>${message}</span>
    </div>
  `;

	document.body.appendChild(toast);

	// Add listener for the options link IF it exists in this toast
	const optionsLink = toast.querySelector<HTMLAnchorElement>('#gce-options-link');
	if (optionsLink) {
		optionsLink.addEventListener('click', (event) => {
			event.preventDefault();
			// Send a message to the background script to open the options page
			browser.runtime.sendMessage({ action: "openOptionsPage" });
		});
	}

	// Auto-remove after 5 seconds
	setTimeout(() => {
		toast.style.opacity = "0";
		toast.style.transition = "opacity 0.5s ease";
		setTimeout(() => toast.remove(), 500);
	}, 5000);
}

/**
 * Main Initialization Function
 */
function initializeContributorStats(): void {
	// console.log("[Contributors on GitHub]: Initializing contributor stats...");

	// Check if we are on a relevant page (PR or Issue)
	if (!isPR(location.pathname) && !isIssue(location.pathname)) {
		// console.log("[Contributors on GitHub]: Not on a PR or Issue page.");
		return;
	}

	// Attempt to get the contributor from the DOM
	const firstContributor = getFirstContributor();
	if (!firstContributor) {
		// console.log("[Contributors on GitHub]: Contributor element not found yet, likely page hasn't fully rendered. Skipping initialization for now.");
		return;
	}

	// Remove existing UI if it exists (for SPA navigations)
	// document.getElementById(ELEMENT_IDS.CONTAINER)?.remove();
	// document.getElementById('gce-responsive-styles')?.remove(); // Remove old styles if present
	// Reset the flag here to allow re-initialization of handlers
	window.gceEventHandlersInitialized = false; 

	const pathInfo = getPathInfo();

	if (!pathInfo.contributor) {
		// This check might be redundant now due to the check above, but keep for safety
		// console.warn("[Contributors on GitHub]: Could not determine contributor even after finding element.");
		return;
	}

	console.log(`[Contributors on GitHub]: ${pathInfo.contributor}, ${pathInfo.repoPath}`);

	// Inject initial UI structure (which includes styles now)
	injectInitialUI(pathInfo);
}