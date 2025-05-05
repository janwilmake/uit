# uithub router

The goal for uithub is to support the entire url structure of major websites, and make its data accessible to APIs and LLMs at high scale. The current focus on the following domains:

- github.com - for source code
- npmjs.com - for packages
- x.com - for social data

uithub brings the UIT protocol to the browser by routing any URL structure to the right source, plugin, and query params. This allows uithub to view context for any domain.

![](router.drawio.png)

Anyone can create a website-router to become viewable by uithub. Your domain specific router should mirror the URL structure of the original domain (e.g. github -> uithub, x -> xymake) and map the URL to a StandardURL JSON Response. See [standard-url.schema.json](public/standard-url.schema.json) for the specification.

![](convention.drawio.svg)

How should the convention work?

1. github is the default source
2. if first segment is of format {domain.tld}, another router gets applied to retrieve the source
3. which is the basePath and branch (optional) is determined based on the pathname and the domain. {subPath} is then known

Uithub URL pathname consists of:

- source-locator
- page
- version-identifier (optional)
- subpath

This should allow accessing any source and explore/transform it in different ways.

# Conventions in the URL Structure

| Feature                | URL Pattern                                                | Description                                                | Routing Complete | Implementation Done | Stable |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------- | ------------------- | ------ |
| Domain specific router | uithub.com/**{domain.tld}**                                | Use domain as owner with repository being an ID            | ✅               | ✅                  | ✅     |
| Alternative Page Types | uithub.com/{owner}/{repository}/**{page}**/{branch}/{path} | Page type can be any compatible plugin                     | ✅               | ✅                  | ❌     |
| Extended Format        | uithub.com/{owner}/{repository}/**{page}.{ext}**           | Add file extension to page type for different data formats | ✅               | ✅                  | ❌     |

# GitHub URL Structure

| Resource Type                          | URL Pattern                                                       | Routing Complete | Implementation Done | Stable |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------- | ------------------- | ------ |
| User Profile, starred, repos, projects | uithub.com/{owner}                                                | ✅               | ❌                  | ❌     |
| Repository                             | uithub.com/{owner}/{repository}                                   | ✅               | ✅                  | ❌     |
| Repository Wiki                        | uithub.com/{owner}/{repository}/wiki                              | ✅               | 🟠                  | ❌     |
| Specific Branch                        | uithub.com/{owner}/{repository}/tree/{branch_name}                | ✅               | ✅                  | ✅     |
| File or Directory                      | uithub.com/{owner}/{repository}/blob/{branch_name}/{path_to_file} | ✅               | ✅                  | ✅     |
| Repository Issues                      | uithub.com/{owner}/{repository}/issues                            | ✅               | 🟠                  | ❌     |
| Specific Issue                         | uithub.com/{owner}/{repository}/issues/{issue_number}             | ✅               | 🟠                  | ❌     |
| Pull Requests                          | uithub.com/{owner}/{repository}/pulls                             | ✅               | 🟠                  | ❌     |
| Specific Pull Request                  | uithub.com/{owner}/{repository}/pull/{pr_number}                  | ✅               | 🟠                  | ❌     |
| Repository Discussions                 | uithub.com/{owner}/{repository}/discussions                       | ✅               | 🟠                  | ❌     |
| Specific Discussions                   | uithub.com/{owner}/{repository}/discussions/{discussion_number}   | ✅               | 🟠                  | ❌     |
| Repository Branches                    | uithub.com/{owner}/{repository}/branches                          | ✅               | ❌                  | ❌     |
| Repository Commits                     | uithub.com/{owner}/{repository}/commits                           | ✅               | ❌                  | ❌     |
| Specific Commit                        | uithub.com/{owner}/{repository}/commit/{commit_hash}              | ✅               | ❌                  | ❌     |
| Repository Releases                    | uithub.com/{owner}/{repository}/releases                          | ✅               | ❌                  | ❌     |
| Specific Release                       | uithub.com/{owner}/{repository}/releases/tag/{tag_name}           | ✅               | ❌                  | ❌     |
| Repository Actions                     | uithub.com/{owner}/{repository}/actions                           | ✅               | ❌                  | ❌     |
| Compare Changes                        | uithub.com/{owner}/{repository}/compare/{base}...{head}           | ✅               | ❌                  | ❌     |
| Specific Star List                     | uithub.com/stars/{owner}/lists/{list_id}                          | ✅               | ❌                  | ❌     |
| Organization                           | uithub.com/orgs/{org_name}                                        | ✅               | ❌                  | ❌     |
| Starred Repositories                   | uithub.com/stars/{owner}                                          | ❌               | ❌                  | ❌     |
| Repository Projects                    | uithub.com/{owner}/{repository}/projects                          | ❌               | ❌                  | ❌     |
| Gists                                  | uithub.com/{owner}/gists/{gist_id}                                | ❌               | ❌                  | ❌     |

# X URL Structure

| Resource Type                 | URL Pattern                              | Routing Complete | Implementation Done | Stable |
| ----------------------------- | ---------------------------------------- | ---------------- | ------------------- | ------ |
| User (all username endpoints) | uithub.com/x.com/{username}              | ✅               | ❌                  | ❌     |
| List details and members      | uithub.com/x.com/i/lists/[list_id]       | ✅               | ❌                  | ❌     |
| Bookmarks                     | uithub.com/x.com/i/bookmarks             | ❌               | ❌                  | ❌     |
| Topics                        | uithub.com/x.com/i/topics                | ❌               | ❌                  | ❌     |
| Spaces                        | uithub.com/x.com/i/spaces                | ❌               | ❌                  | ❌     |
| Communities                   | uithub.com/x.com/i/communities           | ❌               | ❌                  | ❌     |
| Home timeline                 | uithub.com/x.com/home                    | ❌               | ❌                  | ❌     |
| Messages                      | uithub.com/x.com/messages                | ❌               | ❌                  | ❌     |
| Notifications                 | uithub.com/x.com/notifications           | ❌               | ❌                  | ❌     |
| Explore                       | uithub.com/x.com/explore                 | ❌               | ❌                  | ❌     |
| Search                        | uithub.com/x.com/search?q=[search_terms] | ❌               | ❌                  | ❌     |

# NPM URL Structure

| Resource Type          | URL Pattern                                                      | Routing Complete | Implementation Done | Stable |
| ---------------------- | ---------------------------------------------------------------- | ---------------- | ------------------- | ------ |
| Base route             | uithub.com/npmjs.com/                                            | ❌               | ❌                  | ❌     |
| Package (regular)      | uithub.com/npmjs.com/package/[package_name]                      | ✅               | ✅                  | ✅     |
| Package (scoped)       | uithub.com/npmjs.com/package/@[scope]/[package_name]             | ✅               | ✅                  | ✅     |
| Package version        | uithub.com/npmjs.com/package/[package_name]/v/[version]          | ✅               | ✅                  | ✅     |
| Scoped package version | uithub.com/npmjs.com/package/@[scope]/[package_name]/v/[version] | ✅               | ✅                  | ✅     |
