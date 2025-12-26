import React, { useEffect } from "react";

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

declare global {
  interface Window {
    google: any; // Google Identity Services object
  }
}

export default function GoogleLoginButton() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
      });
    };
  }, []);

  function handleCredentialResponse(response: { credential: string }) {
    fetch("http://localhost:8000/auth/google/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    })
      .then((res) => res.json())
      .then((data) => console.log("Backend response:", data))
      .catch((err) => console.error(err));
  }

  function signIn() {
    window.google.accounts.id.prompt();
  }

  return (
    <button
      onClick={signIn}
      style={{
        padding: "10px 20px",
        borderRadius: "8px",
        border: "none",
        background: "#4285F4",
        color: "white",
        fontSize: "16px",
        cursor: "pointer",
      }}
    >
      Please connect with Google
    </button>
  );
}
