# GitHub Contributior Extension

> Mainly to show if it's a contributors first PR (right now it's specific to the repo, not in general). It adds some info to any urls that look like `https://github.com/babel/babel/pull/3376`

![](firstpr.gif)

> Code is pretty horrible right now.
> I'm just glad it mostly works + happy to start using it (I guess for this as well)!
> Feel free to give some suggestions.

#### Usage

![](options.png)

You may want to create or get a "access token" that uses the `public_repo` permission if you want to use a 30/min rate limit instead of 10/min.

You can add some orgs or specific repos for this script to run on (if you don't want this to run on all repos).
- [ ] A potential feature request would be to run another request to automatically add all orgs of the user to the list.

#### Permissions
- "activeTab": to add the first PR text to the active tab
- "storage", to store access token, cache user PR data
- "webNavigation", to listen for pushState events

#### Local Install
- Download the zip, and unzip it

![](load-extension.png)

- Go to [`chrome://extensions/`](chrome://extensions/)
- Click on `Load unpacked extension...`
- Select the `src` folder of the unzipped folder you downloaded

You should see

![](chrome-entry.png)

Now you can click on the Options to set your token and repos you want to watch and it should work!

Used https://github.com/GoogleChrome/chrome-app-samples/tree/master/samples/github-auth, https://github.com/ekonstantinidis/gitify, https://github.com/sindresorhus/notifier-for-github-chrome for reference.

#### LICENSE
MIT

