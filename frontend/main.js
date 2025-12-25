const statusEl = document.getElementById("status");

fetch("http://backend:8000/api/hello")
  .then(res => {
    if (!res.ok) {
      throw new Error("Backend error");
    }
    return res.json();
  })
  .then(data => {
    statusEl.classList.remove("loading");
    statusEl.innerText = data.message;
  })
  .catch(() => {
    statusEl.classList.remove("loading");
    statusEl.innerText = "❌ Cannot reach backend";
    statusEl.style.color = "crimson";
  });
