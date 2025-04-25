<!--
Can probably just submit this to dev.to, don't need to make my own page per se. However, could be good for backlinks. A simple static html LLM generation based on BLOG.md would be great.
-->

Inspo: https://www.gitlip.com/blog

# Formdata Blogpost (draft)

Draft outline:

- short intro
- how uit has evolved over time, different things i tried
- why i think formdata is the best way to do multi-file streaming/processing
- whats formdata and what its capable of
- formdata history
- intro to uit framework and uuithub(uber uithub, advanced version, to be renamed at later stage)
- attribution

# Zoran

That's a good list! Some of my thoughts:

- streaming is particularly suitable for serverless environments where resources are low (can process files bigger than the memory of the worker)
- might be worthwhile to take a look at popular APIs and suggest that some of them (e.g. OpenAI image / audio APIs) should use multipart/form-data instead of their base64 approach which is wasteful in terms of memory and CPU and is not suitable for streaming
- (you're likely aware, but to mention) multipart/form-data is in the multipart family of Content-Types. It's strange to me that multipart/form-data is the recommended go-to type for general purpose use - I would've expected multipart/mixed to be that...
- I think streaming parsing is particularly interesting. Async generators in Javascript...
- worth mentioning that support for streaming form-data in browsers (and related runtimes) is not present
- If I was writing it, I might have gone as far as to claim that multipart/form-data should be the standard format to feed LLMs (don't know what your thoughts are about this). When I write prompts to LLMs, I most often default to something like ### START: file-1 ### and ### END: file-1 ### to delimit files. multipart/form-data is exactly that but standardized and the borders can be adjusted as necessary

# Claude

This is a great start for your blogpost outline! To make it a potential top Hacker News story, you'll want to balance technical depth with engaging storytelling, while adding some unique insights that spark discussion. Here are some suggestions to enhance your outline:

## Enhanced Outline for UIT/FormData Blog Post

### Introduction

- Open with a compelling problem statement about file processing challenges in modern cloud environments
- Include a brief "aha moment" that led you to explore FormData as a solution
- Tease the unique perspective or insight readers will gain

### Evolution Journey

- Share your personal journey with UIT - what specific pain points led to its creation
- Highlight the technical iterations and dead ends (zipobject.vercel, shadowfs, filetransformers)
- Frame it as a technical detective story - the search for the right abstraction

### The FormData "Revelation"

- Expand on why FormData emerged as the superior solution
- Contrast with alternatives you tried (JSON-based approaches, other streaming methods)
- Include performance benchmarks or real-world examples showing the difference

### FormData Deep Dive

- Explore FormData's origins and how it was never intended for this use case
- Explain the "hidden power" of FormData headers that most developers overlook
- Include code snippets showing FormData in traditional usage vs. your innovative approach

### The UIT Framework

- Present UIT as a mental model first, then a technical implementation
- Emphasize the 4-step process and why modularity matters for serverless architectures
- Include a visual representation of how modules can be composed

### Real-World Applications & Performance

- Show concrete examples of UIT solving previously difficult problems
- Include performance metrics (memory usage, processing times for large files)
- Discuss specific edge cases where the approach shines

### Future Directions

- Share upcoming modules or extensions to the framework
- Discuss potential integrations with other systems or standards
- Present open questions or areas where you still see room for improvement

### Community & Open Source Strategy

- Explain your vision for community contribution
- Highlight where you see the most need for collaboration
- Discuss your approach to documentation and making the project accessible

### Conclusion

- Circle back to the initial problem and how UIT represents a step forward
- End with a thought-provoking question or call to action for readers

### Technical Elements to Include:

- Diagrams showing data flow through the system
- Code snippets demonstrating key concepts
- Benchmarks comparing UIT to other approaches
- "Gotchas" and lessons learned during development

For a Hacker News audience, focus on the novel technical insights, unexpected discoveries about FormData capabilities, and architectural decisions that led to your current approach. The HN community especially appreciates posts that teach them something new about a familiar technology or challenge conventional wisdom with solid technical reasoning.

Would you like me to elaborate on any specific section of this enhanced outline?

# X Thread (leading to blogpost and repo)

<!-- It could literally lead to the blog ON GitHub. Why should I make a separate website for that? -->

# Get back to users after launch

https://x.com/janwilmake/status/1895375026939142292

Make a pinned post like this one: https://x.com/samwillis/status/1824385175486337137 a thread that introduces me to my new followers and explains my mission. also, hackernews and producthunt.

# X Thread

(🧵 1/8)
Excited to announce that UIthub is now open source! 🎉
We're building the future of code analysis and development, starting with the entire GitHub ecosystem.

(2/8)
What is UIthub? Think GitHub, but with a U - we're creating a powerful platform for extracting, analyzing, and interacting with code from any repository.

(3/8)
Our mission: Enable a community of builders to create the next generation of code analysis tools. We believe in augmenting developers with AI while ensuring quality and reliability.

(4/8)
🔍 Key Features:
• Smart code extraction from any repo
• Direct code chat interface
• Rich context for LLMs
• Comprehensive analytics dashboard

(5/8)
The future of software development will be collaborative - between humans and AI agents. UIthub provides the foundation for building and validating these tools.

(6/8)
We're working on making it incredibly simple to write code with UIthub. New features coming soon will revolutionize how developers interact with codebases.

(7/8)
Join us in building the future of software development. Check out our repo, star us on GitHub, and start contributing today!
[GitHub Link]

(8/8)
Launch also live on:
• Product Hunt: [Link]
• Hacker News: [Link]

Let's build something amazing together! 🚀

# For Hacker News:

Title: UIthub – Open-source platform for code analysis and AI-assisted development

Show HN: I've been building UIthub, a platform for advanced code analysis and AI-assisted development, and today I'm making it open source. UIthub makes it easy to extract and analyze code from any GitHub repository, providing rich context for LLMs and enabling direct code chat capabilities.

The goal is to create an ecosystem where developers can build powerful code analysis tools on top of GitHub's dataset. This will be crucial for developing and validating software development agents in the future.

Key features:

- Smart code extraction from any repository
- Direct code chat interface
- Rich context generation for LLMs
- Analytics dashboard
- Coming soon: Simplified code writing experience

I believe the future of software development will be highly collaborative between humans and AI agents. UIthub aims to provide the foundation for building and validating these tools while ensuring quality and reliability.

Repository: [Link]
Documentation: [Link]

Would love to hear your thoughts and feedback!

# For Product Hunt:

Title: UIthub - Open-source code analysis platform

Tagline: Extract, analyze, and chat with code from any GitHub repository

Description:
UIthub is now open source! We're building a platform that makes it easy to analyze and interact with code from any GitHub repository. Our mission is to enable developers to create powerful code analysis tools and lay the groundwork for reliable AI-assisted development.

What makes UIthub special:
• Smart code extraction
• Built-in code chat interface
• Rich context for LLMs
• Comprehensive analytics
• Active community focus

We're committed to building an ecosystem where developers can create innovative tools for code analysis and AI-assisted development. Join us in shaping the future of software development!

[Include relevant screenshots and links]
