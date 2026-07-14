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
import './RichTextEditor.css';

const EMPTY_HTML = '<p></p>';
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
                className={active ? 'framework-rich-editor__tool is-active' : 'framework-rich-editor__tool'}
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
        <div className="framework-rich-editor__link-popover">
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
                className={active ? 'framework-rich-editor__tool is-active' : 'framework-rich-editor__tool'}
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
        <div className="framework-rich-editor__toolbar" role="toolbar" aria-label="Rich text formatting">
            <div className="framework-rich-editor__tool-group">
                <Select
                    size="small"
                    value={state.heading}
                    aria-label="Text style"
                    className="framework-rich-editor__format-select"
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

            <div className="framework-rich-editor__tool-group" aria-label="Text formatting">
                <ToolbarButton label="Bold" active={state.bold} icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} />
                <ToolbarButton label="Italic" active={state.italic} icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} />
                <ToolbarButton label="Underline" active={state.underline} icon={<UnderlineOutlined />} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                <ToolbarButton label="Strikethrough" active={state.strike} icon={<StrikethroughOutlined />} onClick={() => editor.chain().focus().toggleStrike().run()} />
                <ToolbarButton label="Inline code" active={state.code} icon={<CodeOutlined />} onClick={() => editor.chain().focus().toggleCode().run()} />
            </div>

            <div className="framework-rich-editor__tool-group" aria-label="Lists and blocks">
                <ToolbarButton label="Bulleted list" active={state.bulletList} icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                <ToolbarButton label="Numbered list" active={state.orderedList} icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                <ToolbarButton label="Block quote" active={state.blockquote} icon={<BlockOutlined />} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
                <ToolbarButton label="Horizontal rule" icon={<DashOutlined />} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
            </div>

            <div className="framework-rich-editor__tool-group" aria-label="Alignment">
                <ToolbarButton label="Align left" active={state.alignLeft} icon={<AlignLeftOutlined />} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
                <ToolbarButton label="Align center" active={state.alignCenter} icon={<AlignCenterOutlined />} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
                <ToolbarButton label="Align right" active={state.alignRight} icon={<AlignRightOutlined />} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
                <ToolbarButton label="Justify" active={state.alignJustify} icon={<span className="framework-rich-editor__justify-icon">J</span>} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />
            </div>

            <div className="framework-rich-editor__tool-group" aria-label="Insert content">
                <LinkTool editor={editor} active={state.link} />
                <ToolbarButton label="Insert image" disabled={imageUploading} icon={<PictureOutlined spin={imageUploading} />} onClick={onChooseImage} />
            </div>

            <div className="framework-rich-editor__tool-group" aria-label="Document actions">
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
            HTMLAttributes: { class: 'framework-rich-editor__image' },
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
                class: 'framework-rich-editor__content',
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
        return <div className={`framework-rich-editor is-loading ${className}`.trim()} aria-busy="true" />;
    }

    return (
        <div
            className={`framework-rich-editor${editable ? '' : ' is-readonly'} ${className}`.trim()}
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
                className="framework-rich-editor__file-input"
                type="file"
                accept={acceptedImageTypes.join(',')}
                tabIndex={-1}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) insertImage(file);
                }}
            />
            {imageError && <div className="framework-rich-editor__error" role="alert">{imageError}</div>}
            <EditorContent editor={editor} />
            {showWordCount && (
                <div className="framework-rich-editor__status" aria-live="polite">
                    <span>{counts?.words ?? 0} words</span>
                    <span>{counts?.characters ?? 0} characters</span>
                </div>
            )}
        </div>
    );
}
