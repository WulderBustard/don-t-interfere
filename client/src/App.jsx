import React, { useState, useEffect, useRef, useMemo } from "react";
import "./index.css";
import { fetchChannels, createChannel, deleteChannelApi, fetchMessages, sendMessageApi } from "./api";
import VoiceChannels from "./components/VoiceChannel.jsx";
// ======= App (root компонент) =======
export default function App() {
  // Состояния приложения
  const [channels, setChannels] = useState({ text: {}, voice: {} }); // все каналы, разделенные по типу
  const [current, setCurrent] = useState(null); // текущий выбранный канал
  const [selfStatus, setSelfStatus] = useState("online"); // статус пользователя
  const [micMuted, setMicMuted] = useState(false); // микрофон включен/выключен
  const [membersOpen, setMembersOpen] = useState(false); // панель участников открыта
  const [messagesByChannel, setMessagesByChannel] = useState({}); // сообщения по каналам
  const [modal, setModal] = useState({ open: false, mode: "add", type: "text", name: "" }); // модальное окно
  const [voiceMembers, setVoiceMembers] = useState({}); // ADDED: карта channelId -> members[]
  const [joinedVoiceChannelId, setJoinedVoiceChannelId] = useState(null); // ADDED: id голосового канала, в котором мы сейчас в голосе

  // ======= Загрузка каналов при старте =======
useEffect(() => {
  let mounted = true;

  fetchChannels()
    .then(async (rows) => {
      if (!mounted) return;

      const text = {}, voice = {};
      rows.forEach(r => {
        if (r.type === "text") text[r.id] = { id: r.id, name: r.name };
        else voice[r.id] = { id: r.id, name: r.name, members: [] };
      });
      setChannels({ text, voice });

      if (!current) {
        const firstText = Object.values(text)[0];
        if (firstText) setCurrent({ id: firstText.id, name: firstText.name, type: "text" });
        else {
          const firstVoice = Object.values(voice)[0];
          if (firstVoice) setCurrent({ id: firstVoice.id, name: firstVoice.name, type: "voice" });
        }
      }

      // Подгружаем все сообщения с сервера
      try {
        const msgs = await fetchMessages(); // { [channelId]: [ {user, text, time}, ... ] }
        if (!mounted) return;
        setMessagesByChannel(msgs);
      } catch (err) {
        console.error("fetchMessages:", err);
      }
    })
    .catch(err => console.error("fetchChannels:", err));

  return () => { mounted = false; };
}, []);

  // ======= Добавление нового канала =======
  async function addChannel({ name, type }) {
    const trimmed = (name || "").trim();
    if (!trimmed) return; // игнорируем пустые имена
    try {
      const ch = await createChannel(trimmed, type); // создаем канал на сервере
      setChannels(prev => {
        const copy = { text: {...prev.text}, voice: {...prev.voice} };
        if (ch.type === "text") copy.text[ch.id] = { id: ch.id, name: ch.name };
        else copy.voice[ch.id] = { id: ch.id, name: ch.name, members: [] };
        return copy;
      });
      setCurrent({ id: ch.id, name: ch.name, type: ch.type }); // переключаем на новый канал
      setModal({ open: false }); // закрываем модальное окно
    } catch (err) {
      if (err.message === "exists") alert("Канал с таким именем уже существует");
      else { console.error(err); alert("Ошибка при создании канала"); }
    }
  }

  // ======= Удаление канала =======
  async function deleteChannel({ id, type }) {
    if (!id) return;
    try {
      await deleteChannelApi(id); // удаляем канал на сервере
      setChannels(prev => {
        const copy = { text: {...prev.text}, voice: {...prev.voice} };
        if (type === "text") delete copy.text[id];
        else delete copy.voice[id];
        return copy;
      });

      // если текущий канал был удален — переключаем на следующий
      setCurrent(prev => {
        if (!prev || prev.id !== id) return prev;
        const remainingText = Object.values(channels.text).filter(c => c.id !== id);
        if (remainingText.length) return { id: remainingText[0].id, name: remainingText[0].name, type: "text" };
        const remainingVoice = Object.values(channels.voice).filter(c => c.id !== id);
        if (remainingVoice.length) return { id: remainingVoice[0].id, name: remainingVoice[0].name, type: "voice" };
        return null;
      });

      setModal({ open: false });
    } catch (err) {
      console.error("deleteChannel", err);
      alert("Не удалось удалить канал");
    }
  }

  // ======= Отправка сообщений =======
async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || !current || current.type !== "text") return;

  const payload = { user: "Вы", text: trimmed, time: timeHHMM() };

  try {
    const saved = await sendMessageApi(current.id, payload); // отправляем на сервер
    setMessagesByChannel(prev => ({
      ...prev,
      [current.id]: [...(prev[current.id] || []), saved]
    }));
  } catch (err) {
    console.error("sendMessage:", err);
    alert("Не удалось отправить сообщение");
  }
}


  // ======= HANDLE SWITCH CHANNEL (wrap original setCurrent) =======
  // ADDED: используем эту функцию вместо setCurrent напрямую, чтобы при заходе в голосовой канал
  // автоматически начать голосовую сессию (оставляя голосовую сессию включенной при переключении на текст)
  function handleSwitchChannel(ch) {
    setCurrent(ch);
    if (ch && ch.type === "voice") {
      setJoinedVoiceChannelId(ch.id); // VoiceChannel будет смонтирован и подключится
    }
  }


  // ======= UI =======
  return (
    <div className={"app-grid" + (membersOpen ? " members-open" : "")}>
      <ChannelList
        channels={channels}
        current={current}
        onSwitch={setCurrent}
        onOpenModal={setModal}
        selfStatus={selfStatus}
        onChangeStatus={setSelfStatus}
        micMuted={micMuted}
        onToggleMic={() => setMicMuted(v => !v)}
      />

      {current && (
        <ChatPanel
          current={current}
          messages={messagesByChannel[current.id] || []}
          onSend={sendMessage}
          onToggleMembers={() => setMembersOpen(v => !v)}
        />
      )}

      {membersOpen && current && (
        <MembersPanel
          current={current}
          voiceChannels={channels.voice}
          selfStatus={selfStatus}
          voiceMembersMap={voiceMembers} 
        />
      )}

      {modal.open && (
        <ChannelModal
          {...modal}
          onClose={() => setModal({ open: false })}
          onConfirm={(data) => {
            if (modal.mode === "add") addChannel(data);
            else if (modal.mode === "delete") deleteChannel(data);
          }}
        />
      )}
    </div>
  );
}

