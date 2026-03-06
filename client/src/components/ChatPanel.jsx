import { useState, useRef, useEffect, useContext } from "react";
import { AuthContext } from "../AuthContext";


function MessageItem({ user, time, text, isOwn }) {
  return (
    <div className={`message ${isOwn ? "own" : "other"}`}>
      <div className="message-meta">
        <b>{user}</b>
        <span className="timestamp">{time}</span>
      </div>
      <div className="message-text">{text}</div>
    </div>
  );
}

export default function ChatPanel({ current, messages, onSend, onToggleMembers }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const { user } = useContext(AuthContext);

  const ref = useRef(null);
  const inputRef = useRef(null);

  const isTextChannel = current.type === "text";

  useEffect(() => {
    if (isTextChannel) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [current, isTextChannel]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [current]);

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
      behavior: "smooth",
    });
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);

    try {
      await onSend(trimmed);
      setText("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <span>
          {isTextChannel ? "#" : "🔊"} {current.name}
        </span>
        <button
          onClick={onToggleMembers}
          title="Участники канала"
          className="members-panel-btn"
        >
          ⋮
        </button>
      </header>

      <div className="chat-messages" ref={ref}>
        {!isTextChannel ? (
          <p className="text-muted">Это голосовой канал.</p>
        ) : messages.length === 0 ? (
          <p className="text-muted">Сообщений пока нет.</p>
        ) : (
          messages.map((m, i) => (
            <MessageItem
              key={m.id ?? i}
              user={m.user}
              time={m.time}
              text={m.text}
              isOwn={m.user === user?.username}
            />
          ))
        )}
      </div>

        {showScrollDown && (
          <button
            className="scroll-down-btn"
            onClick={scrollToBottom}
            title="Прокрутить вниз"
          >
            ↓
          </button>
        )}


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
