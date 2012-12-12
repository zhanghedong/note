(function ($) {
    window.noteClipper = function () {
        "use strict";
        var g = {};
        g.params = {
            isCreatedPopup:false,
            zIndex:20121204,
            popupWidth:400,
            resize:false,
            timer:0,
            resizeOffsetX:0,
            disallowedAttributes:[ "id", "class", "accesskey", "data", "dynsrc", "rel", "tabindex", "style", "width", "height" ]
        };
        g.node = {
            popupDom:{},
            doc:$(document)
        };
        var helper = {
            attributeAllowed:function (attrName) {
                attrName = attrName.toLowerCase();
                if (attrName.match(/^on/i)) return false;
                if (attrName.match(/^data-/i)) return false;
                return (g.params.disallowedAttributes.indexOf(attrName) == -1);
            },
            removeAttrs:function (node) {//移除元素属性
                var i, l, attrs, nodeClone;
                nodeClone = node.clone(false);
                nodeClone.find('*').each(function (k) {
                    attrs = $(this)[0].attributes;
                    for (i = 0; i < attrs.length; i++) {
                        if (attrs[i] && attrs[i].name) {
                            if (!helper.attributeAllowed(attrs[i].name)) {
                                $(this).removeAttr(attrs[i].name);
                                i--;
                            }
                        }
                    }
                });
                return nodeClone;
            },
            escapeHTML:function (str) {
                str = str.replace(/&/g, "&amp;");
                str = str.replace(/</g, "&lt;");
                str = str.replace(/>/g, "&gt;");
                return str;
            },
            getIndex:function () {
                return g.params.zIndex++;
            }
        };
        var htmlLayout = {
            popupWin:function () {
                var html = '', resizeTitle = chrome.i18n.getMessage('action_resize_title');
                html += '<div id="note91_chrome_extension" style="z-index: 2147483647!important;">';
                html += '<a id="note91_popup_resize" href="#" role="resize" title="'+resizeTitle+'"></a> ';
                html += '<iframe frameborder="0" id="popup_iframe" style="width:100%;height:100%;"></iframe>';
                html += '</div>';
                return html;
            }
        };
        var process = {
            addWindowEventListener:function () {//添加popup事件监听
                window.addEventListener('message', function (e) {
                    switch (e.data.name) {
                        case 'closefromnotepopup':
                            process.closePopup();
                            break;
                        case 'getpagecontentfromnotepopup':
                            process.getPageContent();
                            break;
                        default:
                            break;
                    }
                });
            },
            createPopup:function () {
                var html = htmlLayout.popupWin();
                g.node.popupDom = $(html).appendTo(document.body);
                g.node.popupDom.fadeIn().find('iframe').eq(0).attr('src', chrome.extension.getURL('popup.html'));
                g.params.isCreatedPopup = true;
                process.addDomEvent();//添加事件
            },
            closePopup:function () {
                process.removeInspector();
                g.node.popupDom.fadeOut(function (e) {
                    $(this).remove();
                    g.params.isCreatedPopup = false;
                });
            },
            removeInspector:function () {//移除相关事件及节点

            },
            getSelectionContainer:function () {
                var container = null;
                if (window.getSelection) {
                    var selectionRange = window.getSelection();
                    if (selectionRange.rangeCount > 0) {
                        var range = selectionRange.getRangeAt(0);
                        container = range.commonAncestorContainer;
                    }
                } else {
                    if (document.selection) {
                        var textRange = document.selection.createRange();
                        container = textRange.parentElement();
                    }
                }
                return container;
            },
            getSelectedHTML:function () {
                var userSelection, range;
                if (window.getSelection) {
                    //W3C Ranges
                    userSelection = window.getSelection();
                    //Get the range:
                    if (userSelection.getRangeAt) {
                        range = userSelection.getRangeAt(0);
                    } else {
                        range = document.createRange();
                        range.setStart(userSelection.anchorNode, userSelection.anchorOffset);
                        range.setEnd(userSelection.focusNode, userSelection.focusOffset);
                    }
                    //And the HTML:
                    var clonedSelection = range.cloneContents();
                    var div = document.createElement('div');
                    div.appendChild(clonedSelection);
                    return div.innerHTML;
                } else if (document.selection) {
                    //Explorer selection, return the HTML
                    userSelection = document.selection.createRange();
                    alert('bbb');
                    return userSelection.htmlText;
                } else {
                    return '';
                }
            },
            sendContentToPopup:function (content, title) {
                //cannot send data directly to popup page, so connect to background page first
                if (!content) return;//add blank node, return;
                var port = chrome.extension.connect({name:'actionfrompopupinspecotr'});
                var data = {
                    "content":content[0].innerHTML,
                    "title":title
                };
                port.postMessage(data);
            },
            extractContent:function (doc) {
                var ex = new ExtractContentJS.LayeredExtractor();
                ex.addHandler(ex.factory.getHandler('Heuristics'));
                var res = ex.extract(doc);
                return res;
            },
            getPageContent:function () {
                var extract = process.extractContent(document);
                if (extract.isSuccess) {
                    var extractedContent = extract.content.asNode();
                    if (extractedContent.nodeType == 3) {
                        extractedContent = extractedContent.parentNode;
                    }
                    setTimeout(function () {
                        var title = document.title && document.title.split('-')[0];
                        var html = helper.removeAttrs($(extractedContent));
                        process.sendContentToPopup(html, helper.escapeHTML(title));
                    }, 0);
                } else {
                    var port = chrome.extension.connect({name:'noarticlefrompage'});
                    port.postMessage();
                }
            },
            addDomEvent:function () {
                g.node.popupDom.find('a[role="resize"]').bind('mousedown', function (e) {
                    g.params.resizeOffsetX = e.pageX - $(this).offset().left; // 鼠标点击时相对目标元素左上角的位置。
                    g.params.resize = true;
                    var mask = document.createElement('div');
                    $('<div role="mask">move</div>').appendTo(g.node.popupDom).css({
                        'position':'absolute',
                        'width':'100%',
                        'height':'100%',
                        'left':0,
                        'top':0,
                        'z-index':g.params.zIndex,
                        'background-color':'#000',
                        'opacity':0.1});

                    if (this.setCapture) {
                        this.setCapture();
                        $(this).bind('losecapture', end);
                    }
                    var end = function () {
                        var scope = g.node.popupDom.find('a[role="resize"]').eq(0);
                        if (scope[0].releaseCapture) {
                            scope[0].releaseCapture();
                        }
                        g.node.doc.unbind('mousemove').unbind('mouseup');
                        scope.unbind('losecapture');
                        g.node.popupDom.find('div[role="mask"]').remove();
                        g.params.resize = false;
                    };
                    g.node.doc.bind('mousemove',function (e) {
                        var winWidth = $(window).width();
                        if (g.params.resize) {
                            g.params.popupWidth = winWidth - e.pageX + g.params.resizeOffsetX;
                            g.node.popupDom.css('width', Math.max(32, Math.min(g.params.popupWidth, winWidth)));
                        }
                    }).bind('mouseup', function () {
                            end();
                        });
                });

            }
        };
        return {
            init:function () {
                process.addWindowEventListener();
            },
            openOrClosePopup:function () {
                if (!g.params.isCreatedPopup) {
                    process.createPopup();
                } else {
                    process.closePopup();
                }
            },
            saveImages:function(){

            },
            getSelectedContent:function () {
                var commonAncestorContainer = process.getSelectionContainer(), content = '', title = '';
                if (commonAncestorContainer === null || $(commonAncestorContainer).text() === '') {
                    content = false;
                } else if (commonAncestorContainer.nodeType === 3) {
                    content = $(commonAncestorContainer).text();
                    title = content;
                } else if (commonAncestorContainer.nodeType === 1) {
                    var selectedHTML = process.getSelectedHTML();
                    var tempNode = $('<div>', {html:selectedHTML});//.insertAfter($(commonAncestorContainer));
                    tempNode = helper.removeAttrs(tempNode);
                    var html = tempNode.html();
                    title = tempNode.text();
                    tempNode.remove();
                    content = html;
                }
                if (content) {
                    var port = chrome.extension.connect({name:'getselectedcontent'});
                    port.postMessage({
                        title:title,
                        sourceurl:location.href,
                        content:content
                    });
                }
            },
            getImage:function(param){

            }
        };
    }();
    noteClipper.init();
})
    (jQuery);