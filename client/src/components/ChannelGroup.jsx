import React from "react";

// ====================== ChannelItem ======================
// Один элемент списка каналов
function ChannelItem({ id, name, type, active, onSwitch, onDelete }) {
  const icon = type === "text" ? "#" : "🔊";
  return (
    <div
      className={`channel-item${active ? " active" : ""}`}
      onClick={onSwitch}
      title={`Перейти в ${name}`}
    >
      <span>{icon} {name}</span>
      <button
        className="delete-btn"
        title="Удалить канал"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        🗑️
      </button>
    </div>
  );
}

// ====================== ChannelGroup ======================
// Отдельный блок каналов (текстовые/голосовые)
export default function ChannelGroup({
  title,
  type,
  list = [],
  current,
  onSwitch,
  onOpenModal
}) {
  return (
    <div className="channel-group">
      <div className="channel-category">
        <span>{title}</span>
        <button
          onClick={() => onOpenModal({ open: true, mode: "add", type })}
          title="Добавить канал"
        >
          +
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-muted">Нет каналов</p>
      ) : (
        list.map((ch) => (
          <ChannelItem
            key={ch.id}
            id={ch.id}
            name={ch.name}
            type={type}
            active={current?.id === ch.id && current?.type === type}
            onSwitch={() => onSwitch({ id: ch.id, name: ch.name, type })}
            onDelete={() =>
              onOpenModal({
                open: true,
                mode: "delete",
                id: ch.id,
                name: ch.name,
                type
              })
            }
          />
        ))
      )}
    </div>
  );
}
