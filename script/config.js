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
            }
        };
    }();
})();