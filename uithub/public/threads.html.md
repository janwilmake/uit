Make a new html in a similar style as the uithub landingpage but for listing all issues or discussions, depending on the value in the url. the url uses the same url structure as github. for the data, use the cache api as defined in the spec and take only the items from the thread type we need.

for each issue or discussion, besides adding a regular styled thread list item, also add the following buttons to be clickable:

- markdown_url goes to /[n]?accept=text/markdown

- Add details_url to each thread going to uithub address

- Relevant code URL goes to https://getrelevantcode.com/[owner]/[repo]/issues|discussions/[number]/relevant-code

- Resolve URLs go to https://filetransformers.com/[owner]/[repo]/issues|discussions/[number]/resolve/resolve|plan|confidence respectively
