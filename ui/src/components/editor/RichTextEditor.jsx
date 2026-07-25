import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlignCenterOutlined,
    AlignLeftOutlined,
    AlignRightOutlined,
    BlockOutlined,
    BoldOutlined,
    ClearOutlined,
    CodeOutlined,
    DashOutlined,
    ItalicOutlined,
    LinkOutlined,
    OrderedListOutlined,
    PictureOutlined,
    RedoOutlined,
    StrikethroughOutlined,
    UnderlineOutlined,
    UndoOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Button, Input, Popover, Select, Space, Tooltip } from 'antd';

const EMPTY_HTML = '<p></p>';
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EDITOR_ROOT_CLASS = [
    'w-full overflow-hidden rounded-[var(--app-radius,8px)] border border-[var(--color-border,#d9d9d9)]',
    'bg-[var(--color-bg-container,#fff)] text-[var(--color-text-primary,#171717)]',
    'transition-[border-color,box-shadow] duration-150 ease-out',
    'focus-within:border-[var(--color-accent,#1677ff)]',
    'focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent,#1677ff)_14%,transparent)]',
    'motion-reduce:transition-none',
].join(' ');

const TOOL_CLASS = [
    'inline-flex size-[30px] min-w-[30px] items-center justify-center',
    '!rounded-[calc(var(--app-radius,8px)*0.65)] !text-[var(--color-text-secondary,#595959)]',
    'hover:!bg-[color-mix(in_srgb,var(--color-accent,#1677ff)_11%,transparent)]',
    'hover:!text-[var(--color-accent,#1677ff)]',
].join(' ');

const TOOL_GROUP_CLASS = [
    'inline-flex items-center gap-0.5 border-r border-[var(--color-border-subtle,#eee)] pr-1.5',
    'mr-px last:mr-0 last:border-r-0 last:pr-0 max-sm:border-r-0',
].join(' ');

const EDITOR_CONTENT_CLASS = [
    'min-h-[var(--framework-editor-min-height,280px)] px-5 pt-[18px] pb-6 outline-none max-sm:p-4',
    'font-[var(--font-body,inherit)] text-[var(--font-size-base,14px)] leading-[1.7]',
    'text-[var(--color-text-primary,#171717)] [overflow-wrap:anywhere]',
    '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
    '[&_h1]:my-[1.2em] [&_h1]:mb-[0.45em] [&_h1]:text-[2em] [&_h1]:font-bold [&_h1]:leading-[1.2]',
    '[&_h2]:my-[1.2em] [&_h2]:mb-[0.45em] [&_h2]:text-[1.55em] [&_h2]:font-bold [&_h2]:leading-[1.2]',
    '[&_h3]:my-[1.2em] [&_h3]:mb-[0.45em] [&_h3]:text-[1.25em] [&_h3]:font-bold [&_h3]:leading-[1.2]',
    '[&_p]:mb-[0.8em] [&_p]:mt-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-[1.6rem]',
    '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-[1.6rem]',
    '[&_blockquote]:my-4 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[var(--color-accent,#1677ff)]',
    '[&_blockquote]:py-0.5 [&_blockquote]:pl-4 [&_blockquote]:text-[var(--color-text-secondary,#595959)]',
    '[&_code]:rounded-sm [&_code]:border [&_code]:border-[var(--color-border-subtle,#eee)]',
    '[&_code]:bg-[var(--color-bg-elevated,#f5f5f5)] [&_code]:px-[0.35em] [&_code]:py-[0.15em] [&_code]:text-[0.9em]',
    '[&_pre]:overflow-x-auto [&_pre]:rounded-[calc(var(--app-radius,8px)*0.8)] [&_pre]:bg-[#171717]',
    '[&_pre]:px-4 [&_pre]:py-3.5 [&_pre]:text-[#f5f5f5]',
    '[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
    '[&_a]:cursor-pointer [&_a]:text-[var(--color-accent,#1677ff)] [&_a]:underline [&_a]:underline-offset-2',
    '[&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[var(--color-border,#d9d9d9)]',
    '[&_img]:mx-auto [&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:max-w-full',
    '[&_img]:rounded-[calc(var(--app-radius,8px)*0.8)]',
    '[&_p.is-editor-empty:first-child]:before:pointer-events-none',
    '[&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0',
    '[&_p.is-editor-empty:first-child]:before:text-[var(--color-text-tertiary,#8c8c8c)]',
    '[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
].join(' ');

function normalizeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function editorHtml(editor) {
    if (!editor || editor.isEmpty) return '';
    return editor.getHTML();
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
    });
}

function resolveUploadUrl(result) {
    if (typeof result === 'string') return result;
    return result?.url ?? result?.src ?? result?.location ?? result?.data?.url ?? '';
}

function normalizeLink(value) {
    const link = value.trim();
    if (!link) return '';
    if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(link)) return link;
    return `https://${link}`;
}

function ToolbarButton({ label, active = false, disabled = false, icon, onClick }) {
    return (
        <Tooltip title={label} mouseEnterDelay={0.35}>
            <Button
                type="text"
                size="small"
                className={`${TOOL_CLASS} ${active ? '!bg-[color-mix(in_srgb,var(--color-accent,#1677ff)_11%,transparent)] !text-[var(--color-accent,#1677ff)]' : ''}`}
                icon={icon}
                aria-label={label}
                aria-pressed={active}
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={onClick}
            />
        </Tooltip>
    );
}

function LinkTool({ editor, active }) {
    const [open, setOpen] = useState(false);
    const [href, setHref] = useState('');

    function showEditor() {
        setHref(editor.getAttributes('link').href ?? '');
        setOpen(true);
    }

    function applyLink() {
        const nextHref = normalizeLink(href);
        if (!nextHref) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: nextHref }).run();
        }
        setOpen(false);
    }

    const form = (
        <div className="grid w-[min(320px,70vw)] gap-2.5 [&_.ant-space]:justify-end">
            <Input
                value={href}
                placeholder="https://example.com"
                aria-label="Link address"
                onChange={(event) => setHref(event.target.value)}
                onPressEnter={applyLink}
            />
            <Space>
                <Button size="small" onClick={() => {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    setOpen(false);
                }}>
                    Remove
                </Button>
                <Button size="small" type="primary" onClick={applyLink}>Apply</Button>
            </Space>
        </div>
    );

    return (
        <Popover
            content={form}
            title="Insert link"
            trigger="click"
            open={open}
            onOpenChange={(nextOpen) => {
                if (nextOpen) showEditor();
                else setOpen(false);
            }}
        >
            <Button
                type="text"
                size="small"
                className={`${TOOL_CLASS} ${active ? '!bg-[color-mix(in_srgb,var(--color-accent,#1677ff)_11%,transparent)] !text-[var(--color-accent,#1677ff)]' : ''}`}
                icon={<LinkOutlined />}
                aria-label="Insert link"
                aria-pressed={active}
                onMouseDown={(event) => event.preventDefault()}
            />
        </Popover>
    );
}

