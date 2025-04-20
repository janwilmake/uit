github.com/owner/repo/page/branch/...subpath

npmjs.com/package/@owner/package

x.com/i/lists/23479878723

||

uithub.com/url-id/{page}[/url-id-part2]/subpath?query...

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

TODO - create this URL parser
