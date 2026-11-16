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
    if (pageId === "memories") loadMemoryLibrary();
    if (pageId === "identity") loadIdentityProfile();
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
  // PROFILE INFORMATION - CLOUDFLARE
  // ======================================

  const IDENTITY_API =
    "https://junior-dangote-twin-api.ddangote701.workers.dev";

  const fullName = document.getElementById("fullName");
  const aboutMe = document.getElementById("aboutMe");
  const personality = document.getElementById("personality");
  const saveIdentity = document.getElementById("saveIdentity");
  const identityMessage = document.getElementById("identityMessage");

  function getOwnerKey() {
    let key = sessionStorage.getItem("juniorTwinOwnerKey");

    if (!key) {
      key = prompt("Enter your private owner access key:");

      if (key && key.trim()) {
        key = key.trim();
        sessionStorage.setItem("juniorTwinOwnerKey", key);
      }
    }

    return key;
  }

  async function loadIdentityProfile() {
    const key = getOwnerKey();

    if (!key) return;
    try {
      const response = await fetch(
        IDENTITY_API + "/api/admin/identity",
        {
          headers: {
            "Authorization": "Bearer " + key
          }
        }
      );

      if (response.status === 401) {
        sessionStorage.removeItem("juniorTwinOwnerKey");
        return;
      }

      if (!response.ok) throw new Error("Could not load profile.");

      const data = await response.json();
      const profile = data.profile;

      if (profile) {
        if (fullName) fullName.value = profile.display_name || "";
        if (aboutMe) aboutMe.value = profile.public_bio || "";
        if (personality) personality.value = profile.personality || "";
      }

    } catch (error) {
      console.error("Profile loading failed:", error);
    }
  }

  if (saveIdentity) {
    saveIdentity.addEventListener("click", async () => {
      const key = getOwnerKey();

      if (!key) {
        if (identityMessage) {
          identityMessage.textContent = "Owner access key is required.";
        }
        return;
      }

      const profile = {
        display_name: fullName ? fullName.value.trim() : "",
        public_bio: aboutMe ? aboutMe.value.trim() : "",
        personality: personality ? personality.value.trim() : ""
      };

      if (!profile.display_name) {
        if (identityMessage) {
          identityMessage.textContent = "Enter a public display name.";
        }
        return;
      }

      if (identityMessage) {
        identityMessage.textContent = "Saving to Cloudflare...";
      }

      saveIdentity.disabled = true;

      try {
        const response = await fetch(
          IDENTITY_API + "/api/admin/identity",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + key
            },
            body: JSON.stringify(profile)
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          sessionStorage.removeItem("juniorTwinOwnerKey");
          throw new Error("Access key is incorrect. Please try again.");
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Profile could not be saved.");
        }

        if (identityMessage) {
          identityMessage.textContent =
            "✅ Identity profile saved successfully to Cloudflare.";
        }

      } catch (error) {
        if (identityMessage) {
          identityMessage.textContent = error.message;
        }

        console.error("Profile save failed:", error);

      } finally {
        saveIdentity.disabled = false;
      }
    });
  }
    // ======================================
  // MEMORY LIBRARY - CLOUDFLARE D1
  // ======================================

  const memoryContent = document.getElementById("memoryContent");
  const memoryCategory = document.getElementById("memoryCategory");
  const addMemoryButton = document.getElementById("addMemory");
  const memoryList = document.getElementById("memoryList");
  const memoryMessage = document.getElementById("memoryMessage");

  function escapeMemoryHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  async function memoryRequest(path, method = "GET", body = null) {
    const key = getOwnerKey();

    if (!key) throw new Error("Owner access key is required.");

    const options = {
      method,
      headers: {
        "Authorization": "Bearer " + key
      }
    };

    if (body) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(IDENTITY_API + path, options);
    const data = await response.json();

    if (response.status === 401) {
      sessionStorage.removeItem("juniorTwinOwnerKey");
      throw new Error("Access key incorrect. Please try again.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Memory request failed.");
    }

    return data;
  }

  async function loadMemoryLibrary() {
    if (!memoryList) return;

    memoryList.innerHTML = "<p>Loading memories...</p>";

    try {
      const result = await memoryRequest("/api/admin/memories");

      const memories = Array.isArray(result)
        ? result
        : result.memories || result.data || [];

      if (!memories.length) {
        memoryList.innerHTML = "<p>No memories saved yet.</p>";
        return;
      }

      memoryList.innerHTML = memories.map(memory => `
        <div class="memory-card" data-memory-id="${escapeMemoryHTML(memory.id)}">
          <p>
            <strong>${escapeMemoryHTML(memory.category || "General")}</strong>
            · ${escapeMemoryHTML(memory.status || "pending")}
            · ${escapeMemoryHTML(memory.visibility || "private")}
          </p>

          <p>${escapeMemoryHTML(memory.content)}</p>

          <button type="button" data-action="approve">Approve</button>
          <button type="button" data-action="reject">Reject</button>
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="visibility">
            Make ${memory.visibility === "public" ? "Private" : "Public"}
          </button>
          <button type="button" data-action="delete">Delete</button>
        </div>
      `).join("");

    } catch (error) {
      memoryList.innerHTML = "";
      if (memoryMessage) memoryMessage.textContent = error.message;
    }
  }

  if (addMemoryButton) {
    addMemoryButton.addEventListener("click", async () => {
      const content = memoryContent.value.trim();
      const category = memoryCategory.value;

      if (!content) {
        memoryMessage.textContent = "Enter some memory information first.";
        return;
      }

      addMemoryButton.disabled = true;
      memoryMessage.textContent = "Saving memory...";

      try {
        await memoryRequest("/api/admin/memories", "POST", {
          content,
          category,
          status: "pending",
          visibility: "private"
        });

        memoryContent.value = "";
        memoryMessage.textContent =
          "✅ Memory saved as pending and private.";

        await loadMemoryLibrary();

      } catch (error) {
        memoryMessage.textContent = error.message;
      } finally {
        addMemoryButton.disabled = false;
      }
    });
  }

  if (memoryList) {
    memoryList.addEventListener("click", async event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const card = button.closest("[data-memory-id]");
      if (!card) return;

      const id = card.dataset.memoryId;
      const action = button.dataset.action;

      try {
        let update = null;

        if (action === "approve") {
          if (!confirm("Approve this memory? It will remain private.")) return;
          update = { status: "approved" };
        }

        if (action === "reject") {
          if (!confirm("Reject this memory?")) return;
          update = { status: "rejected" };
        }

        if (action === "visibility") {
          const isPublic = card.querySelector("p").textContent.includes("public");

          const visibility = isPublic ? "private" : "public";

          if (visibility === "public" &&
              !confirm("Make this memory public? The public AI twin may use it.")) {
            return;
          }

          update = { visibility };
        }

        if (action === "edit") {
          const oldContent = card.querySelectorAll("p")[1]?.textContent || "";
          const content = prompt("Edit this memory:", oldContent);

          if (content === null || !content.trim()) return;
          update = { content: content.trim() };
        }

        if (action === "delete") {
          if (!confirm("Permanently delete this memory?")) return;

          await memoryRequest(
            "/api/admin/memories/" + encodeURIComponent(id),
            "DELETE"
          );

          memoryMessage.textContent = "Memory deleted.";
          await loadMemoryLibrary();
          return;
        }

        if (update) {
          await memoryRequest(
            "/api/admin/memories/" + encodeURIComponent(id),
            "PATCH",
            update
          );

          memoryMessage.textContent = "Memory updated successfully.";
          await loadMemoryLibrary();
        }

      } catch (error) {
        memoryMessage.textContent = error.message;
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
      // ======================================
  // CLINICAL EVIDENCE SEARCH - v0.5.26
  // ======================================

  const CLINICAL_API =
    "https://junior-dangote-clinical-test.ddangote701.workers.dev";

  function attachClinicalVerification(evidence) {
    if (!evidence || typeof evidence !== "object" || evidence.status === "not_required") return;

    const status = evidence.verification_status || "status_not_returned";
    const count = Number(evidence.count || 0);

    let label = "⚠️ Clinical review status unavailable";

    if (status === "ai_reviewed_against_retrieved_references") {
      label = "🔍 Separate AI review completed using retrieved references. This is an AI review, not human clinical verification.";
    } else if (status === "review_unavailable") {
      label = "⚠️ References were retrieved, but the separate AI review could not be completed.";
    } else if (status === "no_references_to_review") {
      label = "⚠️ No usable clinical references were available for the separate AI review.";
    } else if (status === "not_reviewed") {
      label = "⚠️ The answer has not been reviewed against clinical references.";
    }

    const details = [
      label,
      "References supplied to the API review: " + count
    ];

    const statusMessage = addChatMessage(details.join("\n"), "assistant");
    statusMessage.style.whiteSpace = "pre-line";
  }

  function attachClinicalEvidence(evidence) {
    if (!evidence || typeof evidence !== "object" || evidence.status === "not_required") return;

    const sources = Array.isArray(evidence.sources) ? evidence.sources : [];

    const lines = [
      "📚 Clinical references supplied to the separate AI review",
      "References supplied: " + Number(evidence.count || sources.length),
      ""
    ];

    if (sources.length) {
      sources.forEach((item, index) => {
        lines.push(
          (index + 1) + ". " + (item.title || "Untitled reference") +
          (item.year ? " (" + item.year + ")" : "")
        );

        if (item.source) lines.push("   Source: " + item.source);
        if (item.url) lines.push("   " + item.url);
        lines.push("");
      });

      lines.push(
        "These references were retrieved before answer generation and supplied to the separate AI review. This is AI review, not human clinical verification."
      );
    } else {
      lines.push("No usable clinical references were supplied to the separate AI review.");
    }

    const evidenceMessage = addChatMessage(lines.join("\n"), "assistant");
    evidenceMessage.style.whiteSpace = "pre-line";
  }                                        
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
        attachClinicalVerification(data.clinical_evidence);
        attachClinicalEvidence(data.clinical_evidence);
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
