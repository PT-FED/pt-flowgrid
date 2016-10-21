'use strict';
/**
 * Copyright (c) 2016 tm-roamer
 * https://github.com/PT-FED/pt-flowgrid
 * version: 1.0.1
 * 描述: 可拖拽流式布局
 * 原则和思路:  不依赖任何框架和类库, 通过指定classname进行配置, 实现view层的拖拽, 只和css打交道.
 * 兼容性: ie11+
 * 支持: requirejs和commonjs和seajs, 
 */
(function (parent, fun) {
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
    var THROTTLE_TIME = 12;                                // 节流函数的间隔时间单位ms, FPS = 1000 / THROTTLE_TIME
    var MEDIA_QUERY_SMALL = 768;                           // 分辨率768px
    var MEDIA_QUERY_MID = 992;                             // 分辨率992px
    var MEDIA_QUERY_BIG = 1200;                            // 分辨率1200px
    var GRID_ITEM = 'pt-flowgrid-item';                    // 拖拽块classname
    var GRID_ITEM_ZOOM = 'pt-flowgrid-item-zoom';          // 拖拽块内部放大缩小div的classname
    var GRID_ITEM_DRAG = 'pt-flowgrid-item-drag';          // 拖拽块可以进行拖拽div的classname
    var GRID_ITEM_CONTENT = 'pf-flowgrid-item-content';    // 拖拽块的展示内容区div的classname
    var GRID_ITEM_DRAG_SVG = 'pt-flowgrid-item-drag-svg';  // 拖拽块可以进行拖拽div里面svg的classname
    var GRID_ITEM_ANIMATE = 'pt-flowgrid-item-animate';    // 拖拽块classname 动画效果
    var GRID_ITEM_GRAG_DROP = 'pt-flowgrid-item-dragdrop'; // 正在拖拽的块classname
    var GRID_ITEM_PLACEHOLDER = 'pt-flowgrid-item-placeholder'  // 拖拽块的占位符
    var GRID_ITEM_DATA_ID = 'data-fg-id';                  // 拖拽块的数据标识id
    var GRID_CONTAINER = 'pt-flowgrid-container';          // 拖拽容器classname
    var GRID_CONTAINER_INDEX = 'data-container-index';     // 拖拽容器编号
    var PLACEHOLDER = 'placeholder';                       // 占位符

    // 网格对象的缓存对象
    var cache = {
        count: 0
    };

    // 默认设置
    var setting = {
        row: 7,
        col: 12,
        cellMinW: 2,
        cellMinH: 2,
        container: null,
        draggable: true, 
        resizable: true,
        isDragBar: false,
        padding: {
            top: 5,
            left: 5,
            right: 5,
            bottom: 5   
        },
        cellScale: {
            w: 16,
            h: 9
        },
        autoAddCell: {
            x: 0,
            y: 0,
            w: 2,
            h: 2
        },
        onDragStart:function(){},
        onDragEnd:function(){},
        onResizeStart:function(){},
        onResizeEnd:function(){},
        onAddNode:function(){},
        onDeleteNode:function(){},
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
        for(var i in obj) {
            return false;
        }
        return true;
    }

    // 节流函数
    function throttle(now) {
        var time = new Date().getTime();
        throttle = function(now) {
            if ( now - time > THROTTLE_TIME ) {
                time = now;
                return true;
            }
            return false;
        };
        throttle(now);
    }

    // 异步执行回调
    function asyncFun(ck) {
        setTimeout(function() {
            ck && typeof ck === 'function' && ck();
        }, 0);
    }

    // 构建节点
    function buildNode(n, id, opt) {
        var node = {
            id: n.id || id,
            x: n.x,
            y: n.y,
            w: n.w,
            h: n.h,
            minW: n.minW || opt.cellMinW,
            minH: n.minH || opt.cellMinH,
        };
        return node;
    }

    // 事件处理对象
    var handleEvent = {
        init: function(isbind, body) {
            if (this.isbind) return;
            this.isbind = isbind;
            this.body = body;
            this.unbindEvent();
            this.bindEvent();
        },
        // 绑定监听
        bindEvent: function() {
            document.addEventListener('mousedown', this.mousedown , false);
            document.addEventListener('mousemove', this.mousemove, false);
            document.addEventListener('mouseup', this.mouseup, false);
            this.isbind = true;
        },
        // 移除监听
        unbindEvent: function() {
            document.removeEventListener('mousedown', this.mousedown, false);
            document.removeEventListener('mousemove', this.mousemove, false);
            document.removeEventListener('mouseup', this.mouseup, false);
            this.isbind = false;
        },
        mousedown: function(event) {
            var node = view.searchUp(event.target, GRID_ITEM)
            if (node) {
                dragdrop.dragstart(event, node);
                var isResize = dragdrop.isResize;
                var grid = dragdrop.grid;
                if (grid.opt.draggable) {
                    asyncFun(function() {
                        isResize ? grid.opt.onResizeStart && grid.opt.onResizeStart(event, dragdrop.dragElement, dragdrop.dragNode) 
                        : grid.opt.onDragStart && grid.opt.onDragStart(event, dragdrop.dragElement, dragdrop.dragNode);    
                    })
                }
            }
        },
        mousemove: function (event) {
            if (dragdrop.isDrag) {
                throttle(new Date().getTime()) && dragdrop.drag(event);
            }
        },
        mouseup: function (event) {
            // console.log(dragdrop.isResize, dragdrop.isDrag);
            if (dragdrop.isDrag) {
                var isResize = dragdrop.isResize;
                var grid = dragdrop.grid;
                asyncFun(function() {
                    isResize ? grid.opt.onResizeEnd && grid.opt.onResizeEnd(event, dragdrop.dragElement, dragdrop.dragNode) 
                        : grid.opt.onDragEnd && grid.opt.onDragEnd(event, dragdrop.dragElement, dragdrop.dragNode);
                });
                dragdrop.dragend(event);
            }
        },
        mousewheel: function(event) {},
        mouseout: function (event) {},
        mouseover: function (event) {}
    };

    // 拖拽对象
    var dragdrop = {
        isDrag: false,              // 是否正在拖拽
        isResize: false,            // 是否放大缩小
        dragNode: {                 // 拖拽节点的的关联数据
            id: undefined,          // 拖拽节点的id
            data: null,             // 占位符节点的关联数据
        },
        dragElement: null,          // 拖拽的dom节点
        dragstart: function(event, node) {
            var className = event.target.className;
            // 取得容器和网格对象
            var container = view.searchUp(node, GRID_CONTAINER);
            this.grid = cache[container.getAttribute(GRID_CONTAINER_INDEX)];
            // 配置项, 禁用拖拽
            if (!grid.opt.draggable) return;
            // 判断是否拖拽
            if (className && className.split(" ").indexOf(GRID_ITEM_DRAG) === -1) {
                // 判断是否放大缩小
                if (className.split(" ").indexOf(GRID_ITEM_ZOOM) !== -1) {
                    this.isResize = true;
                } else {
                    // 如果有拖拽句柄的设置, 但没有选中, 则return
                    if (this.grid.opt.isDragBar) return;
                }
            }
            this.isDrag = true;
            this.dragElement = node;
            // 取得当前拖拽节点, 并替换当前拖拽节点id
            var query = this.grid.query(node.getAttribute(GRID_ITEM_DATA_ID));
            if (query) {
                this.dragElement.className = GRID_ITEM + ' ' + GRID_ITEM_GRAG_DROP;
                this.dragNode.id = query.node.id;
                this.dragNode.data = query.node;
                this.dragNode.data.id = PLACEHOLDER;
                // 新增占位符
                var element = this.grid.elements[this.dragNode.data.id] = view.create(this.grid, this.dragNode.data);
                this.grid.opt.container.appendChild(element);
            }
        },
        drag: function(event) {
            var self = this;
            if(!self.dragNode.data) return;
            var opt = self.grid.opt;
            // 计算坐标
            self.prevX || (self.prevX = event.pageX);
            self.prevY || (self.prevY = event.pageY);
            // 保存坐标
            self.currentX = event.pageX;
            self.currentY = event.pageY;
            // 计算位移
            var dx = self.currentX - self.prevX;
            var dy = self.currentY - self.prevY;
            // 触发机制 (优化, 减少触发次数)
            // console.log('dx='+dx+',dy='+dy);
            if ( (-2 < dx && dx < 2) && (-2 < dy && dy < 2) ) return;
            // 当前坐标变成上一次的坐标
            self.prevX = self.currentX;
            self.prevY = self.currentY;
            // 判断是不是放大缩小
            if (this.isResize) {
                this.resize(event, opt, dx, dy);
            } else {
                this.changeLocation(event, opt, dx, dy);
            }
        },
        changeLocation: function(event, opt, dx, dy) {
            var cellW_Int = opt.cellW_Int,
                cellH_Int = opt.cellH_Int;
            // 相对父元素的坐标x,y
            var translate = this.dragElement.style.transform;
            var value = translate.replace(/translate.*\(/ig, '').replace(/\).*$/ig, '').replace(/px/ig, '').split(',');
            var translateX = value[0]*1;
            var translateY = value[1]*1;
            // 计算坐标
            this.dragElement.style.cssText += ';transform: translate(' + (translateX + dx) + 'px,' + (translateY + dy) + 'px);';
            // 当前拖拽节点的坐标, 转换成对齐网格的坐标
            var nodeX = Math.round(translateX / cellW_Int);
            var nodeY = Math.round(translateY / cellH_Int);
            // 判断坐标是否变化
            if (this.dragNode.data.x !== nodeX || this.dragNode.data.y !== nodeY) {
                this.grid.clearNodeInArea(this.grid.area, this.dragNode.data);
                this.dragNode.data.x = nodeX;
                this.dragNode.data.y = nodeY;
                // this.scroll(this.dragNode.data); // 滚动条跟随
                this.grid.checkIndexIsOutOf(this.grid.area, this.dragNode.data);
                this.grid.overlap(this.grid.data, this.dragNode.data, dx, dy, this.isResize);
                this.grid.load();
            }
        },
        resize: function(event, opt, dx, dy) {
            var eleW = this.dragElement.clientWidth + dx,
                eleH = this.dragElement.clientHeight + dy,
                minW = opt.cellW_Int * this.dragNode.data.minW - opt.padding.left - opt.padding.right,
                minH = opt.cellH_Int * this.dragNode.data.minH - opt.padding.top - opt.padding.bottom,
                nodeW = Math.ceil(eleW / opt.cellW_Int),
                nodeH = Math.ceil(eleH / opt.cellH_Int);
            // 计算最小尺寸
            eleW < minW && (eleW = minW*0.9);
            eleH < minH && (eleH = minH*0.9);
            // 设置宽高
            this.dragElement.style.cssText += ';width: ' + eleW + 'px; height: ' + eleH + 'px;';
            // 判断宽高是否变化
            if (this.dragNode.data.w !== nodeW || this.dragNode.data.h !== nodeH) {
                //this.scroll(this.dragNode.data); // 滚动条跟随
                this.grid.clearNodeInArea(this.grid.area, this.dragNode.data);
                this.dragNode.data.w = nodeW;
                this.dragNode.data.h = nodeH;
                this.grid.checkIndexIsOutOf(this.grid.area, this.dragNode.data);
                this.grid.overlap(grid.data, this.dragNode.data, dx, dy, this.isResize);
                this.grid.load();
            }
        },
        dragend: function(event) {
            if(!this.dragNode.data) return;
            this.dragNode.data.id = this.dragNode.id;
            // 替换占位符
            view.update(this.grid, this.grid.elements[this.dragNode.data.id], this.dragNode.data);
            // 清理临时样式(结束拖拽)
            this.dragElement.className = GRID_ITEM + ' ' + GRID_ITEM_ANIMATE;
            // 清理临时变量
            this.isDrag = false;
            this.isResize = false;
            this.dragNode.id = undefined;
            this.dragNode.data = null;
            // 清理临时坐标
            this.prevX = undefined;
            this.prevY = undefined;
            this.currentX = undefined;
            this.currentY = undefined;
            // 移除临时dom(占位符)
            view.remove(PLACEHOLDER);
            delete this.grid.elements[PLACEHOLDER];
            // 重新计算容器高度
            var opt = this.grid.opt,
                maxRowAndCol = this.grid.maxRowAndCol;
            view.setContainerProperty(opt.container, maxRowAndCol.col * opt.cellW, 
                    maxRowAndCol.row * opt.cellH,
                    opt.draggable, opt.resizable);
        },
        scroll: function(dragNode) {
            var opt = this.grid.opt,
                cellH = opt.cellH,
                y = (dragNode.y + dragNode.h) * cellH,
                height = document.body.clientHeight;
            if ( y >= height ) {
                document.body.scrollTop = document.body.scrollHeight;
                document.documentElement.scrollTop = document.documentElement.scrollHeight;
            }
            console.log(height, y);
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
                        x: ele.getAttribute('data-fg-x')*1,
                        y: ele.getAttribute('data-fg-y')*1,
                        w: ele.getAttribute('data-fg-w')*1,
                        h: ele.getAttribute('data-fg-h')*1,
                        minW: ele.getAttribute('data-fg-min-w')*1,
                        minH: ele.getAttribute('data-fg-min-h')*1
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
        setContainerProperty: function(container, width, height, draggable, resizable) {
            if (container) {
                container.setAttribute('data-fg-draggable', draggable);
                container.setAttribute('data-fg-resizable', resizable);
                container.style.cssText += ";width:"+width+'px;'+'height:'+height+'px;';
            }
        },
        searchUp: function(node, type) {
            if (node === handleEvent.body || node === document) return undefined;   // 向上递归到body就停
            var arr = node.className.split(' ');
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === type) {
                    return node;
                }
            }
            return this.searchUp(node.parentNode, type);
        },
        create: function(grid, node, className) {
            var item = document.createElement("div"),
                zoom = document.createElement("div"),
                content = document.createElement("div");
            // 是否配置了拖拽句柄
            if (grid.opt.isDragBar) {
                var drag = document.createElement("div");
                drag.className = GRID_ITEM_DRAG;
                drag.innerHTML = '<svg class="'+GRID_ITEM_DRAG_SVG+'" viewBox="0 0 200 200"'
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
        update: function(grid, element, node, className) {
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
                    + 'width: ' + (node.w * opt.cellW_Int - opt.padding.left - opt.padding.right)  + 'px;'
                    + 'height: ' + (node.h * opt.cellH_Int - opt.padding.top - opt.padding.bottom) + 'px;');    
            }
        },
        clear: function(container) {
            container.innerHTML = '';
        },
        remove: function(id) {
            var delElement = document.querySelector('div.'+GRID_ITEM+'['+GRID_ITEM_DATA_ID+'="'+id+'"]');
            delElement && delElement.parentNode.removeChild(delElement);
        },
        render: function(data, elements, container, grid) {
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
        this.init(extend(setting, options), container, originalData);
    }

    // 网格对象原型
    Grid.prototype = {
        constructor: Grid,
        init: function(opt, container, originalData) {
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
                    // view.render(this.data, this.elements, container, this);
                }
            }
            return this;
        },
        load: function(isload) {
            if (isload === undefined || isload === true) {
                var opt = this.opt,
                    area = this.area, 
                    data = this.data,
                    elements = this.elements;
                this.maxRowAndCol = this.getMaxRowAndCol(opt, data);
                this.sortData(data)
                    .buildArea(area, this.maxRowAndCol.row, this.maxRowAndCol.col)
                    .putData(area, data)
                    .layout(area, data);
                view.setContainerProperty(opt.container, this.maxRowAndCol.col * opt.cellW, 
                    this.maxRowAndCol.row * opt.cellH,
                    opt.draggable, opt.resizable);
                view.render(data, elements, opt.container, this);
            }
            return this;
        },
        // 计算最小网格宽高
        computeCellScale: function(opt) {
            opt.containerW = opt.container.clientWidth;
            opt.containerH = opt.container.clientHeight;
            opt.cellW = opt.containerW / opt.col;
            opt.cellH = opt.cellW / opt.cellScale.w * opt.cellScale.h; 
            opt.cellW_Int = Math.floor(opt.cellW);
            opt.cellH_Int = Math.floor(opt.cellH);
            return this;
        },
        // 初始化数据
        setData: function(originalData, isload) {
            // 遍历原始数据
            if (originalData && Array.isArray(originalData)) {
                this.originalData = originalData;
                var opt = this.opt,
                    data = this.data = [];
                // 制作渲染数据
                originalData.forEach(function(node, idx) {
                    data[idx] = buildNode(node, idx, opt);
                });
                // 再刷新
                this.load(isload);
            }
            return this;
        },
        sortData: function(data) {
            data.sort(function(a, b) {
                var y = a.y - b.y
                return y === 0 ? a.x - b.x : y;
            });
            return this;  
        },
        // 构建网格区域
        buildArea: function(area, row, col) {
            if (area && Array.isArray(area) ) {
                for (var r = 0; r < row; r++) {
                    area[r] = new Array(col);
                }
            }
            return this;
        },
        // 铺数据
        putData: function(area, data) {
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
        getMaxRowAndCol: function(opt, data) {
            var i, n, len, max = {row: opt.row, col: opt.col};
            if (data && data.length > 1) {
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
        add: function(n, isload) {
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
                node = this.addAutoNode(data, area, opt);
            }
            data[data.length] = node;
            this.load(isload);
            asyncFun(function(){
                self.opt.onAddNode && self.opt.onAddNode(self.elements[node.id], node);    
            })
            return node;
        },
        // 自动扫描空位添加节点
        addAutoNode: function(data, area, opt) {
            var r, c, node = buildNode(opt.autoAddCell, data.length, opt);
            for (r = 0; r < area.length; r = r + node.h ) {
                node.y = r;
                for (c = 0; c < area[0].length; c = c + node.w ) {
                    node.x = c;
                    if (!this.collision(area, node))
                        return node;
                }
            }
            node.x = 0;  // area区域都占满了, 另起一行
            node.y = r;
            return node;
        },
        // 碰撞检测
        collision: function(area, node) {
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
        delete: function(id, isload) {
            var self = this,
                data = this.data,
                index = this.query(id).index,
                arr = data.splice(index, 1);
            view.remove(id);
            delete this.elements[id];
            this.load(isload);
            asyncFun(function(){
                self.opt.onDeleteNode && self.opt.onDeleteNode(self.elements[id], arr[0]);
            });
        },
        edit: function(n, isload) {
            var node = this.query(n.id).node;
            for(var k in n) {
                node[k] = n[k];
            }
            this.load(isload);
            return node;
        },
        query: function(id) {
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
        setDraggable : function(draggable) {
            if (typeof draggable !== 'undefined') {
                var opt = this.opt,
                maxRowAndCol = this.maxRowAndCol;
                opt.draggable = !!draggable;
                view.setContainerProperty(opt.container, 
                    maxRowAndCol.col * opt.cellW, 
                    maxRowAndCol.row * opt.cellH,
                    opt.draggable, opt.resizable);
            }
            return this;
        },
        setResizable: function(resizable) {
            if (typeof resizable !== 'undefined') {
                var opt = this.opt,
                maxRowAndCol = this.maxRowAndCol;
                opt.resizable = !!resizable;
                view.setContainerProperty(opt.container, 
                    maxRowAndCol.col * opt.cellW, 
                    maxRowAndCol.row * opt.cellH,
                    opt.draggable, opt.resizable);
            }
            return this;
        },
        // 处理脏数据
        checkIndexIsOutOf: function(area, node) {
            var row = area.length,
                col = (area[0] && area[0].length) || this.opt.col;
            // 数组下标越界检查
            node.x < 0 && (node.x = 0);
            node.y < 0 && (node.y = 0);
            node.x + node.w > col && (node.x = col - node.w);
            return this;
        },
        // 检测矩形碰撞
        checkHit: function(n, node) {
            var result = false;
            if ( (n.x + n.w > node.x) && (n.x < node.x + node.w) ) {
                if ( (n.y + n.h > node.y) && (n.y < node.y + node.h) ) {
                    result = true;
                }
            }
            return result;
        },
        // 节点重叠
        overlap: function(data, node, dx, dy, isResize) {
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
                    if (n !== node && checkHit(n, node) ) {
                        var val = n.y + n.h - node.y;
                        if ( val > offsetUnderY ) {
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
                    if ( difference >= median ) {
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
                    if ( (n.y < node.y && node.y < n.y + n.h) || node.y <= n.y ) {
                        n.y = n.y + node.h + offsetUpY;
                    }
                }
            }
            return this;
        },
        // 流布局
        layout: function(area, data) {
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
        findEmptyLine: function(area, node) {
            var r, c, len, cell;
            // 扫描, 找到最接近顶部的空行是第几行
            for (r = node.y - 1; r >= 0; r--) {
                for (c = node.x, len = node.x + node.w; c < len; c++){
                    cell = area[r][c];
                    if (cell || cell == 0) {
                        return r+1;
                    }
                }
            }
            return 0;
        },
        // 上移
        moveUp: function(area, node, newRow) {
            // 清除区域中的节点
            this.clearNodeInArea(area, node);
            // 在刷进去
            var r, c, rlen, clen;
            node.y = newRow;
            for (r = node.y, rlen = node.y + node.h; r < rlen; r++)
                for (c = node.x, clen = node.x + node.w; c < clen; c++)
                    area[r][c] = node.id;
        },
        // 清除区域中的节点
        clearNodeInArea: function(area, node) {
            var r, c, rlen, clen;
            for (r = node.y, rlen = node.y + node.h; r < rlen; r++)
                for (c = node.x, clen = node.x + node.w; c < clen; c++)
                    area[r] && (area[r][c] = undefined);
        },
        clone: function(mod) {
            var obj = {};
            for(var attr in mod)
                if (mod.hasOwnProperty(attr)) 
                    obj[attr] = mod[attr];
            return obj;
        }
    };

    // 构建实例
    function instance(options, container, originalData) {
        // 初始化监听, 单例, 仅绑定一次
        handleEvent.init(true, document.body);
        // 判断容器
        if (!container)
            container = document.querySelector('.'+GRID_CONTAINER);
        else if (typeof jQuery === "object" && container instanceof jQuery)
            container = container[0];
        // 设置编号
        var index = GRID_CONTAINER + cache.count++;
        if (!container.getAttribute(GRID_CONTAINER_INDEX))
            container.setAttribute(GRID_CONTAINER_INDEX, index);
        return cache[index] = new Grid(options, container, originalData);;
    }

    flowgrid = {
        version: "1.0.2",
        instance: instance
    };

    return flowgrid;
})