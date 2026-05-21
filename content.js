(() => {
  if (window.__chatgptQuestionSidebarLoaded) return;
  window.__chatgptQuestionSidebarLoaded = true;

  const SIDEBAR_ID = "cq-sidebar";
  let searchText = "";

  function createSidebar() {
    if (document.getElementById(SIDEBAR_ID)) return;

    const sidebar = document.createElement("aside");
    sidebar.id = SIDEBAR_ID;

    const header = document.createElement("div");
    header.id = "cq-sidebar-header";
    header.textContent = "提问导航";

    const search = document.createElement("input");
    search.id = "cq-search";
    search.placeholder = "搜索提过的问题...";
    search.addEventListener("input", () => {
      searchText = search.value.trim().toLowerCase();
      renderQuestions();
    });

    const list = document.createElement("div");
    list.id = "cq-list";

    sidebar.appendChild(header);
    sidebar.appendChild(search);
    sidebar.appendChild(list);
    document.body.appendChild(sidebar);
    restoreSidebarPosition(sidebar);
    makeSidebarDraggable(sidebar, header);
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function shorten(text, maxLen = 72) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "…";
  }

  function findUserQuestions() {
    const candidates = Array.from(
      document.querySelectorAll('[data-message-author-role="user"]')
    );

    return candidates
      .filter(isVisible)
      .map((el) => ({
        el,
        text: normalizeText(el.innerText || el.textContent || "")
      }))
      .filter((item) => item.text.length > 0);
  }

  function flashElement(el) {
    el.classList.add("cq-flash");
    setTimeout(() => {
      el.classList.remove("cq-flash");
    }, 1200);
  }

  function renderQuestions() {
    createSidebar();

    const list = document.getElementById("cq-list");
    if (!list) return;

    const questions = findUserQuestions();

    const filtered = questions.filter((q) => {
      if (!searchText) return true;
      return q.text.toLowerCase().includes(searchText);
    });

    list.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cq-empty";
      empty.textContent = "当前没有识别到问题。";
      list.appendChild(empty);
      return;
    }

    filtered.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.className = "cq-item";

      const index = document.createElement("div");
      index.className = "cq-index";
      index.textContent = `Q${idx + 1}`;

      const text = document.createElement("div");
      text.className = "cq-text";
      text.textContent = shorten(q.text);

      btn.appendChild(index);
      btn.appendChild(text);

      btn.addEventListener("click", () => {
        q.el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        flashElement(q.el);
      });

      list.appendChild(btn);
    });
  }

  function debounce(fn, delay = 300) {
    let timer = null;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  const debouncedRender = debounce(renderQuestions, 300);

  function startObserver() {
    const target = document.body;
    if (!target) return;

    const observer = new MutationObserver(() => {
      debouncedRender();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  createSidebar();
  renderQuestions();
  startObserver();
})();

function restoreSidebarPosition(sidebar) {
  const saved = localStorage.getItem("cq-sidebar-position");
  if (!saved) return;

  try {
    const pos = JSON.parse(saved);

    if (typeof pos.left === "number" && typeof pos.top === "number") {
      sidebar.style.left = `${pos.left}px`;
      sidebar.style.top = `${pos.top}px`;
      sidebar.style.right = "auto";
    }
  } catch (e) {
    console.warn("Failed to restore sidebar position:", e);
  }
}

function makeSidebarDraggable(sidebar, handle) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener("pointerdown", (e) => {
    isDragging = true;

    const rect = sidebar.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    sidebar.style.left = `${rect.left}px`;
    sidebar.style.top = `${rect.top}px`;
    sidebar.style.right = "auto";

    handle.setPointerCapture(e.pointerId);

    e.preventDefault();
  });

  handle.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const sidebarRect = sidebar.getBoundingClientRect();

    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    const minLeft = 0;
    const minTop = 0;
    const maxLeft = window.innerWidth - sidebarRect.width;
    const maxTop = window.innerHeight - 80;

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));

    sidebar.style.left = `${newLeft}px`;
    sidebar.style.top = `${newTop}px`;
  });

  handle.addEventListener("pointerup", (e) => {
    if (!isDragging) return;

    isDragging = false;

    const rect = sidebar.getBoundingClientRect();

    localStorage.setItem(
      "cq-sidebar-position",
      JSON.stringify({
        left: rect.left,
        top: rect.top
      })
    );

    handle.releasePointerCapture(e.pointerId);
  });

  handle.addEventListener("pointercancel", () => {
    isDragging = false;
  });
}