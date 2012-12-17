(function ($) {
    "use strict";
    var g = {};
    g.node = {
        closeBtn:$('#close_btn'),
        cleanBtn:$('#clean_btn'),
        inspector:$('#mouse_select'),
        content:$('#content'),
        doc:$(document)
    };
    var process = {
        init:function () {
            process.addEvents();
            process.initExtensionRequest();
        },
        addEvents:function () {
            g.node.closeBtn.bind('click', function (e) {
                parent.postMessage({name:'closefromnotepopup'}, '*');
                return false;
            });
            g.node.cleanBtn.bind('click', function (e) {
                g.node.content.html('');
                parent.postMessage({name:'actionfrompopupclearinspecotr'}, '*');
                return false;
            });
            g.node.inspector.bind('click', function (e) {
                parent.postMessage({name:'actionfrompopupinspecotr'}, '*');
                return false;
            });
            window.onload = function(){
                parent.postMessage({name:'getpagecontentfromnotepopup'}, '*');
                return false;
            }
        },
        setPopupContent:function (data) {
            if(data.isAppend){
                g.node.content.append($('<div note91clip="true" id="' + data.uid + '"></div>').append(data.content));
                if(data.title){
                    g.node.content.find('.article-header').val(data.title);
                }
            }else{
                if(data.uid){
                    $('#' + data.uid).remove();
                }else{
                    var html = '<h1 class="article-header">' + (data.title) + '</h1>';
                    g.node.content.html(html + data.content);
                }
            }
        },
        initExtensionRequest:function () {
            chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
                if (!sender || sender.id !== chrome.i18n.getMessage("@@extension_id")) {
                    return;
                }
                switch (request.name) {
                    case 'actionsetpopupcontent':
//                        process.actionfrompopupinspecotrHandler(request.data);
                        process.setPopupContent(request.data);
                        break;
                    default:
                        break;
                }
            })
        }
    };
    process.init();
})(jQuery);