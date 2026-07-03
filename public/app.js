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
const createShareForm = document.querySelector("#createShareForm");
const createdShare = document.querySelector("#createdShare");
const createdShareLink = document.querySelector("#createdShareLink");
const openShareForm = document.querySelector("#openShareForm");
const shareTitle = document.querySelector("#shareTitle");
const permissionBadge = document.querySelector("#permissionBadge");
const uploadForm = document.querySelector("#uploadForm");
const fileInput = document.querySelector("#fileInput");
const resourceList = document.querySelector("#resourceList");
const resourceTemplate = document.querySelector("#resourceTemplate");

function apiErrorMessage(payload) {
  return payload?.error?.message || payload?.error?.code || "Request failed";
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

function shareUrl(shareId) {
  return `${window.location.origin}/s/${shareId}`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function renderResources() {
  resourceList.textContent = "";

  if (!state.share) {
    resourceList.textContent = "Open or create a share to see resources.";
    return;
  }

  if (!state.resources.length) {
    resourceList.textContent = "No resources yet.";
    return;
  }

  for (const resource of state.resources) {
    const node = resourceTemplate.content.firstElementChild.cloneNode(true);
    const previewUrl = `/api/shares/${state.share.id}/resources/${resource.id}/preview`;
    const downloadUrl = `/api/shares/${state.share.id}/resources/${resource.id}/download`;

    node.querySelector("[data-name]").textContent = resource.originalName;
    node.querySelector("[data-meta]").textContent = `${resource.previewType} • ${formatBytes(resource.size)}`;
    node.querySelector("[data-preview]").href = previewUrl;
    node.querySelector("[data-download]").href = downloadUrl;
    node.querySelector("[data-download]").download = resource.originalName;

    const deleteButton = node.querySelector("[data-delete]");
    deleteButton.hidden = !state.share.permissions.delete;
    deleteButton.addEventListener("click", async () => {
      await fetch(`/api/shares/${state.share.id}/resources/${resource.id}`, { method: "DELETE" });
      await loadShare(state.share.id);
    });

    resourceList.append(node);
  }
}

function renderShare() {
  if (!state.share) {
    shareTitle.textContent = "No share selected";
    permissionBadge.textContent = "none";
    uploadForm.hidden = true;
    renderResources();
    return;
  }

  shareTitle.textContent = state.share.name;
  permissionBadge.textContent = state.share.accessMode;
  uploadForm.hidden = !state.share.permissions.upload;
  openShareForm.elements.shareId.value = state.share.id;
  renderResources();
}

async function loadShare(shareId) {
  const payload = await jsonRequest(`/api/shares/${shareId}/resources`);
  state.share = payload.share;
  state.resources = payload.resources;
  renderShare();
}

createShareForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(createShareForm);
  const payload = await jsonRequest("/api/shares", {
    method: "POST",
    body: JSON.stringify({
      name: form.get("name"),
      accessMode: form.get("accessMode"),
      expiresInHours: Number(form.get("expiresInHours")),
      maxResourceBytes: Number(form.get("maxResourceMb")) * 1024 * 1024
    })
  });

  createdShare.hidden = false;
  createdShareLink.href = shareUrl(payload.share.id);
  createdShareLink.textContent = shareUrl(payload.share.id);
  history.replaceState(null, "", `/s/${payload.share.id}`);
  await loadShare(payload.share.id);
});

openShareForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const shareId = openShareForm.elements.shareId.value.trim();
  if (!shareId) return;
  history.replaceState(null, "", `/s/${shareId}`);
  await loadShare(shareId);
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

  const shareFromPath = window.location.pathname.match(/^\/s\/([^/]+)$/)?.[1];
  if (shareFromPath) {
    await loadShare(shareFromPath);
  } else {
    renderShare();
  }
}

window.addEventListener("unhandledrejection", (event) => {
  alert(event.reason?.message || "Something failed");
});

boot();
