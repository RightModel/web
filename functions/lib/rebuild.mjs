export async function triggerRepositoryDispatch({ token } = {}) {
  const owner = process.env.RIGHTMODEL_GITHUB_OWNER;
  const repo = process.env.RIGHTMODEL_GITHUB_REPO;

  if (!owner || !repo || !token) {
    throw new Error("GitHub dispatch credentials are required");
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      event_type: "cache-updated"
    })
  });

  if (!response.ok) {
    throw new Error(`Dispatch failed with ${response.status}`);
  }
}
