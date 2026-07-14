import { useCallback, useMemo, useRef, useState } from 'react';
import RichTextEditor from '../components/editor/RichTextEditor';

function normalizeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function currentHtml(editorInstance) {
    if (!editorInstance || editorInstance.isEmpty) return '';
    return editorInstance.getHTML();
}

/**
 * Owns a Tiptap rich-text editor while retaining the original hook's editor()
 * renderer. Tiptap's self-hosted core is MIT licensed and needs no API key.
 */
export default function useTextEditor(options = {}) {
    const {
        initialContent = '',
        onChange,
        ...defaultEditorProps
    } = options;
    const editorInstanceRef = useRef(null);
    const baselineRef = useRef(normalizeHtml(initialContent));
    const [content, setContentState] = useState(() => normalizeHtml(initialContent));
    const [editorChanged, setEditorChanged] = useState(false);

    const getContent = useCallback(() => {
        if (editorInstanceRef.current) return currentHtml(editorInstanceRef.current);
        return content;
    }, [content]);

    const getEditor = useCallback(() => editorInstanceRef.current, []);

    const setContent = useCallback((nextContent, { markDirty = true } = {}) => {
        const nextHtml = normalizeHtml(nextContent);
        if (!markDirty) baselineRef.current = nextHtml;
        setContentState(nextHtml);
        setEditorChanged(markDirty);
        if (editorInstanceRef.current && currentHtml(editorInstanceRef.current) !== nextHtml) {
            editorInstanceRef.current.commands.setContent(nextHtml || '<p></p>', { emitUpdate: false });
        }
    }, []);

    const markClean = useCallback(() => {
        const nextBaseline = editorInstanceRef.current
            ? currentHtml(editorInstanceRef.current)
            : content;
        baselineRef.current = nextBaseline;
        setEditorChanged(false);
    }, [content]);

    const reset = useCallback((nextContent = baselineRef.current) => {
        const nextHtml = normalizeHtml(nextContent);
        baselineRef.current = nextHtml;
        setContentState(nextHtml);
        setEditorChanged(false);
        editorInstanceRef.current?.commands.setContent(nextHtml || '<p></p>', { emitUpdate: false });
    }, []);

    const editorRef = useMemo(() => ({
        get current() {
            return {
                instance: editorInstanceRef.current,
                getContent: () => currentHtml(editorInstanceRef.current),
                getHTML: () => currentHtml(editorInstanceRef.current),
                getJSON: () => editorInstanceRef.current?.getJSON() ?? null,
                getText: () => editorInstanceRef.current?.getText() ?? '',
                setContent,
                focus: () => editorInstanceRef.current?.commands.focus(),
            };
        },
    }), [setContent]);

    const editor = useCallback((editorInitialContent = initialContent, overrides = {}) => {
        const {
            onChange: fieldOnChange,
            onReady: fieldOnReady,
            ...overrideProps
        } = overrides;

        return (
            <RichTextEditor
                {...defaultEditorProps}
                {...overrideProps}
                initialContent={normalizeHtml(editorInitialContent)}
                onReady={(instance) => {
                    editorInstanceRef.current = instance;
                    if (instance) {
                        const html = currentHtml(instance);
                        baselineRef.current = html;
                        setContentState(html);
                        setEditorChanged(false);
                    }
                    fieldOnReady?.(instance);
                }}
                onChange={(html, context) => {
                    setContentState(html);
                    setEditorChanged(true);
                    onChange?.(html, context);
                    fieldOnChange?.(html, context);
                }}
            />
        );
    }, [defaultEditorProps, initialContent, onChange]);

    return {
        editor,
        content,
        setContent,
        getContent,
        editorChanged,
        isDirty: editorChanged,
        markClean,
        reset,
        editorRef,
        getEditor,
        EditorComponent: RichTextEditor,
    };
}
