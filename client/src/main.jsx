/* eslint-disable react-refresh/only-export-components */
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, AuthContext } from "./AuthContext";
import LoginPage from "./LoginPage";
import App from "./App";
import "./index.css";

function Root() {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) return <div>Загрузка...</div>;

  const targetPath = user ? "/" : "/login";
  if (window.location.pathname !== targetPath) {
    window.history.replaceState(null, "", targetPath);
  }

  return user ? <App /> : <LoginPage />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
);
