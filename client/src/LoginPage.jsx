import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function LoginPage() {
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const ok = isRegister
        ? await register(form.username, form.password)
        : await login(form.username, form.password);

      if (ok) navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleMode() {
    setError("");
    setIsRegister((prev) => !prev);
  }

  return (
    <main className="auth-page">
      <section className="auth-box" aria-label="Авторизация">
        <div className="auth-header">
          <div className="auth-mark">D</div>
          <div>
            <h1>{isRegister ? "Регистрация" : "Вход"}</h1>
            <p>{isRegister ? "Создайте аккаунт для чата" : "Войдите в свой аккаунт"}</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Логин</span>
            <input
              type="text"
              placeholder="Введите логин"
              value={form.username}
              autoComplete="username"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>

          <label>
            <span>Пароль</span>
            <input
              type="password"
              placeholder="Введите пароль"
              value={form.password}
              autoComplete={isRegister ? "new-password" : "current-password"}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit">
            {isRegister ? "Создать аккаунт" : "Войти"}
          </button>
        </form>

        <button className="auth-switch" type="button" onClick={toggleMode}>
          {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
        </button>
      </section>
    </main>
  );
}
