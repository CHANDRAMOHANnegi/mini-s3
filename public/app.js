const state = {
  share: null,
  resources: []
};

const appOrigin = `${window.location.protocol}//${window.location.hostname}:8787`;
const isExpressApp = window.location.port === "8787";

if (!isExpressApp) {
  window.location.replace(appOrigin);
}

const healthBadge = document.querySelector("#healthBadge");
const currentShareLink = document.querySelector("#currentShareLink");
const adminTokenInput = document.querySelector("#adminTokenInput");
const newShareButton = document.querySelector("#newShareButton");
const shareTitle = document.querySelector("#shareTitle");
const permissionBadge = document.querySelector("#permissionBadge");
const uploadForm = document.querySelector("#uploadForm");
const fileInput = document.querySelector("#fileInput");
const resourceList = document.querySelector("#resourceList");
const resourceTemplate = document.querySelector("#resourceTemplate");

function apiErrorMessage(payload) {
  return payload?.error?.message || payload?.error?.code || "Request failed";
}

function saveAdminToken(token) {
  if (token) {
    window.localStorage.setItem("miniS3AdminToken", token);
  }
}

function adminToken() {
  return window.localStorage.getItem("miniS3AdminToken") || "";
}

function adminHeaders() {
  const token = adminTokenInput.value.trim() || adminToken();
  return token ? { "x-admin-token": token } : {};
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload));
  }

  return payload;
}

function randomShareId() {
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `share_${token}`;
}

function currentPathShareId() {
  return window.location.pathname.match(/^\/s\/([^/]+)$/)?.[1] || "";
}

function shareUrl(shareId) {
  return `${window.location.origin}/s/${shareId}`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function ensureShare(shareId) {
  const token = adminTokenInput.value.trim();
  saveAdminToken(token);

  try {
    // First try to open the room. If it exists, the URL is enough.
    const payload = await jsonRequest(`/api/shares/${shareId}/resources`);
    state.share = payload.share;
    state.resources = payload.resources;
  } catch (error) {
    if (!String(error.message).includes("Share link not found")) throw error;

    // Codeshare-style behavior: a clean /s/share_xxx URL creates its own temporary room.
    const payload = await jsonRequest("/api/shares", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        id: shareId,
        name: "Shared resources",
        expiresInHours: 24,
        maxResourceBytes: 100 * 1024 * 1024
      })
    });
    state.share = payload.share;
    state.resources = [];
  }
}

function renderResources() {
  resourceList.textContent = "";

  if (!state.resources.length) {
    resourceList.textContent = "No resources yet.";
    return;
  }

  for (const resource of state.resources) {
    const node = resourceTemplate.content.firstElementChild.cloneNode(true);
    const previewUrl = `/api/shares/${state.share.id}/resources/${resource.id}/preview`;
    const downloadUrl = `/api/shares/${state.share.id}/resources/${resource.id}/download`;

    node.querySelector("[data-name]").textContent = resource.originalName;
    node.querySelector("[data-meta]").textContent = `${resource.previewType} - ${formatBytes(resource.size)}`;
    node.querySelector("[data-preview]").href = previewUrl;
    node.querySelector("[data-download]").href = downloadUrl;
    node.querySelector("[data-download]").download = resource.originalName;
    node.querySelector("[data-delete]").addEventListener("click", async () => {
      await fetch(`/api/shares/${state.share.id}/resources/${resource.id}`, { method: "DELETE" });
      await loadShare(state.share.id);
    });

    resourceList.append(node);
  }
}

function renderShare() {
  currentShareLink.href = shareUrl(state.share.id);
  currentShareLink.textContent = shareUrl(state.share.id);
  shareTitle.textContent = state.share.name;
  permissionBadge.textContent = "full access";
  renderResources();
}

async function loadShare(shareId) {
  const payload = await jsonRequest(`/api/shares/${shareId}/resources`);
  state.share = payload.share;
  state.resources = payload.resources;
  renderShare();
}

newShareButton.addEventListener("click", () => {
  window.location.href = `/s/${randomShareId()}`;
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.share || !fileInput.files.length) return;

  const body = new FormData();
  body.append("file", fileInput.files[0]);

  const response = await fetch(`/api/shares/${state.share.id}/resources`, {
    method: "POST",
    body
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(apiErrorMessage(payload));
  }

  uploadForm.reset();
  await loadShare(state.share.id);
});

async function boot() {
  try {
    const health = await fetch("/health");
    healthBadge.textContent = health.ok ? "online" : "offline";
  } catch {
    healthBadge.textContent = "offline";
  }

  const shareId = currentPathShareId() || randomShareId();
  if (!currentPathShareId()) {
    // The browser URL is the share link. There is no separate create step.
    history.replaceState(null, "", `/s/${shareId}`);
  }

  await ensureShare(shareId);
  renderShare();
}

window.addEventListener("unhandledrejection", (event) => {
  alert(event.reason?.message || "Something failed");
});

boot();
