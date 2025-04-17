/* global browser */

/**
 * Contributors on GitHub - Storage Utilities
 * Provides utilities for accessing and managing extension storage
 */

// Cache duration in milliseconds (7 days)
const CACHE_DURATION: number = 7 * 24 * 60 * 60 * 1000;

// Define an interface for storage keys for better type safety
interface StorageKeys {
	ACCESS_TOKEN: string;
	SHOW_PRIVATE_REPOS: string;
}

// Storage keys
const STORAGE_KEYS: StorageKeys = {
	ACCESS_TOKEN: "access_token",
	SHOW_PRIVATE_REPOS: "_showPrivateRepos",
};

// Local storage prefix for contributor data
export const CACHE_PREFIX: string = "gce-cache-";

// Define a type for the cached data structure
interface CachedContributorData {
	data: unknown; // Use unknown instead of any
	timestamp: number;
}

/**
 * Stores contributor data in localStorage
 * @param contributor - The GitHub username of the contributor
 * @param orgRepoPath - The organization or repository path
 * @param value - The data to store
 */
function setStorage(
	contributor: string,
	orgRepoPath: string,
	value: unknown,
): void {
	// value is unknown
	try {
		// Create a unique key for this contributor and repo/org
		const cacheKey = `${contributor}|${orgRepoPath}`;
		const dataToStore = {
			data: value,
			timestamp: Date.now(),
		};

		// Store in local storage
		localStorage.setItem(
			`${CACHE_PREFIX}${cacheKey}`,
			JSON.stringify(dataToStore),
		);
	} catch (e: unknown) {
		// Use unknown for caught errors
		console.error("Local storage error:", e);
		// Handle quota exceeded error - need type guard for accessing e.message
		if (e instanceof Error && e.message?.includes("quota")) {
			clearContributorCache(contributor); // Assuming this function handles clearing logic
		}
	}
}

/**
 * Gets contributor data from localStorage
 * @param contributor - The GitHub username of the contributor
 * @param orgRepoPath - The organization or repository path
 * @returns A promise that resolves with the stored data (or empty object)
 */
async function getStorage(
	contributor: string,
	orgRepoPath: string,
): Promise<Record<string, unknown>> {
	// Return unknown data
	const cacheKey = `${contributor}|${orgRepoPath}`; // Type inference works here

	try {
		const cachedDataString = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
		if (cachedDataString) {
			const parsed: CachedContributorData = JSON.parse(cachedDataString);
			// Check if cache is still valid
			if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
				// Return in the format { cacheKey: data }
				return { [cacheKey]: parsed.data };
			}
		}
	} catch (e) {
		console.error("Local storage read error:", e);
	}

	// Return empty object if no valid data found or on error
	return { [cacheKey]: {} };
}

/**
 * Clears only contributor data from localStorage
 */
function clearContributorCache(contributor?: string): void {
	if (contributor) {
		console.log(`Clearing localStorage cache entries for ${contributor}`);
	} else {
		console.log(`Clearing all localStorage cache entries with prefix ${CACHE_PREFIX}`);
	}
	try {
		for (const key of Object.keys(localStorage)) {
			if (key.startsWith(CACHE_PREFIX)) {
				// If contributor is provided, check if key includes their name
				// Otherwise (contributor is undefined), remove the key regardless
				if (!contributor || key.includes(`|${contributor}|`)) {
					localStorage.removeItem(key);
				}
			}
		}
	} catch (e) {
		console.error("Error clearing contributor cache:", e);
	}
}
/**
 * Clears all contributor data and optionally resets settings
 * @param preserveToken - Whether to preserve the access token
 * @returns A promise that resolves when clearing is complete
 */
async function clearAllStorage(preserveToken = true): Promise<void> {
	// Clear contributor cache from localStorage
	clearContributorCache();

	// Handle settings in sync storage
	if (preserveToken) {
		try {
			// Get current token before clearing
			// Use browser.storage.sync.get directly
			const retrievedData = await browser.storage.sync.get({
				[STORAGE_KEYS.ACCESS_TOKEN]: null,
			});
			const access_token = retrievedData[STORAGE_KEYS.ACCESS_TOKEN];

			// Clear sync storage
			await browser.storage.sync.clear();

			// Restore token if it exists
			if (access_token) {
				// Use browser.storage.sync.set directly
				await browser.storage.sync.set({
					[STORAGE_KEYS.ACCESS_TOKEN]: access_token,
				});
			}
		} catch (e) {
			console.error("Error managing sync storage:", e);
		}
	} else {
		// Clear all sync storage without preserving anything
		await browser.storage.sync.clear();
	}
}

export {
	STORAGE_KEYS, // Export constants if needed elsewhere
	CACHE_DURATION,
	setStorage,
	getStorage,
	clearContributorCache,
	clearAllStorage,
};
