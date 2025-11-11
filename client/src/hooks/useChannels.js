import { useEffect, useState } from "react";
import { fetchChannels, fetchMessages, createChannel, deleteChannelApi } from "../api";

export function useChannels() {
  const [channels, setChannels] = useState({ text: {}, voice: {} });
  const [messagesByChannel, setMessagesByChannel] = useState({});
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchChannels();
        if (!active) return;

        const text = {}, voice = {};
        for (const r of rows) {
          (r.type === "text" ? text : voice)[r.id] = { ...r, members: [] };
        }
        setChannels({ text, voice });

        const first = Object.values(text)[0] || Object.values(voice)[0];
        if (first) setCurrent(first);

        const msgs = await fetchMessages();
        if (active) setMessagesByChannel(msgs);
      } catch (err) {
        console.error(err);
      }
    })();

    return () => { active = false };
  }, []);

  async function addChannel(name, type) {
    const ch = await createChannel(name.trim(), type);
    setChannels(prev => ({
      ...prev,
      [type]: { ...prev[type], [ch.id]: { ...ch, members: [] } }
    }));
    setCurrent(ch);
  }

  async function deleteChannel(id, type) {
    await deleteChannelApi(id);
    setChannels(prev => {
      const copy = structuredClone(prev);
      delete copy[type][id];
      return copy;
    });
  }

  return {
    channels,
    current,
    setCurrent,
    messagesByChannel,
    setMessagesByChannel,
    addChannel,
    deleteChannel
  };
}
