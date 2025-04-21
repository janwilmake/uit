// Function to copy the markdown and navigate (called on button click)
function addBadgeToReadme() {
  const urlPath = window.location.pathname;
  const urlSearch = window.location.search;
  const urlParts = urlPath.split("/").filter(Boolean);
  const owner = urlParts[0];
  const repo = urlParts[1];
  const branch = urlParts[3] || "main";

  try {
    // Create a temporary textarea element
    const textarea = document.createElement("textarea");
    textarea.value = `[![${owner}/${repo} context](https://badge.forgithub.com${urlPath}${urlSearch})](https://uithub.com${window.location.pathname}${window.location.search})`;

    // Make it non-editable and invisible
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";

    // Add it to the document, select and copy
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand("copy");

    // Clean up
    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error("Copy command failed");
    } else {
      alert(
        "Copied to clipboard. You can now add the badge for this context to the README",
      );
    }

    // Navigate to README edit page
    window.location.href = `https://github.com/${owner}/${repo}/edit/${branch}/README.md`;
  } catch (err) {
    console.error("Copy failed:", err);
    alert("Failed to copy badge. Please try again.");
  }
}
