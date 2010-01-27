var TodoItem = Class.create({
	init: function(options){
	    console.log("creating new todo item");
	    this.id = options.id;
	    this.name = options.name;
	    this.completed = options.completed;
	    this.mine = options.mine;
	    this.list = options.list; // should change to todo_list_id and link list as the actual list object
	},
	toHtml: function(){
		var self = this,
			li = $("<li id=\"item" + this.id + "\">" + this.name + "</li>");
        if (this.mine)
            li.addClass("mine");
            if (this.completed) {
                li.addClass("completed");
            } else {
                items_completed = false;
                li.append("<span>(<a href=\"#\">completed?</a>)</span>");
            }
			li.find("a").bind("click", function(){
				self.complete();
				return false;
			});
	},
	create: function(){
	},
	update: function(){
	},
	complete: function(){
		var self = this;
	    app.connection.request({
	        url: "/todo_items/" + id + "/complete.xml",
	        type: 'PUT',
	        success: function(response){
                $("#item" + id).addClass("completed").find("span").remove();
				self.completed = true;
				TodoList.saveToCache();				
	        }
	    })
	},
	newRecord: function(){
	    return !this.id
	}


});

$.extend(TodoItem, {
    fromXml : function(node){
        var node = $(node);
    	var mine, rpid, rpel = node.children("responsible-party-id");
        if (rpel){
        	rpid = rpel.text();
            if (rpid == app.user.id)
            	mine = true;
        }
        return new TodoItem({
            id:        node.children("id").text(),
            name:      node.children("content").text(),
            completed: (node.children("completed").text() == "true"),
            mine: mine,
            list: node.children("todo-list-id").text()
        });
    }
})

$.extend(Project, base);
$.extend(TodoList, base);
$.extend(TodoItem, base);