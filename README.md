# pt-flowgrid
flowgrid.js is a plugin for widget layout, 一个轻量简单的网格流布局插件

### 先上图,再逼逼
  
  ![github](https://github.com/tm-roamer/ctopo/blob/master/image/demo.png?raw=true "demo1")
  ![github](https://github.com/tm-roamer/ctopo/blob/master/image/skin.jpg?raw=true "demo2")

### 简介
  	引用的插件[gridstack](https://github.com/troolee/gridstack.js)满足不了我们产品的需求, 那就自己写个吧, 一写就是一个月.

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

### 使用说明和特点

	这个插件的设计原则就是: 就是不依赖任何框架和库, 只和css打交道. 不拆散源码, 提供一个完整的源文件, 扔哪都能用.



### 特性, 缺点, 

### 配置说明

### API

基础实例
-----
		<!DOCTYPE html>
		<html lang="zh">
		    <head>
		      <meta charset="UTF-8">
		      <title></title>
		    </head>
		    <body>
		      <canvas id="canvas"></canvas>
		      <script type="text/javascript" src="ctopo.js"></script>
		      <script type="text/javascript">
		        //调用ctopo
		        ctopo({
				      id:"canvas",    //说明: canvas标签的id,     写法: canvas , #canvas
				      width:"auto",   //说明: canvas的宽度,       写法: 500,500px,50%,auto 
				      height:"auto",  //说明: canvas的高度,       写法: 500,500px,50%,auto
				      style:{	      //说明: 样式省略了.....
					      global:{},
					      node:{},
					      edge:{}
				      },
				      layout:{},      //说明: 布局省略了.....
				      data:{},	      //说明: 数据省略了.....
				      event:{}	      //说明: 事件回调省略了.....
				    });
		      </script>
		    </body>
		</html>  
  

api接口
-----
### 使用方法
		//取得ctopo对象, 点出api方法即可
		var ctopo = ctopo({..各种基础配置..});
		var nodeA = ctopo.node("1108"); //获取节点A
		var nodeB = ctopo.node("0724"); //获取节点B
		var edge = ctopo.edge("1108","0724"); //获取连线
		
### 属性和方法
<table>
	<thead>
		<tr><td>属性名</td><td>描述</td></tr>
	</thead>
	<tbody>
		<tr><td>version</td><td>版本</td></tr>
		<tr><td>option</td><td>配置对象</td></tr>
		<tr><td>canvas</td><td>画布对象</td></tr>
		<tr><td>context</td><td>画布上下文对象</td></tr>
		<tr><td>nodes</td><td>节点数组</td></tr>
		<tr><td>edges</td><td>连线对象</td></tr>
	</tbody>
</table>

<table>
	<thead>
		<tr><td>方法名</td><td>描述</td><td>参数</td><td>返回值</td></tr>
	</thead>
	<tbody>
		<tr>
			<td>addEdge(edge,isDrawNow)</td>
			<td>添加连线</td>
			<td>
				参数1: <br/>edge添加的连线对象<br/>
				参数2: <br/>isDrawNow是否立刻渲染到屏幕
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>addNode(node,isDrawNow)</td>
			<td>添加节点</td>
			<td>
				参数1: <br/>edge添加的节点对象<br/>
				参数2: <br/>isDrawNow是否立刻渲染到屏幕
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>draw(option)</td>
			<td>重新绘制画布,<br/>用法等于ctopo(option)</td>
			<td>
				参数1: <br/>option初始的配置对象
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>drawData(data,isApplyLayout)</td>
			<td>局部刷新,只刷新数据</td>
			<td>
				参数1: <br/>data格式=optioin.data<br/>
				参数2: <br/>isApplyLayout是否重新应用布局
			</td>
			<td>成功true,失败false</td>
		</tr>
		<tr>
			<td>edge(sid,tid)</td>
			<td>
				取得连线对象<br/>
				ps:区分方向
			</td>
			<td>
				参数1: <br/>开始节点id<br/>
				参数2: <br/>结束节点id
			</td>
			<td>
				查到: 连线对象 <br/>
				没查到: null
			</td>
		</tr>
		<tr>
			<td>edgeArray()</td>
			<td>取得所有的连线对象数组</td>
			<td>
				无
			</td>
			<td>连线对象数组</td>
		</tr>
		<tr>
			<td>firstNeighbors(nid)</td>
			<td>返回与之关联的连线和节点数组对象</td>
			<td>
				参数1: <br/>nid待匹配的节点id
			</td>
			<td>查到:关联数据对象;<br/>
				没查到:空数组对象<br/>
				{<br/>
				edgeNeighbors:[],<br/>
				nodeNeighbors:[]<br/>
				}<br/>
			</td>
		</tr>
		<tr>
			<td>layout(layout)</td>
			<td>重置切换布局</td>
			<td>
				(可选)参数1:<br/> layout==option.layout
			</td>
			<td>
				无参数:<br/> 返回option.layout<br/>
				有参数:<br/> 重置布局,<br/>成功true,失败false
			</td>
		</tr>
		<tr>
			<td>node(id)</td>
			<td>取得节点对象</td>
			<td>
				参数1: <br/>节点id
			</td>
			<td>
				查到:节点对象<br/>
				没查到:null
			</td>
		</tr>
		<tr>
			<td>nodeLabelsVisible(visible)</td>
			<td>设置节点标签是否显示</td>
			<td>
				参数1: <br/>visible是否显示标签,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>edgeLabelsVisible(visible)</td>
			<td>设置连线标签是否显示</td>
			<td>
				参数1: <br/>visible是否显示标签,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>edgeArrowsVisible(visible)</td>
			<td>设置连线箭头是否显示</td>
			<td>
				参数1: <br/>visible是否显示箭头,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>nodeArray()</td>
			<td>取得所有节点对象数组</td>
			<td>
				无
			</td>
			<td>节点对象数组</td>
		</tr>
		<tr>
			<td>nodeTooltipsVisible(visible)</td>
			<td>设置节点提示框是否显示</td>
			<td>
				参数1: <br/>visible是否显示提示框,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>edgeTooltipsVisible(visible)</td>
			<td>设置连线提示框是否显示</td>
			<td>
				参数1: <br/>visible是否显示提示框,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>edgeAnimateBallsVisible(visible)</td>
			<td>设置连线动画球是否显示</td>
			<td>
				参数1: <br/>visible是否显示动画球,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>consolePanelVisible(visible)</td>
			<td>设置控制台是否显示</td>
			<td>
				参数1: <br/>visible是否显示控制台,<br/>布尔型true,false
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>removeEdge(sid,tid,isDrawNow)</td>
			<td>删除连线</td>
			<td>
				参数1: <br/>开始节点id <br/>
				参数2: <br/>结束节点id <br/>
				参数3: <br/>是否立刻渲染到屏幕
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>removeNode(id,isDrawNow)</td>
			<td>删除节点,与之关联的线也删除</td>
			<td>
				参数1: <br/>节点id <br/>
				参数2: <br/>是否立刻渲染到屏幕
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>updateEdge(edge,isDrawNow)</td>
			<td>更新连线</td>
			<td>
				参数1: <br/>连线对象 <br/>
				参数3: <br/>是否立刻渲染到屏幕
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>updateNode(node,isDrawNow)</td>
			<td>更新节点</td>
			<td>
				参数1: <br/>节点对象 <br/>
				参数2: <br/>是否立刻渲染到屏幕
			</td>
			<td>空</td>
		</tr>
		<tr>
			<td>style(style)</td>
			<td>重置切换样式</td>
			<td>
				(可选)参数1: <br/>style==option.style
			</td>
			<td>
				无参数: <br/>返回option.style
				有参数: <br/>重置样式,<br/>成功true,失败false
			</td>
		</tr>
		<tr>
			<td>zoom(scale)</td>
			<td>设置缩放比例(0-1)</td>
			<td>
				(可选)参数1: <br/>scale比例0-1,100%=0.5<br/>
			</td>
			<td>
				无参数:<br/> 返回比例值<br/>
				有参数:<br/> 设置比例值,<br/>成功ture,失败false
			</td>
		</tr>
	</tbody>
</table>


  
### 版权
  MIT
