(function ($) {
    window.noteClipper = function () {
        "use strict";
        var g = {};
        /**
         * 全局变量
         * @type {Object}
         */
        g.params = {
            isCreatedPopup:false,
            zIndex:20121204,
            popupWidth:400,
            resize:false,
            timer:0,
            resizeOffsetX:0,
            marks:{},
            markedElements:{},
            markCount:1,
            disallowedAttributes:[ "id", "class", "accesskey", "data", "dynsrc", "rel", "tabindex", "style", "width", "height" ]
        };
        /**
         * 节点
         * @type {Object}
         */
        g.node = {
            popupDom:{},
            doc:$(document),
            body:$(document.body),
            mask:'',
            mark:'',
            maskMarkPanel:''

        };
        /**
         * helper方法
         * @type {Object}
         */
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
            },
            getBackgroundImageUrl:function () {
                return chrome.extension.getURL('images/icons/opt_bg.png');
            }
        };
        /**
         * HTML 模板
         * @type {Object}
         */
        var htmlLayout = {
            popupWin:function () {
                var html = '', resizeTitle = chrome.i18n.getMessage('action_resize_title');
                html += '<div id="note91_chrome_extension" note91clip="true" style="z-index: 2147483647!important;">';
                html += '<a id="note91_popup_resize" href="#" role="resize" title="' + resizeTitle + '"></a> ';
                html += '<iframe frameborder="0" id="popup_iframe" style="width:100%;height:100%;"></iframe>';
                html += '</div>';
                return html;
            },
            maskMarkPanel:function () {
                return '<div note91clip="true" id="note91_clip_mask_mark_panel"></div>';
            }(),
            mask:function () {
                return '<div note91clip="true" class="note91-clip-mask"></div>';
            }(),
            mark:function () {
                var html = '';
                html += '<div note91clip="true" class="note91-clip-mark">';
                html += '   <div note91clip="true" class="note91-clip-mark-inner">';
                html += '      <div note91clip="true" class="note91-clip-mark-expandor">放大</div>';
                html += '      <div note91clip="true" class="note91-clip-mark-close">删除</div>';
                html += '   </div>';
                html += '</div>';
                return html;
            }()
        };
        /**
         * 鼠标选择
         * @type {Object}
         */
        var inspector = {
            createPanel:function () {
                if (g.node.maskMarkPanel) {
                    return;
                }
                g.node.maskMarkPanel = $(htmlLayout.maskMarkPanel);
                g.node.mask = $(htmlLayout.mask);
                g.node.mark = $(htmlLayout.mark);
                g.node.maskMarkPanel.appendTo(document.body).append(g.node.mask);
                g.node.body.bind('mousemove.note91clipmark',function (e) {
                    inspector.mouseMoveMarkHandler(e);
                }).bind('click.note91clipmark',function (e) {
                        inspector.clickMarkHandler(e);
                    }).bind('mouseleave.note91clipmark', function (e) {
                        g.node.mask.hide()
                    })
            },
            remove:function () {
                if (!g.node.maskMarkPanel) return;
                g.node.maskMarkPanel.remove();
                g.params.markedElements = {};
                g.params.marks = {};
                g.params.markCount = 0;
                g.node.body.unbind('mousemove.note91clipmark').unbind('click.note91clipmark');
            },
            hide:function () {
                if (!g.node.maskMarkPanel) return;
                g.node.maskMarkPanel.hide();
                g.node.body.unbind('mousemove.note91clipmark').unbind('click.note91clipmark');
            },
            show:function () {
                if (!g.node.maskMarkPanel) return;
                g.node.maskMarkPanel.show();
                g.node.body.bind('mousemove.note91clipmark',function (e) {
                    inspector.mouseMoveMarkHandler(e);
                }).bind('click.note91clipmark', function (e) {
                        inspector.clickMarkHandler(e);
                    })
            },
            mouseMoveMarkHandler:function (e) {
                g.node.mask.show();
                var target = inspector.elementFormPoint(e),
                    isMark = target.attr('note91clip'),
                    isIgnore = false;
                if (target.is('body,html') || isMark) {
                    isIgnore = true
                }
                if (!isMark && !isIgnore) {
                    inspector.attachBox(target, g.node.mask);
                } else {
                    g.node.mask.hide();
                }
            },
            clickMarkHandler:function (e) {
                var target = inspector.elementFormPoint(e),
                    isIgnore = false;
                if (target.is('iframe, frame')) {
                    console.log('无法获取iframe及frame里面的内容');
                }
                if (target.is('body, html')) {
                    isIgnore = true;
                }
                inspector.removeMarkInElement(target);
                if (!isIgnore) {
                    inspector.addMark(target, g.node.mark.clone());
                    return false;
                }
                e.stopPropagation();
            },
            addMark:function (target, mark, title) {
                var uid = 'node91mark_' + g.params.markCount;
                mark.attr('uid', uid);
                g.node.maskMarkPanel.append(mark);
                inspector.attachBox(target, mark);
                g.params.markCount++;
                var html = helper.removeAttrs(target);
                process.sendContentToPopup(html, title, uid, true);
                g.params.markedElements[uid] = target;
                g.params.marks[uid] = mark;
                mark.data('uid', uid).click(function (e) {
                    e.stopPropagation();//停止往上冒泡触发body click事件
                    inspector.delMark(mark);
                    return false;
                });
                $(mark.children()[1]).click(function (e) {
                    inspector.parentMark(mark);
                    return false;
                });
            },
            delMark:function (mark) {
                var uid = mark.data('uid');
                mark.remove();
                process.sendContentToPopup('', '', uid);
                delete g.params.markedElements[uid];
            },
            clearMarks:function () {
                g.node.maskMarkPanel.html('').append(g.node.mask);
                g.params.markedElements = {};
                g.params.marks = {};
                g.params.markCount = 0;
            },
            parentMark:function (mark) {
                var uid = mark.data('uid'),
                    parent = g.params.markedElements[uid].parent();
                if (!parent.is('html')) {
                    inspector.removeMarkInElement(parent);
                    inspector.addMark(parent, g.node.mark.clone());
                }
            },
            removeMarkInElement:function (el) {
                var markedPageElementInParent = {};
                for (var uid in g.params.markedElements) {
                    if (el.find(g.params.markedElements[uid]).length > 0) {
                        markedPageElementInParent[uid] = true;
                    }
                }
                for (var uid in g.params.marks) {
                    if (markedPageElementInParent[uid]) {
                        inspector.delMark(g.params.marks[uid]);
                    }
                }
            },
            elementFormPoint:function (e) {
                g.node.mask.hide();
                var pos = {
                    top:e.pageY - $(window).scrollTop(),
                    left:e.pageX
                };
                var target = $(document.elementFromPoint(pos.left, pos.top));
                g.node.mask.show();
                return target;
            },
            attachBox:function (target, el) {
                var size = {
                        height:target.outerHeight(),
                        width:target.outerWidth()
                    },
                    pos = {
                        left:target.offset().left,
                        top:target.offset().top
                    };
                var bodyOuterWidth = g.node.body.outerWidth();
                if (pos.left == 0) {
                    if (size.width >= bodyOuterWidth) {
                        size.width = bodyOuterWidth - 6;
                    }
                } else if (pos.left + size.width >= bodyOuterWidth) {
                    size.width = bodyOuterWidth - pos.left - 6;
                } else {
                    pos.left -= 3;
                }
                if (pos.top == 0) {
                    size.height -= 3;
                } else {
                    pos.top -= 3;
                }
                el.css({
                    left:pos.left,
                    top:pos.top,
                    height:size.height,
                    width:size.width
                });
            }
        };
        /**
         *  逻辑处理
         * @type {Object}
         */
        var process = {
            createPopup:function () {
                var html = htmlLayout.popupWin();
                g.node.popupDom = $(html).appendTo(document.body);
                g.node.popupDom.fadeIn().find('iframe').eq(0).attr('src', chrome.extension.getURL('popup.html'));
                g.params.isCreatedPopup = true;
                events.addDomEvent();//添加事件
            },
            closePopup:function () {
                process.removeInspector();
                inspector.remove();
                g.node.popupDom.fadeOut(function (e) {
                    $(this).remove();
                    g.params.isCreatedPopup = false;
                });
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
            sendContentToPopup:function (content, title, uid, isAppend) {//isAppend是否添加到已有内容
                //cannot send data directly to popup page, so connect to background page first
                if (isAppend && !content) return;//add blank node, return;
                var port = chrome.extension.connect({name:'actionsetpopupcontent'});
                var data = {
                    "content":content ? content[0].outerHTML : '',
                    "title":title,
                    "uid":uid,
                    "isAppend":isAppend
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
                        process.sendContentToPopup(html, helper.escapeHTML(title), '');
                    }, 0);
                } else {
                    var port = chrome.extension.connect({name:'noarticlefrompage'});
                    port.postMessage();
                }
            }
        };
        /**
         * 事件
         * @type {Object}
         */
        var events = {
            addWindowEventListener:function () {//添加popup事件监听
                window.addEventListener('message', function (e) {
                    switch (e.data.name) {
                        case 'closefromnotepopup':
                            process.closePopup();
                            break;
                        case 'actionfrompopupinspecotr':
                            inspector.createPanel();
                            break;
                        case 'actionfrompopupclearinspecotr':
                            inspector.clearMarks();
                            break;
                        case 'getpagecontentfromnotepopup':
                            process.getPageContent();
                            break;
                        default:
                            break;
                    }
                });
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
        /**
         * 接口方法
         */
        return {
            init:function () {
                events.addWindowEventListener();
            },
            openOrClosePopup:function () {
                if (!g.params.isCreatedPopup) {
                    process.createPopup();
                } else {
                    process.closePopup();
                }
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
            }
        };
    }();
    noteClipper.init();
})(jQuery);