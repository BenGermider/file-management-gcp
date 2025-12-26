import React from "react";
import { useNavigate } from "react-router-dom";
import { decodeToken } from "../auth/auth";

const OAuthCallback = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) return;

    localStorage.setItem("token", token);

    const user = decodeToken(token);
    console.log("Logged in as:", user);

    navigate("/dashboard");
  }, [navigate]);

  return <div>Logging you in...</div>;
};

export default OAuthCallback;