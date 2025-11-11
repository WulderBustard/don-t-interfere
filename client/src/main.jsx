import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./AuthContext";
import LoginPage from "./LoginPage";
import App from "./App";
import "./index.css";

// ProtectedRoute ждет окончания загрузки и проверяет user
function ProtectedRoute({ children }) {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) return <div>Загрузка...</div>;
  return user ? children : <Navigate to="/login" />;
}

function Root() {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) return <div>Загрузка...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
