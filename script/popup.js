(function ($) {
    "use strict";

    var g = {};
    g.params = {
    };
    g.node = {
        closeBtn:$('#close_btn'),
        cleanBtn:$('#clean_btn'),
        loginOut:$('#login_out'),
        inspector:$('#mouse_select'),
        sidebar:$('#sidebar'),
        content:$('#content'),
        loginPanel:$('#login_panel'),
        labelUserName:$('#label_user_name'),
        labelPassword:$('#label_password'),
        iptUserName:$('#ipt_user_name'),
        iptPassword:$('#ipt_password'),
        btnLogin:$('#btn_login'),
        loginNotice:$('#login_notice'),
        save:$('#save'),
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
            g.node.loginOut.bind('click', function (e) {
                noteConfig.setSid('');
                process.loginLayout();
                return false;
            });
            g.node.inspector.bind('click', function (e) {
                parent.postMessage({name:'actionfrompopupinspecotr'}, '*');
                return false;
            });
            g.node.save.bind('click', function (e) {
                g.node.content.find('div[note91clip=true]').removeAttr('id').removeAttr('note91clip');
                var title = g.node.content.find('.article-header').text();
                var contentClone = g.node.content.clone();
                contentClone.find('h1.article-header').remove();
                var noteData = {
                    title:title,
                    content:contentClone.html(),
                    taxonomy_id:0,
                    tags:''
                };
                parent.postMessage({name:'actionfrompopupsavenote', noteData:noteData}, '*');
                return false;
            });
            window.onload = function () {
                if (noteConfig.getSid()) {
                    g.node.sidebar.find('.is-login').show();
                    g.node.content.show();
                    parent.postMessage({name:'getpagecontentfromnotepopup'}, '*');
                } else {
                    process.loginLayout('');
                }
                return false;
            }
        },
        loginLayout:function (callback) {
            g.node.labelUserName.text(chrome.i18n.getMessage("label_user_name"));
            g.node.labelPassword.text(chrome.i18n.getMessage("label_password"));
            g.node.btnLogin.val(chrome.i18n.getMessage("btn_login_label"));
            g.node.sidebar.find('.is-login').hide();
            g.node.content.hide();
            g.node.loginPanel.show();
            g.node.btnLogin.bind('click', function () {
                process.login();
            });
            g.node.iptUserName.bind('keydown', function () {
                g.node.loginNotice.html('');
            });
            g.node.iptPassword.bind('keydown', function () {
                g.node.loginNotice.html('');
            });
            g.node.iptPassword.bind('keyup', function (e) {
                if (e.keyCode == 13) {
                    process.login();
                }
            });
        },
        login:function () {
            var userName = $.trim(g.node.iptUserName.val());
            var password = $.trim(g.node.iptPassword.val());
            if (userName == '') {
                g.node.loginNotice.html(chrome.i18n.getMessage("notice_user_name"));
                return false;
            }
            if (password == '') {
                g.node.loginNotice.html(chrome.i18n.getMessage("notice_password"));
                return false;
            }
            var dataObj = {
                username:userName,
                password:password
            };
            $.ajax({
                headers:{
                    'X-Requested-With':'XMLHttpRequest'
                },
                type:'POST',
                url:noteConfig.url.login,
                data:JSON.stringify(dataObj),
                dataType:'json',
                success:function (data) {
                    if (data.code == 200) {
                        noteConfig.setSid(data.sid);
                        g.node.loginPanel.hide();
                        g.node.sidebar.find('.is-login').show();
                        g.node.content.show();
                        g.node.btnLogin.unbind('click');
                        g.node.labelPassword.bind('keydown');
                        g.node.labelUserName.bind('keydown');
                        g.node.iptPassword.bind('keyup');
                        parent.postMessage({name:'getpagecontentfromnotepopup'}, '*');
                    } else {
                        g.node.loginNotice.html(data.msg);
                    }
                },
                error:function (jqXHR, textStatus, errorThrown) {

                }
            });
        },
        setPopupContent:function (data) {
            if (data.isAppend) {
                g.node.content.append($('<div note91clip="true" id="' + data.uid + '"></div>').append(data.content));
                if (data.title) {
                    g.node.content.find('.article-header').val(data.title);
                }
            } else {
                if (data.uid) {
                    $('#' + data.uid).remove();
                } else {
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
                    case 'openloginwin':
//                        process.actionfrompopupinspecotrHandler(request.data);
                        process.loginLayout(request.callback);
                        break;
                    default:
                        break;
                }
            })
        }
    };
    process.init();
})(jQuery);