function EditorToolbar({ editor, onChooseImage, imageUploading }) {
    const state = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => ({
            bold: currentEditor.isActive('bold'),
            italic: currentEditor.isActive('italic'),
            underline: currentEditor.isActive('underline'),
            strike: currentEditor.isActive('strike'),
            code: currentEditor.isActive('code'),
            bulletList: currentEditor.isActive('bulletList'),
            orderedList: currentEditor.isActive('orderedList'),
            blockquote: currentEditor.isActive('blockquote'),
            link: currentEditor.isActive('link'),
            alignLeft: currentEditor.isActive({ textAlign: 'left' }),
            alignCenter: currentEditor.isActive({ textAlign: 'center' }),
            alignRight: currentEditor.isActive({ textAlign: 'right' }),
            alignJustify: currentEditor.isActive({ textAlign: 'justify' }),
            heading: currentEditor.isActive('heading', { level: 1 }) ? '1'
                : currentEditor.isActive('heading', { level: 2 }) ? '2'
                    : currentEditor.isActive('heading', { level: 3 }) ? '3'
                        : 'paragraph',
            canUndo: currentEditor.can().chain().focus().undo().run(),
            canRedo: currentEditor.can().chain().focus().redo().run(),
        }),
    });

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border-subtle,#eee)] bg-[var(--color-bg-elevated,#fafafa)] px-2.5 py-2 max-sm:items-start max-sm:overflow-x-auto" role="toolbar" aria-label="Rich text formatting">
            <div className={TOOL_GROUP_CLASS}>
                <Select
                    size="small"
                    value={state.heading}
                    aria-label="Text style"
                    className="w-[118px]"
                    options={[
                        { value: 'paragraph', label: 'Paragraph' },
                        { value: '1', label: 'Heading 1' },
                        { value: '2', label: 'Heading 2' },
                        { value: '3', label: 'Heading 3' },
                    ]}
                    onChange={(value) => {
                        if (value === 'paragraph') editor.chain().focus().setParagraph().run();
                        else editor.chain().focus().toggleHeading({ level: Number(value) }).run();
                    }}
                />
            </div>

            <div className={TOOL_GROUP_CLASS} aria-label="Text formatting">
                <ToolbarButton label="Bold" active={state.bold} icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} />
                <ToolbarButton label="Italic" active={state.italic} icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} />
                <ToolbarButton label="Underline" active={state.underline} icon={<UnderlineOutlined />} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                <ToolbarButton label="Strikethrough" active={state.strike} icon={<StrikethroughOutlined />} onClick={() => editor.chain().focus().toggleStrike().run()} />
                <ToolbarButton label="Inline code" active={state.code} icon={<CodeOutlined />} onClick={() => editor.chain().focus().toggleCode().run()} />
            </div>

            <div className={TOOL_GROUP_CLASS} aria-label="Lists and blocks">
                <ToolbarButton label="Bulleted list" active={state.bulletList} icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                <ToolbarButton label="Numbered list" active={state.orderedList} icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                <ToolbarButton label="Block quote" active={state.blockquote} icon={<BlockOutlined />} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
                <ToolbarButton label="Horizontal rule" icon={<DashOutlined />} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
            </div>

            <div className={TOOL_GROUP_CLASS} aria-label="Alignment">
                <ToolbarButton label="Align left" active={state.alignLeft} icon={<AlignLeftOutlined />} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
                <ToolbarButton label="Align center" active={state.alignCenter} icon={<AlignCenterOutlined />} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
                <ToolbarButton label="Align right" active={state.alignRight} icon={<AlignRightOutlined />} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
                <ToolbarButton label="Justify" active={state.alignJustify} icon={<span className="inline-flex w-[1em] items-center justify-center text-xs font-bold [text-decoration:underline_overline]">J</span>} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />
            </div>

            <div className={TOOL_GROUP_CLASS} aria-label="Insert content">
                <LinkTool editor={editor} active={state.link} />
                <ToolbarButton label="Insert image" disabled={imageUploading} icon={<PictureOutlined spin={imageUploading} />} onClick={onChooseImage} />
            </div>

            <div className={TOOL_GROUP_CLASS} aria-label="Document actions">
                <ToolbarButton label="Undo" disabled={!state.canUndo} icon={<UndoOutlined />} onClick={() => editor.chain().focus().undo().run()} />
                <ToolbarButton label="Redo" disabled={!state.canRedo} icon={<RedoOutlined />} onClick={() => editor.chain().focus().redo().run()} />
                <ToolbarButton label="Clear formatting" icon={<ClearOutlined />} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
            </div>
        </div>
    );
}

