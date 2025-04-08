uithubs goal is to support the entire github url structure and make its data accessible to APIs and LLMs at high scale. Besides this url structure, uithub will allow navigating over data from other domains as well, and allow performing and navigating inferences of this data.

# GitHub URL Structure

| Resource Type             | URL Pattern                                                       | Supported in uithub  |
| ------------------------- | ----------------------------------------------------------------- | -------------------- |
| User Profile              | uithub.com/{owner}                                                | ⚠️ only html for now |
| Repository                | uithub.com/{owner}/{repository}                                   | ✅                   |
| Specific Branch           | uithub.com/{owner}/{repository}/tree/{branch_name}                | ✅                   |
| File or Directory         | uithub.com/{owner}/{repository}/blob/{branch_name}/{path_to_file} | ✅                   |
| Repository Issues         | uithub.com/{owner}/{repository}/issues                            | ❌                   |
| Specific Issue            | uithub.com/{owner}/{repository}/issues/{issue_number}             | ❌                   |
| Pull Requests             | uithub.com/{owner}/{repository}/pulls                             | ❌                   |
| Specific Pull Request     | uithub.com/{owner}/{repository}/pull/{pr_number}                  | ❌                   |
| Repository Branches       | uithub.com/{owner}/{repository}/branches                          | ❌                   |
| Repository Commits        | uithub.com/{owner}/{repository}/commits                           | ❌                   |
| Specific Commit           | uithub.com/{owner}/{repository}/commit/{commit_hash}              | ❌                   |
| Repository Releases       | uithub.com/{owner}/{repository}/releases                          | ❌                   |
| Specific Release          | uithub.com/{owner}/{repository}/releases/tag/{tag_name}           | ❌                   |
| Repository Wiki           | uithub.com/{owner}/{repository}/wiki                              | ❌                   |
| Repository Actions        | uithub.com/{owner}/{repository}/actions                           | ❌                   |
| Repository Projects       | uithub.com/{owner}/{repository}/projects                          | ❌                   |
| Gists                     | gist.uithub.com/{owner}/{gist_id}                                 | ❌                   |
| Starred Repositories      | uithub.com/stars/{owner}                                          | ❌                   |
| Specific Star List        | uithub.com/stars/{owner}/lists/{list_id}                          | ❌                   |
| User's Starred Items      | uithub.com/{owner}?tab=stars                                      | ❌                   |
| User's Repositories       | uithub.com/{owner}?tab=repositories                               | ❌                   |
| User's Projects           | uithub.com/{owner}?tab=projects                                   | ❌                   |
| Organization              | uithub.com/orgs/{org_name}                                        | ❌                   |
| Organization Repositories | uithub.com/orgs/{org_name}/repositories                           | ❌                   |
| Organization People       | uithub.com/orgs/{org_name}/people                                 | ❌                   |
| Organization Teams        | uithub.com/orgs/{org_name}/teams                                  | ❌                   |
| Compare Changes           | uithub.com/{owner}/{repository}/compare/{base}...{head}           | ❌                   |

# Custom Extensions to URL Structure

| Feature                | URL Pattern                                                      | Description                                                   |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| Domain as Owner        | uithub.com/{domain.tld}/{id}                                     | Use domain as owner with repository being an ID               |
| Alternative Page Types | uithub.com/{owner}/{repository}/{page_type}/{branch_name}/{path} | Page type can be: swc, typedoc, x, etc. beyond standard types |
| Extended Format        | uithub.com/{owner}/{repository}/{page_type}.{ext}                | Add file extension to page type for different data formats    |
| Combined Features      | uithub.com/{domain.tld}/{id}/{page_type}.{ext}/{path}            | Combining domain as owner with alternative formats            |
