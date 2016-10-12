(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var flowgrid = require('../../src/flowgrid');
var options = {};
var grid = flowgrid.instance(options);

},{"../../src/flowgrid":2}],2:[function(require,module,exports){
'use strict';
/**
 * Copyright (c) 2016 tm-roamer
 * https://github.com/PT-FED/pt-flowgrid
 * version: 1.0.1
 * 描述: 可拖拽流式布局
 * 原则和思路:  通过指定classname进行配置, 实现view层的拖拽, 与数据,业务,请求等都毫无关联. 最好只和css打交道.
 * 兼容性: ie9+
 * 说明: 与HTML5的原生拖拽毫无关系(兼容性差,顾不采用), 事件机制参考了HTML5原生拖拽事件名.
 * 支持: AMD和CMD, 
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
    var GRID_ITEM_INNER = 'pt-flowgrid-item-inner';        // 拖拽块内部区域div的classname
    var GRID_ITEM_ZOOM = 'pt-flowgrid-item-zoom';          // 拖拽块内部放大缩小div的classname
    var GRID_ITEM_ANIMATE = 'pt-flowgrid-item-animate';    // 拖拽块classname 动画效果
    var GRID_ITEM_GRAG_DROP = 'pt-flowgrid-item-dragdrop'; // 正在拖拽的块classname
    var GRID_ITEM_PLACEHOLDER = 'pt-flowgrid-item-placeholder'  // 拖拽块的占位符
    var GRID_ITEM_DATA_ID = 'data-fg-id';                  // 拖拽块的数据标识id
    var GRID_CONTAINER = 'pt-flowgrid-container';          // 拖拽容器classname
    var GRID_CONTAINER_INDEX = 'data-container-index';     // 拖拽容器编号
    var PLACEHOLDER = 'placeholder';                       // 占位符

    // 变量
    var THROTTLE_ID = undefined;                           // 节流函数的id
    var cache = {};                                        // 网格对象的缓存对象
    var grid = null;                                       // 当前缓存的网格对象

    // 默认设置
    var setting = {
        flow: true,
        row: 7,
        col: 12,
        cellminW: 4,
        cellminH: 4,
        cellScale: {
            w: 16,
            h: 9
        },
        autoAddCell: {
            x: 0,
            y: 0,
            w: 4,
            h: 4
        },
        container: null
    };

    // 属性拷贝
    function extend(mod, opt) {
        if (!opt) return mod;
        var conf = {};
        for (var attr in mod) {
            conf[attr] = opt[attr] || mod[attr];
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
            var body = this.body;
            body.addEventListener('mousedown', this.mousedown , false);
            body.addEventListener('mousemove', this.mousemove, false);
            // body.addEventListener('mouseout', this.mouseout, false);
            // body.addEventListener('mouseover', this.mouseover, false);
            body.addEventListener('mouseup', this.mouseup, false);
            this.isbind = true;
        },
        // 移除监听
        unbindEvent: function() {
            var body = this.body;
            body.removeEventListener('mousedown', this.mousedown, false);
            body.removeEventListener('mousemove', this.mousemove, false);
            // body.removeEventListener('mouseout', this.mouseout, false);
            // body.removeEventListener('mouseover', this.mouseover, false);
            body.removeEventListener('mouseup', this.mouseup, false);
            this.isbind = false;
        },
        mousedown: function(event) {
            var node = view.find(event.target, GRID_ITEM);
            if (node) {
                dragdrop.dragstart(event, node);
            }
        },
        mousemove: function (event) {
            if (dragdrop.isdrag) {
                throttle(new Date().getTime()) && dragdrop.drag(event);
            }
        },
        mouseup: function (event) {
            if (dragdrop.isdrag) {
                dragdrop.dragend(event);
            }
        },
        mouseout: function (event) {},
        mouseover: function (event) {}
    };

    // 拖拽对象
    var dragdrop = {
        isdrag: false,              // 是否正在拖拽
        iszoom: false,              // 是否放大缩小
        dragNode: {                 // 拖拽节点的的关联数据
            id: undefined,          // 拖拽节点的id
            data: null,             // 占位符节点的关联数据
        },
        dragElement: null,          // 拖拽的dom节点
        dragstart: function(event, node) {
            this.isdrag = true;
            this.dragElement = node;
            // 这句话不太好, 不严谨 ???
            if (event.target.className === GRID_ITEM_ZOOM) {
                this.iszoom = true;
            }
            // 取得容器和网格对象
            var container = view.find(node, GRID_CONTAINER);
            grid = cache[container.getAttribute(GRID_CONTAINER_INDEX)*1];
            // 取得当前拖拽节点, 并替换当前拖拽节点id
            var query = grid.query(node.getAttribute(GRID_ITEM_DATA_ID)*1);
            if (query) {
                this.dragElement.className = GRID_ITEM + ' ' + GRID_ITEM_GRAG_DROP;
                this.dragNode.id = query.node.id;
                this.dragNode.data = query.node;
                this.dragNode.data.id = PLACEHOLDER;
                // 新增占位符
                var element = grid.elements[this.dragNode.data.id] = view.create(this.dragNode.data)
                grid.opt.container.appendChild(element);
            }
        },
        drag: function(event) {
            var self = this;
            if(!self.dragNode.data) return;
            var opt = grid.opt;
            // 计算坐标
            self.prevX || (self.prevX = event.pageX);
            self.prevY || (self.prevY = event.pageY);
            // 保存坐标
            self.currentX = event.pageX;
            self.currentY = event.pageY;
            // 计算位移
            var dx = self.currentX - self.prevX;
            var dy = self.currentY - self.prevY;
            // 触发机制
            // console.log('dx='+dx+',dy='+dy);
            if ( (-2 < dx && dx < 2) && (-2 < dy && dy < 2) ) return;
            // 当前坐标变成上一次的坐标
            self.prevX = self.currentX;
            self.prevY = self.currentY;
            // 判断是不是放大缩小
            if (this.iszoom) {
                this.zoom(event, opt, dx, dy);
            } else {
                this.changeLocation(event, opt, dx, dy);
            }
        },
        changeLocation: function(event, opt, dx, dy) {
            var cellW_Int = opt.cellW_Int,
                cellH_Int = opt.cellH_Int;
            // 相对父元素的坐标x,y
            var translate = this.dragElement.style.transform;
            var value = translate.replace(/translate.*\(/ig, '').replace(/\).*$/ig, '').split(',');
            var translateX = parseInt(value[0]);
            var translateY = parseInt(value[1]);
            // 计算坐标
            this.dragElement.style.cssText += ';transform: translate(' + (translateX + dx) + 'px,' + (translateY + dy) + 'px);';
            // 当前拖拽节点的坐标, 转换成对齐网格的坐标
            var nodeX = Math.round(translateX / cellW_Int);
            var nodeY = Math.round(translateY / cellH_Int);
            // 判断坐标是否变化
            if (this.dragNode.data.x !== nodeX || this.dragNode.data.y !== nodeY) {
                
                grid.clearNodeInArea(grid.area, this.dragNode.data);
                this.dragNode.data.x = nodeX;
                this.dragNode.data.y = nodeY;
                
                grid.checkIndexIsOutOf(grid.area, this.dragNode.data);
                grid.overlap(grid.data, this.dragNode.data);
                grid.load();
            }
        },
        zoom: function(event, opt, dx, dy) {
            var eleW = this.dragElement.clientWidth + dx,
                eleH = this.dragElement.clientHeight + dy,
                minW = opt.cellW_Int * this.dragNode.data.minW,
                minH = opt.cellH_Int * this.dragNode.data.minH,
                nodeW = Math.round(eleW / opt.cellW_Int),
                nodeH = Math.round(eleH / opt.cellH_Int);
            // 计算最小尺寸
            eleW < minW && (eleW = minW);
            eleH < minH && (eleH = minH);
            // 设置宽高
            this.dragElement.style.cssText += ';width: ' + eleW + 'px; height: ' + eleH + 'px;';
            // 判断宽高是否变化
            if (this.dragNode.data.w !== nodeW || this.dragNode.data.h !== nodeH) {
                
                grid.clearNodeInArea(grid.area, this.dragNode.data);
                this.dragNode.data.w = nodeW;
                this.dragNode.data.h = nodeH;
                
                grid.checkIndexIsOutOf(grid.area, this.dragNode.data);
                grid.overlap(grid.data, this.dragNode.data);
                grid.load();
            }
        },
        dragend: function(event) {
            if(!this.dragNode.data) return;
            this.dragNode.data.id = this.dragNode.id;
            // 替换占位符
            view.update(grid.elements[this.dragNode.data.id], this.dragNode.data);
            // 清理临时样式(结束拖拽)
            this.dragElement.className = GRID_ITEM + ' ' + GRID_ITEM_ANIMATE;
            // 清理临时变量
            this.isdrag = false;
            this.iszoom = false;
            this.dragNode.id = undefined;
            this.dragNode.data = null;
            // 清理临时坐标
            this.prevX = undefined;
            this.prevY = undefined;
            this.currentX = undefined;
            this.currentY = undefined;
            // 移除临时dom(占位符)
            view.remove(PLACEHOLDER);
            delete grid.elements[PLACEHOLDER];
        }
    };

    // 展示对象, 操作dom
    var view = {
        // 转换初始化, 将初始dom转换成js对象
        dom2obj: function (container) {
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
                    grid.elements[i] = ele;
                }
            }
            return arr;
        },
        find: function(node, type) {
            if (node === handleEvent.body) return undefined;   // 向上递归到body就停
            var arr = node.className.split(' ');
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === type) {
                    return node;
                }
            }
            return this.find(node.parentNode, type);
        },
        create: function(node, className) {
            var item = document.createElement("div"),
                zoom = document.createElement("div"),
                inner = document.createElement("div");
            item.className = className ? className : (GRID_ITEM + ' ' + GRID_ITEM_ANIMATE);
            inner.className = GRID_ITEM_INNER;
            zoom.className = GRID_ITEM_ZOOM;
            inner.appendChild(zoom);
            item.appendChild(inner);
            this.update(item, node, className);
            return item;
        },
        update: function(element, node, className) {
            var opt = grid.opt;
            if (element) {
                element.className = className ? className : (GRID_ITEM + ' ' + GRID_ITEM_ANIMATE);
                element.setAttribute(GRID_ITEM_DATA_ID, node.id);
                element.setAttribute('data-fg-x', node.x);
                element.setAttribute('data-fg-y', node.y);
                element.setAttribute('data-fg-w', node.w);
                element.setAttribute('data-fg-h', node.h);
                // element.setAttribute('data-fg-min-w', node.minW);
                // element.setAttribute('data-fg-min-h', node.minH);
                element.style.cssText += (';transform: translate(' + (node.x * opt.cellW_Int) + 'px,'
                    + (node.y * opt.cellH_Int) + 'px);'
                    + 'width: ' + (node.w * opt.cellW_Int) + 'px;'
                    + 'height: ' + (node.h * opt.cellH_Int) + 'px;');    
            }
        },
        clear: function(container) {
            container.innerHTML = '';
        },
        remove: function(id) {
            var delElement = document.querySelector('div.'+GRID_ITEM+'['+GRID_ITEM_DATA_ID+'="'+id+'"]');
            delElement && delElement.parentNode.removeChild(delElement);
        },
        render: function(data, container) {
            var i, len, node, element;
            if (isEmptyObject(grid.elements)) {
                var fragment = document.createDocumentFragment();
                for (i = 0, len = data.length; i < len; i++) {
                    node = data[i];
                    if (node) { 
                        element = grid.elements[node.id] = this.create(node)
                        fragment.appendChild(element);
                    }
                }
                container.appendChild(fragment);
            } else {
                for (i = 0, len = data.length; i < len; i++) {
                    node = data[i];
                    if (node) {
                        if (grid.elements[node.id]) {
                            this.update(grid.elements[node.id], node)
                        } else {
                            element = grid.elements[node.id] = this.create(node)
                            container.appendChild(element);
                        }    
                    }
                }
            }
        }
    };

    // 网格对象
    function Grid(options, originalData, container) {
        // 兼容多种配置情况
        if (Array.isArray(options) && originalData === undefined) {
            originalData = options;
            options = undefined;
        }
        // 替换当前grid
        grid = this;
        this.init(extend(setting, options), originalData, container);
    }

    // 网格对象原型
    Grid.prototype = {
        constructor: Grid,
        init: function(opt, originalData, container) {
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
                var arr = view.dom2obj(container);
                this.setData(arr, false);
                view.render(this.data, container);
            }
            return this;
        },
        load: function(isload) {
            if (isload === undefined || isload === true) {
                var opt = this.opt,
                    area = this.area, 
                    data = this.data,
                    max = this.max(data);
                this.sortData(data)
                    .buildArea(area, (max.y + max.h), opt.col)
                    .putData(area, data)
                    .layout(area, data);
                view.render(data, opt.container);
            }
            return this;
        },
        // 计算最小网格, 根据 16: 9 计算得出高
        computeCellScale: function(opt) {
            opt.containerW = opt.container.scrollWidth;
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
                var data = this.data,
                    opt = this.opt;
                this.originalData = originalData;
                // 制作渲染数据
                originalData.forEach(function(node, idx) {
                    data[idx] = {
                        id: idx,
                        x: node.x,
                        y: node.y,
                        w: node.w,
                        h: node.h,
                        minW: node.minW || opt.cellminW,
                        minH: node.minH || opt.cellminH,
                    };
                });
                this.load(isload);
            }
            return this;
        },
        sortData: function(data) {
            data.sort(function(a, b) {
                return a.y - b.y;
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
        // 取得区域中的最大行
        max: function(data) {
            var i, n, len, max = data[0];
            if (data && data.length > 1) {
                for (i = 0, len = data.length; i < len; i++) {
                    n = data[i];
                    if (n.y + n.h > max.y + max.h) {
                        max = n;
                    }
                }
            }
            return max;
        },
        add: function(n, isload) {
            var node,
                area = this.area,
                data = this.data;
            if (n) {
                node = {
                    id: n.id || data.length,
                    x: n.x,
                    y: n.y,
                    w: n.w,
                    h: n.h,
                    minW: node.minW || opt.cellminW,
                    minH: node.minH || opt.cellminH,
                };
                this.checkIndexIsOutOf(area, node);
                this.overlap(data, node);
            } else {
                node = this.autoAdd(data, this.area, this.opt);
            }
            data[data.length] = node;
            this.load(isload);
            return node;
        },
        // 自动扫描空位节点
        autoAdd: function(data, area, opt) {
            var r, c, node = this.clone(opt.autoAddCell);
            node.id = data.length;
            for (r = 0; r < area.length; r = r + node.h ) {
                node.y = r;
                for (c = 0; c < area[0].length; c = c + node.w ) {
                    node.x = c;
                    if (!this.collision(area, node))
                        return node;
                }
            }
            // area区域都占满了, 另起一行
            node.x = 0; 
            node.y = r;
            return node;
        },
        // 碰撞检测
        collision: function(area, node) {
            var r, c, rlen, clen;
            // 从左到右, 从上到下
            for (r = node.y, rlen = node.y + node.h; r < rlen; r++) {
                for (c = node.x, clen = node.x + node.w; c < clen; c++) {
                    if (area[r] && (area[r][c] || area[r][c] === 0)) {
                        return true;
                    }
                }
            }
            return false;
        },
        del: function(id, isload) {
            var data = this.data,
                index = this.query(id).index;
            data.splice(index, 1);
            this.load(isload);
        },
        edit: function(n, isload) {
            var node = this.query(n.id).node;
            node.x = n.x;
            node.y = n.y;
            node.w = n.w;
            node.h = n.h;
            this.load(isload);
            return node;
        },
        query: function(id) {
            var data = this.data;
            for (var i = 0, len = data.length; i < len; i++) {
                if (data[i].id === id) {
                    return {
                        index: i,
                        node: data[i]
                    };
                }
            }
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
        // 节点重叠
        overlap: function(data, node) {
            var i, len, n, 
                cursor = node.y, 
                offset = 0, 
                isUp = true;
            // 找到重叠的点
            for (i = 0, len = data.length; i < len; i++) {
                n = data[i];
                if (n !== node) {
                    // 碰撞检测
                    if ( n.x <= node.x && node.x < n.x + n.w && n.y <= node.y && node.y < n.y + n.h ) {
                        // 判断插入点应该上移还是下移, 通过重叠点的中间值h/2来判断
                        var median = n.h / 2 < 1 ? 1 : Math.floor(n.h / 2);
                        // 计算差值, 与中间值比较
                        var difference = node.y - n.y;
                        // 大于中间值, 下移, 求出偏移量
                        if( difference >= median ) {
                            isUp = false;
                            offset = n.y + n.h - node.y;
                        }
                    }
                }
            }
            // 计算y值, 插入节点
            for (i = 0, len = data.length; i < len; i++) {
                n = data[i];
                if (n !== node) {
                    // 比较坐标, 比插入节点y值大的节点, 统一下移
                    if ( n.y >= cursor ) {
                        n.y = n.y + node.h + offset;
                    }
                    // 或 重叠的节点y值小于插入节点的情况, 下移
                    else if ( n.y + n.h > cursor ) {
                        isUp ? (n.y = cursor + node.h) : (node.y = n.y + n.h);
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
                    if (cell || cell === 0) {
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
    function instance(options, originalData) {
        // 初始化监听, 单例, 仅绑定一次
        handleEvent.init(true, document.body);
        // 初始化网格对象
        var containers = document.querySelectorAll('.'+GRID_CONTAINER);
        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];
            // 已经存在, 就不再初始化
            if (!container.getAttribute(GRID_CONTAINER_INDEX)) {
                container.setAttribute(GRID_CONTAINER_INDEX, i);
                var flowgrid = new Grid(options, originalData, container);
                cache[i] = flowgrid;
            }
        }
        // 默认返回第一个
        return (grid = cache[0]);
    }

    flowgrid = {
        version: "1.0.1",
        instance: instance
    };

    return flowgrid;
})
},{}]},{},[1]);
