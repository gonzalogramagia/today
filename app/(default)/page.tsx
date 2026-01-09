"use client";

import { useState, useEffect } from "react";

interface TextBlock {
  id: string;
  tag: string;
  title: string;
  content: string;
}

export default function LocalPage() {
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  // ahora usamos IDs cortos tipo hash de 4 caracteres

  // Cargar datos del localStorage al montar el componente
  useEffect(() => {
    const savedBlocks = localStorage.getItem("localhost-blocks");

    if (savedBlocks) {
      try {
        const parsed = JSON.parse(savedBlocks);
        // migrate titles that were auto-generated as "Bloque <id>" to empty so placeholder shows
        // and ensure each block has a tag (random) for the placeholder
        const migrated = (parsed as any[]).map((b) => {
          const tag =
            b && typeof b.tag === "string" && b.tag ? b.tag : generateId();
          if (
            b &&
            typeof b.title === "string" &&
            /^Bloque [a-z0-9]{4}$/i.test(b.title)
          ) {
            return { ...b, title: "", tag };
          }
          return { ...b, tag };
        });
        setBlocks(migrated as TextBlock[]);
      } catch (e) {
        // fallback: parse and ensure tags
        const raw = JSON.parse(savedBlocks) as any[];
        const ensured = raw.map((b) => ({
          ...b,
          tag: b && b.tag ? b.tag : generateId(),
        }));
        setBlocks(ensured as TextBlock[]);
      }
    }
  }, []);

  // Guardar en localStorage cada vez que cambien los bloques
  useEffect(() => {
    localStorage.setItem("localhost-blocks", JSON.stringify(blocks));
  }, [blocks]);

  // Si se hace click fuera del bloque en edición, guardar y salir de edición
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!editingBlockId) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Si el click fue sobre un enlace, no interferimos (abrirá en nueva pestaña)
      if (target.closest && target.closest("a")) return;

      // Encontrar el bloque que contiene el target (si existe)
      let node: HTMLElement | null = target;
      let targetBlockId: string | null = null;
      while (node) {
        const attr = node.getAttribute && node.getAttribute("data-block-id");
        if (attr) {
          targetBlockId = attr;
          break;
        }
        node = node.parentElement;
      }

      // Si el click fue dentro del mismo bloque en edición => no hacer nada
      if (targetBlockId === editingBlockId) return;

      // Guardar el bloque actualmente en edición
      const current = blocks.find((b) => b.id === editingBlockId);
      if (current) {
        updateBlock(current.id, editingContent);
      }

      if (targetBlockId) {
        // Si el click fue dentro de otro bloque: cambiar a ese bloque y cargar su contenido
        const next = blocks.find((b) => b.id === targetBlockId);
        if (next) {
          setEditingBlockId(next.id);
          setEditingContent(next.content);
          return;
        }
      }

      // Si fue fuera de cualquier bloque: cerrar edición
      setEditingBlockId(null);
      setEditingContent("");
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [editingBlockId, editingContent, blocks]);

  // Genera un hash corto de 4 caracteres (alfa-numérico) y evita colisiones
  const generateId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const make = () =>
      Array.from(
        { length: 4 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
    let id = make();
    // en el improbable caso de colisión, volver a generar hasta que sea único
    const existing = new Set(blocks.map((b) => b.id));
    while (existing.has(id)) {
      id = make();
    }
    return id;
  };

  // Alterna entre modo edición para un bloque (editar/guardar)
  const toggleEditBlock = (block: TextBlock) => {
    if (editingBlockId === block.id) {
      // guardar
      updateBlock(block.id, editingContent);
      setEditingBlockId(null);
      setEditingContent("");
    } else {
      // guardar actual antes de cambiar
      saveCurrentEditing();
      // entrar a editar
      setEditingBlockId(block.id);
      setEditingContent(block.content);
    }
  };

  const saveCurrentEditing = () => {
    if (!editingBlockId) return;
    const current = blocks.find((b) => b.id === editingBlockId);
    if (current) updateBlock(current.id, editingContent);
  };

  // Convierte URLs en enlaces seguros que abren en nueva pestaña
  const linkify = (text: string) => {
    if (!text) return "";
    // escapar HTML básico
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const escaped = escapeHtml(text);
    const urlRegex = /((https?:\/\/|www\.)[\w\-.:/?#@!$&'()*+,;=%~]+)/g;
    return escaped.replace(urlRegex, (match) => {
      const url = match.startsWith("http") ? match : `https://${match}`;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${match}</a>`;
    });
  };

  const addBlock = () => {
    const id = generateId();
    const newBlock: TextBlock = {
      id,
      tag: generateId(),
      title: "",
      content: "",
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, content } : block))
    );
  };

  const updateBlockTitle = (id: string, title: string) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, title } : block))
    );
  };

  const deleteBlock = (id: string) => {
    if (!confirm("¿Estás seguro que quieres eliminar este bloque?")) return;
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  return (
    <section className="mb-8">
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tighter">
          Local Notes
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Bloque de notas que se guardan automáticamente en tu navegador
        </p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={addBlock}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer"
          >
            + Agregar Bloque
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {blocks
          .slice()
          .reverse()
          .map((block) => (
            <div
              key={block.id}
              data-block-id={block.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-2 gap-3">
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => updateBlockTitle(block.id, e.target.value)}
                  onFocus={() => {
                    if (editingBlockId !== block.id) {
                      saveCurrentEditing();
                      setEditingBlockId(block.id);
                      setEditingContent(block.content);
                    } else {
                      setEditingBlockId(block.id);
                    }
                  }}
                  onClick={() => {
                    if (editingBlockId !== block.id) {
                      saveCurrentEditing();
                      setEditingBlockId(block.id);
                      setEditingContent(block.content);
                    } else {
                      setEditingBlockId(block.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // si estamos editando este bloque, guardar contenido y salir de edición
                      if (editingBlockId === block.id) {
                        updateBlock(block.id, editingContent);
                        setEditingBlockId(null);
                        setEditingContent("");
                        // quitar focus del input
                        (e.target as HTMLInputElement).blur();
                      }
                    }
                  }}
                  className={`flex-1 text-sm font-medium px-2 py-1 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500 ${editingBlockId === block.id
                    ? "bg-black text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    }`}
                  placeholder={`Nombre del bloque #${block.tag}...`}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleEditBlock(block)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    <span>
                      {editingBlockId === block.id ? "Guardar" : "Editar"}
                    </span>
                  </button>

                  {editingBlockId === block.id && (
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                      aria-label={`Eliminar ${block.title}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                        aria-hidden="true"
                      >
                        <path d="M9 3a1 1 0 00-1 1v1H4a1 1 0 100 2h16a1 1 0 100-2h-4V4a1 1 0 00-1-1H9zM7 9a1 1 0 011 1v7a2 2 0 002 2h4a2 2 0 002-2v-7a1 1 0 112 0v7a4 4 0 01-4 4h-4a4 4 0 01-4-4v-7a1 1 0 011-1z" />
                      </svg>
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>

              {editingBlockId === block.id ? (
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      // Enter without Shift -> save and exit edit mode
                      e.preventDefault();
                      updateBlock(block.id, editingContent);
                      setEditingBlockId(null);
                      setEditingContent("");
                      (e.target as HTMLTextAreaElement).blur();
                    }
                    // Shift+Enter should insert newline (default behavior)
                  }}
                  placeholder="Escribe aquí..."
                  className="w-full min-h-[160px] p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-y bg-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap break-words break-all overflow-auto"
                  autoFocus
                />
              ) : (
                <div
                  className="w-full min-h-[160px] p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-y bg-white dark:bg-gray-800 text-black dark:text-white whitespace-pre-wrap break-words break-all overflow-auto"
                  // Mostrar contenido con links clicables y permitir click-to-edit salvo clicks en links

                  onClick={(e) => {
                    // si el target es un enlace o tiene un ancestro <a>, no entrar en modo edición
                    let node = e.target as HTMLElement | null;
                    while (node) {
                      if (node.tagName === "A") return;
                      node = node.parentElement;
                    }

                    // activar edición (guardar anterior si aplica)
                    saveCurrentEditing();
                    setEditingBlockId(block.id);
                    setEditingContent(block.content);
                  }}
                  dangerouslySetInnerHTML={{ __html: linkify(block.content) }}
                />
              )}
              <div className="text-xs text-gray-400 mt-2">
                {editingBlockId === block.id
                  ? editingContent.length
                  : block.content.length}{" "}
                caracteres
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