// ====================== ChannelList ======================
// Список всех каналов и управление пользователем
function ChannelList({
  channels,
  current,
  onSwitch,
  onOpenModal,
  selfStatus,
  onChangeStatus,
  micMuted,
  onToggleMic,
}) {
  return (
    <aside className="channel-list">
      <div className="channel-groups">
        <ChannelGroup
          title="ТЕКСТОВЫЕ КАНАЛЫ"
          type="text"
          list={Object.values(channels.text)}
          current={current}
          onSwitch={onSwitch}
          onOpenModal={onOpenModal}
        />
        <ChannelGroup
          title="ГОЛОСОВЫЕ КАНАЛЫ"
          type="voice"
          list={Object.values(channels.voice)}
          current={current}
          onSwitch={onSwitch}
          onOpenModal={onOpenModal}
        />
      </div>

      <UserControls
        status={selfStatus}
        onChangeStatus={onChangeStatus}
        micMuted={micMuted}
        onToggleMic={onToggleMic}
      />
    </aside>
  );
}

// ====================== ChannelGroup ======================
// Группа каналов одного типа (текстовые или голосовые)
function ChannelGroup({ title, type, list, current, onSwitch, onOpenModal }) {
  return (
    <div className="channel-group">
      <div className="channel-category">
        <span>{title}</span>
        <button onClick={() => onOpenModal({ open: true, mode: "add", type })}>+</button>
      </div>
      {list.map(ch => (
        <ChannelItem
          key={ch.id}
          id={ch.id}
          name={ch.name}
          type={type}
          active={current?.id === ch.id && current?.type === type}
          onSwitch={() => onSwitch({ id: ch.id, name: ch.name, type })}
          onDelete={() => onOpenModal({ open: true, mode: "delete", id: ch.id, name: ch.name, type })}
        />
      ))}
    </div>
  );
}