export default function RichTextEditor({
    initialContent = '',
    value,
    onChange,
    onReady,
    onBlur,
    placeholder = 'Start writing…',
    minHeight = 280,
    disabled = false,
    readOnly = false,
    showToolbar = true,
    showWordCount = true,
    uploadImage,
    allowBase64Images = true,
    acceptedImageTypes = DEFAULT_IMAGE_TYPES,
    maxImageSize = 5 * 1024 * 1024,
    ariaLabel = 'Rich text editor',
    className = '',
}) {
    const fileInputRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const onReadyRef = useRef(onReady);
    const onBlurRef = useRef(onBlur);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageError, setImageError] = useState('');
    const editable = !disabled && !readOnly;

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
    useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);

    const extensions = useMemo(() => [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            link: {
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
            },
        }),
        Image.configure({
            allowBase64: allowBase64Images,
            HTMLAttributes: { class: 'block h-auto max-w-full' },
        }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder }),
        CharacterCount,
    ], [allowBase64Images, placeholder]);

    const editor = useEditor({
        extensions,
        content: normalizeHtml(value ?? initialContent) || EMPTY_HTML,
        editable,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: EDITOR_CONTENT_CLASS,
                'aria-label': ariaLabel,
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            onChangeRef.current?.(editorHtml(currentEditor), {
                editor: currentEditor,
                json: currentEditor.getJSON(),
                text: currentEditor.getText(),
            });
        },
        onBlur: ({ editor: currentEditor, event }) => {
            onBlurRef.current?.(editorHtml(currentEditor), { editor: currentEditor, event });
        },
    }, [extensions]);

    const counts = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => {
            const characterCount = currentEditor?.storage?.characterCount;
            if (!characterCount) return { words: 0, characters: 0 };
            return {
                words: characterCount.words(),
                characters: characterCount.characters(),
            };
        },
    });

    useEffect(() => {
        if (!editor) return undefined;
        onReadyRef.current?.(editor);
        return () => onReadyRef.current?.(null);
    }, [editor]);

    useEffect(() => {
        editor?.setEditable(editable);
    }, [editable, editor]);

    useEffect(() => {
        if (!editor) return;
        const nextContent = normalizeHtml(value ?? initialContent);
        const currentContent = editorHtml(editor);
        if (nextContent !== currentContent) {
            editor.commands.setContent(nextContent || EMPTY_HTML, { emitUpdate: false });
        }
    }, [editor, initialContent, value]);

    async function insertImage(file) {
        setImageError('');
        if (!acceptedImageTypes.includes(file.type)) {
            setImageError('Choose a JPG, PNG, WebP, or GIF image.');
            return;
        }
        if (file.size > maxImageSize) {
            setImageError(`The image must be smaller than ${Math.round(maxImageSize / 1024 / 1024)} MB.`);
            return;
        }

        try {
            setImageUploading(true);
            const result = uploadImage
                ? await uploadImage(file)
                : allowBase64Images
                    ? await readFileAsDataUrl(file)
                    : '';
            const url = resolveUploadUrl(result);
            if (!url) throw new Error('The image upload did not return a usable URL.');
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        } catch (error) {
            setImageError(error?.message || 'The image could not be inserted. Please try again.');
        } finally {
            setImageUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    if (!editor) {
        return <div className={`${EDITOR_ROOT_CLASS} min-h-[var(--framework-editor-min-height,280px)] bg-[var(--color-bg-elevated,#fafafa)] ${className}`.trim()} aria-busy="true" />;
    }

    return (
        <div
            className={`${EDITOR_ROOT_CLASS} ${editable ? '' : 'focus-within:border-[var(--color-border,#d9d9d9)] focus-within:shadow-none [&_.tiptap]:min-h-0 [&_.tiptap]:bg-[var(--color-bg-elevated,#fafafa)]'} ${className}`.trim()}
            style={{ '--framework-editor-min-height': `${minHeight}px` }}
        >
            {showToolbar && editable && (
                <EditorToolbar
                    editor={editor}
                    imageUploading={imageUploading}
                    onChooseImage={() => fileInputRef.current?.click()}
                />
            )}
            <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept={acceptedImageTypes.join(',')}
                tabIndex={-1}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) insertImage(file);
                }}
            />
            {imageError && <div className="border-b border-[color-mix(in_srgb,var(--color-error,#ff4d4f)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-error,#ff4d4f)_7%,transparent)] px-4 py-2 text-[13px] text-[var(--color-error,#ff4d4f)]" role="alert">{imageError}</div>}
            <EditorContent editor={editor} />
            {showWordCount && (
                <div className="flex min-h-8 justify-end gap-3.5 border-t border-[var(--color-border-subtle,#eee)] bg-[var(--color-bg-elevated,#fafafa)] px-3 py-[7px] text-xs tabular-nums text-[var(--color-text-tertiary,#8c8c8c)]" aria-live="polite">
                    <span>{counts?.words ?? 0} words</span>
                    <span>{counts?.characters ?? 0} characters</span>
                </div>
            )}
        </div>
    );
}
