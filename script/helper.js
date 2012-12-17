(function ($) {
    window.noteHelper = function () {
        "use strict";
        var g = {};
        g.params = {
            notificationTimer:0,
            notification:false,
            notificationData:{},
            sid:''
        };
        var process = {
        };
        return {
            init:function () {

            },
            getSid:function(){
                return g.params.sid;
            },
            getGUID:function(){
                var g = function g() {
                    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
                };
                return  (g() + g() + "-" + g() + "-" + g() + "-" + g() + "-" + g() + g() + g()).toUpperCase();
            },
            closeNotification:function(){
                g.params.notification.cancel();
            },
            getNotificationData:function(){
               return g.params.notificationData
            },
            notifyHTML:function (content, lastTime, title) {
                if (!content) return;
                g.params.notificationData = {
                    content:content,
                    title:title || 'Hi:'
                };
                if (g.params.notification) {
                    clearTimeout(g.params.notificationTimer);
                    //chrome version below 20 has no such method
                    if (chrome.extension.sendMessage) {
                        chrome.extension.sendMessage({name:'sendnotification', data:g.params.notificationData});
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
                        g.params.notification && g.params.notification.cancel();
                    }, lastTime || 5000);
                }
            }
        };
    }();
    noteHelper.init();
})(jQuery);