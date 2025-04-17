import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Contributors on Github',
    description: 'Show Contributor Stats on Github',
    short_name: 'Stats on Github',
    homepage_url: 'https://github.com/hzoo/contributors-on-github',
    // Keep the key for development stability if needed, but usually removed for production builds outside CRX store
    // key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwnKOOu3IkB/A55pdBjEV988NSgMzl8KDo4vZeCz9uuWEyYRLOF63/i8rm4ujFgGm+sfOqIm7u3wNKmgIfEdZwdswWeVC/0/Gra4frixoiQcsykapk7bKFAuFDA06p4jHmmfZZs32bujZaqRDE9Fm4lJ4+otikCmZodHf5oxHu1NdGVSlyiFDpqh7wkg6zhUvOU5vr2bC/Ot5EMAMEtv6oHW5MAflxnLvERc0pK2abVRWvXBM9EbsekSa+d4WwJ2tMDFOe2KDM/FS6+6Jjhm/6SKDc30b+o9Ts8ueDNg8anZ0bOYvzdFtTZYqyQ18zYV252UKDOAgg1rhJkUe9RvNnwIDAQAB",
    version: '1.0.9', // Consider reading from package.json: process.env.npm_package_version
    icons: {
      '128': '/icon-128.png', // Path relative to public directory
    },
    host_permissions: [
      "https://github.com/*/*",
      "https://api.github.com/*"
    ],
    permissions: [
      "storage"
    ],
    // background service worker defined in entrypoints/background.ts
    // content_scripts defined in entrypoints/content.ts
    // options_ui defined in entrypoints/options.html
    minimum_chrome_version: '88',
    browser_specific_settings: {
      gecko: {
        id: 'contributors-on-github-test@hzoo.github.com',
        strict_min_version: '109.0',
      },
    },
    action: {
      default_icon: {
        '128': '/icon-128.png',
      },
      default_title: 'Contributors on Github Settings',
      // default_popup is automatically handled if entrypoints/popup.html exists
    },
  },
  // Automatically finds entrypoints in the entrypoints/ directory
  webExt: {
    chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"],
    startUrls: [
      "https://github.com/openai/codex/pull/75"
    ]
  }
}); 