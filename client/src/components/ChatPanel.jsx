import { useState, useRef, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../AuthContext";
import UserAvatar from "./UserAvatar";

function parseMessageDate(raw) {
  if (!raw) return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  const value = String(raw).trim();
  const sqliteUtcMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (sqliteUtcMatch) {
    const [, year, month, day, hour, minute, second = "00"] = sqliteUtcMatch;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMessageDate(message) {
  const raw = message.created_at || message.createdAt || message.time;
  return parseMessageDate(raw) || new Date(0);
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatDateSeparator(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - messageDay) / 86400000);

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSentAt(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MessageItem({ message, author, isOwn }) {
  const date = getMessageDate(message);

  return (
    <div className={`message ${isOwn ? "own" : "other"}`}>
      <UserAvatar user={author} username={message.user} status={author?.status || "offline"} size="sm" />
      <div className="message-body">
        <div className="message-meta">
          <b>{message.user}</b>
          <span className="timestamp" title={formatSentAt(date)}>
            {formatTime(date)}
          </span>
          <span className="sent-at">Отправлено: {formatSentAt(date)}</span>
        </div>
        <div className="message-text">{message.text}</div>
      </div>
    </div>
  );
}

export default function ChatPanel({ current, messages, users = [], onSend, onToggleMembers }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const { user } = useContext(AuthContext);

  const ref = useRef(null);
  const inputRef = useRef(null);

  const isTextChannel = current.type === "text";
  const usersByName = useMemo(
    () => new Map(users.map((item) => [item.username, item])),
    [users]
  );

  const groupedMessages = useMemo(() => {
    const sorted = [...messages].sort((a, b) => {
      const diff = getMessageDate(a) - getMessageDate(b);
      if (diff !== 0) return diff;
      return (a.id || 0) - (b.id || 0);
    });

    const groups = [];
    for (const message of sorted) {
      const date = getMessageDate(message);
      const key = dayKey(date);
      const last = groups[groups.length - 1];

      if (!last || last.key !== key) {
        groups.push({ key, date, messages: [message] });
      } else {
        last.messages.push(message);
      }
    }

    return groups;
  }, [messages]);

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
  }, [messages, current]);

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
        ) : groupedMessages.length === 0 ? (
          <p className="text-muted">Сообщений пока нет.</p>
        ) : (
          groupedMessages.map((group) => (
            <div className="message-day-group" key={group.key}>
              <div className="date-separator">{formatDateSeparator(group.date)}</div>
              {group.messages.map((message, index) => {
                const author = usersByName.get(message.user);
                return (
                  <MessageItem
                    key={message.id ?? `${group.key}-${index}`}
                    message={message}
                    author={author}
                    isOwn={message.user === user?.username}
                  />
                );
              })}
            </div>
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
