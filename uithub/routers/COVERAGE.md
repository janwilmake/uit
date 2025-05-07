# Implemented routers (so far)

The following routers are partly implemented. This document serves as the central source of progress for the implemented routers, showing which URLs are implemented and functional.

## github.com (default router)

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

## npmjs.com

| Resource Type          | URL Pattern                                                      | Routing Complete | Implementation Done | Stable |
| ---------------------- | ---------------------------------------------------------------- | ---------------- | ------------------- | ------ |
| Base route             | uithub.com/npmjs.com/                                            | ❌               | ❌                  | ❌     |
| Package (regular)      | uithub.com/npmjs.com/package/[package_name]                      | ✅               | ✅                  | ✅     |
| Package (scoped)       | uithub.com/npmjs.com/package/@[scope]/[package_name]             | ✅               | ✅                  | ✅     |
| Package version        | uithub.com/npmjs.com/package/[package_name]/v/[version]          | ✅               | ✅                  | ✅     |
| Scoped package version | uithub.com/npmjs.com/package/@[scope]/[package_name]/v/[version] | ✅               | ✅                  | ✅     |

## news.ycombinator.com

TODO

## x.com

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

# openapisearch.com

OpenAPISearch will provide crawled openapis in converted formats as a agent-supervised dataset. This is high prio and will be coming soon. Reach out if you have specific needs to an openapi dataset.
