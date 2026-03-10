import React, { useRef, useState, useMemo } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import $ from 'jquery';
import Settings from "../utils/Settings"
import utils from '../utils/function_utils';

export default function useTextEditor() {
    const editorRef = useRef(undefined);
    const [content, setContent] = useState();
    const [editorChanged, setEditorChanged] = useState(false);
    useMemo(() => {

    }, [editorRef.current, content])

    function getContent() {
        if (editorRef.current) {
            const bool = typeof editorRef.current.getContent !== "undefined";
            if (bool) {
                return editorRef.current?.getContent();
            }
        }
        return '';
    };

    async function uploader(file) {
        const formData = new FormData();
        formData.append('tinymce_files', file);
        formData.append('container', 'tinymce');
        let res = await fetch(`${Settings.baseUrl}/upload_tinymce_file`, {
            method: 'POST',
            body: formData,
        });
        return await res.json();
    }

    function editor(initialContent) {
        return (
            <>
                <textarea className='d-none' ref={editorRef}></textarea>
                <Editor
                    onInit={(evt, editor) => editorRef.current = editor}
                    initialValue={content || initialContent}
                    init={{
                        setup(editor) {
                            editor.on("change", function (e) {
                                setEditorChanged(editorChanged => !editorChanged);
                            });
                            editor.on("keydown", function (e) {
                                setEditorChanged(editorChanged => !editorChanged);
                                //     if ((e.key.toLowerCase() == 'backspace' || e.key.toLowerCase() == 'delete') && editor.selection) {
                                //         let selectedNode = editor.selection.getNode();
                                //         console.log(selectedNode);
                                //         // var element = editor.dom.getParent(editor.selection.getNode(), 'img');
                                //         // console.log(element);
                                //         /*if (selectedNode && selectedNode.nodeName == 'IMG') {
                                //             let imageSrc = selectedNode.src;
                                //             console.log(imageSrc)
                                //             //here you can call your server to delete the image
                                //         }*/
                                //     }
                            });
                        },
                        file_picker_callback: function (callback, value, meta) {
                            if (meta.filetype == 'image') {
                                let fileInput = document.createElement('input');
                                fileInput.setAttribute('type', 'file');
                                fileInput.setAttribute('accept', '.jpg,.jpeg,.png');
                                // fileInput.setAttribute('multiple', 'true');
                                $(fileInput).trigger('click');
                                $(fileInput).on('change', async () => {
                                    let files = $(fileInput)[0].files;
                                    let fileLength = files.length;
                                    if (fileLength > 5) {
                                        alert('Files cannot be more than 5');
                                        return;
                                    }
                                    for (let i = 0; i < fileLength; i++) {
                                        let file = files[i];
                                        let fileSize = file.size;
                                        let fileTitle = file.name;
                                        // if (fileSize > 1000000) {
                                        //     alert('File size is too big. Please compress');
                                        //     continue;
                                        // }
                                        // console.log(file);
                                        // const res = await uploader(file);
                                        // console.log(res);
                                        let reader = new FileReader();
                                        reader.onloadend = (e) => {
                                            let result = e.target.result;
                                            callback(result, { alt: "" });
                                        }
                                        reader.readAsDataURL(file);
                                    }
                                });
                            }
                        },
                        file_picker_types: 'file image media',
                        height: 500,
                        menubar: false,
                        plugins: [
                            'advlist autolink lists link image charmap print preview anchor',
                            'searchreplace visualblocks code fullscreen',
                            'insertdatetime media table paste code help wordcount'
                        ],
                        toolbar: 'insertfile undo redo | formatselect styleselect | fontselect fontsizeselect | ' +
                            'link image | print preview media fullpage' +
                            'bold italic backcolor forecolor emoticons | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'removeformat | help',
                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                    }}

                />
                {/* <button onClick={getContent}>Log editor content</button> */}
            </>
        );
    }

    return { editor, content: getContent(), setContent, editorChanged, editorRef };
}
