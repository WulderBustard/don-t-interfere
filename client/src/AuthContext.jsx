/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from "react";
import { API_BASE, fetchMe, updatePresence } from "./api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function persistUser(nextUser) {
    if (!nextUser) return;
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.setItem("username", nextUser.username);
    setUser(nextUser);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token) {
      setLoading(false);
      return;
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }

    fetchMe()
      .then(persistUser)
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const trimmed = username.trim();

    if (!trimmed || !password) {
      alert("Логин и пароль не могут быть пустыми");
      return false;
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
        return false;
      }

      localStorage.setItem("token", data.token);
      persistUser(data.user);
      return true;
    } catch (err) {
      console.error(err);
      alert("Ошибка сети");
      return false;
    }
  }

  async function register(username, password) {
    const trimmed = username.trim();

    if (!trimmed || !password) {
      alert("Логин и пароль не могут быть пустыми");
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

      localStorage.setItem("token", data.token);
      persistUser(data.user);
      return true;
    } catch (err) {
      console.error(err);
      alert(err.message || "Ошибка сети");
      return false;
    }
  }

  function logout() {
    updatePresence({ status: "offline", micMuted: user?.mic_muted ?? false }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    setUser(null);
  }

  const value = { user, login, register, logout, loading, updateUser: persistUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
