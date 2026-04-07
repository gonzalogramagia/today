'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Check, Square, CheckSquare, Pencil, X, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'

type Task = {
    id: string
    text: string
    url?: string
    completed: boolean
    sort_index?: number
}

export default function DailyTasks() {
    const { user, loading: authLoading, supabase } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [inputValue, setInputValue] = useState('')
    const [urlValue, setUrlValue] = useState('')
    const [mounted, setMounted] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const isEnglish = pathname?.startsWith('/en')
    const containerRef = useRef<HTMLDivElement>(null)

    // Helper to get Argentina date string YYYY-MM-DD
    const getArgentinaDate = () => {
        return new Date().toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    // Close form when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (editingId) {
                    addTask()
                }
                setIsAdding(false)
                setEditingId(null)
            }
        }

        if (isAdding || editingId) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isAdding, editingId, inputValue, urlValue])

    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const checkVisibility = () => {
            const saved = localStorage.getItem('config-show-tasks')
            setIsVisible(saved !== 'false')
        }

        checkVisibility()
        window.addEventListener('config-update', checkVisibility)
        return () => window.removeEventListener('config-update', checkVisibility)
    }, [])

    // Fetch integration: Local + Supabase
    useEffect(() => {
        setMounted(true)
        if (authLoading) return;
        const loadTasks = async () => {
            const today = getArgentinaDate()
            const lastReset = localStorage.getItem('daily-tasks-last-reset')

            if (user) {
                // ENVIRONMENT: AUTHENTICATED (Supabase)
                const { data, error } = await supabase
                    .from('daily_tasks')
                    .select('*')
                    .order('sort_index', { ascending: true })

                if (!error && data) {
                    let remoteTasks = data as Task[]
                    
                    // Handle daily reset logic on Supabase data
                    if (lastReset !== today) {
                        const { error: updateError } = await supabase
                            .from('daily_tasks')
                            .update({ completed: false })
                            .eq('user_id', user.id)

                        if (!updateError) {
                            remoteTasks = remoteTasks.map(t => ({ ...t, completed: false }))
                            localStorage.setItem('daily-tasks-last-reset', today)
                        }
                    }
                    setTasks(remoteTasks)
                }
            } else {
                // ENVIRONMENT: GUEST (LocalStorage)
                // Apply daily reset logic locally
                if (lastReset !== today) {
                    const savedTasks = localStorage.getItem('daily-tasks')
                    if (savedTasks) {
                        try {
                            const parsed = JSON.parse(savedTasks)
                            const updated = (parsed as Task[]).map(t => ({ ...t, completed: false }))
                            localStorage.setItem('daily-tasks', JSON.stringify(updated))
                            setTasks(updated)
                        } catch (e) { }
                    }
                    localStorage.setItem('daily-tasks-last-reset', today)
                } else {
                    const savedTasks = localStorage.getItem('daily-tasks')
                    if (savedTasks) {
                        try {
                            setTasks(JSON.parse(savedTasks))
                        } catch (e) { }
                    }
                }
            }
            setLoading(false)
        }

        loadTasks()

        const handleStorageChange = (e: StorageEvent) => {
            // Only sync from other tabs if we are in GUEST mode
            if (e.key === 'daily-tasks' && e.newValue && !user) {
                try {
                    setTasks(JSON.parse(e.newValue))
                } catch (err) {
                    console.error('Failed to sync tasks', err)
                }
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [user, authLoading, supabase])

    // Save to LocalStorage ONLY for Guest environment
    useEffect(() => {
        if (!mounted || user) return // Do not touch localStorage if logged in
        localStorage.setItem('daily-tasks', JSON.stringify(tasks))
    }, [tasks, mounted, user])

    // Interval to check for date change if the app is kept open
    useEffect(() => {
        const interval = setInterval(() => {
            const lastReset = localStorage.getItem('daily-tasks-last-reset')
            const today = getArgentinaDate()
            if (lastReset !== today) {
                setTasks(current => current.map(t => ({ ...t, completed: false })))
                localStorage.setItem('daily-tasks-last-reset', today)
                if (user) {
                    supabase.from('daily_tasks').update({ completed: false }).eq('user_id', user.id).then()
                }
            }
        }, 60000) // Check every minute
        return () => clearInterval(interval)
    }, [user, supabase])

    const addTask = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!inputValue.trim()) return

        if (editingId) {
            const updatedText = inputValue.trim()
            const updatedUrl = urlValue.trim() || undefined
            
            setTasks(tasks.map(t =>
                t.id === editingId
                    ? { ...t, text: updatedText, url: updatedUrl }
                    : t
            ))

            if(user) {
                await supabase
                    .from('daily_tasks')
                    .update({ text: updatedText, url: updatedUrl })
                    .eq('id', editingId)
            }
            setEditingId(null)
        } else {
            const newTask: Task = {
                id: crypto.randomUUID(),
                text: inputValue.trim(),
                url: urlValue.trim() || undefined,
                completed: false,
                sort_index: tasks.length
            }
            setTasks([...tasks, newTask])

            if (user) {
                await supabase
                    .from('daily_tasks')
                    .insert([{
                        id: newTask.id,
                        user_id: user.id,
                        text: newTask.text,
                        url: newTask.url,
                        completed: newTask.completed,
                        sort_index: newTask.sort_index
                    }])
            }
        }
        setInputValue('')
        setUrlValue('')
        setIsAdding(false)
    }

    const startEditing = (task: Task) => {
        setEditingId(task.id)
        setInputValue(task.text)
        setUrlValue(task.url || '')
        setIsAdding(false)
    }

    const cancelEditing = () => {
        if (editingId) {
            addTask()
        }
        setEditingId(null)
        setInputValue('')
        setUrlValue('')
    }

    const handleCloseAdd = () => {
        setIsAdding(false)
        setInputValue('')
        setUrlValue('')
    }

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id)
        if (!task) return

        const newCompletedStatus = !task.completed
        setTasks(tasks.map(t =>
            t.id === id ? { ...t, completed: newCompletedStatus } : t
        ))

        if (user) {
            await supabase
                .from('daily_tasks')
                .update({ completed: newCompletedStatus })
                .eq('id', id)
        }
    }

    const confirmDelete = async (id: string) => {
        if (deletingId === id) {
            setTasks(tasks.filter(t => t.id !== id))
            if (user) {
                await supabase
                    .from('daily_tasks')
                    .delete()
                    .eq('id', id)
            }
            setDeletingId(null)
        } else {
            setDeletingId(id)
        }
    }

    const handleDragStart = (id: string) => {
        setDraggedTaskId(id)
    }

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault()
        if (draggedTaskId === id) return

        const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId)
        const targetIdx = tasks.findIndex(t => t.id === id)

        if (draggedIdx === -1 || targetIdx === -1) return

        const newTasks = [...tasks]
        const [removed] = newTasks.splice(draggedIdx, 1)
        newTasks.splice(targetIdx, 0, removed)
        setTasks(newTasks)
    }

    const handleDragEnd = async () => {
        setDraggedTaskId(null)
        // Sync reorder to Supabase
        if (user) {
            const updates = tasks.map((task, index) => ({
                id: task.id,
                user_id: user.id,
                text: task.text,
                url: task.url,
                completed: task.completed,
                sort_index: index
            }))
            await supabase.from('daily_tasks').upsert(updates)
        }
    }

    if (!mounted) return null

    return (
        <div ref={containerRef} className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
            <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-4 transition-all">
                <div className="group/header flex items-center justify-between mb-5" onClick={() => editingId && cancelEditing()}>
                    <h3 className="font-medium text-zinc-900 text-sm flex items-center justify-start gap-2 relative group/tooltip w-max cursor-default">
                        <span className="text-base select-none">
                            🕒
                        </span>
                        <span>{isEnglish ? 'Daily Tasks' : 'Tareas Diarias'}</span>
                        <div className="absolute bottom-full left-[-4px] mb-2 w-max bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50">
                            {isEnglish ? 'Resets at 23:59' : 'Se resetean a las 23:59'}
                            {/* Speech bubble pointer */}
                            <div className="absolute top-full left-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-black"></div>
                        </div>
                    </h3>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (isAdding) {
                                handleCloseAdd()
                            } else {
                                if (editingId) cancelEditing()
                                setIsAdding(true)
                                setEditingId(null)
                                setInputValue('')
                                setUrlValue('')
                            }
                        }}
                        className={`p-1 rounded hover:bg-zinc-100 transition-colors cursor-pointer ${isAdding ? 'text-red-500 opacity-100' : 'text-zinc-500 opacity-0 group-hover/header:opacity-100'} ${editingId ? 'hidden' : ''} transition-opacity`}
                    >
                        {isAdding ? <X size={16} /> : <Plus size={16} />}
                    </button>
                </div>

                <div className={`space-y-2 max-h-[60vh] overflow-y-auto overflow-x-hidden mb-3 custom-scrollbar transition-opacity duration-200 ${isAdding ? 'opacity-50 pointer-events-none' : ''}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-6 opacity-50">
                            <Loader2 className="w-5 h-5 animate-spin text-[#6866D6]" />
                        </div>
                    ) : (
                        tasks.map((task, index) => (
                            <div
                                key={task.id}
                                className={`group min-h-[24px] transition-all duration-200 ${draggedTaskId === task.id ? 'opacity-30 scale-[0.98] cursor-grabbing' : 'opacity-100'} ${editingId || isAdding ? 'cursor-default' : 'cursor-grab'}`}
                                draggable={!editingId && !isAdding}
                                onDragStart={() => handleDragStart(task.id)}
                                onDragOver={(e) => handleDragOver(e, task.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => {
                                    if (editingId && editingId !== task.id) {
                                        cancelEditing()
                                    }
                                }}
                            >
                            {editingId === task.id ? (
                                <form onSubmit={addTask} className="flex flex-col gap-2 animate-in fade-in duration-200 px-0.5">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={isEnglish ? 'Task name...' : 'Nombre de tarea...'}
                                            autoFocus
                                            className="flex-1 bg-zinc-50 border-none rounded text-xs px-2 py-1 focus:ring-1 focus:ring-zinc-300 outline-none text-zinc-800 mx-[1px]"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim()}
                                            className="bg-[#6866D6] text-white rounded px-1.5 py-1 hover:bg-[#5856c4] disabled:opacity-50 transition-colors cursor-pointer"
                                            title={isEnglish ? 'Save' : 'Guardar'}
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEditing}
                                            className="rounded px-1.5 py-1 transition-colors cursor-pointer bg-zinc-200 text-zinc-500 hover:bg-red-100 hover:text-red-500 mr-[1px]"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={urlValue}
                                        onChange={(e) => setUrlValue(e.target.value)}
                                        placeholder={isEnglish ? 'Optional URL...' : 'URL opcional...'}
                                        className="w-full bg-zinc-50 border-none rounded text-xs px-2 py-1 focus:ring-1 focus:ring-zinc-300 outline-none text-zinc-800 text-[10px] mx-[1px]"
                                    />
                                </form>
                            ) : (
                                <div className={`flex items-center gap-2 text-sm ${editingId && editingId !== task.id ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`flex-shrink-0 transition-colors cursor-pointer ${task.completed ? 'text-green-500' : 'text-zinc-300 hover:text-zinc-400'}`}
                                    >
                                        {task.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <span className={`flex-1 break-words transition-all ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                                        {task.url ? (
                                            <a
                                                href={task.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline decoration-zinc-400"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {task.text}
                                            </a>
                                        ) : (
                                            task.text
                                        )}
                                    </span>
                                    {(!isAdding && !editingId) && (
                                        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    startEditing(task)
                                                }}
                                                className="p-1 text-zinc-400 hover:text-[#6866D6] transition-colors cursor-pointer"
                                                title={isEnglish ? 'Edit' : 'Editar'}
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    confirmDelete(task.id)
                                                }}
                                                className={`p-1 cursor-pointer ${deletingId === task.id ? 'text-red-500 opacity-100' : 'text-zinc-400 hover:text-red-500'}`}
                                                title={isEnglish ? 'Delete' : 'Eliminar'}
                                            >
                                                {deletingId === task.id ? <Check size={14} /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )))}

                    {tasks.length === 0 && (
                        <div className="text-xs text-zinc-400 text-center py-4 italic">
                            {isEnglish ? 'No tasks for today' : 'No hay tareas para hoy'}
                        </div>
                    )}
                </div>

                {isAdding && (
                    <form onSubmit={addTask} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200 px-0.5">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isEnglish ? 'New task...' : 'Nueva tarea...'}
                                autoFocus
                                className="flex-1 bg-zinc-50 border-none rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-zinc-300 outline-none text-zinc-800 mx-[1px]"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="bg-[#6866D6] text-white rounded p-1.5 hover:bg-[#5856c4] disabled:opacity-50 transition-colors cursor-pointer"
                                title={isEnglish ? 'Add' : 'Agregar'}
                            >
                                <Plus size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false)
                                    setInputValue('')
                                    setUrlValue('')
                                }}
                                className="rounded p-1.5 transition-colors cursor-pointer bg-zinc-200 text-zinc-500 hover:bg-red-100 hover:text-red-500 mr-[1px]"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={urlValue}
                            onChange={(e) => setUrlValue(e.target.value)}
                            placeholder={isEnglish ? 'Optional URL...' : 'URL opcional...'}
                            className="w-full bg-zinc-50 border-none rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-zinc-300 outline-none text-zinc-800 text-xs mx-[1px]"
                        />
                    </form>
                )}
            </div>
        </div>
    )
}
