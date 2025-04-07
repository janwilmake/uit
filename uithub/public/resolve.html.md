Similar to this I want a new page called "uithub issue resolution"

It uses the url pattern it finds in current url /[owner]/[repo]/[issues|discussions]/[number]

it is a dashboard with 3 panes next to each other equally divided

1. calls getrelevantcode.com/[owner]/[repo]/[issues|discussions]/[number]

2. calls analytics.forgithub.com/[owner]/[repo]/[issues|discussions]/[number]

3. calls file transformers.com/[owner]/[repo]/[issues|discussions]/[number]

it starts calling the first pane. the second only starts after the first is done, the third starts once the second is done

shows loading indicators until the result, the result can be shown in a large textarea

Similarly use tailwind CDN, html, and js
