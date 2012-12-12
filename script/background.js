/**
 * @zhanghd
 */
(function ($) {
    "use strict";
    var g = {
        sid:''
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
                        imgs: [info.srcUrl],
                        title: tab.title,
                        imgTitles: [tab.title],
                        sourceurl: tab.url
                    };
                    process.saveImages(param);
//                    chrome.tabs.executeScript(tab.id, {code:"noteClipper.saveImage(["+param+"]);"});
                }
            });
        },
        _saveImages:function(param,successCallback,failCallback){

        },
        saveImages:function(param,successCallback,failCallback){
             process.checkLogin(function(){
                 process._saveImages(param,successCallback,failCallback);
             });
        },
        actionFromPopupInspecotrHandler: function(port){
            port.onMessage.addListener(function(data){
                //send to popup
                chrome.tabs.sendRequest(port.sender.tab.id, {name: 'actionfrompopupinspecotr', data: data});
            });
        },
        initExtensionConnect:function () {
            chrome.extension.onConnect.addListener(function (port) {
                switch (port.name) {
                    case 'getselectedcontent':
                        process.getpagecontentConnect(port);
                        break;
                    case 'actionfrompopupinspecotr':
                        process.actionFromPopupInspecotrHandler(port);
                        break;
                    default:
                        break;
                }
            });

        },
        getpagecontentConnect:function (port) {
            port.onMessage.addListener(function (msg) {
                process.saveNote(msg.title, msg.sourceurl, msg.content);
            });
        },
        saveNote:function (title, sourceurl, content) {
            alert(content);
        },
        login:function(){
            chrome.cookies.get({url: "http://note.91.com", name: "uapc"}, function(cookie){
                alert(JSON.stringify(cookie));
            });
        },
        checkLogin:function(callback){
            callback();
        }

    };
    process.init();
})(jQuery);