// ====================== ChannelItem ======================
// Один канал в списке
function ChannelItem({ id, name, type, active, onSwitch, onDelete }) {
  const icon = type === "text" ? "#" : "🔊";
  return (
    <div className={"channel-item" + (active ? " active" : "")} onClick={onSwitch}>
      <span>{icon} {name}</span>
      <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }}>🗑️</button>
    </div>
  );
}

// ====================== UserControls ======================
// Панель управления пользователем (статус, микрофон)
function UserControls({ status, onChangeStatus, micMuted, onToggleMic }) {
  const [open, setOpen] = useState(false); // меню статуса
  const ref = useRef(null);

  // закрытие меню при клике вне панели
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="user-controls" ref={ref}>
      <div className="avatar" onClick={() => setOpen(v => !v)}>
        <div className={`status-dot ${statusClass(status)}`}></div>
      </div>
      <span className="username">Вы</span>
      <div className="actions">
        <button className={micMuted ? "mic muted" : "mic"} onClick={onToggleMic}>
          {micMuted ? "🔇" : "🎙️"}
        </button>
        <button className="btn-settings">⚙️</button>
      </div>
      {open && (
        <div className="status-menu">
          {["online", "idle", "offline"].map((s) => (
            <button key={s} onClick={() => { onChangeStatus(s); setOpen(false); }}>
              {statusEmoji(s)} {statusLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ====================== ChatPanel ======================
// Панель сообщений текущего канала
function ChatPanel({ current, messages, onSend, onToggleMembers }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  // автопрокрутка вниз при новых сообщениях
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  function submit() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <span>{current.type === "text" ? "#" : "🔊"} {current.name}</span>
        <button onClick={onToggleMembers}>⋮</button>
      </header>

      <div className="chat-messages" ref={ref}>
        {current.type !== "text"
          ? <p className="text-muted">Это голосовой канал.</p>
          : messages.map((m, i) => (
              <div key={i} className="message">
                <b>{m.user}</b> <span className="timestamp">{m.time}</span>
                <div>{m.text}</div>
              </div>
            ))}
      </div>

      {current.type === "text" && (
        <footer className="message-input">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
            placeholder="Напишите сообщение..."
          />
          <button onClick={submit}>Отправить</button>
        </footer>
      )}
    </section>
  );
}

// ====================== MembersPanel ======================
// Панель участников голосового канала
function MembersPanel({ current, voiceChannels, selfStatus }) {
  const members = useMemo(() => {
    if (current.type !== "voice") return [];
    return voiceChannels[current.id]?.members || [];
  }, [current, voiceChannels]);

  return (
    <aside className="members-panel">
      <h6>Участники</h6>
      {current.type === "text" && <p className="text-muted">Нет участников</p>}
      {current.type === "voice" && (
        <>
          {members.map((m, i) => (
            <div key={i} className="member">
              <div className="avatar">
                <div className={`status-dot ${statusClass(m.status)}`}></div>
              </div>
              <span>{m.name}</span>
              <span>{m.micMuted ? "🔇" : "🎙️"}</span>
            </div>
          ))}
          <div className="member">
            <div className="avatar">
              <div className={`status-dot ${statusClass(selfStatus)}`}></div>
            </div>
            <span>Вы</span>
            <span>🎙️</span>
          </div>
        </>
      )}
    </aside>
  );
}

// ====================== ChannelModal ======================
// Модальное окно для создания или удаления канала
function ChannelModal({ mode, type, name, id, onClose, onConfirm }) {
  const [value, setValue] = useState(name || "");
  const isDelete = mode === "delete";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5>{isDelete ? "Удалить канал" : "Создать канал"}</h5>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {isDelete ? (
            <>
              <p>Удалить канал <b>{name}</b>?</p>
              <button className="btn-danger" onClick={() => onConfirm({ id, type })}>Удалить</button>
            </>
          ) : (
            <>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Название канала"
              />
              <button onClick={() => onConfirm({ name: value, type })}>Создать</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================== Helpers ======================
const statusEmoji = s => ({ online: "🟢", idle: "🟡", offline: "⚫" }[s]);
const statusLabel = s => ({ online: "Онлайн", idle: "Нет на месте", offline: "Невидимый" }[s]);
const statusClass = s => ({ online: "status-online", idle: "status-idle" }[s] || "status-offline");
const timeHHMM = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
