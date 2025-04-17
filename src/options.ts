import { STORAGE_KEYS, CACHE_PREFIX } from "./storage";

// DOM elements (get them once the DOM is loaded)
let elements: {
	accessTokenInput: HTMLInputElement | null;
	clearCacheButton: HTMLButtonElement | null;
	showPrivateReposInput: HTMLInputElement | null;
	feedbackElement: HTMLElement | null;
} | null = null;

/**
 * Shows feedback message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, warning)
 */
function showFeedback(
	message: string,
	type: "success" | "error" | "warning" = "success",
) {
	if (!elements?.feedbackElement) return;

	elements.feedbackElement.textContent = message;
	elements.feedbackElement.style.display = "block";

	// Reset classes
	elements.feedbackElement.className = "feedback";
	elements.feedbackElement.classList.add(type);

	// Auto-hide after 3 seconds
	setTimeout(() => {
		if (elements?.feedbackElement) {
			elements.feedbackElement.style.display = "none";
		}
	}, 3000);
}

/**
 * Validates a GitHub token by making a test API call
 * @param {string} token - The token to validate
 * @returns {Promise<boolean>} - Whether the token is valid
 */
async function validateToken(token: string): Promise<boolean> {
	if (!token) return false;

	try {
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
			},
		});

		return response.status !== 401 && response.ok;
	} catch (error) {
		console.error("Token validation error:", error);
		return false;
	}
}

/**
 * Saves the access token after validation
 */
async function saveToken() {
	if (!elements?.accessTokenInput) return;
	try {
		const token = elements.accessTokenInput.value.trim();

		if (token) {
			showFeedback("Validating token...");
			const isValid = await validateToken(token);

			if (!isValid) {
				showFeedback(
					"Invalid token. Please check your token and try again.",
					"error",
				);
				return;
			}
		}

		await browser.storage.sync.set({ [STORAGE_KEYS.ACCESS_TOKEN]: token });
		showFeedback("Token saved successfully");
	} catch (error) {
		const message =
			error instanceof Error && error.message ? error.message : String(error);
		showFeedback(`Error saving token: ${message}`, "error");
	}
}

/**
 * Clears only the contributor data cache from localStorage
 */
function clearContributorCache() {
	try {
		for (const key of Object.keys(localStorage)) {
			if (key.startsWith(CACHE_PREFIX)) {
				localStorage.removeItem(key);
			}
		}
		showFeedback("Contributor data cache cleared successfully");
	} catch (error) {
		const message =
			error instanceof Error && error.message ? error.message : String(error);
		showFeedback(`Error clearing cache: ${message}`, "error");
	}
}

/**
 * Saves the "show private repos" setting
 */
async function savePrivateReposSetting() {
	if (!elements?.showPrivateReposInput) return;
	try {
		await browser.storage.sync.set({
			[STORAGE_KEYS.SHOW_PRIVATE_REPOS]: elements.showPrivateReposInput.checked,
		});
		showFeedback("Setting saved");
	} catch (error) {
		const message =
			error instanceof Error && error.message ? error.message : String(error);
		showFeedback(`Error saving setting: ${message}`, "error");
	}
}

/**
 * Initialize the options page
 */
async function initOptions() {
	// Get elements now that DOM is loaded
	elements = {
		accessTokenInput: document.getElementById(
			"token-input",
		) as HTMLInputElement | null,
		clearCacheButton: document.getElementById(
			"clear-cache",
		) as HTMLButtonElement | null,
		showPrivateReposInput: document.getElementById(
			"show-private-repos",
		) as HTMLInputElement | null,
		feedbackElement: document.getElementById("feedback") as HTMLElement | null,
	};

	// Load saved settings
	try {
		const settings = await browser.storage.sync.get({
			[STORAGE_KEYS.ACCESS_TOKEN]: null,
			[STORAGE_KEYS.SHOW_PRIVATE_REPOS]: false,
		});

		if (settings[STORAGE_KEYS.ACCESS_TOKEN] && elements.accessTokenInput) {
			elements.accessTokenInput.value = settings[STORAGE_KEYS.ACCESS_TOKEN];
		}

		if (elements.showPrivateReposInput) {
			elements.showPrivateReposInput.checked =
				!!settings[STORAGE_KEYS.SHOW_PRIVATE_REPOS];
		}
	} catch (error) {
		const message =
			error instanceof Error && error.message ? error.message : String(error);
		showFeedback(`Error loading settings: ${message}`, "error");
	}

	// Set up event listeners with null checks
	elements.accessTokenInput?.addEventListener("keydown", async (event) => {
		if (event.key === "Enter") {
			event.preventDefault(); // Prevent potential form submission
			await saveToken();
			(event.target as HTMLElement)?.blur(); // Blur the input
		}
	});
	// Also save on blur, in case they click away instead of pressing Enter
	elements.accessTokenInput?.addEventListener("blur", async () => {
		await saveToken();
	});
	elements.clearCacheButton?.addEventListener("click", clearContributorCache);
	elements.showPrivateReposInput?.addEventListener(
		"change",
		savePrivateReposSetting,
	);
}

document.addEventListener("DOMContentLoaded", initOptions);
