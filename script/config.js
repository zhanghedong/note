(function () {
    window.noteConfig = function () {
        "use strict";

        var g = {};
        g.params = {
            cookiesTimeout:2592000
        };
        g.url = {
//            baseUrl:'http://inner.note.91.com/'
            baseUrl:'http://api1.note.91.com/'
        };
        g.themes ={//临时测试地址，等样式确认后发布到WEB端
            "white": {
                "css":'http://1625.me/temp/note91/themes/theme_1.css',
                "icon":'http://1625.me/'
            },
            "gray":{
                "css":'http://1625.me/temp/note91/themes/theme_2.css',
                "icon":'http://1625.me/'
            }
        };
        var process = {
        };
        return {
            url:{
                uploadFile:g.url.baseUrl + 'web/notenew/addItems',
                saveNote:g.url.baseUrl + 'web/notenew/addNote',
                login:g.url.baseUrl + 'common/log/loginname',
                webSignIn:'http://note.91.com/NoteMain/Index.aspx',
                webSignOut:'http://note.91.com/Logout.aspx'
            },
            setSid:function (sid) {
                window.localStorage['note91chromesid'] = sid;
            },
            getSid:function () {
               return (window.localStorage['note91chromesid'] || '');
            },
            setUserName:function(userName){
                window.localStorage['note91chromeusername'] = userName;
            },
            getUserName:function(){
                return (window.localStorage['note91chromeusername'] || '');
            },
            setTheme:function(themeName){
                window.localStorage['note91chrometheme'] = g.themes[themeName];
            },
            getTheme:function(){
                return (window.localStorage['note91chrometheme'] || g.themes.white );
            },
            setInspectorSwitch:function(s){
                window.localStorage['note91chromeinspector'] = s;
            },
            getInspectorSwitch:function(){
                return (window.localStorage['note91chromeinspector'] || 'false');
            },
            setSignInCallback:function(callback){
                window.sessionStorage['note91chromelogincallback'] = callback;
            },
            getSignInCallback:function(){
                return (window.sessionStorage['note91chromelogincallback'] || '');
            }
        };
    }();
})();