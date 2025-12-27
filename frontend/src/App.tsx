import { BrowserRouter, Routes, Route } from "react-router-dom";
import GoogleLoginButton from "./components/GoogleLoginButton";
import Dashboard from "./pages/Menu";
import OAuthCallback from "./pages/OAuthCallback";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GoogleLoginButton />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
