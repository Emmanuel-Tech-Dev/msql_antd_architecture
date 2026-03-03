// hooks/useCalendar.js
import { useState, useCallback, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Badge, Select, Radio, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

dayjs.extend(isBetween);

/**
 * useCalendar
 *
 * Variants:
 *  - 'basic'            → full page calendar, year/month switch
 *  - 'notice'           → full page with badge notices per cell
 *  - 'card'             → compact, fullscreen=false
 *  - 'selectable'       → tracks selected date, shows selection info
 *  - 'lunar'            → accepts lunarData map for cell rendering
 *  - 'week'             → showWeek=true
 *  - 'custom-header'    → headerRender with custom controls
 */
const useCalendar = (variant = 'basic', options = {}) => {
    const {
        defaultDate = dayjs(),
        defaultMode = 'month',
        notes: externalNotes = {},
        events: externalEvents = {},
        lunarData = {},           // { 'YYYY-MM-DD': { lunar, solarTerm, holiday } }
        maxNotesPerDay = null,
        selectable = true,
        validRange,
        disabledDate,
        locale,
        onDateSelect,
        onModeChange,
        onNoteAdd,
        onNoteDelete,
        onEventClick,
    } = options;

    // ─── Core state ──────────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [selectedCell, setSelectedCell] = useState(null);
    const [mode, setMode] = useState(defaultMode);
    const [calendarNotes, setCalendarNotes] = useState(externalNotes);
    const [calendarEvents, setCalendarEvents] = useState(externalEvents);

    // ─── Server sync ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (Object.keys(externalNotes).length > 0) setCalendarNotes(externalNotes);
    }, [JSON.stringify(externalNotes)]);

    useEffect(() => {
        if (Object.keys(externalEvents).length > 0) setCalendarEvents(externalEvents);
    }, [JSON.stringify(externalEvents)]);

    // ─── Key helpers ─────────────────────────────────────────────────────────
    const formatKey = useCallback((date) => dayjs(date).format('YYYY-MM-DD'), []);
    const formatMonthKey = useCallback((date) => dayjs(date).format('YYYY-MM'), []);

    // ─── Notes ───────────────────────────────────────────────────────────────
    const getNotesForDate = useCallback((date) =>
        calendarNotes[formatKey(date)] || [], [calendarNotes, formatKey]);

    const getNotesForMonth = useCallback((date) =>
        calendarNotes[formatMonthKey(date)] || [], [calendarNotes, formatMonthKey]);

    const addNote = useCallback((date, note) => {
        const key = formatKey(date);
        setCalendarNotes((prev) => {
            const existing = prev[key] || [];
            if (maxNotesPerDay && existing.length >= maxNotesPerDay) return prev;
            const newNote = { id: Date.now(), createdAt: dayjs().toISOString(), ...note };
            const updated = { ...prev, [key]: [...existing, newNote] };
            onNoteAdd?.(date, newNote, updated);
            return updated;
        });
    }, [formatKey, maxNotesPerDay, onNoteAdd]);

    const deleteNote = useCallback((date, noteId) => {
        const key = formatKey(date);
        setCalendarNotes((prev) => {
            const updated = { ...prev, [key]: (prev[key] || []).filter((n) => n.id !== noteId) };
            onNoteDelete?.(date, noteId, updated);
            return updated;
        });
    }, [formatKey, onNoteDelete]);

    const updateNote = useCallback((date, noteId, changes) => {
        const key = formatKey(date);
        setCalendarNotes((prev) => ({
            ...prev,
            [key]: (prev[key] || []).map((n) => n.id === noteId ? { ...n, ...changes } : n),
        }));
    }, [formatKey]);

    // ─── Events ──────────────────────────────────────────────────────────────
    const getEventsForDate = useCallback((date) =>
        calendarEvents[formatKey(date)] || [], [calendarEvents, formatKey]);

    const addEvent = useCallback((date, event) => {
        const key = formatKey(date);
        setCalendarEvents((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), { id: Date.now(), ...event }],
        }));
    }, [formatKey]);

    const deleteEvent = useCallback((date, eventId) => {
        const key = formatKey(date);
        setCalendarEvents((prev) => ({
            ...prev,
            [key]: (prev[key] || []).filter((e) => e.id !== eventId),
        }));
    }, [formatKey]);

    const updateEvent = useCallback((date, eventId, changes) => {
        const key = formatKey(date);
        setCalendarEvents((prev) => ({
            ...prev,
            [key]: (prev[key] || []).map((e) => e.id === eventId ? { ...e, ...changes } : e),
        }));
    }, [formatKey]);

    // ─── Lunar helper ────────────────────────────────────────────────────────
    const getLunarData = useCallback((date) =>
        lunarData[formatKey(date)] || null, [lunarData, formatKey]);

    // ─── Selection ───────────────────────────────────────────────────────────
    const handleDateSelect = useCallback((date, info) => {
        if (!selectable) return;
        setSelectedDate(date);
        setSelectedCell(formatKey(date));
        onDateSelect?.(date, {
            source: info?.source,
            notes: getNotesForDate(date),
            events: getEventsForDate(date),
            lunar: getLunarData(date),
        });
    }, [selectable, formatKey, getNotesForDate, getEventsForDate, getLunarData, onDateSelect]);

    const handlePanelChange = useCallback((date, newMode) => {
        setSelectedDate(date);
        setMode(newMode);
        onModeChange?.(newMode, date);
    }, [onModeChange]);

    // ─── Cell data ───────────────────────────────────────────────────────────
    const getCellData = useCallback((date) => ({
        key: formatKey(date),
        notes: getNotesForDate(date),
        events: getEventsForDate(date),
        lunar: getLunarData(date),
        isSelected: formatKey(date) === selectedCell,
        isToday: dayjs(date).isSame(dayjs(), 'day'),
        hasNotes: getNotesForDate(date).length > 0,
        hasEvents: getEventsForDate(date).length > 0,
    }), [formatKey, getNotesForDate, getEventsForDate, getLunarData, selectedCell]);

    const getMonthCellData = useCallback((date) => ({
        key: formatMonthKey(date),
        notes: getNotesForMonth(date),
        isSelected: formatMonthKey(date) === formatMonthKey(selectedDate),
        hasNotes: getNotesForMonth(date).length > 0,
    }), [formatMonthKey, getNotesForMonth, selectedDate]);

    // ─── Stats ───────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const noteValues = Object.values(calendarNotes);
        const eventValues = Object.values(calendarEvents);
        return {
            totalNotes: noteValues.flat().length,
            totalEvents: eventValues.flat().length,
            daysWithNotes: noteValues.filter((n) => n.length > 0).length,
            daysWithEvents: eventValues.filter((e) => e.length > 0).length,
            notesByType: noteValues.flat().reduce((acc, note) => {
                acc[note.type || 'default'] = (acc[note.type || 'default'] || 0) + 1;
                return acc;
            }, {}),
            eventsByType: eventValues.flat().reduce((acc, event) => {
                acc[event.type || 'default'] = (acc[event.type || 'default'] || 0) + 1;
                return acc;
            }, {}),
        };
    }, [calendarNotes, calendarEvents]);

    // ─── Built-in cell renderers ──────────────────────────────────────────────
    // Notice calendar — renders badges from notes
    const noticeCellRender = useCallback((date, info) => {
        if (info.type === 'date') {
            const { notes } = getCellData(date);
            return notes.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {notes.map((note) => (
                        <li key={note.id}>
                            <Badge
                                status={note.type || 'default'}
                                text={note.title}
                                style={{ fontSize: 12 }}
                            />
                        </li>
                    ))}
                </ul>
            ) : null;
        }
        if (info.type === 'month') {
            const { notes } = getMonthCellData(date);
            return notes.length > 0 ? (
                <Badge count={notes.length} style={{ backgroundColor: '#52c41a' }} />
            ) : null;
        }
    }, [getCellData, getMonthCellData]);

    // Lunar calendar — renders lunar info below date number
    const lunarCellRender = useCallback((date, info) => {
        if (info.type !== 'date') return info.originNode;
        const lunar = getLunarData(date);
        return (
            <div style={{ position: 'relative' }}>
                {info.originNode}
                {lunar && (
                    <div style={{ fontSize: 10, color: lunar.holiday ? '#f5222d' : '#999', lineHeight: 1.2 }}>
                        {lunar.holiday || lunar.solarTerm || lunar.lunar}
                    </div>
                )}
            </div>
        );
    }, [getLunarData]);

    // ─── Custom header renderer ───────────────────────────────────────────────
    const customHeaderRender = useCallback(({ value, type, onChange, onTypeChange }) => {
        const year = value.year();
        const month = value.month();

        const yearOptions = Array.from({ length: 10 }, (_, i) => ({
            label: `${year - 5 + i}`,
            value: year - 5 + i,
        }));

        const monthOptions = Array.from({ length: 12 }, (_, i) => ({
            label: dayjs().month(i).format('MMM'),
            value: i,
        }));

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
                <Button
                    size="small"
                    icon={<LeftOutlined />}
                    onClick={() => onChange(value.subtract(1, type === 'month' ? 'month' : 'year'))}
                />
                <Select
                    size="small"
                    value={year}
                    options={yearOptions}
                    onChange={(val) => onChange(value.year(val))}
                    style={{ width: 80 }}
                />
                {type === 'month' && (
                    <Select
                        size="small"
                        value={month}
                        options={monthOptions}
                        onChange={(val) => onChange(value.month(val))}
                        style={{ width: 70 }}
                    />
                )}
                <Button
                    size="small"
                    icon={<RightOutlined />}
                    onClick={() => onChange(value.add(1, type === 'month' ? 'month' : 'year'))}
                />
                <Radio.Group
                    size="small"
                    value={type}
                    onChange={(e) => onTypeChange(e.target.value)}
                    style={{ marginLeft: 'auto' }}
                >
                    <Radio.Button value="month">Month</Radio.Button>
                    <Radio.Button value="year">Year</Radio.Button>
                </Radio.Group>
            </div>
        );
    }, []);

    // ─── Variant-specific calendar props ─────────────────────────────────────
    const calendarProps = useMemo(() => {
        const base = {
            value: selectedDate,
            mode,
            validRange,
            disabledDate,
            locale,
            onSelect: handleDateSelect,
            onPanelChange: handlePanelChange,
        };

        switch (variant) {
            case 'notice':
                return { ...base, fullscreen: true, cellRender: noticeCellRender };

            case 'card':
                return { ...base, fullscreen: false };

            case 'selectable':
                return { ...base, fullscreen: true };

            case 'lunar':
                return { ...base, fullscreen: true, fullCellRender: lunarCellRender };

            case 'week':
                return { ...base, fullscreen: true, showWeek: true };

            case 'custom-header':
                return { ...base, fullscreen: true, headerRender: customHeaderRender };

            case 'basic':
            default:
                return { ...base, fullscreen: true };
        }
    }, [
        variant, selectedDate, mode, validRange, disabledDate, locale,
        handleDateSelect, handlePanelChange,
        noticeCellRender, lunarCellRender, customHeaderRender,
    ]);

    return {
        // state
        selectedDate, setSelectedDate,
        selectedCell,
        mode, setMode,
        // notes
        calendarNotes, setCalendarNotes,
        getNotesForDate, getNotesForMonth,
        addNote, deleteNote, updateNote,
        // events
        calendarEvents, setCalendarEvents,
        getEventsForDate,
        addEvent, deleteEvent, updateEvent,
        // lunar
        getLunarData,
        // handlers
        handleDateSelect,
        handlePanelChange,
        // cell helpers
        getCellData, getMonthCellData,
        // built-in renderers (can override)
        noticeCellRender,
        lunarCellRender,
        customHeaderRender,
        // stats
        stats,
        // spread directly onto <Calendar />
        calendarProps,
    };
};

export default useCalendar;