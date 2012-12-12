(function ($) {
    "use strict";
    var g = {};
    g.node = {
        closeBtn:$('#close_btn'),
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
            window.onload = function(){
                parent.postMessage({name:'getpagecontentfromnotepopup'}, '*');
                return false;
            }
        },
        actionfrompopupinspecotrHandler:function (data) {
            var html = '<h1 class="article-header">' + data.title + '</h1>';
            $('#content').html(html + data.content);
        },
        initExtensionRequest:function () {
            chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
                if (!sender || sender.id !== chrome.i18n.getMessage("@@extension_id")) {
                    return;
                }
                switch (request.name) {
                    case 'actionfrompopupinspecotr':
                        process.actionfrompopupinspecotrHandler(request.data);
                        break;
                    default:
                        break;
                }
            })
        }
    };
    process.init();
})(jQuery);