uithubs goal is to support the entire github url structure and make its data accessible to APIs and LLMs at high scale. Besides this url structure, uithub will allow navigating over data from other domains as well, and allow performing and navigating inferences of this data.

# GitHub URL Structure

| Resource Type                          | URL Pattern                                                       | Supported in uithub         |
| -------------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| User Profile, starred, repos, projects | uithub.com/{owner}                                                | ✅                          |
| Repository                             | uithub.com/{owner}/{repository}                                   | ✅                          |
| Repository Wiki                        | uithub.com/{owner}/{repository}/wiki                              | ✅                          |
| Specific Branch                        | uithub.com/{owner}/{repository}/tree/{branch_name}                | ✅                          |
| File or Directory                      | uithub.com/{owner}/{repository}/blob/{branch_name}/{path_to_file} | ✅                          |
| Repository Issues                      | uithub.com/{owner}/{repository}/issues                            | ✅                          |
| Specific Issue                         | uithub.com/{owner}/{repository}/issues/{issue_number}             | ✅                          |
| Pull Requests                          | uithub.com/{owner}/{repository}/pulls                             | ✅                          |
| Specific Pull Request                  | uithub.com/{owner}/{repository}/pull/{pr_number}                  | ✅                          |
| Repository Discussions                 | uithub.com/{owner}/{repository}/discussions                       | ✅                          |
| Specific Discussions                   | uithub.com/{owner}/{repository}/discussions/{discussion_number}   | ✅                          |
| Repository Branches                    | uithub.com/{owner}/{repository}/branches                          | ✅                          |
| Repository Commits                     | uithub.com/{owner}/{repository}/commits                           | ✅                          |
| Specific Commit                        | uithub.com/{owner}/{repository}/commit/{commit_hash}              | ✅                          |
| Repository Releases                    | uithub.com/{owner}/{repository}/releases                          | ✅                          |
| Specific Release                       | uithub.com/{owner}/{repository}/releases/tag/{tag_name}           | ✅                          |
| Repository Actions                     | uithub.com/{owner}/{repository}/actions                           | ✅                          |
| Compare Changes                        | uithub.com/{owner}/{repository}/compare/{base}...{head}           | ✅                          |
| Specific Star List                     | uithub.com/stars/{owner}/lists/{list_id}                          | ✅                          |
| Organization                           | uithub.com/orgs/{org_name}                                        | ✅                          |
| Starred Repositories                   | uithub.com/stars/{owner}                                          | ❌ (works through /{owner}) |
| Repository Projects                    | uithub.com/{owner}/{repository}/projects                          | ❌                          |
| Gists                                  | uithub.com/{owner}/gists/{gist_id}                                | ❌ (tbd)                    |

# Custom Extensions to URL Structure

| Feature                | URL Pattern                                                | Description                                                   |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Domain as Owner        | uithub.com/**{domain.tld}**/{id}                           | Use domain as owner with repository being an ID               |
| Alternative Page Types | uithub.com/{owner}/{repository}/**{page}**/{branch}/{path} | Page type can be: swc, typedoc, x, etc. beyond standard types |
| Extended Format        | uithub.com/{owner}/{repository}/**{page}.{ext}**           | Add file extension to page type for different data formats    |
