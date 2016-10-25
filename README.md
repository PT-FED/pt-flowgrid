# pt-flowgrid
flowgrid.js is a plugin for widget layout, 一个轻量简单的网格流布局插件

### DEMO地址

[https://pt-fed.github.io/pt-flowgrid/](https://pt-fed.github.io/pt-flowgrid/)

### 先上图,再逼逼
  
  ![github](https://github.com/PT-FED/pt-flowgrid/blob/master/doc/demo_small_1.gif?raw=true "demo")
  ![github](https://github.com/PT-FED/pt-flowgrid/blob/master/doc/demo_small_2.gif?raw=true "demo")

### 简介
那我开始逼逼了哈, 引用的插件[gridstack](https://github.com/troolee/gridstack.js)满足不了我们产品的需求, 那就自己写个吧, 一写就是小一个月.

### 实现原理
其实里面就是一个二维数组的网格布局, 数字就是一个个小块, 然后碰撞检测, 上移.


		0	0	3	3	-	6	6	9	9	12	12	- 

		0	0	3	3	-	6	6	9	9	12	12	-

		-	-	2	2	2	5	5	8	8	11	11	-
  
	 	-	-	1	1	-	5	5	8	8	11	11	-
  
	 	-	-	1	1	-	4	4	7	7	10	10	-
  
	 	-	-	1	1	-	4	4	7	7	10	10	-

	 	-	-	-	-	-	-	-	-	-	-	-	-

	 	-	-	-	-	-	-	-	-	-	-	-	-

   ![github](https://github.com/PT-FED/pt-flowgrid/blob/master/doc/demo.png?raw=true "demo")

### 设计思路
这个插件的设计原则就是: 就是不依赖任何框架和库, 只和css打交道. 不拆散源码, 提供一个完整的源文件, 扔哪都能用.

### 优点

  	(1) 节点块的top,left使用translate()来计算模拟, 提高了FPS, 可以顺畅60FPS
  	(2) 优化了节点块上下的拖拽位移算法, 上下拖拽换位操作更顺滑.
  	(3) 轻量没有依赖, js源码1000行左右, css150行左右, 小家碧玉
  	(4) 支持require, sea, commonjs
  	(5) 样式修改简单容易

### 缺点

	(1) 不支持多个面板之间的拖拽
	(2) 节点块上下左右四个角四个边的拖拽

### 基础实例

		<!DOCTYPE html>
		<html>
		    <head>
		      <meta charset="UTF-8">
		      <title></title>
		      <script type="text/javascript" src="flowgrid.css"></script>
		    </head>
		    <body>
		      	<!-- 外层容器 -->
	    		<div class="pt-flowgrid-container">
		            <!-- 节点块 -->
		            <div class="pt-flowgrid-item" data-fg-x="0" data-fg-y="0" data-fg-w="4" data-fg-h="2">
		                <!-- 内容区, 摆放展示内容 -->
		                <div class="pt-flowgrid-item-content">1</div>
		                <!-- 放大缩小句柄, 隐藏或删除则不能放大缩小 -->
		                <div class="pt-flowgrid-item-zoom"></div>
		            </div>
	    		</div>
		      <script type="text/javascript" src="flowgrid.js"></script>
		      <script type="text/javascript">
		      		// 初始化方式一
		        	var grid = flowgrid.instance();
		        	// 初始化方式二
		        	// var grid = flowgrid.instance({各种配置});
		        	// 初始化方式三
		        	// var grid = flowgrid.instance({各种配置}, 外层容器dom对象);
		        	// 初始化方式四
		        	// var grid = flowgrid.instance({各种配置}, 外层容器dom对象, [原始数据,格式:{x,y,w,h}]);
		      </script>
		    </body>
		</html>  

### 配置说明

		<script type="text/javascript">
      		// 配置参数
      		var options = {
      			row: 7,                                            // 网格布局的默认行,默认7行
		        col: 12,                                           // 网格布局的默认列,默认12列
		        distance: 10,                                      // 触发拖拽的拖拽距离,默认10px
		        draggable: true,                                   // 是否允许拖拽, 默认允许
		        resizable: true,                                   // 是否允许缩放, 默认允许
		        isDragBar: false,                                  // 是否启用拖拽句柄, 默认不启明
		        nodeMinW: 2,                                       // 节点块的最小宽度, 默认占2格
		        nodeMinH: 2,                                       // 节点块的最小高度, 默认占2格
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
		        // 回调函数, 开始拖拽
		        onDragStart: function(event, element, node) {
		        	// event 	事件对象
		        	// element 	节点块的dom对象
		        	// node  	节点块的数据对象
		        },
                // 回调函数, 结束拖拽
                onDragEnd: function(event, element, node) {},
                // 回调函数, 开始缩放
                onResizeStart: function(event, element, node) {},
                // 回调函数, 结束拖拽
                onResizeEnd: function(event, element, node) {},
                // 回调函数, 添加节点
                onAddNode: function(element, node) {},
                // 回调函数, 删除节点
                onDeleteNode: function(element, node) {},
                // 回调函数, 重新加载
                onLoad: function() {}
      		};
      		// 初始化
        	var grid = flowgrid.instance(options);
      </script>

### API

	使用方法
		//取得flowgrid对象, 点出api方法即可
		var grid = flowgrid.instance({..各种基础配置..}, undefined, [格式:{x,y,w,h}])
		grid.area; // 取得布局网格二维数组
		grid.data; // 取得所有渲染数据
		

### flowgrid对象的属性和方法
<table>
	<thead>
		<tr><td>名称</td><td>类型</td><td>描述</td></tr>
	</thead>
	<tbody>
		<tr><td>version</td><td>属性</td><td>版本</td></tr>
		<tr><td>instance</td><td>方法</td><td>构建实例</td></tr>
		<tr><td>destroy</td><td>方法</td><td>销毁实例</td></tr>
	</tbody>
</table>

### flowgrid实例的属性和方法
<table>
	<thead>
		<tr><td>属性名</td><td>描述</td></tr>
	</thead>
	<tbody>
		<tr><td>opt</td><td>配置对象</td></tr>
		<tr><td>opt.container</td><td>外层容器的dom对象</td></tr>
		<tr><td>elements</td><td>节点块的dom集合对象</td></tr>
		<tr><td>area</td><td>网格布局的二维数据</td></tr>
		<tr><td>data</td><td>渲染数据数组</td></tr>
		<tr><td>originalData</td><td>原始数据数组(不会修改)</td></tr>
	</tbody>
</table>

<table>
	<thead>
		<tr><td>方法名</td><td>描述</td><td>参数</td><td>返回值</td></tr>
	</thead>
	<tbody>
		<tr>
			<td>init(opt, container, originalData)</td>
			<td>初始化</td>
			<td>
				参数1: 配置对象<br/>
				参数2: 外层容器dom<br/>
				参数3: 原始数据数组, <br/>格式:{x,y,w,h}
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>destroy()</td>
			<td>注销</td>
			<td>
				无参
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>loadDom(isload)</td>
			<td>重新绘制画布,<br/>遍历dom节点进行渲染</td>
			<td>
				参数1: 是否刷新
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>load(isload)</td>
			<td>重新绘制画布,<br/>遍历渲染数据,进行重绘</td>
			<td>
				参数1: 是否刷新
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>computeCellScale(opt)</td>
			<td>
				计算最小网格宽高
			</td>
			<td>
				参数1: 配置对象
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>setData(originalData, isload)</td>
			<td>设置数据</td>
			<td>
				参数1: 原始数据<br/>
				参数2: 是否刷新
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>sortData(data)</td>
			<td>渲染数据排序</td>
			<td>
				参数1: <br/>渲染数据
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>buildArea(area, row, col)</td>
			<td>构建网格区域</td>
			<td>
				参数1: 网格布局二维数组<br/>
				参数2: 行<br/>
				参数3: 列
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>putData(area, data)</td>
			<td>将数据铺进网格布局</td>
			<td>
				参数1: 网格布局二维数组<br/>
				参数2: 渲染数据
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>getMaxRowAndCol(opt, data)</td>
			<td>取得区域中的最大行和列</td>
			<td>
				参数1: 配置对象<br/>
				参数2: 渲染数据
			</td>
			<td>{row,col}</td>
		</tr>
		<tr>
			<td>add(n, isload)</td>
			<td>添加节点</td>
			<td>
				参数1: 节点数据<br/>
				参数2: 是否刷新
			</td>
			<td>新增节点对象</td>
		</tr>
		<tr>
			<td>getVacant(w, h)</td>
			<td>计算网格的空位,<br/>用于节点x,y赋值</td>
			<td>
				参数1: 节点宽<br/>
				参数2: 节点高
			</td>
			<td>节点对象</td>
		</tr>
		<tr>
			<td>addAutoNode(area, node)</td>
			<td>自动扫描空位添加节点</td>
			<td>
				参数1:<br/>网格布局二维数组<br/>
				参数2: 节点对象
			</td>
			<td>传入节点对象</td>
		</tr>
		<tr>
			<td>collision(area, node)</td>
			<td>碰撞检测</td>
			<td>
				参数1:<br/>网格布局二维数组<br/>
				参数2: 节点对象
			</td>
			<td>true碰撞, false未碰撞</td>
		</tr>
		<tr>
			<td>delete(id, isload)</td>
			<td>删除节点</td>
			<td>
				参数1: 节点id<br/>
				参数2: 是否刷新
			</td>
			<td>被删除节点对象</td>
		</tr>
		<tr>
			<td>edit(n, isload)</td>
			<td>编辑节点</td>
			<td>
				参数1: 节点对象<br/>
				参数2: 是否刷新
			</td>
			<td>被编辑节点</td>
		</tr>
		<tr>
			<td>query(id)</td>
			<td>查询节点</td>
			<td>
				参数1: 节点id
			</td>
			<td>{index,node}</td>
		</tr>
		<tr>
			<td>setDraggable(draggable)</td>
			<td>设置是否可以拖拽</td>
			<td>
				参数1: 拖拽状态true,false<br/>
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>setResizable(resizable)</td>
			<td>设置是否可以缩放</td>
			<td>
				参数1: 缩放状态true,false<br/>
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>checkIndexIsOutOf(area, node)</td>
			<td>检测脏数据,下标越界</td>
			<td>
				参数1:<br/>网格布局二维数组<br/>
				参数2: 节点对象
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>checkHit(n, node)</td>
			<td>矩形碰撞检测</td>
			<td>
				参数1: 节点对象1 <br/>
				参数2: 节点对象2
			</td>
			<td>true碰撞, false未碰撞</td>
		</tr>
		<tr>
			<td>overlap(data, node, dx, dy, isResize)</td>
			<td>节点重叠,插入节点关键算法</td>
			<td>
				参数1:  渲染数据 <br/>
				参数2:  节点对象 <br/>
				参数3:  x轴偏移 <br/>
				参数4:  y轴偏移 <br/>
				参数5:  是否缩放
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>layout(area, data)</td>
			<td>流布局算法</td>
			<td>
				参数1: <br/>网格布局二维数组 <br/>
				参数2: 渲染数据
			</td>
			<td>this</td>
		</tr>
		<tr>
			<td>findEmptyLine(area, node)</td>
			<td>寻找空行</td>
			<td>
				参数1: <br/>网格布局二维数组 <br/>
				参数2: 节点对象
			</td>
			<td>找到最接近顶部的空行号</td>
		</tr>
		<tr>
			<td>moveUp(area, node, newRow)</td>
			<td>上移</td>
			<td>
				参数1: <br/>网格布局二维数组 <br/>
				参数2: 节点对象<br/>
				参数3: <br/>新行,给node.y赋值
			</td>
			<td>无</td>
		</tr>
		<tr>
			<td>clearNodeInArea(area, node)</td>
			<td>清除区域中的节点</td>
			<td>
				参数1: <br/>网格布局二维数组 <br/>
				参数2: 节点对象
			</td>
			<td>无</td>
		</tr>
		<tr>
			<td>clone(node)</td>
			<td>克隆节点</td>
			<td>
				参数1: 节点对象
			</td>
			<td>克隆节点对象</td>
		</tr>
	</tbody>
</table>
  
### 版权
  MIT
