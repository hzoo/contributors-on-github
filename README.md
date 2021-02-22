<p align="center">
  <img alt="" src="graphics/readme_git_nodes.png">
</p>

# Contributors on Github

The original idea was to show if it's a contributors first PR on the pull request page such as https://github.com/babel/babel/pull/3283.

[![](firstpr.gif)](https://github.com/babel/babel/pull/3283)

Much thanks to @Pocket-titan and @djrosenbaum for working on the logo 🖼!

---

## Install

[link-chrome]: https://chrome.google.com/webstore/detail/github-contributor-stats/cjbacdldhllelehomkmlniifaojgaeph?hl=en 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/contributor-on-github/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_128x128.png" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/cjbacdldhllelehomkmlniifaojgaeph.svg?label=%20">][link-chrome] also compatible with [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png" width="24" alt="Edge" valign="middle">][link-chrome] [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/opera/opera_48x48.png" width="24" alt="Opera" valign="middle">][link-chrome]

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_128x128.png" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/contributor-on-github.svg?label=%20">][link-firefox]

---

## Usage

You can start from any page on `github.com` and when you navigate to a specific issue/pull request (such as https://github.com/babel/babel/pull/3331), it will inject information inline (like the # of PRs a user has made to that specific repo).

[![](injected-content.png)](https://github.com/jscs-dev/node-jscs/pull/2180)

You can click on `🔄` to update the data if it has changed (it is cached in chrome storage).

If necessary, you may want to create or get a "access token" that uses the `public_repo` permission if you want to use a 30/min rate limit instead of 10/min.

> If you want to use this on private repos then you'll need to add the `repo` permission instead. I would recommend installing locally for this.

<img src="options.png" alt="options" height="300px">

---

## Permissions

- "https://github.com/*/*": to be able to inject data into github
  - The [content script](src/content.js) was matching `"https://github.com/*/*/pull/*` which is correct, but if you start from the hompage, then the script won't ever be injected since github is using pushState to change urls. Now it will match `https://github.com` and then check for the specific url.
- "https://api.github.com/*": to fetch issue/pr data
- `"storage"`, to store access token, cache user PR data.
- `"identity"`, to create an oauth request window.
 
---

## Local Install (Chrome)

- Download the zip, and unzip it

<img src="load-extension.png" alt="local install instructions" height="150px">

- Go to [`chrome://extensions/`](chrome://extensions/)
- Click on `Load unpacked extension...`
- Select the `src` folder of the unzipped folder you downloaded

Now try it out!

## Local Install (Firefox)

- Go to [`about:debugging#/runtime/this-firefox`](about:debugging#/runtime/this-firefox)
- Click on `Load Temporary Add-on…`
- Select the `manifest.json` file in the `src` folder you downloaded
- You're done! It should also show up in `about:addons`

---

## Related

- [Awesome browser extensions for GitHub](https://github.com/stefanbuck/awesome-browser-extensions-for-github)
- [Refined GitHub](https://github.com/sindresorhus/refined-github/) - OG github extension

---

## License

MIT
