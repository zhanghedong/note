/**
 * @zhanghd
 */
var BASEURL = 'http://d.com/plus/';

//inner.note.91.com/web/noteNew/addNote
(function ($) {
    "use strict";
    var g = {};
    g.params = {
        sid:'',
        uploadFileName:'file', //上传文件 name = file0,file1,file2
        saveImagesToServer:true,
        uploadUrl:"http://inner.note.91.com/web/noteNew/addNote"
//        uploadUrl:BASEURL + "api_demo/upload.php"
    };
    var process = {
        init:function () {
            process.browserAction();
            process.initContextMenus();
            process.initExtensionConnect();
            process.login();
        },
        browserAction:function () {
            chrome.browserAction.onClicked.addListener(function (tab) {
                process.openOrClosePopup();
            });
        },
        openOrClosePopup:function () {
            chrome.tabs.executeScript(null, {"code":"noteClipper.openOrClosePopup();"});
        },
        initContextMenus:function () {
            chrome.contextMenus.create({
                title:chrome.i18n.getMessage("select_content_context_menu"),
                contexts:['all'],
                onclick:function (info, tab) {
                    chrome.tabs.executeScript(tab.id, {code:"noteClipper.getSelectedContent();"});
                }
            });
            chrome.contextMenus.create({
                title:chrome.i18n.getMessage("select_image_context_menu"),
                contexts:['all'],
                onclick:function (info, tab) {
                    var param = {
                        imgs:[info.srcUrl],
                        title:tab.title,
                        imgTitles:[tab.title],
                        sourceUrl:tab.url
                    };
                    process.saveSelectImage(param);//不需要加callback
//                    chrome.tabs.executeScript(tab.id, {code:"noteClipper.saveImage(["+param+"]);"});
                }
            });
        },
        writeBlobAndSendFile:function (fs, blob, fileName, successCallback, errorCallback, imgIndex) {
            fs.root.getFile(fileName, {create:true}, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwrite = function (e) {
                        console.log('Write completed.');
                        fileEntry.file(function (file) {
                            successCallback(file, imgIndex);
                        });
                    };
                    fileWriter.onerror = function (e) {
                        console.log('Write failed: ' + e.toString());
                    };
                    fileWriter.write(blob);
                }, process.onFileError);
            }, process.onFileError);
        },
        onFileError:function (err) {
            for (var p in FileError) {
                if (FileError[p] == err.code) {
                    console.log('Error code: ' + err.code + 'Error info: ' + p);
                    break;
                }
            }
        },
        removeFile:function (fileName, fileSize) {
            window.requestFileSystem(TEMPORARY, fileSize, function (fs) {
                fs.root.getFile(fileName, {}, function (fileEntry) {
                    fileEntry.remove(function () {
                        console.log('File ' + fileName + ' removed.');
                    }, process.onFileError);
                }, process.onFileError);
            }, process.onFileError);
        },
        downloadImage:function (url, imgIndex, successCallback, errorCallback) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function (e) {
                if (this.status == 200) {
                    var suffix = url.split('.'),
                        blob = new Blob([this.response], {type:'image/' + suffix[suffix.length - 1]}),
                        parts = url.split('/'),
                        fileName = parts[parts.length - 1];
                    window.requestFileSystem(TEMPORARY, this.response.byteLength, function (fs) {
                        process.writeBlobAndSendFile(fs, blob, fileName, successCallback, errorCallback, imgIndex);
                    }, process.onFileError);
                }
            };
            xhr.onerror = function () {
                console.log('retrieve remote image xhr onerror')
                errorCallback && errorCallback(imgIndex);
            };
            xhr.onabort = function () {
                console.log('retrieve remote image xhr onabort')
                errorCallback && errorCallback(imgIndex);
            };
            xhr.send(null);
        },
        _saveImages:function (param, successCallback, failCallback) {
            var imgs = param.imgs, titles = param.imgTitles, content;
            if (g.params.saveImagesToServer) {
                //正在保存图片提示
                noteHelper.notifyHTML(chrome.i18n.getMessage('is_retrieving_remote_image_tip'), false);
                var totalImgNum = imgs ? imgs.length : 1,
                    saveSucceedImgNum = 0,
                    saveFailedImgNum = 0,
                    saveSucceedImgIndex = [],
                    saveSucceedImgIndexByOrder = {},
                    files = {};
                var removeFiles = function () {
                    for (var idx in files) {
                        process.removeFile(files[idx].name, files[idx].size);
                    }
                };
                var checkComplete = function () {
                    if (saveSucceedImgNum + saveFailedImgNum == totalImgNum) {
                        if (saveFailedImgNum == totalImgNum) {
                            //all images retrieve failed
                            if (failCallback) {
                                //is replace images in page content
                                failCallback(true);
                            } else {
                                noteHelper.notifyHTML(chrome.i18n.getMessage('retrieve_images_failed'));
                            }
                        } else {
                            for (var i = 0, l = saveSucceedImgIndex.length; i < l; i++) {
                                saveSucceedImgIndexByOrder[saveSucceedImgIndex[i]] = i.toString();
                            }
                            noteHelper.notifyHTML(chrome.i18n.getMessage('is_uploading_images_tip'), false);
                            $.ajax({
                                url:g.params.uploadUrl,
                                type:"POST",
                                data:formData,
                                processData:false,
                                contentType:false,
                                dataType:'json',
                                success:function (data) {
                                    console.log(data);
                                    console.log(typeof data);
                                    if (data.code != 200) {
                                        //todo: server error, pending note...
                                        console.log('Internal error: ');
                                        console.log(data.msg);
                                        if (failCallback) {
                                            failCallback(true);
                                        }
                                        removeFiles();
                                        return;
                                    }
                                    if (successCallback) {
                                        //is replace images in page content
                                        noteHelper.notifyHTML(chrome.i18n.getMessage('is_uploaded_images_tip'), false);
                                        successCallback(data, saveSucceedImgIndexByOrder);
                                    }
                                    removeFiles();
                                },
                                error:function (jqXHR, textStatus, errorThrown) {
                                    console.log('xhr error: ')
                                    console.log(textStatus)
                                    removeFiles();
                                    noteHelper.notifyHTML(chrome.i18n.getMessage('upload_images_failed'));
                                }
                            });
                        }
                    }
                };
                var formData = new FormData();
                formData.append('type', 'Embedded');
                formData.append('categoryId', param.categoryId || '');
                formData.append('id', param.id || '');
                for (var i = 0, l = totalImgNum; i < l; i++) {
                    process.downloadImage(imgs[i], i, function (file, idx) {
                        saveSucceedImgNum++;
                        saveSucceedImgIndex.push(idx);
                        formData.append(g.params.uploadFileName + idx, file);
                        files[idx] = file;
                        checkComplete();
                    }, function (idx) {
                        saveFailedImgNum++;
                        checkComplete();
                    });
                }
            }
        },
        saveImages:function (param, successCallback, failCallback) {
            process.checkLogin(function () {
                process._saveImages(param, successCallback, failCallback);
            });
        },
        initExtensionConnect:function () {
            chrome.extension.onConnect.addListener(function (port) {
                switch (port.name) {
                    case 'actionsetpopupcontent':
                        process.setPopupContentConnect(port);
                        break;
                    default:
                        break;
                }
            });

        },
        actionFromInspecotrHandler:function(){
            var self = this;
            port.onMessage.addListener(function(data){
                //send to popup
                chrome.tabs.sendRequest(port.sender.tab.id, {name: 'actionfrominspecotr', data: data});
            });
        },
        setPopupContentConnect:function (port) {
            port.onMessage.addListener(function (data) {
                chrome.tabs.sendRequest(port.sender.tab.id, {name: 'actionsetpopupcontent', data: data});
//                process.savePageContent(param);
                //param.title, param.sourceurl, param.content,param.tags || '','',param.id ||''
            });
        },
        saveNote:function (title, sourceurl, content, category_id, tags, id) {
            var dataObj = {

                "client_type":"pc",
                "belong_to":"xxx", //所属文件夹ID，默认文件夹为GUID_NULL字符串

                //主内容要怎么添加？
                "title":"xxx", //笔记标题
                "note_src":"xxx", //笔记来源

               //这里的场景信息是什么？
                "note_addr":"xxx", //场景信息

                //以下数据取不到对添加会不会影响？
                "first_item":"xxx", //主笔记项GUID
                "file_ext":"xxx" , //主笔记项的文件夹扩展名
                "file_size":"xxx", //文件校验
                "stream_type":"xxx", //文件流类型（用于下载时头部设置流类型）
                "md5":"xxx"   //文件的md5校验码
            };
            noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_succeed'));
        },
        savePageContent:function (param) {

        },
        saveSelectContent:function (param) {

        },
        saveSelectImage:function (param) {
            process.checkLogin(function () {
                process.saveImages(param, function (data) {
                    var content = '<div class="image"><img src="' + data.data[g.params.uploadFileName + '0'] + '" title="' + param.imgTitles + '" /></div>';
                    process.saveNote(param.title, param.sourceUrl, content, '', '', '');
                })
            });
        },
        login:function () {
            chrome.cookies.get({url:"http://note.91.com", name:"uapc"}, function (cookie) {
//                alert(JSON.stringify(cookie));
            });
        },
        checkLogin:function (callback) {
            callback();
        }

    };
    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    process.init();
})(jQuery);
