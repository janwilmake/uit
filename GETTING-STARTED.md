# Running locally

Prerequisites:

- [wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

Installation:

- Run uithub

```
git clone https://github.com/janwilmake/uit.git`
cd uit/uithub
wrangler dev
```

- Run sponsorflare

```
git clone https://github.com/janwilmake/cloudflare-sponsorware.git`
cd cloudflare-sponsorware
wrangler dev --port 3001
```

Ensure to setup `.dev.vars` correctly (copy `.dev.vars.example` and add your GitHub PAT (create one [here](https://github.com/settings/tokens))).

# Developing a new plugin locally

Add your plugin to [plugins.json](uithub/public/plugins.json) and explore it through the interface. Should work with a remote plugin as well as a local one on another port, e.g. `http://localhost:3002`.

# Running a new plugin directly from the hosted interface

This isn't possible yet, but I'm working hard to realize this. Ideally you'd configure the `dev` plugin from the interface with a endpoint URL that is submitted as a shared cookie. This URL must be a remote URL that follows the FormData to FormData spec or is in API format. When visiting the `dev` page (https://uithub.com/[owner]/[repo]/dev/[branch]/...) the plugin provided would become accessible.

🤔 Instead of having to develop `uithub.murl` immediately, it might be faster to build this out quickly and discourage local development altogether. However, having uithub.murl is gonna be great!
