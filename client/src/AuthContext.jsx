import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // флаг загрузки

  // при монтировании читаем localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (token && username) {
      setUser({ username });
    }

    setLoading(false); // проверка токена завершена
  }, []);

  async function login(username, password) {
    username = username.trim();

    if (!username || !password) {
      alert("Логин и пароль не могут быть пустыми");
      return;
    }

    try {
      const res = await fetch("https://10.21.3.106:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Ошибка авторизации");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      setUser({ username });
    } catch (err) {
      console.error(err);
      alert("Ошибка сети");
    }
  }

  async function register(username, password) {
    try {
      const res = await fetch("https://10.21.3.106:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}


