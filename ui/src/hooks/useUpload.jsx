import React, { useState, useMemo } from 'react';
import ValuesStore from '../store/values-store';
import { Upload, message, notification, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';


//this hook is based on zustand
const useUpload = (tablesMetaData, whereKeyName) => {
    const valuesStore = ValuesStore();
    const [tblMetaDataName, setTblMetaDataName] = useState(tablesMetaData);
    const [whrKeyName, setWhrKeyName] = useState(whereKeyName);
    // const [record, setRecord] = useState({});
    const [fileList, setFileList] = useState([]);
    const [base64FileList, setBase64FileList] = useState([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [picUploaderDisabled, setPicUploaderDisabled] = useState(false);
    const [uploadURL, setUploadURL] = useState('');
    const [numFiles, setNumFiles] = useState(-1);
    const [returnedData, setReturnedData] = useState(undefined);
    const [extraUploadParams, setExtraUploadParams] = useState({});
    const [customBeforeUpload, setCustomBeforeUpload] = useState(undefined);
    const [multipleUploads, setMultipleUploads] = useState(false);
    const [delFile, setDelFile] = useState(undefined);
    const [acceptedFiles, setAcceptedFiles] = useState(['image/png', 'image/jpeg']);
    const [uploaderName, setUploaderName] = useState();
    const [uploaderID, setUploaderID] = useState();
    const [metaData, setMetaData] = useState();
    const [data, setData] = useState();
    // async function save(url = `${Settings.backend}/add`, endpoint = null) {
    //     let res = await utils.requestWithReauth('post', url, endpoint, record);
    //     if (res.status === 'Ok') {
    //         message.success('Record has been updated succesfully');
    //     } else {
    //         message.error(res.msg);
    //     }
    // }

    const getBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

    const uploadButton = (
        <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>
                Upload
            </div>
        </div>
    );

    useMemo(() => {
        // console.log('filelist changed');
    }, [fileList]);


    const handleChange = ({ fileList: newFileList }) => {
        newFileList?.forEach((file) => {
            if (file.response) {
                const status = file?.response?.status;
                const msg = file?.response?.msg;
                setReturnedData(returnedData => ({ ...returnedData, file }));
                if (status === 'Error') {
                    file.status = 'error';
                    notification.open({
                        message: <label className="fw-bolder text-danger"><i className='fas fa-exclamation-circle'></i> Error</label>,
                        description: msg,
                        placement: 'bottomRight'
                    });
                } else {
                    file.status = 'done';
                }
            }
        });
        setFileList(newFileList);
    };

    const handlePreviewCancel = () => setPreviewVisible(false);

    const handlePreview = async (file) => {
        const imageExt = ['apng', 'avif', 'gif', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'svg', 'webp'];
        const fileExt = file?.name.split('.')[1];
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        } else {
            if (!imageExt.includes(fileExt.toLowerCase())) {
                window.open(file.url, '_blank').focus();//none image files such as pdf needs to open in another tab for reading
                return;
            }
        }
        setPreviewImage(file.url || file.preview);
        setPreviewVisible(true);
        setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
    };



    const preview = () => {
        return <Modal zIndex={1002} open={previewVisible} title={previewTitle} footer={null} onCancel={handlePreviewCancel}>
            <img
                alt="example"
                style={{
                    width: '100%',
                }}
                src={previewImage}
            />
        </Modal>
    }

    async function removeFile(file) {
        if (!delFile?.delete) {
            message.error('delete prop or function is required for this action');
            return false;
        }
        delFile?.delete(file);
    }

    function beforeUpload(file, accepted = ['image/png', 'image/jpeg']) {
        if (customBeforeUpload) {
            if (!customBeforeUpload.beforeUpload) {
                message.error('beforeUpload prop or function is required for this action');
                return false;
            }
            customBeforeUpload.beforeUpload(file, accepted);
            return false;
        } else {
            const isAllowed = accepted.includes(file.type);
            if (!isAllowed) {
                notification.open({
                    message: <label className="fw-bolder text-danger"><i className='fas fa-exclamation-circle'></i> Error</label>,
                    description: `${file.name} file type is not accepted`,
                    placement: 'bottomRight'
                });
            }
            return isAllowed || Upload.LIST_IGNORE;
        }
    }

    function setMultipleFiles(files, nameAccessor, pathAccessor, idAccessor, extraData = {}, baseUrl) {
        const f = files.map((file, i) => {
            const url = !!baseUrl ? baseUrl + '/' + file[pathAccessor] : file[pathAccessor];
            return {
                uid: `${file[idAccessor]}_${i}`,
                name: file[nameAccessor],
                status: 'done',
                url: url,
                extraData
            };
        });
        setFileList(f);
    }

    function uploaderHTMLElement(ref) {
        return ref.upload.uploader.fileInput;
    }

    function uploader(uploadName, endpoint, key, accptFiles = ['image/png', 'image/jpeg'], listType = "picture-card", classes = "", uploadRef = null) {
        return <Upload
            ref={uploadRef}
            className={classes}
            multiple={multipleUploads}
            key={key}
            disabled={picUploaderDisabled}
            name={uploaderName || uploadName}
            action={uploadURL || endpoint}
            listType={listType}
            data={async e => extraUploadParams}
            fileList={fileList}
            onPreview={handlePreview}
            onRemove={file => removeFile(file, delFile)}
            beforeUpload={file => (beforeUpload(file, acceptedFiles || accptFiles))}
            onChange={e => handleChange(e)}
        >
            {fileList.length < numFiles || numFiles === -1 ? uploadButton : null}
        </Upload>
    }

    return {
        metaData, setMetaData,//for setting any meta data especially from the add and edit hooks
        setData, data,//for setting any user-defined data
        uploaderID, setUploaderID,
        setExtraUploadParams, extraUploadParams,//for setting specific params required for multipart file upload
        uploaderName, setUploaderName,
        acceptedFiles, setAcceptedFiles,
        uploaderHTMLElement,
        setReturnedData, returnedData,//holds an object of files that have been returned by server after upload. this will contain upload status and other params
        base64FileList, setBase64FileList,
        setMultipleUploads, getBase64, setCustomBeforeUpload,
        fileList, beforeUpload,
        uploader, setPicUploaderDisabled,
        setUploadURL, setMultipleFiles,
        setFileList, preview, setNumFiles,
        removeFile, setDelFile
    };

}
export default useUpload;