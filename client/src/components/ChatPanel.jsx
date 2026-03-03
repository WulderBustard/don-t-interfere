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

  const [showScrollDown, setShowScrollDown] = useState(false);

  const ref = useRef(null);
  const inputRef = useRef(null);

  const isTextChannel = current.type === "text";

  // Автофокус при входе в текстовый канал
  useEffect(() => {
    if (isTextChannel) inputRef.current?.focus();
  }, [current]);

  // Автопрокрутка вниз при появлении новых сообщений
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  // Автопрокрутка при заходе в канал
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [current]);

  // Следим, внизу ли пользователь
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleScroll() {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distance > 150);
    }

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToBottom() {
    const el = ref.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth"
    });
  }

  async function submit(e) {
    e?.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      await onSend(text);
      setText("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <span>{isTextChannel ? "#" : "🔊"} {current.name}</span>
        <button onClick={onToggleMembers} title="Участники канала" className="members-panel-btn">⋮</button>
      </header>

      <div className="chat-messages" ref={ref}>
        {!isTextChannel ? (
          <p className="text-muted">Это голосовой канал.</p>
        ) : messages.length === 0 ? (
          <p className="text-muted">Сообщений пока нет.</p>
        ) : (
          messages.map((m, i) => <MessageItem key={m.id ?? i} {...m} />)
        )}

               {showScrollDown && (
        <button
          className="scroll-down-btn"
          onClick={scrollToBottom}
          title="Прокрутить вниз"
        >
          ↓
        </button>
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
            type="button"
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
