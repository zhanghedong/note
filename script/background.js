/**
 * @zhanghd
 */
(function ($) {
    "use strict";
    var g = {};
    g.params = {
        sid:'',
        uploadFileName:'file', //上传文件 name = file0,file1,file2
        saveImagesToServer:true,
        belongTo:'00000000-0000-0000-0000-000000000000',
        imgArr:[],
        imgGUIDArr:[],
        noteID:'',
        firstItem:''
    };
    var helper = {
        getSuffix:function (url) {
            return url.substr(url.length - 4).toLocaleLowerCase();
        }
    };
    var process = {
        jQuerySetUp:function () {
            $.ajaxSetup({
                dataType:'json',
//                scriptCharset: "utf-8" ,
                cache:false
//                dataFilter:function (data) {
//                },
//                beforeSend:function (xhr) {
//                    xhr.setRequestHeader('UserClient', 'note_web_chromeext/3.1.0');
//                }
            });
        },
        init:function () {
            process.browserAction();
            process.initContextMenus();
            process.initExtensionConnect();
            process.jQuerySetUp();
            process.addListener();
            process.autoSignIn('');//通过cookie自动登录
        },
        autoSignIn:function (callback) {
            chrome.cookies.getAll({url:"http://note.91.com"}, function (cookies) {
                if (cookies) {
                    var userName = '', uapc = '';
                    for (var i = 0, j = cookies.length; i < j; i++) {
                        if (cookies[i].name == 'lUserName') {
                            userName = cookies[i].value;
                        } else if (cookies[i].name == 'uapc') {
                            uapc = cookies[i].value;
                        }
                    }
                    if (uapc && userName) {
                        var sid = noteHelper.sidDecode(uapc);
                        noteConfig.setSid(sid);
                        noteConfig.setUserName(userName)
                        callback && callback(true);
                    }else{
                        callback && callback(false);
                    }
                }
            });
        },
        autoSignOut:function(){
            noteConfig.setSid('');
            noteConfig.setUserName('');
        },
        addListener:function () {
            chrome.tabs.onUpdated.addListener(function HandlerConnect(id, info) {
                if (info.url == noteConfig.url.webSignIn) {
                    process.autoSignIn(function(flag){
                       if(flag){//为避免多次登录退出暂时先不移除监听，功能完成后优化
//                           chrome.tabs.onUpdated.removeListener(HandlerConnect);
                       }
                    });
                }else if (info.url == noteConfig.url.webSignOut) {//WEB端退出时同时插件也要退出
                    process.autoSignOut();
                }
            });
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
                    g.params.imgArr = [];
                    g.params.imgGUIDArr = [];
                    var suffix = helper.getSuffix(info.srcUrl);
                    var imgGUIDSrc = noteHelper.getGUID();
                    if (/^\.(gif|jpg|png|jpeg|bmp)$/.test(suffix)) {
                        imgGUIDSrc += suffix;
                    } else {
                        imgGUIDSrc += '.jpg';//默认为jpg
                    }
                    g.params.imgArr.push(info.srcUrl);
                    g.params.imgGUIDArr.push(imgGUIDSrc);
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
            var imgs = param.imgs, imgsGUID = param.imgsGUID, titles = param.imgTitles || '', content;
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
                                url:noteConfig.url.uploadFile + '?sid=' + noteConfig.getSid(),
                                type:"POST",
                                data:formData,
                                processData:false,
                                contentType:false,
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
                formData.append('note_id', g.params.noteID || '');
                formData.append('belong_to', g.params.belongTo || '');
                for (var i = 0, l = totalImgNum; i < l; i++) {
                    process.downloadImage(imgs[i], i, function (file, idx) {
                        saveSucceedImgNum++;
                        saveSucceedImgIndex.push(idx);
                        formData.append(imgsGUID[idx], file);
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
            process._saveImages(param, successCallback, failCallback);
        },
        initExtensionConnect:function () {
            chrome.extension.onConnect.addListener(function (port) {
                switch (port.name) {
                    case 'actionsetpopupcontent':
                        process.setPopupContentConnect(port);
                        break;
                    case 'savenotefrompopup':
                        process.saveNoteFromPopup(port);
                        break;
                    case 'saveselectedcontent':
                        process.saveSelectContent(port);
                        break;

                    default:
                        break;
                }
            });

        },
        setPopupContentConnect:function (port) {
            port.onMessage.addListener(function (data) {
                chrome.tabs.sendRequest(port.sender.tab.id, {name:'actionsetpopupcontent', data:data});
//                process.savePageContent(param);
                //param.title, param.sourceurl, param.content,param.tags || '','',param.id ||''
            });
        },
        saveNote:function (noteData, successCallback, failCallback) {//id为当前note_id新流程先保存笔记 再上传图片未用到该参数
            noteHelper.notifyHTML(chrome.i18n.getMessage('note_saving'), false);
            var params = {
                "title":noteData.title,
                "sourceUrl":noteData.sourceUrl || "",
                "content":noteData.content || "",
                "belongTo":noteData.belong_to || g.params.belongTo
            };
            console.log(params);
            g.params.noteID = noteHelper.getGUID();
            g.params.firstItem = noteHelper.getGUID();
            //替换照片src
            var itemContent = $(noteData.content);
            g.params.imgArr = [];
            g.params.imgGUIDArr = [];
            itemContent.find('img').each(function (i) {
                if (this.tagName.toLocaleLowerCase() == 'img') {
                    var url = this.src;
                    var suffix = helper.getSuffix(url);
//                    var imgGUID = noteHelper.getGUID();
                    var imgGUIDSrc = noteHelper.getGUID();
                    if (/^\.(gif|jpg|png|jpeg|bmp)$/.test(suffix)) {
                        imgGUIDSrc += suffix;
                    } else {
                        imgGUIDSrc += '.jpg';//默认为jpg
                    }
                    g.params.imgArr.push(url);
                    g.params.imgGUIDArr.push(imgGUIDSrc);
                    params.content = params.content.replace(new RegExp(url, "g"), imgGUIDSrc);
                }
            });
            var contentHTML='<!DOCTYPE HTML>';
            contentHTML+='    <html>';
            contentHTML+='            <head>';
            contentHTML+='                <meta charset="UTF-8">';
            contentHTML+='                    <title></title>';
            contentHTML+='                </head>';
            contentHTML+='                <body>';
            contentHTML+= params.content;
            contentHTML+='                </body>';
            contentHTML+='            </html>';
            var dataObj = {
                "client_type":"chrome",
                "belong_to":params.belongTo, //所属文件夹ID，默认文件夹为GUID_NULL字符串
                "title":params.title, //笔记标题
                "note_src":params.sourceUrl, //笔记来源
                "note_id":g.params.noteID,
                "first_item":g.params.firstItem, //主笔记项GUID
                "file_ext":"html", //主笔记项的文件夹扩展名
                "item_content":contentHTML
            };
            $.ajax({
                headers:{
                    'X-Requested-With':'XMLHttpRequest'
                },
                type:'POST',
                url:noteConfig.url.saveNote + '?sid=' + noteConfig.getSid(),
                data:JSON.stringify(dataObj),
                success:function (data) {
                    if (data.code != 200) {
                        failCallback && failCallback();
                        return;
                    }
                    successCallback && successCallback();
                },
                error:function (jqXHR, textStatus, errorThrown) {
                    failCallback && failCallback();
                    noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                }
            });
        },
        saveNoteFromPopup:function (port) {
            port.onMessage.addListener(function (msg) {
                process.saveNote(msg, function () {
                    if(g.params.imgArr.length > 0){
                        var param = {
                            imgs:g.params.imgArr,
                            imgsGUID:g.params.imgGUIDArr
                        };
                        process.saveImages(param, function () {
                            noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_succeed'), 2000);
                        }, function () {
                            noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                        });
                    }else{
                        noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_succeed'), 2000);
                    }
                }, function () {
                    noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                })
            });
        },
        //等合并到saveNoteFromPopup
        saveSelectContent:function (port) {
            process.checkLogin(function () {
                port.onMessage.addListener(function (data) {
                    process.saveNote(data, function () {
                        if(g.params.imgArr.length > 0){
                            var param = {
                                imgs:g.params.imgArr,
                                imgsGUID:g.params.imgGUIDArr
                            };
                            process.saveImages(param, function () {
                                noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_succeed'), 2000);
                            }, function () {
                                noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                            });
                        }else{
                            noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_succeed'), 2000);
                        }
                    }, function () {
                        noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                    });
                });
            });
        },
        saveSelectImage:function (param) {
            process.checkLogin(function () {
                var content = '<div class="image"><img src="' + param.imgs[0] + '" title="' + param.imgTitles + '" /></div>';
                var noteData = {
                    title:param.title,
                    sourceUrl:param.sourceUrl,
                    content:content
                };
                process.saveNote(noteData, function () {
                    var img = {
                        imgs:g.params.imgArr,
                        imgsGUID:g.params.imgGUIDArr
                    };
                    process.saveImages(img, function () {
                        noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_succeed'), 2000);
                    }, function () {
                        noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                    })
                }, function () {
                    noteHelper.notifyHTML(chrome.i18n.getMessage('note_save_failed'));
                })
            });
        },
        checkLogin:function (callback) {
            if (noteConfig.getSid()) {
                callback();
            } else {
                process.autoSignIn(function(flag){
                   if(!flag) {//取不到cookie时弹出登录框 这里主要是处理当登录WEB端退出后再登录导致tab监听丢失问题
                       chrome.tabs.getSelected(function (tab) {
                           process.openOrClosePopup();
                       });
                   }
                });
            }
        }
    };
    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    process.init();
})(jQuery);

