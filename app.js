// ========================================
// JUNIOR DANGOTE TWIN
// Frontend interaction
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  const sidebar = document.getElementById("sidebar");
  const menuButton = document.getElementById("menuButton");
  const pageTitle = document.getElementById("pageTitle");

  // ======================================
  // PAGE NAVIGATION
  // ======================================

  const navigationButtons = document.querySelectorAll("[data-page]");
  const navigationLinks = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");

  function showPage(pageId) {
    const targetPage = document.getElementById(pageId);

    if (!targetPage) return;

    pages.forEach(page => {
      page.classList.remove("active");
    });

    targetPage.classList.add("active");

    navigationLinks.forEach(link => {
      link.classList.toggle(
        "active",
        link.dataset.page === pageId
      );
    });

    const activeLink = document.querySelector(
      `.nav-link[data-page="${pageId}"]`
    );

    pageTitle.textContent = activeLink
      ? activeLink.textContent.trim()
      : "Overview";

    if (sidebar) sidebar.classList.remove("open");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  navigationButtons.forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  // ======================================
  // BUTTONS THAT OPEN OTHER PAGES
  // ======================================

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.go);
    });
  });

  // ======================================
  // MOBILE SIDEBAR
  // ======================================

  if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  document.addEventListener("click", event => {
    if (
      window.innerWidth <= 760 &&
      sidebar &&
      menuButton &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      sidebar.classList.remove("open");
    }
  });

  // ======================================
  // PROFILE PHOTO PREVIEW
  // ======================================

  const photoUpload = document.getElementById("photoUpload");
  const identityPhoto = document.getElementById("identityPhoto");

  if (photoUpload && identityPhoto) {
    photoUpload.addEventListener("change", event => {

      const file = event.target.files[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        photoUpload.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = result => {
        identityPhoto.innerHTML = "";

        const image = document.createElement("img");
        image.src = result.target.result;
        image.alt = "Profile photo preview";

        identityPhoto.appendChild(image);
      };

      reader.readAsDataURL(file);
    });
  }

  // ======================================
  // PROFILE INFORMATION
  // ======================================

  const fullName = document.getElementById("fullName");
  const aboutMe = document.getElementById("aboutMe");
  const personality = document.getElementById("personality");
  const saveIdentity = document.getElementById("saveIdentity");
  const identityMessage = document.getElementById("identityMessage");

  try {
    const savedProfile = localStorage.getItem("juniorDangoteTwinProfile");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);

      if (fullName) fullName.value = profile.fullName || "";
      if (aboutMe) aboutMe.value = profile.aboutMe || "";
      if (personality) personality.value = profile.personality || "";
    }
  } catch (error) {
    console.error("Could not load saved profile:", error);
  }

  if (saveIdentity) {
    saveIdentity.addEventListener("click", () => {

      const profile = {
        fullName: fullName ? fullName.value.trim() : "",
        aboutMe: aboutMe ? aboutMe.value.trim() : "",
        personality: personality ? personality.value.trim() : ""
      };

      try {
        localStorage.setItem(
          "juniorDangoteTwinProfile",
          JSON.stringify(profile)
        );

        if (identityMessage) {
          identityMessage.textContent =
            "Profile saved in this browser.";
        }

      } catch (error) {
        if (identityMessage) {
          identityMessage.textContent =
            "Unable to save profile in this browser.";
        }

        console.error("Profile save failed:", error);
      }
    });
  }

  // ======================================
  // CLOUDFLARE AI CHAT CONNECTION
  // ======================================

  const TWIN_API =
    "https://junior-dangote-twin-api.ddangote701.workers.dev";

  const chatInput = document.getElementById("chatInput");

  const sendButton =
    document.getElementById("sendMessage") ||
    document.querySelector(".send-button");

  const chatMessages = document.getElementById("chatMessages");
  const chatStatus = document.querySelector(".chat-header span");

  function addChatMessage(message, type) {

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + type + "-message";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = type === "assistant" ? "✦" : "JD";

    const content = document.createElement("div");
    content.className = "message-content";

    const title = document.createElement("strong");

    title.textContent =
      type === "assistant" ? "Junior Dangote Twin" : "You";

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    content.appendChild(title);
    content.appendChild(paragraph);

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return paragraph;
  }

  if (chatInput && sendButton && chatMessages) {

    chatInput.disabled = false;
    sendButton.disabled = false;

    chatInput.placeholder =
      "Ask your digital twin something...";

    async function sendTwinMessage() {

      const message = chatInput.value.trim();

      if (!message) return;

      addChatMessage(message, "user");

      chatInput.value = "";
      sendButton.disabled = true;
      chatInput.disabled = true;

      const loading = addChatMessage(
        "Thinking...",
        "assistant"
      );

      try {

        const response = await fetch(
          TWIN_API + "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: message
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "AI request failed.");
        }

        loading.textContent =
          data.reply || "The AI returned an empty response.";

      } catch (error) {

        loading.textContent =
          "I couldn't connect to my AI brain. Please try again.";

        console.error("Twin AI error:", error);

      } finally {

        sendButton.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();

      }
    }

    sendButton.addEventListener("click", sendTwinMessage);

    chatInput.addEventListener("keydown", event => {

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendTwinMessage();
      }

    });

    fetch(TWIN_API + "/api/health")
      .then(response => response.json())
      .then(data => {

        if (data.success && chatStatus) {
          chatStatus.innerHTML =
            '<i class="status-dot"></i> AI connected';
        }

      })
      .catch(error => {
        console.error("AI health check failed:", error);
      });

  }

  // ======================================
  // INITIAL PAGE
  // ======================================

  showPage("overview");

});
