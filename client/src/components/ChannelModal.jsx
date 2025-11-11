import { useState, useEffect } from "react";

function ChannelModal({ mode, type, name, id, onClose, onConfirm }) {
  const [value, setValue] = useState(name || "");
  const isDelete = mode === "delete";

  // Закрытие по Esc
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  // Подтверждение создания
  const handleCreate = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed, type });
  };

  // Подтверждение удаления
  const handleDelete = () => onConfirm({ id, type });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h5>{isDelete ? "Удалить канал" : "Создать канал"}</h5>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>

        <main className="modal-body">
          {isDelete ? (
            <>
              <p>
                Вы действительно хотите удалить канал <b>{name}</b>?
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={onClose}>Отмена</button>
                <button className="btn-danger" onClick={handleDelete}>Удалить</button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Название канала"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn-cancel" onClick={onClose}>Отмена</button>
                <button className="btn-add" onClick={handleCreate}>Создать</button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ChannelModal;
