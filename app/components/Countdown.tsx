'use client'

import { useState, useEffect, useRef } from 'react'
import { Timer, Trash2, CalendarClock, Plus, Pencil, X, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { dictionary } from "../data/i18n"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/app/hooks/useAuth"

interface CountdownItem {
    id: string
    name: string
    date: string
    type?: 'christmas' | 'new-year'
}

export default function Countdown() {
    const { user, loading: authLoading } = useAuth()
    const [countdowns, setCountdowns] = useState<CountdownItem[]>([])
    const [mounted, setMounted] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', date: '' })
    const [draggedCountdownId, setDraggedCountdownId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const isEnglish = pathname?.startsWith('/en')
    const containerRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    const handleSaveFixed = async (e?: React.FormEvent, customData?: { name: string, date: string }) => {
        e?.preventDefault()
        const data = customData || formData
        if (!data.name || !data.date) return

        let updatedCountdowns: CountdownItem[] = [];

        if (editingId) {
            updatedCountdowns = countdowns.map(c => {
                if (c.id === editingId) {
                    const isNameDifferent = c.name !== data.name;
                    return { 
                        ...c, 
                        ...data,
                        type: isNameDifferent ? undefined : c.type
                    };
                }
                return c;
            });
            setCountdowns(updatedCountdowns);
            
            if (user) {
              await supabase.from('countdowns')
                .upsert({ 
                    user_id: user.id,
                    local_id: editingId,
                    name: data.name, 
                    date: data.date 
                }, { onConflict: 'user_id,local_id' });
            }
            setEditingId(null)
        } else {
            if (countdowns.length >= 2) return
            const newId = crypto.randomUUID();
            const newItem = { id: newId, ...data };
            updatedCountdowns = [...countdowns, newItem];
            setCountdowns(updatedCountdowns);
            
            if (user) {
              await supabase.from('countdowns').insert({
                user_id: user.id,
                local_id: newId,
                name: data.name,
                date: data.date,
                sort_index: countdowns.length
              });
            }
            setIsCreating(false)
        }
        setFormData({ name: '', date: '' })
    }

    const handleSave = (e: React.FormEvent) => handleSaveFixed(e)

    const handleCloseEdit = () => {
        if (editingId) {
            handleSaveFixed()
        }
        setIsCreating(false)
        setEditingId(null)
    }

    // Close form when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (editingId) {
                    handleSaveFixed()
                }
                setIsCreating(false)
                setEditingId(null)
            }
        }
        if (isCreating || editingId) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isCreating, editingId, formData])

    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const checkVisibility = () => {
            const saved = localStorage.getItem('config-show-countdown')
            setIsVisible(saved !== 'false')
        }
        checkVisibility()
        window.addEventListener('config-update', checkVisibility)
        return () => window.removeEventListener('config-update', checkVisibility)
    }, [])

    useEffect(() => {
        setMounted(true)
        if (authLoading) return
        const loadCountdowns = async () => {
            if (authLoading) return

            if (user) {
                // ENVIRONMENT: AUTHENTICATED
                const { data, error } = await supabase
                    .from('countdowns')
                    .select('*')
                    .order('sort_index', { ascending: true });
                
                if (!error && data && data.length > 0) {
                    setCountdowns(data.map((c: any) => ({
                        id: c.local_id,
                        name: c.name,
                        date: c.date,
                        type: c.type
                    })));
                } else {
                    setCountdowns([]);
                }
            } else {
                // ENVIRONMENT: GUEST
                const saved = localStorage.getItem('countdown-events')
                if (saved) {
                    try {
                        setCountdowns(JSON.parse(saved))
                    } catch (e) {
                        console.error('Failed to parse countdowns', e)
                    }
                } else {
                    // Default logic for beginners
                    const isFirstTime = localStorage.getItem('countdown-first-time-check') === null
                    if (isFirstTime) {
                        const currentYear = new Date().getFullYear()
                        const nextYear = currentYear + 1
                        const t = dictionary[isEnglish ? 'en' : 'es']
                        const initialCountdown = [
                            {
                                id: crypto.randomUUID(),
                                name: `${t.countdownChristmas} ${currentYear}`,
                                date: `${currentYear}-12-24T23:59`,
                                type: 'christmas' as const
                            },
                            {
                                id: crypto.randomUUID(),
                                name: `${t.countdownNewYear} ${nextYear}`,
                                date: `${nextYear}-01-01T00:00`,
                                type: 'new-year' as const
                            }
                        ]
                        setCountdowns(initialCountdown)
                        localStorage.setItem('countdown-events', JSON.stringify(initialCountdown))
                        localStorage.setItem('countdown-first-time-check', 'done')
                    }
                }
            }
            setLoading(false)
        }

        loadCountdowns()

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'countdown-events' && !user) {
                loadCountdowns()
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [user, authLoading, supabase])

    useEffect(() => {
        if (!mounted || user) return
        localStorage.setItem('countdown-events', JSON.stringify(countdowns))
    }, [countdowns, mounted, user])

    const handleDelete = async (id: string) => {
        const remaining = countdowns.filter(c => c.id !== id);
        setCountdowns(remaining);
        if (user) {
            await supabase.from('countdowns').delete().eq('user_id', user.id).eq('local_id', id);
            // Re-sync sort order
            syncSortOrder(remaining);
        }
    }

    const syncSortOrder = async (items: CountdownItem[]) => {
        if (!user) return;
        for (let i = 0; i < items.length; i++) {
            supabase.from('countdowns')
                .update({ sort_index: i })
                .eq('user_id', user.id)
                .eq('local_id', items[i].id)
                .then();
        }
    }

    const startEditing = (item: CountdownItem) => {
        setEditingId(item.id)
        setFormData({ name: item.name, date: item.date })
        setIsCreating(false)
    }

    const handleDragStart = (id: string) => {
        setDraggedCountdownId(id)
    }

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault()
        if (draggedCountdownId === id) return

        const draggedIdx = countdowns.findIndex(c => c.id === draggedCountdownId)
        const targetIdx = countdowns.findIndex(c => c.id === id)

        if (draggedIdx === -1 || targetIdx === -1) return

        const newCountdowns = [...countdowns]
        const [removed] = newCountdowns.splice(draggedIdx, 1)
        newCountdowns.splice(targetIdx, 0, removed)
        setCountdowns(newCountdowns)
        if (user) syncSortOrder(newCountdowns)
    }

    const handleDragEnd = () => {
        setDraggedCountdownId(null)
    }

    if (!mounted) return null

    return (
        <div ref={containerRef} className={`fixed right-9 top-48 z-40 hidden lg:flex flex-col gap-4 w-64 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
            <div className="group bg-white border border-zinc-200 rounded-lg shadow-lg p-4 transition-all">
                <div className="flex items-center justify-between mb-3" onClick={handleCloseEdit}>
                    <h3 className="font-medium text-zinc-900 pt-1 text-sm flex items-center gap-2 cursor-default">
                        <CalendarClock size={16} />
                        {isEnglish ? 'Countdowns' : 'Cuentas Regresivas'}
                        {user && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-0.5" title="Sincronizado" />
                        )}
                    </h3>
                    {countdowns.length < 2 && !editingId && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsCreating(!isCreating)
                                setFormData({ name: '', date: '' })
                            }}
                            className={`p-1 rounded hover:bg-zinc-100 transition-colors cursor-pointer ${isCreating ? 'text-red-500 opacity-100' : 'text-zinc-500 opacity-0 group-hover:opacity-100'} transition-opacity`}
                        >
                            {isCreating ? <X size={16} /> : <Plus size={16} />}
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-6 opacity-50">
                            <Loader2 className="w-5 h-5 animate-spin text-[#6866D6]" />
                        </div>
                    ) : (
                        countdowns.map((item, index) => (
                        <div
                            key={item.id}
                            className={`relative group/item transition-all duration-200 ${draggedCountdownId === item.id ? 'opacity-30 scale-[0.98] cursor-grabbing' : 'opacity-100'} ${editingId || isCreating ? 'cursor-default' : 'cursor-grab'}`}
                            draggable={!editingId && !isCreating}
                            onDragStart={() => handleDragStart(item.id)}
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                                if (editingId && editingId !== item.id) {
                                    handleCloseEdit()
                                }
                            }}
                        >
                            <CountdownDisplay
                                item={item}
                                isEnglish={isEnglish}
                                onDelete={() => handleDelete(item.id)}
                                onEdit={() => startEditing(item)}
                                isEditing={editingId === item.id}
                                globalEditingId={editingId}
                            />
                            {editingId === item.id && (
                                <div className="mt-2">
                                    <CountdownForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        handleSave={handleSave}
                                        isEnglish={isEnglish}
                                        onCancel={() => {
                                            setEditingId(null)
                                            setFormData({ name: '', date: '' })
                                        }}
                                        isEditing={true}
                                    />
                                </div>
                            )}
                            {index === 0 && countdowns.length > 1 && !editingId && (
                                <div className="mt-4 border-t border-zinc-100" />
                            )}
                        </div>
                    )))}

                    {countdowns.length === 0 && !loading && !isCreating && (
                        <div className="text-xs text-zinc-400 text-center pt-5 pb-6 italic">
                            {isEnglish ? 'No active countdowns' : 'Aún no hay cuentas regresivas'}
                        </div>
                    )}

                    {isCreating && (
                        <CountdownForm
                            formData={formData}
                            setFormData={setFormData}
                            handleSave={handleSave}
                            isEnglish={isEnglish}
                            isEditing={false}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

function CountdownDisplay({ item, isEnglish, onDelete, onEdit, isEditing, globalEditingId }: {
    item: CountdownItem,
    isEnglish: boolean,
    onDelete: () => void,
    onEdit: () => void,
    isEditing: boolean,
    globalEditingId: string | null
}) {
    const [timeLeft, setTimeLeft] = useState('')
    const [timeColor, setTimeColor] = useState('text-zinc-500')
    const [funMessage, setFunMessage] = useState('')

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(item.date) - +new Date()

            if (difference > 0) {
                const totalMinutes = Math.floor(difference / (1000 * 60))
                const days = Math.floor(difference / (1000 * 60 * 60 * 24))
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
                const minutes = Math.floor((difference / 1000 / 60) % 60)
                const seconds = Math.floor((difference / 1000) % 60)

                if (totalMinutes <= 5) {
                    setTimeColor('text-red-500 animate-pulse')
                    setFunMessage(isEnglish ? 'Hurry up! 😱🔥' : 'Apurate! 😱🔥')
                } else if (totalMinutes <= 15) {
                    setTimeColor('text-yellow-500')
                    setFunMessage(isEnglish ? 'Almost there! 🏃‍♂️💨' : 'Ya casi! 🏃‍♂️💨')
                } else {
                    setTimeColor('text-zinc-500')
                    setFunMessage(isEnglish ? 'Keep going! 🚀' : 'Seguí así! 🚀')
                }

                return `${isEnglish ? 'In' : 'En'} ${days}d ${hours}h ${minutes}m ${seconds}s`
            } else {
                setTimeColor('text-green-500 font-bold')
                setFunMessage(isEnglish ? 'Enjoy! 🎉🥳' : 'Disfrutá! 🎉🥳')
                return isEnglish ? 'Event started!' : '¡Evento iniciado!'
            }
        }

        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
        return () => clearInterval(timer)
    }, [item.date, isEnglish])

    const date = new Date(item.date)
    const formattedDate = isEnglish
        ? (() => {
            const weekday = date.toLocaleString('en-US', { weekday: 'long' })
            const month = date.toLocaleString('en-US', { month: 'long' })
            const day = date.getDate()
            const time = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            return `On ${weekday}, ${month} ${day} at ${time}`
        })()
        : (() => {
            const weekday = date.toLocaleString('es-AR', { weekday: 'long' })
            const month = date.toLocaleString('es-AR', { month: 'long' })
            const day = date.getDate()
            const time = date.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })

            const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
            const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)

            return `El ${capitalizedWeekday} ${day} de ${capitalizedMonth} a las ${time} hs`
        })()

    return (
        <div className={`flex flex-col gap-1 relative transition-opacity ${isEditing ? 'opacity-30 pointer-events-none' : ''}`}>
            {!globalEditingId && (
                <div className="absolute -top-1 right-0 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="text-zinc-400 hover:text-[#6866D6] transition-colors cursor-pointer p-1"
                        title={isEnglish ? 'Edit' : 'Editar'}
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                        title={isEnglish ? 'Delete' : 'Eliminar'}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            <div className="font-bold text-lg text-zinc-800 break-words pr-12 leading-tight">
                {(() => {
                    const t = dictionary[isEnglish ? 'en' : 'es'];
                    if (item.type === 'christmas') return `${t.countdownChristmas} ${new Date(item.date).getFullYear()}`;
                    if (item.type === 'new-year') return `${t.countdownNewYear} ${new Date(item.date).getFullYear()}`;
                    return item.name;
                })()}
            </div>

            <div className="text-[10px] text-zinc-400 mb-1">
                {formattedDate}
            </div>

            <div className={`text-xl font-mono font-bold tracking-tight ${timeColor} transition-colors duration-500`}>
                {timeLeft}
            </div>

            <div className="text-xs font-medium text-zinc-600 mt-1 animate-bounce">
                {funMessage}
            </div>
        </div>
    )
}

function CountdownForm({ formData, setFormData, handleSave, isEnglish, onCancel, isEditing }: {
    formData: { name: string, date: string },
    setFormData: (data: { name: string, date: string }) => void,
    handleSave: (e: React.FormEvent) => void,
    isEnglish: boolean,
    onCancel?: () => void,
    isEditing: boolean
}) {
    return (
        <form onSubmit={handleSave} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
            <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isEnglish ? 'Event name...' : 'Nombre del evento...'}
                autoFocus
                className="w-full bg-zinc-50 border-none rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-zinc-300 outline-none text-zinc-800"
            />
            <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-zinc-50 border-none rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-zinc-300 outline-none text-zinc-800"
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={!formData.name || !formData.date}
                    className="flex-1 bg-[#6866D6] text-white rounded p-1.5 text-xs hover:bg-[#5856c4] disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                    <Timer size={14} />
                    {isEnglish ? 'Save' : 'Guardar'}
                </button>
                {isEditing && onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-1.5 rounded bg-zinc-100 text-zinc-500 hover:text-red-500 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </form>
    )
}
