(function ($) {
    window.noteHelper = function () {
        "use strict";
        var g = {};
        g.params = {
            notificationTimer:0,
            notification:{}
        };
        var process = {
        };
        return {
            init:function () {

            },
            notifyHTML:function (content, lastTime, title) {
                if (!content) return;
                var notificationData = {
                    content:content,
                    title:title || 'Hi:'
                };
                if (g.params.notification) {
                    clearTimeout(g.params.notificationTimer);
                    //chrome version below 20 has no such method
                    if (chrome.extension.sendMessage) {
                        chrome.extension.sendMessage({name:'sendnotification', data:notificationData});
                    }
                } else {
                    g.params.notification = webkitNotifications.createHTMLNotification('notification.html');
                    g.params.notification.addEventListener('close', function (e) {
                        g.params.notification = null;
                    });
                    g.params.notification.show();
                }
                if (lastTime !== false) {
                    g.params.notificationTimer = setTimeout(function () {
                        g.params.notification && params.notification.cancel();
                    }, lastTime || 5000);
                }
            },
        };
    };
    noteHelper.init();
})(jQuery);