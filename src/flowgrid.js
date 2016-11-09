'use strict';
/**
 * Copyright (c) 2016 tm-roamer
 * https://github.com/PT-FED/pt-flowgrid
 * version: 1.0.5
 * 描述: 可拖拽流式布局
 * 原则和思路:  不依赖任何框架和类库, 通过指定classname进行配置, 实现view层的拖拽, 只和css打交道.
 * 兼容性: ie11+
 * 支持: requirejs和commonjs和seajs,
 */
;(function (parent, fun) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = fun();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(fun);
    } else if (typeof define === 'function' && typeof define.cmd === 'object') {
        define(fun);
    } else {
        parent.flowgrid = fun();
    }
})(window.pt || window, function (flowgrid) {

    // 常量
    var THROTTLE_TIME = 13,                                // 节流函数的间隔时间单位ms, FPS = 1000 / THROTTLE_TIME
        MEDIA_QUERY_SMALL = 768,                           // 分辨率768px
        MEDIA_QUERY_MID = 992,                             // 分辨率992px
        MEDIA_QUERY_BIG = 1200,                            // 分辨率1200px
        GRID_ITEM = 'pt-flowgrid-item',                    // 拖拽块classname
        GRID_ITEM_ZOOM = 'pt-flowgrid-item-zoom',          // 拖拽块内部放大缩小div的classname
        GRID_ITEM_DRAG = 'pt-flowgrid-item-drag',          // 拖拽块可以进行拖拽div的classname
        GRID_ITEM_CONTENT = 'pf-flowgrid-item-content',    // 拖拽块的展示内容区div的classname
        GRID_ITEM_DRAG_SVG = 'pt-flowgrid-item-drag-svg',  // 拖拽块可以进行拖拽div里面svg的classname
        GRID_ITEM_ANIMATE = 'pt-flowgrid-item-animate',    // 拖拽块classname 动画效果
        GRID_ITEM_GRAG_DROP = 'pt-flowgrid-item-dragdrop', // 正在拖拽的块classname
        GRID_ITEM_PLACEHOLDER = 'pt-flowgrid-item-placeholder',  // 拖拽块的占位符
        GRID_ITEM_DATA_ID = 'data-fg-id',                  // 拖拽块的数据标识id
        GRID_CONTAINER = 'pt-flowgrid-container',          // 拖拽容器classname
        GRID_CONTAINER_DRAGGABLE = 'data-fg-draggable',    // 拖拽容器拖拽属性
        GRID_CONTAINER_RESIZABLE = 'data-fg-resizable',    // 拖拽容器缩放属性
        GRID_CONTAINER_INDEX = 'data-container-index',     // 拖拽容器编号
        PLACEHOLDER = 'placeholder';                       // 占位符

    // 默认设置
    var f = function () {
    };
    var setting = {
        row: 7,                                            // 网格布局的默认行,默认7行
        col: 12,                                           // 网格布局的默认列,默认12列
        container: null,                                   // 网格容器的dom对象
        distance: 5,                                       // 触发拖拽的拖拽距离,默认5px
        draggable: true,                                   // 是否允许拖拽, 默认允许
        resizable: true,                                   // 是否允许缩放, 默认允许
        isDragBar: false,                                  // 是否启用拖拽句柄, 默认不启明
        nodeMinW: 2,                                       // 节点块的最小宽度, 默认占2格
        nodeMinH: 2,                                       // 节点块的最小高度, 默认占2格
        overflow: 5,                                       // 当拖拽或缩放超出网格容器的溢出像素
        padding: {                                         // 节点块之间的间距, 默认都为5px
            top: 5,
            left: 5,
            right: 5,
            bottom: 5
        },
        cellScale: {                                       // 单元格的宽高比例, 默认16:9
            w: 16,
            h: 9
        },
        autoAddCell: {                                     // 自动添加节点的默认数据
            x: 0,
            y: 0,
            w: 2,
            h: 2
        },
        onDragStart: f,                                     // 回调函数, 开始拖拽
        onDragEnd: f,                                       // 回调函数, 结束拖拽
        onResizeStart: f,                                   // 回调函数, 开始缩放
        onResizeEnd: f,                                     // 回调函数, 结束拖拽
        onAddNode: f,                                       // 回调函数, 添加节点
        onDeleteNode: f,                                    // 回调函数, 删除节点
        onLoad: f                                           // 回调函数, 重新加载
    };

    // 网格对象的缓存对象
    var cache = {
        count: 0,
        getGrid: function (node) {
            var container = view.searchUp(node, GRID_CONTAINER);
            return cache[container.getAttribute(GRID_CONTAINER_INDEX)]
        }
    };

    // 属性拷贝
    function extend(mod, opt) {
        if (!opt) return mod;
        var conf = {};
        for (var attr in mod) {
            if (typeof opt[attr] !== "undefined") {
                conf[attr] = opt[attr];
            } else {
                conf[attr] = mod[attr];
            }
        }
        return conf;
    }

    // 空对象
    function isEmptyObject(obj) {
        for (var i in obj) {
            return false;
        }
        return true;
    }

    // 节流函数
    function throttle(now) {
        var time = new Date().getTime();
        throttle = function (now) {
            if (now - time > THROTTLE_TIME) {
                time = now;
                return true;
            }
            return false;
        };
        throttle(now);
    }

    // 异步执行回调
    function asyncFun(ck) {
        setTimeout(function () {
            ck && typeof ck === 'function' && ck();
        }, 0);
    }

    // 构建节点
    function buildNode(n, id, opt) {
        var node = {
            id: n.id || id,
            x: n.x,
            y: n.y,
            w: n.w || n.minW || opt.nodeMinW,
            h: n.h || n.minH || opt.nodeMinH,
            minW: n.minW || opt.nodeMinW,
            minH: n.minH || opt.nodeMinH,
        };
        return node;
    }

    // 事件处理对象
    var handleEvent = {
        init: function (isbind, body) {
            if (this.isbind) return;
            this.isbind = isbind;
            this.body = body;
            this.unbindEvent();
            this.bindEvent();
        },
        // 绑定监听
        bindEvent: function () {
            document.addEventListener('mousedown', this.mousedown, false);
            document.addEventListener('mousemove', this.mousemove, false);
            document.addEventListener('mouseup', this.mouseup, false);
            document.addEventListener('click', this.click, true);
            this.isbind = true;
        },
        // 移除监听
        unbindEvent: function () {
            document.removeEventListener('mousedown', this.mousedown, false);
            document.removeEventListener('mousemove', this.mousemove, false);
            document.removeEventListener('mouseup', this.mouseup, false);
            document.removeEventListener('click', this.click, true);
            this.isbind = false;
        },
        mousedown: function (event) {
            var node = this.node = view.searchUp(event.target, GRID_ITEM)
            if (node) {
                dragdrop.dragstart(event, node);
                var isResize = dragdrop.isResize;
                var grid = dragdrop.grid;
                this.distance = grid.opt.distance;
                this.pageX = event.pageX;
                this.pageY = event.pageY;
                if (grid.opt.draggable) {
                    asyncFun(function () {
                        isResize ? grid.opt.onResizeStart(event, dragdrop.dragElement, dragdrop.dragNode)
                            : grid.opt.onDragStart(event, dragdrop.dragElement, dragdrop.dragNode);
                    })
                }
            }
        },
        mousemove: function (event) {
            if (dragdrop.isDrag) {
                var x = Math.abs(event.pageX - this.pageX);
                var y = Math.abs(event.pageY - this.pageY);
                this.triggerDistance = this.distance ? (x >= this.distance || y >= this.distance) : false;
                if (this.triggerDistance || dragdrop.isResize) {
                    throttle(new Date().getTime()) && dragdrop.drag(event);    
                }
            }
        },
        mouseup: function (event) {
            if (dragdrop.isDrag) {
                var triggerDistance = this.triggerDistance;
                var isResize = dragdrop.isResize;
                var grid = dragdrop.grid;
                var node = grid.clone(dragdrop.dragNode);
                asyncFun(function () {
                    if (triggerDistance) {
                        isResize ? grid.opt.onResizeEnd(event, dragdrop.dragElement, node)
                            : grid.opt.onDragEnd(event, dragdrop.dragElement, node);    
                    }
                });
                dragdrop.dragend(event);
                this.triggerDistance = false;
            }
        },
        click: function (event) {
            if (this.node) {
                var x = Math.abs(event.pageX - this.pageX);
                var y = Math.abs(event.pageY - this.pageY);
                if (x >= this.distance || y >= this.distance) {
                    event.stopPropagation();
                }
                this.node = null;
            }
        }
    };

    // 拖拽对象
    var dragdrop = {
        isDrag: false,              // 是否正在拖拽
        isResize: false,            // 是否放大缩小
        dragNode: {                 // 拖拽节点的的关联数据
            id: undefined,          // 拖拽节点的id
            node: null,             // 占位符节点的关联数据
        },
        dragElement: null,          // 拖拽的dom节点
        dragstart: function (event, node) {
            var className = event.target.className;
            // 取得网格对象
            var grid = this.grid = cache.getGrid(node);
            // 配置项, 禁用拖拽
            if (!grid.opt.draggable) return;
            // 判断是否拖拽
            if (typeof className === 'string') {
                var classes = className.split(" ");
                if (classes.indexOf(GRID_ITEM_DRAG) === -1) {
                    // 判断是否放大缩小
                    if (classes.indexOf(GRID_ITEM_ZOOM) !== -1) {
                        this.isResize = true;
                    } else {
                        // 如果有拖拽句柄的设置, 但没有选中, 则return
                        if (grid.opt.isDragBar) return;
                    }
                }
            }
            this.isDrag = true;
            this.dragElement = node;
            // 取得当前拖拽节点, 并替换当前拖拽节点id
            var query = grid.query(node.getAttribute(GRID_ITEM_DATA_ID));
            if (query) {
                this.dragElement.className = GRID_ITEM + ' ' + GRID_ITEM_GRAG_DROP;
                this.dragNode.id = query.node.id;
                this.dragNode.node = query.node;
                this.dragNode.node.id = PLACEHOLDER;
                // 新增占位符
                var element = grid.elements[this.dragNode.node.id] = view.create(grid, this.dragNode.node);
                grid.opt.container.appendChild(element);
            }
        },
        drag: function (event) {
            if (!this.dragNode.node) return;
            var grid = this.grid,
                opt = grid.opt,
                container = opt.container,
                containerOffset = view.getOffset(container),    // 取得容器偏移
                // 相对父元素的偏移坐标x,y
                translate = this.dragElement.style.transform,
                value = translate.replace(/translate.*\(/ig, '').replace(/\).*$/ig, '').replace(/px/ig, '').split(','),
                info = {
                    containerX: containerOffset.left,
                    containerY: containerOffset.top,
                    containerW: container.clientWidth,
                    translateX: value[0] * 1,
                    translateY: value[1] * 1
                };
            // 赋初值
            this.prevX || (this.prevX = event.pageX);
            this.prevY || (this.prevY = event.pageY);
            // 计算位移
            info.dx = event.pageX - this.prevX;
            info.dy = event.pageY - this.prevY;
            // 保存当前坐标变成上一次的坐标
            this.prevX = event.pageX;
            this.prevY = event.pageY;
            // 转换坐标
            info.eventX = event.pageX - info.containerX;
            info.eventY = event.pageY - info.containerY;
            // 判断是不是放大缩小
            if (this.isResize) {
                this.resize(event, opt, info, grid);
            } else {
                // 计算偏移
                this.eventOffsetX || (this.eventOffsetX = info.eventX - info.translateX);
                this.eventOffsetY || (this.eventOffsetY = info.eventY - info.translateY);
                this.changeLocation(event, opt, info, grid);
            }
        },
        changeLocation: function (event, opt, info, grid) {
            var node = this.dragNode.node,
                x = info.eventX - this.eventOffsetX,
                y = info.eventY - this.eventOffsetY;
            // 计算坐标
            this.dragElement.style.cssText += ';transform: translate(' + x + 'px,' + y + 'px);';
            // 当前拖拽节点的坐标, 转换成对齐网格的坐标
            var nodeX = Math.round(x / opt.cellW_Int);
            var nodeY = Math.round(y / opt.cellH_Int);
            // 判断坐标是否变化
            if (node.x !== nodeX || node.y !== nodeY) {
                grid.replaceNodeInArea(grid.area, node);
                node.x = nodeX;
                node.y = nodeY;
                grid.checkIndexIsOutOf(grid.area, node, this.isResize);
                grid.overlap(grid.data, node, info.dx, info.dy, this.isResize);
                grid.load();
            }
        },
        resize: function (event, opt, info, grid) {
            var node = this.dragNode.node,
                minW = node.minW * opt.cellW_Int - opt.padding.left - opt.padding.right,
                minH = node.minH * opt.cellH_Int - opt.padding.top - opt.padding.bottom,
                eventW = info.eventX - info.translateX + opt.overflow,
                eventH = info.eventY - info.translateY + opt.overflow,
                w = eventW,
                h = eventH;
            // 判断最小宽
            if (eventW < minW)
                w = minW - opt.overflow;
            // 判断最小高
            if (eventH < minH)
                h = minH - opt.overflow;
            // 判断最大宽
            if (eventW + info.translateX > info.containerW)
                w = info.containerW - info.translateX + opt.overflow;
            // 设置宽高
            this.dragElement.style.cssText += ';width: ' + w + 'px; height: ' + h + 'px;';
            // 判断宽高是否变化
            var nodeW = Math.ceil(w / opt.cellW_Int),
                nodeH = Math.ceil(h / opt.cellH_Int);
            if (node.w !== nodeW || node.h !== nodeH) {
                grid.replaceNodeInArea(grid.area, node);
                node.w = nodeW;
                node.h = nodeH;
                grid.checkIndexIsOutOf(grid.area, node, this.isResize);
                grid.overlap(grid.data, node, info.dx, info.dy, this.isResize);
                grid.load();
            }
        },
        dragend: function (event) {
            if (!this.dragNode.node) return;
            var grid = this.grid,
                node = this.dragNode.node;
            node.id = this.dragNode.id;
            // 替换占位符
            view.update(grid, grid.elements[node.id], node);
            // 清理临时样式(结束拖拽)
            this.dragElement.className = GRID_ITEM + ' ' + GRID_ITEM_ANIMATE;
            // 清理临时变量
            this.grid = null;
            this.isDrag = false;
            this.isResize = false;
            this.dragNode.id = undefined;
            this.dragNode.node = null;
            // 清理临时坐标
            this.prevX = undefined;
            this.prevY = undefined;
            this.eventOffsetX = undefined;
            this.eventOffsetY = undefined;
            // 移除临时dom(占位符)
            view.remove(PLACEHOLDER);
            delete grid.elements[PLACEHOLDER];
        }
    };

    // 展示对象, 操作dom
    var view = {
        // 转换初始化, 将初始dom转换成js对象
        dom2obj: function (container, grid) {
            var i, len, ele, node, arr = [],
                elements = container.children;
            for (i = 0, len = elements.length; i < len; i++) {
                ele = elements[i];
                if (ele.className.split(" ").indexOf(GRID_ITEM) !== -1) {
                    arr[i] = {
                        x: ele.getAttribute('data-fg-x') * 1,
                        y: ele.getAttribute('data-fg-y') * 1,
                        w: ele.getAttribute('data-fg-w') * 1,
                        h: ele.getAttribute('data-fg-h') * 1,
                        minW: ele.getAttribute('data-fg-min-w') * 1,
                        minH: ele.getAttribute('data-fg-min-h') * 1
                    };
                    var id = ele.getAttribute('data-fg-id');
                    if (id) {
                        arr[i].id = id;
                        grid.elements[id] = ele;
                    } else {
                        grid.elements[i] = ele;
                    }
                }
            }
            return arr;
        },
        setContainerAttr: function (container, opt, draggable, resizable) {
            if (container) {
                if (typeof draggable !== 'undefined') {
                    opt.draggable = !!draggable;
                    opt.container.setAttribute(GRID_CONTAINER_DRAGGABLE, opt.draggable);
                }
                if (typeof resizable !== 'undefined') {
                    opt.resizable = !!resizable;
                    opt.container.setAttribute(GRID_CONTAINER_RESIZABLE, opt.resizable);
                }
            }
        },
        getOffset: function(node, offset) {
            offset = offset ? offset : {top: 0, left: 0};
            if (node === null || node === document) return offset;
                offset.top += node.offsetTop;
                offset.left += node.offsetLeft;
            return this.getOffset(node.offsetParent, offset);
        },
        searchUp: function (node, type) {
            if (node === handleEvent.body || node === document) return undefined;   // 向上递归到body就停
            var arr = typeof node.className === 'string' && node.className.split(' ');
            if (arr) {
                for (var i = 0, len = arr.length; i < len; i++) {
                    if (arr[i] === type) {
                        return node;
                    }
                }
            }
            return this.searchUp(node.parentNode, type);
        },
        create: function (grid, node, className) {
            var item = document.createElement("div"),
                zoom = document.createElement("div"),
                content = document.createElement("div");
            // 是否配置了拖拽句柄
            if (grid.opt.isDragBar) {
                var drag = document.createElement("div");
                drag.className = GRID_ITEM_DRAG;
                drag.innerHTML = '<svg class="' + GRID_ITEM_DRAG_SVG + '" viewBox="0 0 200 200"'
                    + 'version="1.1" xmlns="http://www.w3.org/2000/svg" '
                    + 'xmlns:xlink="http://www.w3.org/1999/xlink">'
                    + '<g class="transform-group">'
                    + '<g transform="scale(0.1953125, 0.1953125)">'
                    + '<path d="M 839.457 330.079 c 36.379 0 181.921 145.538 181.921 181.926 '
                    + 'c 0 36.379 -145.543 181.916 -181.921 181.916 '
                    + 'c -36.382 0 -36.382 -36.388 -36.382 -36.388 '
                    + 'v -291.07 c 0 0 0 -36.384 36.382 -36.384 '
                    + 'v 0 Z M 803.058 475.617 v 72.766 l -254.687 -0.001 '
                    + 'v 254.692 h -72.766 v -254.691 h -254.683 '
                    + 'v -72.766 h 254.682 v -254.693 h 72.766 v 254.692 '
                    + 'l 254.688 0.001 Z M 693.921 184.546 c 0 36.377 -36.388 36.377 -36.388 36.377 '
                    + 'h -291.07 c 0 0 -36.383 0 -36.383 -36.377 c 0 -36.387 145.538 -181.926 181.926 -181.926 '
                    + 'c 36.375 0 181.915 145.539 181.915 181.926 v 0 Z M 657.531 803.075 '
                    + 'c 0 0 36.388 0 36.388 36.382 c 0 36.388 -145.538 181.921 -181.916 181.921 '
                    + 'c -36.387 0 -181.926 -145.532 -181.926 -181.921 c 0 -36.382 36.383 -36.382 36.383 -36.382 '
                    + 'h 291.07 Z M 220.924 548.383 v 109.149 c 0 0 0 36.388 -36.377 36.388 '
                    + 'c -36.387 0 -181.926 -145.538 -181.926 -181.916 c 0 -36.387 145.538 -181.926 181.926 -181.926 '
                    + 'c 36.377 0 36.377 36.383 36.377 36.383 v 181.92 Z M 220.924 548.383 Z"></path></g></g></svg>';
                item.appendChild(drag);
            }
            item.className = className ? className : (GRID_ITEM + ' ' + GRID_ITEM_ANIMATE);
            zoom.className = GRID_ITEM_ZOOM;
            content.className = GRID_ITEM_CONTENT;
            item.appendChild(content);
            item.appendChild(zoom);
            this.update(grid, item, node, className);
            return item;
        },
        update: function (grid, element, node, className) {
            var opt = grid.opt;
            if (element) {
                element.className = className ? className : (GRID_ITEM + ' ' + GRID_ITEM_ANIMATE);
                element.setAttribute(GRID_ITEM_DATA_ID, node.id);
                element.setAttribute('data-fg-x', node.x);
                element.setAttribute('data-fg-y', node.y);
                element.setAttribute('data-fg-w', node.w);
                element.setAttribute('data-fg-h', node.h);
                element.style.cssText += (';transform: translate(' + (node.x * opt.cellW_Int) + 'px,'
                + (node.y * opt.cellH_Int) + 'px);'
                + 'width: ' + (node.w * opt.cellW_Int - opt.padding.left - opt.padding.right) + 'px;'
                + 'height: ' + (node.h * opt.cellH_Int - opt.padding.top - opt.padding.bottom) + 'px;');
            }
        },
        clear: function (container) {
            container.innerHTML = '';
        },
        remove: function (id) {
            var delElement = document.querySelector('div.' + GRID_ITEM + '[' + GRID_ITEM_DATA_ID + '="' + id + '"]');
            delElement && delElement.parentNode.removeChild(delElement);
        },
        render: function (data, elements, container, grid) {
            var i, len, node, element;
            if (isEmptyObject(elements)) {
                var fragment = document.createDocumentFragment();
                for (i = 0, len = data.length; i < len; i++) {
                    node = data[i];
                    if (node) {
                        element = elements[node.id] = this.create(grid, node)
                        fragment.appendChild(element);
                    }
                }
                container.appendChild(fragment);
            } else {
                for (i = 0, len = data.length; i < len; i++) {
                    node = data[i];
                    if (node) {
                        if (elements[node.id]) {
                            this.update(grid, elements[node.id], node)
                        } else {
                            element = elements[node.id] = this.create(grid, node)
                            container.appendChild(element);
                        }
                    }
                }
            }
        }
    };

    // 网格对象
    function Grid(options, container, originalData) {
        // 兼容多种配置情况
        if (Array.isArray(options) && originalData === undefined) {
            originalData = options;
            options = undefined;
        }
        this.init(options, container, originalData);
    }

    // 网格对象原型
    Grid.prototype = {
        constructor: Grid,
        init: function (options, container, originalData) {
            var opt = extend(setting, options);
            this.originalData = [];
            this.area = [];
            this.data = [];
            this.elements = {};
            this.opt = opt;
            this.opt.container = container;
            this.computeCellScale(opt);
            if (originalData) {
                this.setData(originalData)
            } else {
                var arr = view.dom2obj(container, this);
                if (arr && arr.length > 0) {
                    this.setData(arr);
                }
            }
            return this;
        },
        destroy: function () {
            this.originalData = null;
            this.opt = null;
            this.area = null;
            this.data = null;
            this.elements = null;
            return this;
        },
        clean: function() {
            this.originalData = [];
            this.area = [];
            this.data = [];
            this.elements = {};
            return this;
        },
        loadDom: function (isload) {
            if (isload === undefined || isload === true) {
                this.originalData = [];
                this.area = [];
                this.data = [];
                this.elements = {};
                var arr = view.dom2obj(this.opt.container, this);
                if (arr && arr.length > 0) {
                    this.setData(arr);
                }
            }
            return this;
        },
        load: function (isload) {
            if (isload === undefined || isload === true) {
                var self = this,
                    opt = this.opt,
                    area = this.area,
                    data = this.data,
                    elements = this.elements,
                    maxRowAndCol = this.getMaxRowAndCol(opt, data);
                view.setContainerAttr(opt.container, opt, opt.draggable, opt.draggable);
                // 重绘
                this.sortData(data)
                    .buildArea(area, maxRowAndCol.row, maxRowAndCol.col)
                    .putData(area, data)
                    .layout(area, data);
                view.render(data, elements, opt.container, this);
                asyncFun(function () {
                    self.opt.onLoad && self.opt.onLoad();
                });
            }
            return this;
        },
        resize: function (containerW, containerH) {
            var opt = this.opt,
                container = opt.container;
            this.computeCellScale(opt);
            this.load();
        },
        // 计算最小网格宽高
        computeCellScale: function (opt) {
            opt.containerW = opt.container.clientWidth;
            opt.containerH = opt.container.clientHeight;
            opt.cellW = opt.containerW / opt.col;
            opt.cellH = opt.cellW / opt.cellScale.w * opt.cellScale.h;
            opt.cellW_Int = Math.floor(opt.cellW);
            opt.cellH_Int = Math.floor(opt.cellH);
            return this;
        },
        // 设置数据
        setData: function (originalData, isload) {
            // 遍历原始数据
            if (originalData && Array.isArray(originalData)) {
                this.originalData = originalData;
                var opt = this.opt,
                    data = this.data = [];
                // 制作渲染数据
                originalData.forEach(function (node, idx) {
                    data[idx] = buildNode(node, idx, opt);
                });
                // 再刷新
                this.load(isload);
            }
            return this;
        },
        sortData: function (data) {
            data.sort(function (a, b) {
                var y = a.y - b.y
                return y === 0 ? a.x - b.x : y;
            });
            return this;
        },
        // 构建网格区域
        buildArea: function (area, row, col) {
            if (area && Array.isArray(area)) {
                for (var r = 0; r < row; r++) {
                    area[r] = new Array(col);
                }
            }
            return this;
        },
        // 将数据铺进网格布局
        putData: function (area, data) {
            var i, r, c, len, rlen, clen, node;
            for (i = 0, len = data.length; i < len; i++) {
                node = data[i];
                for (r = node.y, rlen = node.y + node.h; r < rlen; r++) {
                    for (c = node.x, clen = node.x + node.w; c < clen; c++) {
                        area[r][c] = node.id;
                    }
                }
            }
            return this;
        },
        // 取得区域中的最大行和列
        getMaxRowAndCol: function (opt, data) {
            var opt = opt || this.opt,
                data = data || this.data,
                i, n, len, max = {row: opt.row, col: opt.col};
            if (data && data.length > 0) {
                for (i = 0, len = data.length; i < len; i++) {
                    n = data[i];
                    if (n.y + n.h > max.row) {
                        max.row = n.y + n.h;
                    }
                    if (n.x + n.w > max.col) {
                        max.col = n.x + n.w;
                    }
                }
            }
            return max;
        },
        add: function (n, isload) {
            var node,
                self = this,
                opt = this.opt,
                area = this.area,
                data = this.data;
            if (n) {
                node = buildNode(n, (n.id || data.length), opt);
                this.checkIndexIsOutOf(area, node);
                this.overlap(data, node);
            } else {
                var node = buildNode(opt.autoAddCell, data.length, opt);
                node = this.addAutoNode(area, node);
            }
            data[data.length] = node;
            this.load(isload);
            asyncFun(function () {
                self.opt.onAddNode && self.opt.onAddNode(self.elements[node.id], node);
            })
            return node;
        },
        // 取得节点空位
        getVacant: function (w, h) {
            return this.addAutoNode(this.area, this.data, {x: 0, y: 0, w: w, h: h});
        },
        // 自动扫描空位添加节点
        addAutoNode: function (area, data, node) {
            if (data.length === 0) return node;
            var r, c, maxCol = area[0].length;
            for (r = 0; r < area.length; r = r + 1) {
                node.y = r;
                for (c = 0; c < area[0].length; c = c + 1) {
                    node.x = c;
                    if (node.x + node.w > maxCol) {
                        node.x = 0;
                    }
                    if (!this.collision(area, node))
                        return node;
                }
            }
            node.x = 0;  // area区域都占满了, 另起一行
            node.y = r;
            return node;
        },
        // 碰撞检测
        collision: function (area, node) {
            var r, c, rlen, clen;
            // 从左到右, 从上到下
            for (r = node.y, rlen = node.y + node.h; r < rlen; r++) {
                for (c = node.x, clen = node.x + node.w; c < clen; c++) {
                    if (area[r] && (area[r][c] || area[r][c] == 0)) {
                        return true;
                    }
                }
            }
            return false;
        },
        delete: function (id, isload) {
            var self = this,
                data = this.data,
                area = this.area,
                queryNode = this.query(id),
                index = queryNode.index,
                node = queryNode.node;
            var arr = data.splice(index, 1);
            view.remove(id);
            delete this.elements[id];
            this.replaceNodeInArea(area, node).load(isload);
            asyncFun(function () {
                self.opt.onDeleteNode && self.opt.onDeleteNode(self.elements[id], arr[0]);
            });
            return arr[0];
        },
        edit: function (n, isload) {
            var node = this.query(n.id).node;
            for (var k in n) {
                node[k] = n[k];
            }
            this.load(isload);
            return node;
        },
        query: function (id) {
            var data = this.data;
            for (var i = 0, len = data.length; i < len; i++) {
                if (data[i].id == id) {
                    return {
                        index: i,
                        node: data[i]
                    };
                }
            }
        },
        setDraggable: function (draggable) {
            var opt = this.opt;
            view.setContainerAttr(opt.container, opt, draggable, undefined);
            return this;
        },
        setResizable: function (resizable) {
            var opt = this.opt;
            view.setContainerAttr(opt.container, opt, undefined, resizable);
            return this;
        },
        // 检测脏数据
        checkIndexIsOutOf: function (area, node, isResize) {
            var row = area.length,
                col = (area[0] && area[0].length) || this.opt.col;
            // 数组下标越界检查
            node.x < 0 && (node.x = 0);
            node.y < 0 && (node.y = 0);
            if (isResize) {
                node.x + node.w > col && (node.w = col - node.x);
            } else {
                node.x + node.w > col && (node.x = col - node.w);
            }
            return this;
        },
        // 检测矩形碰撞
        checkHit: function (n, node) {
            var result = false;
            if ((n.x + n.w > node.x) && (n.x < node.x + node.w)) {
                if ((n.y + n.h > node.y) && (n.y < node.y + node.h)) {
                    result = true;
                }
            }
            return result;
        },
        // 节点重叠
        overlap: function (data, node, dx, dy, isResize) {
            var i, n, len,
                dx = dx || 0,
                dy = dy || 0,
                offsetNode = null,
                offsetUnderY = 0,
                offsetUpY = 0,
                isResize = isResize || false,
                checkHit = this.checkHit;
            // 向下, 向左, 向右插入节点
            if (!isResize) {
                for (i = 0, len = data.length; i < len; i++) {
                    n = data[i];
                    if (n !== node && checkHit(n, node)) {
                        var val = n.y + n.h - node.y;
                        if (val > offsetUnderY) {
                            offsetUnderY = val;
                            offsetNode = n;
                        }
                    }
                }
                if (offsetNode) {
                    // 判断插入点应该上移还是下移, 通过重叠点的中间值h/2来判断
                    var median = offsetNode.h / 2 < 1 ? 1 : Math.floor(offsetNode.h / 2);
                    // 计算差值, 与中间值比较, dy > 2 下移(2是优化, 防止平移上下震动), 拿y+h来和中间值比较
                    var difference = (dy >= 2 && dy >= dx) ? node.y + node.h - offsetNode.y : node.y - offsetNode.y;
                    // 大于中间值, 求出下面那部分截断的偏移量, 等于是怕上下顺序连续的块,会错过互换位置
                    if (difference >= median) {
                        node.y = node.y + offsetUnderY;
                    }
                }
            }
            // 向上插入节点
            for (i = 0, len = data.length; i < len; i++) {
                n = data[i];
                if (n !== node && checkHit(n, node)) {
                    var val = node.y - n.y;
                    offsetUpY = val > offsetUpY ? val : offsetUpY;
                }
            }
            // 重新计算y值
            for (i = 0, len = data.length; i < len; i++) {
                n = data[i];
                if (n !== node) {
                    if ((n.y < node.y && node.y < n.y + n.h) || node.y <= n.y) {
                        n.y = n.y + node.h + offsetUpY;
                    }
                }
            }
            return this;
        },
        // 流布局
        layout: function (area, data) {
            var i, len, r, node;
            // 原理: 遍历数据集, 碰撞检测, 修改node.y, 进行上移.
            for (i = 0, len = data.length; i < len; i++) {
                node = data[i];
                r = this.findEmptyLine(area, node);
                if (node.y > r) {
                    this.moveUp(area, node, r);
                }
            }
            return this;
        },
        // 寻找空行
        findEmptyLine: function (area, node) {
            var r, c, len, cell;
            // 扫描, 找到最接近顶部的空行是第几行
            for (r = node.y - 1; r >= 0; r--) {
                for (c = node.x, len = node.x + node.w; c < len; c++) {
                    cell = area[r][c];
                    if (cell || cell == 0) {
                        return r + 1;
                    }
                }
            }
            return 0;
        },
        // 上移
        moveUp: function (area, node, newRow) {
            this.replaceNodeInArea(area, node);
            var r, c, rlen, clen;
            node.y = newRow;
            for (r = node.y, rlen = node.y + node.h; r < rlen; r++)
                for (c = node.x, clen = node.x + node.w; c < clen; c++)
                    area[r][c] = node.id;
        },
        // 替换区域中的节点
        replaceNodeInArea: function (area, node, id) {
            var r, c, rlen, clen;
            for (r = node.y, rlen = node.y + node.h; r < rlen; r++)
                for (c = node.x, clen = node.x + node.w; c < clen; c++)
                    area[r] && (area[r][c] = id);
            return this;
        },
        clone: function (node) {
            var obj = {};
            for (var attr in node)
                if (node.hasOwnProperty(attr))
                    obj[attr] = node[attr];
            return obj;
        }
    };

    // 构建实例
    function instance(options, container, originalData) {
        // 初始化监听, 单例, 仅绑定一次
        handleEvent.init(true, document.body);
        // 判断容器
        if (!container)
            container = document.querySelector('.' + GRID_CONTAINER);
        else if (typeof jQuery === "object" && container instanceof jQuery)
            container = container[0];
        // 设置编号
        var index = GRID_CONTAINER + cache.count++;
        if (!container.getAttribute(GRID_CONTAINER_INDEX)) {
            container.setAttribute(GRID_CONTAINER_INDEX, index);
        }
        cache[index] = new Grid(options, container, originalData);
        return cache[index];
    }

    // 销毁实例
    function destroy(grid) {
        delete cache[grid.opt.container.getAttribute(GRID_CONTAINER_INDEX)];
        grid.destroy();
        grid = null;
    }

    flowgrid = {
        version: "1.0.5",
        instance: instance,
        destroy: destroy
    };

    return flowgrid;
});
