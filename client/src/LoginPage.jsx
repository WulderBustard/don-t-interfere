import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom"; // ← добавлено
import { AuthContext } from "./AuthContext";

export default function LoginPage() {
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate(); // ← добавлено
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (isRegister) await register(form.username, form.password);
      await login(form.username, form.password);

      // ← редирект после успешного входа
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>{isRegister ? "Регистрация" : "Вход"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Логин"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit">
            {isRegister ? "Создать аккаунт" : "Войти"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p
          className="switch"
          onClick={() => {
            setError("");
            setIsRegister(!isRegister);
          }}
        >
          {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
        </p>
      </div>
    </div>
  );
}
