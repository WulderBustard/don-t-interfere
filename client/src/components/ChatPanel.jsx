import { useState, useRef, useEffect } from "react";

function MessageItem({ user, time, text }) {
  return (
    <div className="message">
      <b>{user}</b> <span className="timestamp">{time}</span>
      <div>{text}</div>
    </div>
  );
}

export default function ChatPanel({ current, messages, onSend, onToggleMembers }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const isTextChannel = current.type === "text";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isTextChannel) {
      inputRef.current?.focus(); // <<< фокус при открытии канала
    }
  }, [current]);

  // <<< вот тут обновляем submit() по новому варианту
  async function submit(e) {
    e?.preventDefault(); // <<< предотвращаем дефолтное поведение
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      await onSend(text);
      setText("");
      requestAnimationFrame(() => inputRef.current?.focus()); // <<< возвращаем фокус обратно
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e); // <<< передаем event, чтобы preventDefault сработал
    }
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <span>{isTextChannel ? "#" : "🔊"} {current.name}</span>
        <button onClick={onToggleMembers} title="Участники канала">⋮</button>
      </header>

      <div className="chat-messages" ref={ref}>
        {!isTextChannel ? (
          <p className="text-muted">Это голосовой канал.</p>
        ) : messages.length === 0 ? (
          <p className="text-muted">Сообщений пока нет.</p>
        ) : (
          messages.map((m, i) => <MessageItem key={m.id ?? i} {...m} />)
        )}
      </div>

      {isTextChannel && (
        <footer className="message-input">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            rows={2}
            disabled={loading}
          />
          <button
            type="button" // <<< обязательно, иначе браузер "съедает" фокус
            onClick={submit}
            disabled={loading || !text.trim()}
          >
            {loading ? "..." : "Отправить"}
          </button>
        </footer>
      )}
    </section>
  );
}
