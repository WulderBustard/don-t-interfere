import React, { createContext, useEffect, useState } from "react";
import { API_BASE } from "./api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (token && username) {
      setUser({ username });
    }

    setLoading(false);
  }, []);

  async function login(username, password) {
    const trimmed = username.trim();

    if (!trimmed || !password) {
      alert("Логин и пароль не могут быть пустыми");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Ошибка авторизации");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", trimmed);
      setUser({ username: trimmed });
    } catch (err) {
      console.error(err);
      alert("Ошибка сети");
    }
  }

  async function register(username, password) {
    const trimmed = username.trim();

    if (!trimmed || !password) {
      alert("Логин и пароль не могут быть пустыми");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
    } catch (err) {
      console.error(err);
      alert(err.message || "Ошибка сети");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  }

  const value = { user, login, register, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}