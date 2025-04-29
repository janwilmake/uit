// GitHub URL UX Animation Script
// This script creates a self-contained component that can be injected at <div id="urlux"></div>

(function () {
  // Create and inject styles
  const styleElement = document.createElement("style");
  styleElement.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }

        .urlux-float-animation {
            animation: float 6s ease-in-out infinite;
        }

        .urlux-text-container {
            position: relative;
            display: inline-block;
        }

        .urlux-letter {
            transition: opacity 0.4s ease;
        }

        .urlux-container {
            max-width: 64rem;
            width: 100%;
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        .urlux-header {
            text-align: center;
            margin-bottom: 4rem;
        }

        .urlux-title {
            font-size: 4rem;
            font-weight: 800;
            background: linear-gradient(to right, #a78bfa, #ec4899);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            display: inline-block;
        }

        .urlux-description {
            color: white;
            margin-top: 1.5rem;
        }

        .urlux-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 2rem;
            padding: 0 1rem;
        }

        @media (min-width: 768px) {
            .urlux-grid {
                grid-template-columns: repeat(2, 1fr);
                padding: 0;
            }
            
            .urlux-container {
                padding: 0 2rem;
            }
        }

        .urlux-card {
            background-color:rgb(39, 50, 67);
            border-radius: 0.75rem;
            padding: 1.5rem;
            transform: scale(1);
            transition: transform 0.3s ease;
            cursor: pointer;
        }

        .urlux-card:hover {
            transform: scale(1.05);
        }

        .urlux-card-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .urlux-url {
            font-size: 2.25rem;
            color: #d1d5db;
            margin-bottom: 1rem;
        }

        .urlux-card-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
            margin-bottom: 0.5rem;
        }

        .urlux-highlight {
            color:#ed64a6;
        }

        .urlux-card-description {
            color: #9ca3af;
        }
    `;
  document.head.appendChild(styleElement);

  // Animation configuration and state management
  const animationConfig = {
    wasInView: false,
    currentAnimationIndex: 0,
    animationPlaying: false,
    animationTimers: [],
  };

  // Create HTML content
  function createURLUXContent() {
    const targetDiv = document.getElementById("urlux");
    if (!targetDiv) return;

    // Set background color if not already dark
    targetDiv.style.backgroundColor =
      targetDiv.style.backgroundColor || "black";

    // Create container
    const container = document.createElement("div");
    container.id = "urlux-animation-container";
    container.className = "urlux-container";

    // Create header
    const header = document.createElement("div");
    header.className = "urlux-header";

    const title = document.createElement("h1");
    title.className = "urlux-title urlux-float-animation";
    title.textContent = "GitHub URL UX";

    const description = document.createElement("p");
    description.className = "urlux-description";
    description.textContent =
      "Try these URL changes for useful GitHub tooling.";

    header.appendChild(title);
    header.appendChild(description);

    // Create grid
    const grid = document.createElement("div");
    grid.className = "urlux-grid";

    // Card 1: github → uithub
    const card1 = document.createElement("div");
    card1.className = "urlux-card";
    card1.dataset.animationIndex = "0";

    // Create anchor for Card 1
    const link1 = document.createElement("a");
    link1.href = "https://uithub.com";
    link1.className = "urlux-card-link";

    const url1 = document.createElement("div");
    url1.className = "urlux-url";
    url1.innerHTML = `
            <span id="github-u-container" class="urlux-text-container">
                <span id="github-u-letter" class="urlux-letter">g</span>
            </span><!--
            -->ithub.com
        `;

    const cardTitle1 = document.createElement("h2");
    cardTitle1.className = "urlux-card-title";
    cardTitle1.innerHTML =
      '<span class="urlux-highlight">useful</span> context';

    const cardDesc1 = document.createElement("p");
    cardDesc1.className = "urlux-card-description";
    cardDesc1.textContent = "Get repository context for AI assistance";

    link1.appendChild(url1);
    link1.appendChild(cardTitle1);
    link1.appendChild(cardDesc1);
    card1.appendChild(link1);

    // Card 2: github → githus
    const card2 = document.createElement("div");
    card2.className = "urlux-card";
    card2.dataset.animationIndex = "1";

    // Create anchor for Card 2
    const link2 = document.createElement("a");
    link2.href = "https://githus.com";
    link2.className = "urlux-card-link";

    const url2 = document.createElement("div");
    url2.className = "urlux-url";
    url2.innerHTML = `
            githu<!--
            --><span id="github-s-container" class="urlux-text-container">
                <span id="github-s-letter" class="urlux-letter">b</span>
            </span><!--
            -->.com
        `;

    const cardTitle2 = document.createElement("h2");
    cardTitle2.className = "urlux-card-title";
    cardTitle2.innerHTML =
      'browse <span class="urlux-highlight">static</span> files';

    const cardDesc2 = document.createElement("p");
    cardDesc2.className = "urlux-card-description";
    cardDesc2.textContent = "Easy static file browsing";

    link2.appendChild(url2);
    link2.appendChild(cardTitle2);
    link2.appendChild(cardDesc2);
    card2.appendChild(link2);

    // Card 3: github → githuq
    const card3 = document.createElement("div");
    card3.className = "urlux-card";
    card3.dataset.animationIndex = "2";

    // Create anchor for Card 3
    const link3 = document.createElement("a");
    link3.href = "https://githuq.com";
    link3.className = "urlux-card-link";

    const url3 = document.createElement("div");
    url3.className = "urlux-url";
    url3.innerHTML = `
            githu<!--
            --><span id="github-q-container" class="urlux-text-container">
                <span id="github-q-letter" class="urlux-letter">b</span>
            </span><!--
            -->.com
        `;

    const cardTitle3 = document.createElement("h2");
    cardTitle3.className = "urlux-card-title";
    cardTitle3.innerHTML =
      'ask any <span class="urlux-highlight">question</span>';

    const cardDesc3 = document.createElement("p");
    cardDesc3.className = "urlux-card-description";
    cardDesc3.textContent = "Question and answer for repositories";

    link3.appendChild(url3);
    link3.appendChild(cardTitle3);
    link3.appendChild(cardDesc3);
    card3.appendChild(link3);

    // Card 4: github → forgithub
    const card4 = document.createElement("div");
    card4.className = "urlux-card";
    card4.dataset.animationIndex = "3";

    // Create anchor for Card 4
    const link4 = document.createElement("a");
    link4.href = "https://forgithub.com";
    link4.className = "urlux-card-link";

    const url4 = document.createElement("div");
    url4.className = "urlux-url";
    url4.innerHTML = `
            <span id="github-for-container" class="urlux-text-container"></span><!--
            -->github.com
        `;

    const cardTitle4 = document.createElement("h2");
    cardTitle4.className = "urlux-card-title";
    cardTitle4.innerHTML =
      'tools <span class="urlux-highlight">for</span> github';

    const cardDesc4 = document.createElement("p");
    cardDesc4.className = "urlux-card-description";
    cardDesc4.textContent = "Extended GitHub tooling";

    link4.appendChild(url4);
    link4.appendChild(cardTitle4);
    link4.appendChild(cardDesc4);
    card4.appendChild(link4);

    // Append cards to grid
    grid.appendChild(card1);
    grid.appendChild(card2);
    grid.appendChild(card3);
    grid.appendChild(card4);

    // Append all to container
    container.appendChild(header);
    container.appendChild(grid);

    // Append container to target div
    targetDiv.appendChild(container);
  }

  // Check if element is in viewport by at least 50%
  function isElementInView(element, threshold = 0.5) {
    const rect = element.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // Calculate how much of the element is visible (as a percentage)
    const visibleHeight =
      Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const percentVisible = visibleHeight / rect.height;

    return percentVisible >= threshold;
  }

  // Clear all animation timers
  function clearAllAnimationTimers() {
    animationConfig.animationTimers.forEach((timer) => clearTimeout(timer));
    animationConfig.animationTimers = [];
  }

  // Animate single letter replacement
  function animateSingleLetterReplacement(
    elementId,
    originalLetter,
    newLetter,
    callback,
  ) {
    const letterElement = document.getElementById(`${elementId}-letter`);

    if (!letterElement) {
      if (callback) callback();
      return;
    }

    let timer1 = setTimeout(() => {
      // Step 1: Remove original letter
      letterElement.style.opacity = "0";

      let timer2 = setTimeout(() => {
        // Step 2: Change letter content
        letterElement.textContent = newLetter;
        letterElement.style.color = "#ed64a6"; // green-500

        let timer3 = setTimeout(() => {
          // Step 3: Show new letter
          letterElement.style.opacity = "1";

          let timer4 = setTimeout(() => {
            if (callback) {
              callback();
            }
          }, 400);
          animationConfig.animationTimers.push(timer4);
        }, 400);
        animationConfig.animationTimers.push(timer3);
      }, 400);
      animationConfig.animationTimers.push(timer2);
    }, 600);
    animationConfig.animationTimers.push(timer1);
  }

  // Animate typing for "for"
  function animateTypingFor(callback) {
    const containerElement = document.getElementById("github-for-container");

    if (!containerElement) {
      if (callback) callback();
      return;
    }

    // Start with empty container
    containerElement.innerHTML = '<span id="github-for-text"></span>';

    // Type "f"
    let timer1 = setTimeout(() => {
      document.getElementById("github-for-text").innerHTML =
        '<span style="color: #ed64a6;">f</span>';

      // Type "o"
      let timer2 = setTimeout(() => {
        document.getElementById("github-for-text").innerHTML =
          '<span style="color: #ed64a6;">fo</span>';

        // Type "r"
        let timer3 = setTimeout(() => {
          document.getElementById("github-for-text").innerHTML =
            '<span style="color: #ed64a6;">for</span>';

          let timer4 = setTimeout(() => {
            if (callback) {
              callback();
            }
          }, 1000);
          animationConfig.animationTimers.push(timer4);
        }, 400);
        animationConfig.animationTimers.push(timer3);
      }, 400);
      animationConfig.animationTimers.push(timer2);
    }, 600);
    animationConfig.animationTimers.push(timer1);
  }

  // Reset all animations to initial state
  function resetAllAnimations() {
    // Reset github-u
    const uLetter = document.getElementById("github-u-letter");
    if (uLetter) {
      uLetter.textContent = "g";
      uLetter.style.color = "#D1D5DB";
      uLetter.style.opacity = "1";
    }

    // Reset github-s
    const sLetter = document.getElementById("github-s-letter");
    if (sLetter) {
      sLetter.textContent = "b";
      sLetter.style.color = "#D1D5DB";
      sLetter.style.opacity = "1";
    }

    // Reset github-q
    const qLetter = document.getElementById("github-q-letter");
    if (qLetter) {
      qLetter.textContent = "b";
      qLetter.style.color = "#D1D5DB";
      qLetter.style.opacity = "1";
    }

    // Reset github-for
    const forContainer = document.getElementById("github-for-container");
    if (forContainer) {
      forContainer.innerHTML = "";
    }
  }

  // Play animations in sequence
  function playAnimationSequence() {
    if (animationConfig.animationPlaying) return;

    animationConfig.animationPlaying = true;
    clearAllAnimationTimers();
    resetAllAnimations();

    const animations = [
      () =>
        animateSingleLetterReplacement("github-u", "g", "u", playNextAnimation),
      () =>
        animateSingleLetterReplacement("github-s", "b", "s", playNextAnimation),
      () =>
        animateSingleLetterReplacement("github-q", "b", "q", playNextAnimation),
      () =>
        animateTypingFor(() => {
          animationConfig.animationPlaying = false;
        }),
    ];

    // Function to play the next animation
    function playNextAnimation() {
      animationConfig.currentAnimationIndex =
        (animationConfig.currentAnimationIndex + 1) % animations.length;
      animations[animationConfig.currentAnimationIndex]();
    }

    // Start with the first animation
    animationConfig.currentAnimationIndex = 0;
    animations[0]();
  }

  // Intersection Observer to check visibility
  function setupIntersectionObserver() {
    const animationContainer = document.getElementById(
      "urlux-animation-container",
    );

    if (!animationContainer) return;

    const options = {
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Check if the container is at least 50% in view
        if (entry.intersectionRatio >= 0.5) {
          // Container is now in view by at least 50%
          if (!animationConfig.wasInView) {
            animationConfig.wasInView = true;
            playAnimationSequence();
          }
        } else if (entry.intersectionRatio < 0.1) {
          // Container is mostly out of view
          animationConfig.wasInView = false;
          clearAllAnimationTimers();
          animationConfig.animationPlaying = false;
        }
      });
    }, options);

    observer.observe(animationContainer);
  }

  // Fallback for browsers that don't support IntersectionObserver
  function setupScrollListener() {
    if (!("IntersectionObserver" in window)) {
      const checkVisibility = () => {
        const animationContainer = document.getElementById(
          "urlux-animation-container",
        );

        if (animationContainer && isElementInView(animationContainer, 0.5)) {
          if (!animationConfig.wasInView) {
            animationConfig.wasInView = true;
            playAnimationSequence();
          }
        } else if (animationContainer) {
          animationConfig.wasInView = false;
          clearAllAnimationTimers();
          animationConfig.animationPlaying = false;
        }
      };

      window.addEventListener("scroll", checkVisibility);
      window.addEventListener("resize", checkVisibility);
      checkVisibility();
    }
  }

  // Initialize the component
  function init() {
    createURLUXContent();
    setupIntersectionObserver();
    setupScrollListener();
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
